import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateDailyTarget } from '@/utils/targetCalculation'
import { getWeekDates, getSeason, getSeasonYear, isMonday } from '@/utils/seasonHelpers'
import { configureVapid } from '@/utils/vapidConfig'
import webpush from 'web-push'

/**
 * Simplified admin endpoint:
 * 1. Auto-accept expired penalties
 * 2. Send notifications to users who haven't checked in
 * 3. Post daily summary to chat
 *
 * Note: Penalties are now created automatically when users open the app
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[send-daily-summary] Starting...')
    // Initialize Supabase at runtime to avoid build-time errors
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Configure web-push for notifications (at runtime, not build time)
    configureVapid()

    console.log('[send-daily-summary] Verifying user...')
    // Verify user is admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, group_id, username')
      .eq('id', user.id)
      .single()

    if (!profile || !['group_admin', 'supreme_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    if (!profile.group_id) {
      return NextResponse.json({ error: 'Admin must be in a group' }, { status: 400 })
    }

    console.log(`[send-daily-summary] Admin ${profile.username} sending daily summary for group ${profile.group_id}`)

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const yesterdayDate = new Date(yesterdayStr)
    const dayOfWeek = yesterdayDate.getDay()

    const stats = {
      autoAccepted: 0,
      notificationsSent: 0
    }

    console.log('[send-daily-summary] Step 1: Auto-accepting expired penalties...')
    // Step 1: Auto-accept expired penalties
    const { data: expiredPenalties } = await supabase
      .from('pending_penalties')
      .select('*')
      .eq('group_id', profile.group_id)
      .eq('status', 'pending')
      .lt('deadline', new Date().toISOString())

    if (expiredPenalties && expiredPenalties.length > 0) {
      for (const penalty of expiredPenalties) {
        try {
          // Create payment transaction
          await supabase.from('payment_transactions').insert({
            user_id: penalty.user_id,
            group_id: penalty.group_id,
            amount: penalty.penalty_amount,
            transaction_type: 'penalty',
            description: `Auto-accepted penalty: Missed target (${penalty.actual_points}/${penalty.target_points} pts) on ${penalty.date}`
          })

          // Update user's balance
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('total_penalty_owed, username')
            .eq('id', penalty.user_id)
            .single()

          if (currentProfile) {
            const newTotal = (currentProfile.total_penalty_owed || 0) + penalty.penalty_amount

            await supabase
              .from('profiles')
              .update({ total_penalty_owed: newTotal })
              .eq('id', penalty.user_id)

            // Update penalty status
            await supabase
              .from('pending_penalties')
              .update({
                status: 'auto_accepted',
                auto_accepted_at: new Date().toISOString()
              })
              .eq('id', penalty.id)

            // Post to chat
            await supabase.rpc('insert_chat_message', {
              p_group_id: penalty.group_id,
              p_user_id: penalty.user_id,
              p_message: `${currentProfile.username}'s penalty auto-accepted (no response): €${penalty.penalty_amount} added to pot`
            })

            stats.autoAccepted++
          }
        } catch (error) {
          console.error(`Error auto-accepting penalty ${penalty.id}:`, error)
        }
      }
    }

    console.log('[send-daily-summary] Step 2: Getting members and group settings...')
    // Step 2: Get all members and their status for yesterday
    const { data: members } = await supabase
      .from('profiles')
      .select('id, username, week_mode, is_sick_mode, has_flexible_rest_day, last_seen')
      .eq('group_id', profile.group_id)

    const { data: groupSettings } = await supabase
      .from('group_settings')
      .select('rest_days, recovery_days')
      .eq('group_id', profile.group_id)
      .single()

    const { data: groupData } = await supabase
      .from('groups')
      .select('start_date')
      .eq('id', profile.group_id)
      .single()

    if (!members || !groupData) {
      return NextResponse.json({ error: 'Group data not found' }, { status: 404 })
    }

    const restDays = Array.isArray(groupSettings?.rest_days) ? groupSettings.rest_days : []
    const recoveryDays = Array.isArray(groupSettings?.recovery_days) ? groupSettings.recovery_days : []
    const groupStartDate = new Date(groupData.start_date)
    const isRestDay = restDays.includes(dayOfWeek)

    // Get all penalties for yesterday
    const { data: penalties } = await supabase
      .from('pending_penalties')
      .select('id, user_id, status, reason_category, reason_message, target_points, actual_points')
      .eq('group_id', profile.group_id)
      .eq('date', yesterdayStr)

    const penaltyMap = new Map(penalties?.map(p => [p.user_id, p]) || [])

    // Get workout logs for yesterday and day before
    const dayBeforeRestDay = new Date(yesterdayDate)
    dayBeforeRestDay.setDate(dayBeforeRestDay.getDate() - 1)
    const dayBeforeStr = dayBeforeRestDay.toISOString().split('T')[0]

    const memberIds = members.map(m => m.id)
    const { data: allLogs } = await supabase
      .from('logs')
      .select('user_id, points, exercise_id, date')
      .in('user_id', memberIds)
      .in('date', [yesterdayStr, dayBeforeStr])

    // Group logs by user and date
    const logsByUserAndDate = new Map<string, Map<string, {points: number, exercise_id: string}[]>>()
    allLogs?.forEach(log => {
      if (!logsByUserAndDate.has(log.user_id)) {
        logsByUserAndDate.set(log.user_id, new Map())
      }
      const userLogs = logsByUserAndDate.get(log.user_id)!
      if (!userLogs.has(log.date)) {
        userLogs.set(log.date, [])
      }
      userLogs.get(log.date)!.push({ points: log.points, exercise_id: log.exercise_id })
    })

    // Calculate days since start
    const daysSinceStart = Math.floor((yesterdayDate.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))

    // Categorize members
    const completedMembers: string[] = []
    const toBeConfirmedMembers: string[] = []
    const pendingMembers: Array<{username: string, actual: number, target: number}> = []
    const disputedMembers: Array<{username: string, reason: string}> = []
    const sickMembers: string[] = []
    const usersWhoNeedNotification: string[] = []

    const recoveryExercises = [
      'recovery_meditation', 'recovery_stretching', 'recovery_blackrolling', 'recovery_yoga',
      'meditation', 'stretching', 'yoga', 'foam rolling', 'blackrolling'
    ]

    // Check today to see if users have opened the app
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    for (const member of members) {
      // Check if sick
      if (member.is_sick_mode) {
        sickMembers.push(member.username)
        continue
      }

      // Handle rest days
      if (isRestDay) {
        if (member.has_flexible_rest_day) {
          const userLogs = logsByUserAndDate.get(member.id)
          const prevDayLogs = userLogs?.get(dayBeforeStr) || []
          const prevDayPoints = prevDayLogs.reduce((sum, log) => sum + log.points, 0)

          const prevDaysSinceStart = daysSinceStart - 1
          const prevDayOfWeek = dayBeforeRestDay.getDay()
          const prevDayTarget = calculateDailyTarget({
            daysSinceStart: prevDaysSinceStart,
            weekMode: member.week_mode || 'sane',
            restDays,
            recoveryDays,
            currentDayOfWeek: prevDayOfWeek
          })

          if (prevDayPoints >= prevDayTarget * 2) {
            completedMembers.push(member.username)
            continue
          }
        } else {
          completedMembers.push(member.username)
          continue
        }
      }

      // Calculate target
      // IMPORTANT: Always use 'sane' mode for penalty/completion evaluation
      // If user hits sane target, they're safe regardless of their display mode
      const dailyTarget = calculateDailyTarget({
        daysSinceStart,
        weekMode: 'sane',
        restDays,
        recoveryDays,
        currentDayOfWeek: dayOfWeek
      })

      // Get logs and calculate points
      const userLogs = logsByUserAndDate.get(member.id)
      const logs = userLogs?.get(yesterdayStr) || []

      let totalRecoveryPoints = 0
      let totalNonRecoveryPoints = 0

      logs.forEach(log => {
        if (recoveryExercises.includes(log.exercise_id)) {
          totalRecoveryPoints += log.points
        } else {
          totalNonRecoveryPoints += log.points
        }
      })

      const recoveryCapLimit = Math.round(dailyTarget * 0.25)
      const cappedRecoveryPoints = Math.min(totalRecoveryPoints, recoveryCapLimit)
      const actualPoints = totalNonRecoveryPoints + cappedRecoveryPoints

      const penalty = penaltyMap.get(member.id)

      if (actualPoints >= dailyTarget) {
        completedMembers.push(member.username)
      } else if (penalty) {
        if (penalty.status === 'pending') {
          pendingMembers.push({
            username: member.username,
            actual: actualPoints,
            target: dailyTarget
          })
        } else if (penalty.status === 'disputed') {
          disputedMembers.push({
            username: member.username,
            reason: penalty.reason_category || 'other'
          })
        }
      } else {
        toBeConfirmedMembers.push(member.username)

        // Check if user has opened app today
        const lastSeen = member.last_seen ? new Date(member.last_seen) : null
        if (!lastSeen || lastSeen < todayStart) {
          usersWhoNeedNotification.push(member.id)
        }
      }
    }

    // Step 3: Send push notifications to users who haven't checked in
    if (usersWhoNeedNotification.length > 0) {
      for (const userId of usersWhoNeedNotification) {
        try {
          const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('subscription')
            .eq('user_id', userId)

          if (subscriptions && subscriptions.length > 0) {
            const payload = JSON.stringify({
              title: 'Check In Reminder',
              body: 'You haven\'t checked in today. Open the app to see if you have any pending penalties.',
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              data: {
                url: '/dashboard'
              }
            })

            for (const sub of subscriptions) {
              try {
                await webpush.sendNotification(sub.subscription, payload, {
                  TTL: 3600,
                  urgency: 'high'
                })
                stats.notificationsSent++
              } catch (error) {
                console.error('Failed to send notification:', error)
              }
            }
          }
        } catch (error) {
          console.error(`Error sending notification to user ${userId}:`, error)
        }
      }
    }

    console.log('[send-daily-summary] Step 4: Posting daily summary to chat...')
    // Step 4: Post daily summary to chat
    let summaryContent = `📊 **Yesterday's Recap** (${yesterdayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })})\n\n`

    if (completedMembers.length > 0) {
      summaryContent += `✅ **Made It** (${completedMembers.length}/${members.length}):\n${completedMembers.join(', ')}\n\n`
    }

    if (toBeConfirmedMembers.length > 0) {
      summaryContent += `⏳ **To Be Confirmed** (${toBeConfirmedMembers.length}):\n${toBeConfirmedMembers.join(', ')}\n\n`
    }

    if (pendingMembers.length > 0) {
      summaryContent += `⚠️ **Pending Response** (${pendingMembers.length}):\n`
      pendingMembers.forEach(m => {
        summaryContent += `• ${m.username} (${m.actual}/${m.target} pts)\n`
      })
      summaryContent += '\n'
    }

    if (disputedMembers.length > 0) {
      summaryContent += `❓ **Disputed** (${disputedMembers.length}):\n`
      disputedMembers.forEach(m => {
        summaryContent += `• ${m.username} (${m.reason})\n`
      })
      summaryContent += '\n'
    }

    if (sickMembers.length > 0) {
      summaryContent += `🤒 **Sick Mode** (${sickMembers.length}):\n${sickMembers.join(', ')}\n\n`
    }

    // Post summary to chat using direct insert (RPC function doesn't exist)
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        group_id: profile.group_id,
        message: summaryContent,
        is_system_message: true,
        user_id: null,
        message_type: 'text'
      })

    if (insertError) {
      console.error('[send-daily-summary] Error posting summary to chat:', insertError)
      throw new Error(`Failed to post summary to chat: ${insertError.message}`)
    }

    console.log('[send-daily-summary] Summary posted successfully to chat')

    console.log('[send-daily-summary] Step 5: Checking if Monday for weekly winner...')
    // Step 5: If today is Monday, calculate last week's overperformer and save to history
    let weeklyWinnerAnnouncement = ''
    if (isMonday()) {
      try {
        console.log('[send-daily-summary] It is Monday, calculating weekly winner...')
        const { start: lastWeekStart, end: lastWeekEnd } = getWeekDates(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0]
        const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0]

        // Get all logs for last week (filter by member IDs since logs don't have group_id)
        const { data: weekLogs } = await supabase
          .from('logs')
          .select('user_id, points, date')
          .in('user_id', memberIds)
          .gte('date', lastWeekStartStr)
          .lte('date', lastWeekEndStr)

        // Calculate each member's weekly performance
        const memberPerformance = new Map<string, { totalPoints: number, targetPoints: number }>()

        for (const member of members) {
          if (member.is_sick_mode) continue

          const memberLogs = weekLogs?.filter(log => log.user_id === member.id) || []
          const totalPoints = memberLogs.reduce((sum, log) => sum + log.points, 0)

          // Calculate weekly target
          let weeklyTarget = 0
          for (let i = 0; i < 7; i++) {
            const date = new Date(lastWeekStart)
            date.setDate(date.getDate() + i)
            const dayOfWeek = date.getDay()
            const daysSinceStart = Math.floor((date.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))

            const dailyTarget = calculateDailyTarget({
              daysSinceStart,
              weekMode: member.week_mode || 'sane',
              restDays,
              recoveryDays,
              currentDayOfWeek: dayOfWeek
            })

            weeklyTarget += dailyTarget
          }

          if (totalPoints > weeklyTarget) {
            memberPerformance.set(member.id, {
              totalPoints,
              targetPoints: weeklyTarget
            })
          }
        }

        // Find the highest percentage over target
        let winner: { userId: string, username: string, percentage: number, totalPoints: number, targetPoints: number } | null = null

        for (const [userId, perf] of memberPerformance.entries()) {
          const percentage = ((perf.totalPoints - perf.targetPoints) / perf.targetPoints) * 100
          const member = members.find(m => m.id === userId)

          if (member && (!winner || percentage > winner.percentage)) {
            winner = {
              userId,
              username: member.username,
              percentage,
              totalPoints: perf.totalPoints,
              targetPoints: perf.targetPoints
            }
          }
        }

        // Save to history and announce
        if (winner) {
          const season = getSeason(lastWeekStart)
          const year = getSeasonYear(lastWeekStart)

          await supabase.from('weekly_overperformer_history').insert({
            week_start_date: lastWeekStartStr,
            week_end_date: lastWeekEndStr,
            user_id: winner.userId,
            group_id: profile.group_id,
            season,
            year,
            percentage_over_target: winner.percentage,
            total_points: winner.totalPoints,
            target_points: winner.targetPoints
          })

          weeklyWinnerAnnouncement = `🏆 **Weekly Overperformer** 🏆\n\n${winner.username} crushed it last week!\n${winner.totalPoints} points (${winner.percentage.toFixed(1)}% over target)\n\n`

          const { error: winnerInsertError } = await supabase
            .from('chat_messages')
            .insert({
              group_id: profile.group_id,
              message: weeklyWinnerAnnouncement,
              is_system_message: true,
              user_id: null,
              message_type: 'text'
            })

          if (winnerInsertError) {
            console.error('[send-daily-summary] Error posting weekly winner:', winnerInsertError)
          }
        }
      } catch (error) {
        console.error('[send-daily-summary] Error calculating weekly overperformer:', error)
      }
    }

    console.log('[send-daily-summary] Returning success response...')
    return NextResponse.json({
      success: true,
      stats: {
        totalMembers: members.length,
        completed: completedMembers.length,
        toBeConfirmed: toBeConfirmedMembers.length,
        pending: pendingMembers.length,
        disputed: disputedMembers.length,
        sick: sickMembers.length,
        autoAccepted: stats.autoAccepted,
        notificationsSent: stats.notificationsSent,
        weeklyWinnerCalculated: weeklyWinnerAnnouncement !== ''
      },
      message: 'Daily summary sent successfully'
    })

  } catch (error) {
    console.error('Error in send-daily-summary:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('Error details:', { message: errorMessage, stack: errorStack })
    return NextResponse.json({
      error: 'Internal server error',
      details: errorMessage,
      stack: errorStack
    }, { status: 500 })
  }
}
