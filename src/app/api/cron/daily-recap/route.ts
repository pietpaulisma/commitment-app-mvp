import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateDailyTarget, RECOVERY_DAY_TARGET_MINUTES } from '@/utils/targetCalculation'

/**
 * Single unified cron job that runs at 00:00 daily
 * 1. Checks who did their workout yesterday and who didn't
 * 2. Creates pending penalties for those who failed
 * 3. Auto-accepts any expired penalties
 * 4. Posts a summary recap to the group chat
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (!authHeader || authHeader !== expectedAuth) {
      console.log('[daily-recap] Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[daily-recap] Starting daily recap cron job...')

    // Initialize Supabase at runtime
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Calculate yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const yesterdayDate = new Date(yesterdayStr)
    const dayOfWeek = yesterdayDate.getDay()

    console.log(`[daily-recap] Processing date: ${yesterdayStr} (day ${dayOfWeek})`)

    // Get all active groups
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name, start_date, rest_day_1, rest_day_2, penalty_amount')
      .not('id', 'is', null)

    if (groupsError) {
      throw groupsError
    }

    if (!groups || groups.length === 0) {
      console.log('[daily-recap] No active groups found')
      return NextResponse.json({ message: 'No active groups' })
    }

    const results = []

    for (const group of groups) {
      console.log(`[daily-recap] Processing group: ${group.name} (${group.id})`)

      try {
        // Get group settings (may not exist)
        const { data: groupSettings } = await supabase
          .from('group_settings')
          .select('rest_days, penalty_amount')
          .eq('group_id', group.id)
          .maybeSingle()

        // Determine rest days and penalty amount
        const restDays: number[] = groupSettings?.rest_days || 
          [group.rest_day_1, group.rest_day_2].filter((d): d is number => d !== null)
        const penaltyAmount = groupSettings?.penalty_amount || group.penalty_amount || 10

        const isRestDay = restDays.includes(dayOfWeek)
        const groupStartDate = new Date(group.start_date)

        // Get all members of this group
        const { data: members } = await supabase
          .from('profiles')
          .select('id, username, week_mode, is_sick_mode, has_flexible_rest_day')
          .eq('group_id', group.id)

        if (!members || members.length === 0) {
          console.log(`[daily-recap] No members in group ${group.name}`)
          continue
        }

        // Get yesterday's logs for all members
        const memberIds = members.map(m => m.id)
        const { data: logs } = await supabase
          .from('logs')
          .select('user_id, points, exercise_id')
          .eq('date', yesterdayStr)
          .in('user_id', memberIds)

        // Get exercises to identify recovery types
        const { data: exercises } = await supabase
          .from('exercises')
          .select('id, type')

        const exerciseTypeMap = new Map(exercises?.map(e => [e.id, e.type]) || [])

        // Get existing penalties for yesterday
        const { data: existingPenalties } = await supabase
          .from('pending_penalties')
          .select('user_id, id')
          .eq('date', yesterdayStr)
          .eq('group_id', group.id)

        const existingPenaltyUserIds = new Set(existingPenalties?.map(p => p.user_id) || [])

        // Get sick mode records for yesterday
        const { data: sickRecords } = await supabase
          .from('sick_mode')
          .select('user_id')
          .eq('date', yesterdayStr)
          .in('user_id', memberIds)

        const sickUserIds = new Set(sickRecords?.map(s => s.user_id) || [])

        // Get recovery days for yesterday
        const { data: recoveryDays } = await supabase
          .from('user_recovery_days')
          .select('user_id, recovery_minutes, is_complete')
          .eq('used_date', yesterdayStr)
          .in('user_id', memberIds)

        const recoveryDayMap = new Map(recoveryDays?.map(r => [r.user_id, r]) || [])

        // Track results for this group
        const groupResult = {
          groupId: group.id,
          groupName: group.name,
          completedMembers: [] as string[],
          restDayMembers: [] as string[],
          sickMembers: [] as string[],
          recoveryDayMembers: [] as string[],
          failedMembers: [] as { username: string; actual: number; target: number }[],
          penaltiesCreated: 0,
          penaltiesAutoAccepted: 0
        }

        // Calculate days since start
        const daysSinceStart = Math.floor((yesterdayDate.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))

        for (const member of members) {
          // Skip sick members
          if (member.is_sick_mode || sickUserIds.has(member.id)) {
            groupResult.sickMembers.push(member.username)
            continue
          }

          // Check for recovery day
          const recoveryDay = recoveryDayMap.get(member.id)
          if (recoveryDay) {
            if (recoveryDay.is_complete || recoveryDay.recovery_minutes >= RECOVERY_DAY_TARGET_MINUTES) {
              groupResult.recoveryDayMembers.push(member.username)
              continue
            }
            // Incomplete recovery day - will fall through to create penalty
          }

          // Check rest day
          if (isRestDay) {
            // Check flex rest day qualification
            if (member.has_flexible_rest_day) {
              // For now, assume flex rest day users need to work out on rest days
              // They would have qualified if they hit 2x target the day before
            } else {
              groupResult.restDayMembers.push(member.username)
              continue
            }
          }

          // Calculate target (always use sane mode for penalty evaluation)
          const dailyTarget = recoveryDay 
            ? RECOVERY_DAY_TARGET_MINUTES
            : calculateDailyTarget({
                daysSinceStart,
                weekMode: 'sane',
                restDays,
                currentDayOfWeek: dayOfWeek
              })

          // Calculate actual points
          const memberLogs = logs?.filter(l => l.user_id === member.id) || []
          let totalRecovery = 0
          let totalNonRecovery = 0

          memberLogs.forEach(log => {
            const type = exerciseTypeMap.get(log.exercise_id)
            if (type === 'recovery') {
              totalRecovery += log.points
            } else {
              totalNonRecovery += log.points
            }
          })

          // Apply recovery cap (25% of target)
          const recoveryCap = Math.round(dailyTarget * 0.25)
          const cappedRecovery = Math.min(totalRecovery, recoveryCap)
          const actualPoints = recoveryDay 
            ? (recoveryDay.recovery_minutes || 0)
            : totalNonRecovery + cappedRecovery

          // Check if met target
          if (actualPoints >= dailyTarget) {
            groupResult.completedMembers.push(member.username)
          } else {
            groupResult.failedMembers.push({
              username: member.username,
              actual: actualPoints,
              target: dailyTarget
            })

            // Create penalty if doesn't exist
            if (!existingPenaltyUserIds.has(member.id)) {
              const deadline = new Date()
              deadline.setHours(deadline.getHours() + 24)

              const { error: penaltyError } = await supabase
                .from('pending_penalties')
                .insert({
                  user_id: member.id,
                  group_id: group.id,
                  date: yesterdayStr,
                  target_points: dailyTarget,
                  actual_points: actualPoints,
                  penalty_amount: penaltyAmount,
                  status: 'pending',
                  deadline: deadline.toISOString()
                })

              if (!penaltyError) {
                groupResult.penaltiesCreated++
                console.log(`[daily-recap] Penalty created for ${member.username}`)
              }
            }
          }
        }

        // Auto-accept expired penalties
        const { data: expiredPenalties } = await supabase
          .from('pending_penalties')
          .select('*')
          .eq('group_id', group.id)
          .eq('status', 'pending')
          .lt('deadline', new Date().toISOString())

        if (expiredPenalties && expiredPenalties.length > 0) {
          for (const penalty of expiredPenalties) {
            // Create payment transaction
            await supabase.from('payment_transactions').insert({
              user_id: penalty.user_id,
              group_id: penalty.group_id,
              amount: penalty.penalty_amount,
              transaction_type: 'penalty',
              description: `Auto-accepted penalty: Missed target on ${penalty.date}`
            })

            // Update user's balance
            const { data: profile } = await supabase
              .from('profiles')
              .select('total_penalty_owed')
              .eq('id', penalty.user_id)
              .single()

            if (profile) {
              await supabase
                .from('profiles')
                .update({ total_penalty_owed: (profile.total_penalty_owed || 0) + penalty.penalty_amount })
                .eq('id', penalty.user_id)
            }

            // Update penalty status
            await supabase
              .from('pending_penalties')
              .update({ status: 'accepted' })
              .eq('id', penalty.id)

            groupResult.penaltiesAutoAccepted++
          }
        }

        // Post summary to chat
        const summaryMessage = buildSummaryMessage(groupResult, yesterdayStr)
        
        await supabase.from('chat_messages').insert({
          group_id: group.id,
          user_id: null,
          message: summaryMessage,
          message_type: 'text',
          is_system_message: true
        })

        console.log(`[daily-recap] Summary posted to ${group.name}`)
        results.push(groupResult)

      } catch (error) {
        console.error(`[daily-recap] Error processing group ${group.name}:`, error)
        results.push({
          groupId: group.id,
          groupName: group.name,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    const response = {
      message: 'Daily recap completed',
      date: yesterdayStr,
      groupsProcessed: groups.length,
      results
    }

    console.log('[daily-recap] Completed:', response)
    return NextResponse.json(response)

  } catch (error) {
    console.error('[daily-recap] Failed:', error)
    return NextResponse.json(
      {
        error: 'Daily recap failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

function buildSummaryMessage(result: any, date: string): string {
  const dateFormatted = new Date(date).toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  })

  let message = `📊 **Daily Recap - ${dateFormatted}**\n\n`

  // Completed
  if (result.completedMembers.length > 0) {
    message += `✅ **Made It** (${result.completedMembers.length})\n`
    message += result.completedMembers.map((u: string) => `• ${u}`).join('\n')
    message += '\n\n'
  }

  // Recovery Day
  if (result.recoveryDayMembers.length > 0) {
    message += `🧘 **Recovery Day**\n`
    message += result.recoveryDayMembers.map((u: string) => `• ${u}`).join('\n')
    message += '\n\n'
  }

  // Rest Day
  if (result.restDayMembers.length > 0) {
    message += `😴 **Rest Day**\n`
    message += result.restDayMembers.map((u: string) => `• ${u}`).join('\n')
    message += '\n\n'
  }

  // Sick
  if (result.sickMembers.length > 0) {
    message += `🤒 **Sick**\n`
    message += result.sickMembers.map((u: string) => `• ${u}`).join('\n')
    message += '\n\n'
  }

  // Failed (pending response)
  if (result.failedMembers.length > 0) {
    message += `⚠️ **Pending Response** (${result.failedMembers.length})\n`
    message += result.failedMembers.map((m: any) => `• ${m.username} (${m.actual}/${m.target} pts)`).join('\n')
    message += '\n\n'
  }

  // Stats
  if (result.penaltiesCreated > 0 || result.penaltiesAutoAccepted > 0) {
    message += `📌 ${result.penaltiesCreated} new penalties created`
    if (result.penaltiesAutoAccepted > 0) {
      message += `, ${result.penaltiesAutoAccepted} auto-accepted`
    }
    message += '\n'
  }

  const totalMembers = result.completedMembers.length + result.recoveryDayMembers.length + 
    result.restDayMembers.length + result.sickMembers.length + result.failedMembers.length

  const successRate = totalMembers > 0 
    ? Math.round(((result.completedMembers.length + result.recoveryDayMembers.length + 
        result.restDayMembers.length + result.sickMembers.length) / totalMembers) * 100)
    : 0

  message += `\n💪 Group success rate: ${successRate}%`

  return message
}

