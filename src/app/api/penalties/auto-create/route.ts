import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateDailyTarget, RECOVERY_DAY_TARGET_MINUTES } from '@/utils/targetCalculation'
import webpush from 'web-push'

/**
 * Auto-create penalty for current user if they failed yesterday's target
 * Called when user opens the app
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase at runtime to avoid build-time errors
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the body to check for client-provided date
    const body = await request.json().catch(() => ({}))

    // Configure web-push for notifications (at runtime, not build time)
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
    const vapidEmail = (process.env.VAPID_EMAIL || 'admin@commitment-app.com').trim()
    const vapidSubject = `mailto:${vapidEmail}`

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, group_id, week_mode, is_sick_mode, has_flexible_rest_day')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const groupId = profile.group_id
    if (!groupId) {
      return NextResponse.json({ error: 'User not in a group' }, { status: 400 })
    }

    // Get yesterday's date - use client-provided date if available (for timezone accuracy)
    // Otherwise fall back to server-calculated UTC date
    let yesterdayStr: string
    if (body.yesterdayDate) {
      yesterdayStr = body.yesterdayDate
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterdayStr = yesterday.toISOString().split('T')[0]
    }
    const yesterdayDate = new Date(yesterdayStr)
    const dayOfWeek = yesterdayDate.getDay()

    console.log('[auto-create] Checking penalties for user:', profile.username, 'date:', yesterdayStr, 'dayOfWeek:', dayOfWeek)

    // Check if penalty already exists for yesterday (use maybeSingle to avoid error)
    const { data: existingPenalty } = await supabase
      .from('pending_penalties')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('date', yesterdayStr)
      .maybeSingle()

    if (existingPenalty) {
      // Penalty already exists, return it
      console.log('[auto-create] Penalty already exists:', existingPenalty.id, 'status:', existingPenalty.status)
      return NextResponse.json({
        penaltyExists: true,
        penaltyId: existingPenalty.id,
        penaltyStatus: existingPenalty.status,
        message: 'Penalty already exists for this date'
      })
    }

    // Get group settings and data
    // Use maybeSingle() for group_settings to handle case where no settings exist
    const [groupSettingsRes, groupDataRes] = await Promise.all([
      supabase
        .from('group_settings')
        .select('rest_days, recovery_days, penalty_amount')
        .eq('group_id', groupId)
        .maybeSingle(),  // Use maybeSingle instead of single to avoid error when no row exists
      supabase
        .from('groups')
        .select('start_date, rest_day_1, rest_day_2, penalty_amount')
        .eq('id', groupId)
        .single()
    ])

    if (!groupDataRes.data) {
      console.error('[auto-create] Group not found for groupId:', groupId)
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Fallback to groups table if group_settings doesn't exist
    const groupData = groupDataRes.data
    let restDays: number[] = []
    let recoveryDays: number[] = []
    let penaltyAmount = 10

    if (groupSettingsRes.data) {
      // Use group_settings if available
      restDays = Array.isArray(groupSettingsRes.data.rest_days) ? groupSettingsRes.data.rest_days : []
      recoveryDays = Array.isArray(groupSettingsRes.data.recovery_days) ? groupSettingsRes.data.recovery_days : []
      penaltyAmount = groupSettingsRes.data.penalty_amount || 10
    } else {
      // Fallback to groups table columns
      console.log('[auto-create] No group_settings found, using groups table fallback')
      if (groupData.rest_day_1 !== null) restDays.push(groupData.rest_day_1)
      if (groupData.rest_day_2 !== null) restDays.push(groupData.rest_day_2)
      penaltyAmount = groupData.penalty_amount || 10
    }

    const groupStartDate = new Date(groupData.start_date)
    console.log('[auto-create] Using restDays:', restDays, 'penaltyAmount:', penaltyAmount)

    // Check if user is currently in sick mode - if so, log it for today
    if (profile.is_sick_mode) {
      // Log this sick day for historical tracking (so recaps show correctly)
      try {
        await supabase
          .from('sick_mode')
          .upsert(
            { user_id: user.id, date: yesterdayStr },
            { onConflict: 'user_id,date' }
          )
      } catch (sickLogError) {
        console.log('[auto-create] Could not log sick day (table may not exist):', sickLogError)
      }
      
      return NextResponse.json({
        noPenalty: true,
        reason: 'User is currently in sick mode'
      })
    }

    // Check if user WAS sick on the specific date we're checking (historical check)
    // This handles the case where user was sick on that day but has since recovered
    const { data: historicalSickRecord } = await supabase
      .from('sick_mode')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', yesterdayStr)
      .maybeSingle()

    if (historicalSickRecord) {
      return NextResponse.json({
        noPenalty: true,
        reason: 'User was in sick mode on this date'
      })
    }

    // Check if user had an active recovery day for yesterday
    const { data: yesterdayRecoveryDay } = await supabase
      .from('user_recovery_days')
      .select('id, recovery_minutes, is_complete')
      .eq('user_id', user.id)
      .eq('used_date', yesterdayStr)
      .maybeSingle()

    if (yesterdayRecoveryDay) {
      // User had activated a recovery day for yesterday
      if (yesterdayRecoveryDay.is_complete || yesterdayRecoveryDay.recovery_minutes >= RECOVERY_DAY_TARGET_MINUTES) {
        // User completed their recovery day - no penalty
        return NextResponse.json({
          noPenalty: true,
          reason: 'User completed their recovery day'
        })
      } else {
        // User activated recovery day but didn't complete it - create penalty with recovery day target
        const deadline = new Date()
        deadline.setHours(deadline.getHours() + 24)

        const { data: newPenalty, error: penaltyError } = await supabase
          .from('pending_penalties')
          .insert({
            user_id: user.id,
            group_id: groupId,
            date: yesterdayStr,
            target_points: RECOVERY_DAY_TARGET_MINUTES,
            actual_points: yesterdayRecoveryDay.recovery_minutes || 0,
            penalty_amount: penaltyAmount,
            status: 'pending',
            deadline: deadline.toISOString()
          })
          .select()
          .single()

        if (penaltyError) {
          console.error('Error creating recovery day penalty:', penaltyError)
          return NextResponse.json({ error: 'Failed to create penalty' }, { status: 500 })
        }

        return NextResponse.json({
          penaltyCreated: true,
          penalty: newPenalty,
          message: 'Penalty created for incomplete recovery day'
        })
      }
    }

    // Check if yesterday was a rest day
    const isRestDay = restDays.includes(dayOfWeek)
    console.log('[auto-create] isRestDay:', isRestDay, 'dayOfWeek:', dayOfWeek, 'restDays:', restDays)

    if (isRestDay) {
      // Check for Flex Rest Day qualification
      if (profile.has_flexible_rest_day) {
        const dayBeforeRestDay = new Date(yesterdayDate)
        dayBeforeRestDay.setDate(dayBeforeRestDay.getDate() - 1)
        const dayBeforeStr = dayBeforeRestDay.toISOString().split('T')[0]

        const { data: prevDayLogs } = await supabase
          .from('logs')
          .select('points')
          .eq('user_id', user.id)
          .eq('date', dayBeforeStr)

        const prevDayPoints = prevDayLogs?.reduce((sum, log) => sum + log.points, 0) || 0
        const daysSinceStart = Math.floor((yesterdayDate.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))
        const prevDaysSinceStart = daysSinceStart - 1
        const prevDayOfWeek = dayBeforeRestDay.getDay()

        const prevDayTarget = calculateDailyTarget({
          daysSinceStart: prevDaysSinceStart,
          weekMode: profile.week_mode || 'sane',
          restDays,
          recoveryDays,
          currentDayOfWeek: prevDayOfWeek
        })

        const qualifiedForFlexRest = prevDayPoints >= prevDayTarget * 2
        console.log('[auto-create] Flex rest day check: prevDayPoints:', prevDayPoints, 'needed:', prevDayTarget * 2, 'qualified:', qualifiedForFlexRest)

        if (qualifiedForFlexRest) {
          console.log('[auto-create] User qualified for flex rest day - no penalty')
          return NextResponse.json({
            noPenalty: true,
            reason: 'User qualified for flex rest day'
          })
        }
        // User has flex rest day feature but didn't qualify - will fall through to check target
        console.log('[auto-create] User has flex rest day but did NOT qualify - checking target')
      } else {
        // Regular rest day, no penalty
        console.log('[auto-create] Regular rest day - no penalty')
        return NextResponse.json({
          noPenalty: true,
          reason: 'Rest day'
        })
      }
    }

    // Calculate days since start
    const daysSinceStart = Math.floor((yesterdayDate.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))

    // Calculate daily target
    // IMPORTANT: Always use 'sane' mode for penalty evaluation
    // If user hits sane target, they're safe regardless of their display mode
    const dailyTarget = calculateDailyTarget({
      daysSinceStart,
      weekMode: 'sane',
      restDays,
      recoveryDays,
      currentDayOfWeek: dayOfWeek
    })

    // Get yesterday's workout logs from the logs table (where workouts are actually stored)
    const { data: logs } = await supabase
      .from('logs')
      .select('points, exercise_id')
      .eq('user_id', user.id)
      .eq('date', yesterdayStr)

    // Get all exercises to check types
    const { data: exercises } = await supabase
      .from('exercises')
      .select('id, type')

    const exerciseTypeMap = new Map(exercises?.map(e => [e.id, e.type]) || [])

    // Calculate actual points with recovery cap
    let totalRecoveryPoints = 0
    let totalNonRecoveryPoints = 0

    logs?.forEach(log => {
      const type = exerciseTypeMap.get(log.exercise_id)
      if (type === 'recovery') {
        totalRecoveryPoints += log.points
      } else {
        totalNonRecoveryPoints += log.points
      }
    })

    const recoveryCapLimit = Math.round(dailyTarget * 0.25)
    const cappedRecoveryPoints = Math.min(totalRecoveryPoints, recoveryCapLimit)
    const actualPoints = totalNonRecoveryPoints + cappedRecoveryPoints

    console.log('[auto-create] Target calculation - dailyTarget:', dailyTarget, 'actualPoints:', actualPoints, 'logs:', logs?.length || 0)

    // Check if user met target
    if (actualPoints >= dailyTarget) {
      console.log('[auto-create] User met target - no penalty needed')
      return NextResponse.json({
        noPenalty: true,
        reason: 'User met target',
        actualPoints,
        dailyTarget
      })
    }

    // User failed target - create pending penalty
    console.log('[auto-create] User FAILED target - creating penalty. Actual:', actualPoints, 'Target:', dailyTarget)
    const deadline = new Date()
    deadline.setHours(deadline.getHours() + 24)

    const { data: newPenalty, error: penaltyError } = await supabase
      .from('pending_penalties')
      .insert({
        user_id: user.id,
        group_id: groupId,
        date: yesterdayStr,
        target_points: dailyTarget,
        actual_points: actualPoints,
        penalty_amount: penaltyAmount,
        status: 'pending',
        deadline: deadline.toISOString()
      })
      .select()
      .single()

    if (penaltyError) {
      console.error('[auto-create] Error creating penalty:', penaltyError)
      return NextResponse.json({ error: 'Failed to create penalty', details: penaltyError.message }, { status: 500 })
    }
    
    console.log('[auto-create] ✅ Penalty created successfully:', newPenalty.id)

    // Send push notification to user
    try {
      console.log('[auto-create] Attempting to send push notification to user:', user.id)

      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', user.id)

      if (subError) {
        console.error('[auto-create] Error fetching subscriptions:', subError)
      }

      console.log('[auto-create] Found subscriptions:', subscriptions?.length || 0)

      if (subscriptions && subscriptions.length > 0) {
        const payload = JSON.stringify({
          title: 'Penalty Alert ⚠️',
          body: `You missed yesterday's target (${actualPoints}/${dailyTarget} pts). Respond within 24h or penalty auto-accepts.`,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'penalty',
          requireInteraction: true,
          data: {
            type: 'penalty',
            url: '/dashboard',
            penaltyId: newPenalty.id
          }
        })

        let successCount = 0
        let failCount = 0

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(sub.subscription, payload, {
              TTL: 3600,
              urgency: 'high'
            })
            successCount++
            console.log('[auto-create] ✅ Notification sent successfully')
          } catch (error) {
            failCount++
            console.error('[auto-create] ❌ Failed to send notification:', error)
          }
        }

        console.log(`[auto-create] Notification results: ${successCount} success, ${failCount} failed`)
      } else {
        console.log('[auto-create] ⚠️ No push subscriptions found for user')
      }
    } catch (error) {
      console.error('[auto-create] ❌ Push notification error:', error)
      // Continue execution - don't fail penalty creation due to notification error
    }

    return NextResponse.json({
      penaltyCreated: true,
      penalty: newPenalty,
      message: 'Penalty created successfully'
    })

  } catch (error) {
    console.error('Error in auto-create penalty:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { message: errorMessage, stack: errorStack })
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage
    }, { status: 500 })
  }
}
