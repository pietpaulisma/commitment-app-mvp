import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateDailyTarget } from '@/utils/targetCalculation'
import { SystemMessageService } from '@/services/systemMessages'
import { calculateDeadline, getYesterdayDateString } from '@/utils/penaltyHelpers'
import type { CheckPenaltiesResponse, PenaltyStats, PendingMemberInfo, DisputedMemberInfo } from '@/types/penalties'

// Initialize Supabase with service role for admin operations
const getSupabaseClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify user is group admin or supreme admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and verify admin status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, group_id, username')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!['group_admin', 'supreme_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    if (!profile.group_id) {
      return NextResponse.json({ error: 'Admin must be in a group' }, { status: 400 })
    }

    console.log(`Admin ${profile.username} triggering penalty check for group ${profile.group_id}`)

    // Get yesterday's date
    const yesterday = getYesterdayDateString()
    const yesterdayDate = new Date(yesterday)

    // Initialize stats
    const stats: PenaltyStats = {
      totalMembers: 0,
      completed: 0,
      penaltiesCreated: 0,
      pending: 0,
      disputed: 0,
      autoAccepted: 0,
      flexRestDays: 0,
      sickMode: 0,
      restDays: 0
    }

    const completedMembers: string[] = []
    const sickModeMembers: string[] = []
    const pendingMembers: PendingMemberInfo[] = []
    const disputedMembers: DisputedMemberInfo[] = []

    // Step 1: Auto-accept expired penalties from previous days
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

    // Step 2: Get all members in the group with group settings
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        week_mode,
        is_sick_mode,
        has_flexible_rest_day,
        groups!inner(
          id,
          start_date
        )
      `)
      .eq('group_id', profile.group_id)

    if (membersError) {
      throw membersError
    }

    stats.totalMembers = members?.length || 0

    // Get group settings
    const { data: groupSettings, error: settingsError } = await supabase
      .from('group_settings')
      .select('rest_days, recovery_days, penalty_amount')
      .eq('group_id', profile.group_id)
      .single()

    if (settingsError || !groupSettings) {
      return NextResponse.json(
        { error: 'Group settings not found', details: settingsError?.message },
        { status: 404 }
      )
    }

    // Parse rest_days array (stored as array in database)
    const restDays = Array.isArray(groupSettings.rest_days) ? groupSettings.rest_days : []
    const recoveryDays = Array.isArray(groupSettings.recovery_days) ? groupSettings.recovery_days : []
    const penaltyAmount = groupSettings.penalty_amount || 10

    // Step 3: Check each member
    for (const member of members || []) {
      try {
        const group = member.groups

        // Skip if sick mode
        if (member.is_sick_mode) {
          stats.sickMode++
          sickModeMembers.push(member.username)
          console.log(`${member.username}: Sick mode - skipped`)
          continue
        }

        // Check if yesterday was a rest day
        const dayOfWeek = yesterdayDate.getDay()
        const isRestDay = restDays.includes(dayOfWeek)

        if (isRestDay) {
          // Check for Flex Rest Day qualification
          if (member.has_flexible_rest_day) {
            // Get day before rest day
            const dayBeforeRestDay = new Date(yesterdayDate)
            dayBeforeRestDay.setDate(dayBeforeRestDay.getDate() - 1)
            const dayBeforeStr = dayBeforeRestDay.toISOString().split('T')[0]

            // Get points from day before
            const { data: prevDayLogs } = await supabase
              .from('logs')
              .select('points')
              .eq('user_id', member.id)
              .eq('date', dayBeforeStr)

            const prevDayPoints = prevDayLogs?.reduce((sum, log) => sum + log.points, 0) || 0

            // Calculate target for day before
            const groupStartDate = new Date(group.start_date)
            const daysSinceStart = Math.floor((dayBeforeRestDay.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))
            const dayOfWeekForTarget = dayBeforeRestDay.getDay()

            const prevDayTarget = calculateDailyTarget({
              daysSinceStart,
              weekMode: member.week_mode || 'sane',
              restDays,
              recoveryDays,
              currentDayOfWeek: dayOfWeekForTarget
            })

            // Check if qualified for flex rest day
            if (prevDayPoints >= (prevDayTarget * 2)) {
              stats.flexRestDays++
              completedMembers.push(member.username)
              console.log(`${member.username}: Flex Rest Day earned (${prevDayPoints} pts, needed ${prevDayTarget * 2})`)
              continue
            }
          }

          // Regular rest day
          stats.restDays++
          completedMembers.push(member.username)
          console.log(`${member.username}: Rest day - skipped`)
          continue
        }

        // Get yesterday's workout logs
        const { data: logs } = await supabase
          .from('logs')
          .select('points, exercise_id')
          .eq('user_id', member.id)
          .eq('date', yesterday)

        // Calculate points with recovery cap
        let totalRecoveryPoints = 0
        let totalNonRecoveryPoints = 0

        const recoveryExercises = [
          'recovery_meditation', 'recovery_stretching', 'recovery_blackrolling', 'recovery_yoga',
          'meditation', 'stretching', 'yoga', 'foam rolling', 'blackrolling'
        ]

        logs?.forEach(log => {
          if (recoveryExercises.includes(log.exercise_id)) {
            totalRecoveryPoints += log.points
          } else {
            totalNonRecoveryPoints += log.points
          }
        })

        // Calculate daily target
        const groupStartDate = new Date(group.start_date)
        const daysSinceStart = Math.floor((yesterdayDate.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))
        const dayOfWeekForTarget = yesterdayDate.getDay()

        const dailyTarget = calculateDailyTarget({
          daysSinceStart,
          weekMode: member.week_mode || 'sane',
          restDays,
          recoveryDays,
          currentDayOfWeek: dayOfWeekForTarget
        })

        // Apply recovery cap
        const recoveryCapLimit = Math.round(dailyTarget * 0.25)
        const cappedRecoveryPoints = Math.min(totalRecoveryPoints, recoveryCapLimit)
        const actualPoints = totalNonRecoveryPoints + cappedRecoveryPoints

        // Check if target was met
        if (actualPoints >= dailyTarget) {
          stats.completed++
          completedMembers.push(member.username)
          console.log(`${member.username}: Target met (${actualPoints}/${dailyTarget})`)
        } else {
          // Check if penalty already exists for this date
          const { data: existingPenalty } = await supabase
            .from('pending_penalties')
            .select('id, status')
            .eq('user_id', member.id)
            .eq('date', yesterday)
            .single()

          if (existingPenalty) {
            // Penalty already exists, check status
            if (existingPenalty.status === 'disputed') {
              stats.disputed++
              // Will be added to disputedMembers list below
            } else if (existingPenalty.status === 'pending') {
              stats.pending++
              // Will be added to pendingMembers list below
            }
            console.log(`${member.username}: Penalty already exists (${existingPenalty.status})`)
          } else {
            // Create new pending penalty
            const deadline = calculateDeadline()

            const { data: newPenalty, error: penaltyError } = await supabase
              .from('pending_penalties')
              .insert({
                user_id: member.id,
                group_id: profile.group_id,
                date: yesterday,
                target_points: dailyTarget,
                actual_points: actualPoints,
                penalty_amount: penaltyAmount,
                status: 'pending',
                deadline
              })
              .select()
              .single()

            if (penaltyError) {
              console.error(`Error creating penalty for ${member.username}:`, penaltyError)
            } else {
              stats.penaltiesCreated++
              stats.pending++
              console.log(`${member.username}: Penalty created (${actualPoints}/${dailyTarget})`)
            }
          }
        }
      } catch (error) {
        console.error(`Error processing member ${member.username}:`, error)
      }
    }

    // Step 4: Get current pending and disputed penalties for response
    const { data: currentPending } = await supabase
      .from('pending_penalties')
      .select(`
        id,
        user_id,
        target_points,
        actual_points,
        deadline,
        profiles!inner(username)
      `)
      .eq('group_id', profile.group_id)
      .eq('status', 'pending')

    // Deduplicate by user_id - keep the most recent penalty per user
    const pendingByUser = new Map<string, any>()
    if (currentPending) {
      currentPending.forEach(p => {
        const deadlineDate = new Date(p.deadline)
        const now = new Date()
        const hoursRemaining = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)

        // Only keep if not already in map or this one is more recent
        if (!pendingByUser.has(p.user_id) || new Date(p.deadline) > new Date(pendingByUser.get(p.user_id).deadline)) {
          pendingByUser.set(p.user_id, {
            username: (p.profiles as any).username,
            userId: p.user_id,
            actual: p.actual_points,
            target: p.target_points,
            hours_remaining: Math.max(0, hoursRemaining),
            penaltyId: p.id
          })
        }
      })
      pendingMembers.push(...Array.from(pendingByUser.values()))
    }

    const { data: currentDisputed } = await supabase
      .from('pending_penalties')
      .select(`
        id,
        user_id,
        reason_category,
        reason_message,
        profiles!inner(username)
      `)
      .eq('group_id', profile.group_id)
      .eq('status', 'disputed')

    if (currentDisputed) {
      currentDisputed.forEach(p => {
        disputedMembers.push({
          username: (p.profiles as any).username,
          userId: p.user_id,
          reason_category: p.reason_category as any,
          reason_message: p.reason_message || '',
          penaltyId: p.id
        })
      })
    }

    // Step 5: Generate and post daily summary
    let summaryMessageId = ''
    try {
      // Build summary message
      let summaryContent = `📊 **Last Night's Recap** (${new Date(yesterday).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})\n\n`

      // Show who succeeded
      if (stats.completed > 0) {
        summaryContent += `✅ **Made It** (${stats.completed}/${stats.totalMembers}):\n`
        summaryContent += completedMembers.join(', ')
        summaryContent += '\n\n'
      }

      // Show sick mode members separately
      if (stats.sickMode > 0) {
        summaryContent += `🤒 **Sick Mode** (${stats.sickMode}):\n`
        summaryContent += sickModeMembers.join(', ')
        summaryContent += '\n\n'
      }

      // Show pending responses (not failed yet - have 24h to respond)
      if (stats.pending > 0) {
        summaryContent += `⏳ **Pending Response** (${stats.pending}):\n`
        pendingMembers.forEach(m => {
          summaryContent += `• ${m.username} (${m.actual}/${m.target} pts)\n`
        })
        summaryContent += '\n'
      }

      // Show who actually failed (disputed with reason or auto-accepted = didn't respond)
      const actuallyFailedCount = stats.disputed + stats.autoAccepted
      if (actuallyFailedCount > 0) {
        summaryContent += `❌ **Failed** (${actuallyFailedCount}):\n`

        if (stats.disputed > 0) {
          disputedMembers.forEach(m => {
            summaryContent += `• ${m.username} (${m.reason_category})\n`
          })
        }

        if (stats.autoAccepted > 0) {
          summaryContent += `• ${stats.autoAccepted} ${stats.autoAccepted === 1 ? 'member' : 'members'} auto-accepted (no response)\n`
        }

        summaryContent += '\n'
      }

      // Post to chat using system message
      const systemMessage = await supabase.rpc('insert_system_message_to_chat', {
        p_group_id: profile.group_id,
        p_message_type: 'daily_summary',
        p_rarity: 'common',
        p_title: `Daily Recap - ${new Date(yesterday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        p_content: summaryContent,
        p_metadata: {
          date: yesterday,
          stats,
          generated_by: 'admin_check'
        },
        p_sender_name: 'System'
      })

      summaryMessageId = systemMessage || ''
      console.log('Daily summary posted to chat:', summaryMessageId)
    } catch (error) {
      console.error('Error posting daily summary:', error)
    }

    // Step 6: Return response
    const response: CheckPenaltiesResponse = {
      success: true,
      stats,
      summaryMessageId,
      pendingPenalties: pendingMembers,
      disputedPenalties: disputedMembers,
      recapData: {
        date: yesterday,
        stats: {
          total: stats.totalMembers,
          completed: stats.completed,
          pending: stats.pending,
          disputed: stats.disputed,
          autoAccepted: stats.autoAccepted
        },
        completedMembers,
        pendingMembers,
        disputedMembers,
        groupStreak: 0, // Will be filled from group data
        totalPot: 0 // Will be filled from pot data
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in check-all-penalties:', error)

    let details = 'Unknown error'
    if (error instanceof Error) {
      details = error.message
      if (error.stack) {
        console.error('Stack trace:', error.stack)
      }
    } else if (typeof error === 'object' && error !== null) {
      details = JSON.stringify(error)
    } else {
      details = String(error)
    }

    return NextResponse.json(
      {
        error: 'Failed to check penalties',
        details
      },
      { status: 500 }
    )
  }
}
