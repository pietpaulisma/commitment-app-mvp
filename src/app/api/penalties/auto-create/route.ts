import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateDailyTarget } from '@/utils/targetCalculation'
import webpush from 'web-push'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Auto-create penalty for current user if they failed yesterday's target
 * Called when user opens the app
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // Check if penalty already exists for yesterday
    const { data: existingPenalty } = await supabase
      .from('pending_penalties')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', yesterdayStr)
      .single()

    if (existingPenalty) {
      // Penalty already exists, return it
      return NextResponse.json({
        penaltyExists: true,
        message: 'Penalty already exists for this date'
      })
    }

    // Get group settings and data
    const [groupSettingsRes, groupDataRes] = await Promise.all([
      supabase
        .from('group_settings')
        .select('rest_days, recovery_days, penalty_amount')
        .eq('group_id', groupId)
        .single(),
      supabase
        .from('groups')
        .select('start_date')
        .eq('id', groupId)
        .single()
    ])

    if (!groupDataRes.data) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const restDays = Array.isArray(groupSettingsRes.data?.rest_days) ? groupSettingsRes.data.rest_days : []
    const recoveryDays = Array.isArray(groupSettingsRes.data?.recovery_days) ? groupSettingsRes.data.recovery_days : []
    const penaltyAmount = groupSettingsRes.data?.penalty_amount || 10
    const groupStartDate = new Date(groupDataRes.data.start_date)

    // Check if user was in sick mode
    if (profile.is_sick_mode) {
      return NextResponse.json({
        noPenalty: true,
        reason: 'User was in sick mode'
      })
    }

    // Check if yesterday was a rest day
    const isRestDay = restDays.includes(dayOfWeek)

    if (isRestDay) {
      // Check for Flex Rest Day qualification
      if (profile.has_flexible_rest_day) {
        const dayBeforeRestDay = new Date(yesterdayDate)
        dayBeforeRestDay.setDate(dayBeforeRestDay.getDate() - 1)
        const dayBeforeStr = dayBeforeRestDay.toISOString().split('T')[0]

        const { data: prevDayLogs } = await supabase
          .from('workout_logs')
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

        if (qualifiedForFlexRest) {
          return NextResponse.json({
            noPenalty: true,
            reason: 'User qualified for flex rest day'
          })
        }
      } else {
        // Regular rest day, no penalty
        return NextResponse.json({
          noPenalty: true,
          reason: 'Rest day'
        })
      }
    }

    // Calculate days since start
    const daysSinceStart = Math.floor((yesterdayDate.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))

    // Calculate daily target
    const dailyTarget = calculateDailyTarget({
      daysSinceStart,
      weekMode: profile.week_mode || 'sane',
      restDays,
      recoveryDays,
      currentDayOfWeek: dayOfWeek
    })

    // Get yesterday's workout logs
    const { data: logs } = await supabase
      .from('workout_logs')
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

    // Check if user met target
    if (actualPoints >= dailyTarget) {
      return NextResponse.json({
        noPenalty: true,
        reason: 'User met target'
      })
    }

    // User failed target - create pending penalty
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
      console.error('Error creating penalty:', penaltyError)
      return NextResponse.json({ error: 'Failed to create penalty' }, { status: 500 })
    }

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
