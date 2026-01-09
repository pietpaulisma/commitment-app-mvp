import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateDailyTarget, RECOVERY_DAY_TARGET_MINUTES } from '@/utils/targetCalculation'
import webpush from 'web-push'

/**
 * Auto-create penalty for current user if they failed yesterday's target
 * Called when user opens the app
 */
export async function POST(request: NextRequest) {
  console.log('[auto-create] === STARTING AUTO-CREATE PENALTY CHECK ===')
  
  try {
    console.log('[auto-create] Step 1: Initializing Supabase...')
    // Initialize Supabase at runtime to avoid build-time errors
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    console.log('[auto-create] Step 1: ✅ Supabase initialized')

    console.log('[auto-create] Step 2: Parsing request body...')
    // Get the body to check for client-provided date
    const body = await request.json().catch(() => ({}))
    console.log('[auto-create] Step 2: ✅ Body parsed:', JSON.stringify(body))

    console.log('[auto-create] Step 3: Configuring VAPID...')
    // Configure web-push for notifications (at runtime, not build time)
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
    const vapidEmail = (process.env.VAPID_EMAIL || 'admin@commitment-app.com').trim()
    const vapidSubject = `mailto:${vapidEmail}`

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
      console.log('[auto-create] Step 3: ✅ VAPID configured')
    } else {
      console.log('[auto-create] Step 3: ⚠️ VAPID not configured (missing keys)')
    }

    console.log('[auto-create] Step 4: Checking auth header...')
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.log('[auto-create] Step 4: ❌ No auth header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[auto-create] Step 4: ✅ Auth header present')

    console.log('[auto-create] Step 5: Validating user token...')
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.log('[auto-create] Step 5: ❌ Auth error:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[auto-create] Step 5: ✅ User authenticated:', user.id)

    console.log('[auto-create] Step 6: Fetching user profile...')
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, group_id, week_mode, is_sick_mode, has_flexible_rest_day')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.log('[auto-create] Step 6: ❌ Profile error:', profileError?.message)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    console.log('[auto-create] Step 6: ✅ Profile found:', profile.username)

    const groupId = profile.group_id
    if (!groupId) {
      console.log('[auto-create] Step 6: ❌ User not in group')
      return NextResponse.json({ error: 'User not in a group' }, { status: 400 })
    }
    console.log('[auto-create] Step 6: ✅ Group ID:', groupId)

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

    console.log('[auto-create] Step 7: Fetching group settings and data...')
    // Get group settings and data
    // Use maybeSingle() for group_settings to handle case where no settings exist
    // Note: rest_days, recovery_days, penalty_amount are in group_settings, not groups
    const [groupSettingsRes, groupDataRes] = await Promise.all([
      supabase
        .from('group_settings')
        .select('rest_days, recovery_days, penalty_amount')
        .eq('group_id', groupId)
        .maybeSingle(),  // Use maybeSingle instead of single to avoid error when no row exists
      supabase
        .from('groups')
        .select('start_date')  // Only select columns that exist in groups table
        .eq('id', groupId)
        .single()
    ])
    console.log('[auto-create] Step 7: ✅ Group queries complete')
    console.log('[auto-create] Step 7: groupSettingsRes.error:', groupSettingsRes.error?.message)
    console.log('[auto-create] Step 7: groupDataRes.error:', groupDataRes.error?.message)

    if (!groupDataRes.data) {
      console.error('[auto-create] Step 7: ❌ Group not found for groupId:', groupId)
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }
    console.log('[auto-create] Step 7: ✅ Group data found, start_date:', groupDataRes.data.start_date)

    // Get settings from group_settings table (with defaults if not found)
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
      // No group_settings found - use defaults
      console.log('[auto-create] No group_settings found, using defaults (no rest days, €10 penalty)')
    }

    const groupStartDate = new Date(groupData.start_date)
    console.log('[auto-create] Using restDays:', restDays, 'penaltyAmount:', penaltyAmount)

    console.log('[auto-create] Step 8: Checking sick mode...')
    // Check if user is currently in sick mode - if so, log it for today
    if (profile.is_sick_mode) {
      console.log('[auto-create] Step 8: User is currently in sick mode')
      // Log this sick day for historical tracking (so recaps show correctly)
      try {
        await supabase
          .from('sick_mode')
          .upsert(
            { user_id: user.id, date: yesterdayStr },
            { onConflict: 'user_id,date' }
          )
        console.log('[auto-create] Step 8: ✅ Logged sick day')
      } catch (sickLogError) {
        console.log('[auto-create] Step 8: ⚠️ Could not log sick day (table may not exist):', sickLogError)
      }
      
      return NextResponse.json({
        noPenalty: true,
        reason: 'User is currently in sick mode'
      })
    }
    console.log('[auto-create] Step 8: ✅ User not in sick mode')

    console.log('[auto-create] Step 9: Checking historical sick records...')
    // Check if user WAS sick on the specific date we're checking (historical check)
    // This handles the case where user was sick on that day but has since recovered
    const { data: historicalSickRecord, error: sickRecordError } = await supabase
      .from('sick_mode')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', yesterdayStr)
      .maybeSingle()

    if (sickRecordError) {
      console.log('[auto-create] Step 9: ⚠️ Error querying sick_mode:', sickRecordError.message)
      // Continue execution - don't fail if sick_mode table has issues
    }

    if (historicalSickRecord) {
      console.log('[auto-create] Step 9: User was sick on this date')
      return NextResponse.json({
        noPenalty: true,
        reason: 'User was in sick mode on this date'
      })
    }
    console.log('[auto-create] Step 9: ✅ No historical sick record')

    console.log('[auto-create] Step 10: Checking recovery day...')
    // Check if user had an active recovery day for yesterday
    const { data: yesterdayRecoveryDay, error: recoveryDayError } = await supabase
      .from('user_recovery_days')
      .select('id, recovery_minutes, is_complete')
      .eq('user_id', user.id)
      .eq('used_date', yesterdayStr)
      .maybeSingle()

    if (recoveryDayError) {
      console.log('[auto-create] Step 10: ⚠️ Error querying user_recovery_days:', recoveryDayError.message)
      // Continue execution - don't fail if table has issues
    }

    if (yesterdayRecoveryDay) {
      console.log('[auto-create] Step 10: User had a recovery day')
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
        .select('user_id, endpoint, p256dh, auth')
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
            // Build the push subscription object from individual columns
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            }
            await webpush.sendNotification(pushSubscription, payload, {
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
