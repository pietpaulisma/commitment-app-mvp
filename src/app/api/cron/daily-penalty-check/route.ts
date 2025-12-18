import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateDailyTarget } from '@/utils/targetCalculation'

// Initialize Supabase with service role for admin operations
// Note: This will be properly initialized at runtime when environment variables are available
const getSupabaseClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (!authHeader || authHeader !== expectedAuth) {
      console.log('Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting daily penalty check...')

    // Initialize Supabase client at runtime
    const supabase = getSupabaseClient()

    // Get all active users (users in groups)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        email,
        group_id,
        week_mode,
        is_sick_mode,
        flex_rest_day_enabled,
        total_penalty_owed,
        last_penalty_check,
        groups!inner(
          id,
          penalty_amount,
          start_date,
          rest_day_1,
          rest_day_2
        )
      `)
      .not('group_id', 'is', null)

    if (profilesError) {
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      console.log('No active users found')
      return NextResponse.json({ message: 'No active users to check' })
    }

    console.log(`Checking ${profiles.length} users for penalties...`)

    // Calculate yesterday's date (the day we're checking penalties for)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const yesterdayStr = yesterday.toISOString().split('T')[0]

    let totalPenaltiesIssued = 0
    const penaltyResults = []

    for (const profile of profiles) {
      try {
        // Skip if we've already checked this user today
        if (profile.last_penalty_check === yesterdayStr) {
          console.log(`Already checked ${profile.username} for ${yesterdayStr}`)
          continue
        }

        // Skip if user is in sick mode
        if (profile.is_sick_mode) {
          console.log(`${profile.username}: Skipping penalty - sick mode enabled`)

          // Log this sick day in the database for historical tracking
          const { error: sickLogError } = await supabase
            .from('sick_mode')
            .upsert(
              { user_id: profile.id, date: yesterdayStr },
              { onConflict: 'user_id, date' }
            )

          if (sickLogError) {
            console.error(`Error logging sick day for ${profile.username}:`, sickLogError)
          }

          // Update last penalty check without issuing penalty
          await supabase
            .from('profiles')
            .update({ last_penalty_check: yesterdayStr })
            .eq('id', profile.id)

          continue
        }

        // Check if yesterday was a rest day
        const dayOfWeek = yesterday.getDay() // 0 = Sunday, 1 = Monday, etc.
        const group = Array.isArray(profile.groups) ? profile.groups[0] : profile.groups
        const isRestDay = dayOfWeek === group.rest_day_1 || dayOfWeek === group.rest_day_2

        if (isRestDay) {
          // Check if user qualifies for Flex Rest Day
          if (profile.flex_rest_day_enabled) {
            // Get the day before rest day (e.g., Monday if Tuesday is rest day)
            const dayBeforeRestDay = new Date(yesterday)
            dayBeforeRestDay.setDate(dayBeforeRestDay.getDate() - 1)
            const dayBeforeRestDayStr = dayBeforeRestDay.toISOString().split('T')[0]

            // Get points from the day before rest day
            const { data: previousDayLogs } = await supabase
              .from('workout_logs')
              .select('points')
              .eq('user_id', profile.id)
              .eq('date', dayBeforeRestDayStr)

            const previousDayPoints = previousDayLogs?.reduce((sum, log) => sum + log.points, 0) || 0

            // Calculate target for the day before rest day
            const groupStartDate = new Date(group.start_date)
            const daysSinceStart = Math.floor((dayBeforeRestDay.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))
            const dayOfWeekForTarget = dayBeforeRestDay.getDay()

            const previousDayTarget = calculateDailyTarget({
              daysSinceStart,
              weekMode: profile.week_mode || 'sane',
              restDays: [group.rest_day_1, group.rest_day_2].filter(day => day !== null),
              recoveryDays: [5],
              currentDayOfWeek: dayOfWeekForTarget
            })

            // Check if user earned 2x the target
            const flexRestDayQualified = previousDayPoints >= (previousDayTarget * 2)

            if (flexRestDayQualified) {
              console.log(`${profile.username}: Flex Rest Day activated! (${previousDayPoints} points earned, ${previousDayTarget * 2} needed)`)

              // Send notification about Flex Rest Day activation
              // TODO: Add push notification here

              // Update last penalty check without issuing penalty
              await supabase
                .from('profiles')
                .update({ last_penalty_check: yesterdayStr })
                .eq('id', profile.id)

              continue
            } else {
              console.log(`${profile.username}: Flex Rest Day not qualified (${previousDayPoints} points, needed ${previousDayTarget * 2})`)
              // Fall through to check if regular rest day applies
            }
          }

          console.log(`${profile.username}: Skipping penalty - rest day`)

          // Update last penalty check without issuing penalty
          await supabase
            .from('profiles')
            .update({ last_penalty_check: yesterdayStr })
            .eq('id', profile.id)

          continue
        }

        // Get user's workout logs for yesterday
        const { data: yesterdayLogs, error: logsError } = await supabase
          .from('workout_logs')
          .select('points, exercise_id')
          .eq('user_id', profile.id)
          .eq('date', yesterdayStr)

        if (logsError) {
          console.error(`Error fetching logs for ${profile.username}:`, logsError)
          continue
        }

        // Calculate actual points earned (with recovery cap applied)
        let totalRecoveryPoints = 0
        let totalNonRecoveryPoints = 0

        const recoveryExercises = [
          'recovery_meditation', 'recovery_stretching', 'recovery_blackrolling', 'recovery_yoga',
          'meditation', 'stretching', 'yoga', 'foam rolling', 'blackrolling'
        ]

        yesterdayLogs?.forEach(log => {
          if (recoveryExercises.includes(log.exercise_id.toLowerCase())) {
            totalRecoveryPoints += log.points
          } else {
            totalNonRecoveryPoints += log.points
          }
        })

        // Calculate daily target for this user
        const groupStartDate = new Date(group.start_date)
        const daysSinceStart = Math.floor((yesterday.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))
        const dayOfWeekForTarget = yesterday.getDay()

        const dailyTarget = calculateDailyTarget({
          daysSinceStart,
          weekMode: profile.week_mode || 'sane',
          restDays: [group.rest_day_1, group.rest_day_2].filter(day => day !== null),
          recoveryDays: [5], // Default Friday
          currentDayOfWeek: dayOfWeekForTarget
        })

        // Apply recovery cap (25% of daily target)
        const recoveryCapLimit = Math.round(dailyTarget * 0.25)
        const cappedRecoveryPoints = Math.min(totalRecoveryPoints, recoveryCapLimit)

        // Check if user failed to meet target (using capped recovery points)
        const actualPoints = totalNonRecoveryPoints + cappedRecoveryPoints
        const missedTarget = actualPoints < dailyTarget

        console.log(`${profile.username}: Target=${dailyTarget}, Actual=${actualPoints}, Missed=${missedTarget}`)

        if (missedTarget) {
          // Issue penalty
          const penaltyAmount = group.penalty_amount || 10

          // Insert penalty transaction
          const { error: transactionError } = await supabase
            .from('payment_transactions')
            .insert({
              user_id: profile.id,
              group_id: profile.group_id,
              amount: penaltyAmount,
              transaction_type: 'penalty',
              description: `Automatic penalty: Missed daily target (${actualPoints}/${dailyTarget} points)`
            })

          if (transactionError) {
            console.error(`Error inserting penalty for ${profile.username}:`, transactionError)
            continue
          }

          // Update user's total penalty owed
          const newTotalOwed = (profile.total_penalty_owed || 0) + penaltyAmount

          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              total_penalty_owed: newTotalOwed,
              last_penalty_check: yesterdayStr
            })
            .eq('id', profile.id)

          if (updateError) {
            console.error(`Error updating penalty total for ${profile.username}:`, updateError)
            continue
          }

          totalPenaltiesIssued++
          penaltyResults.push({
            username: profile.username,
            penaltyAmount,
            target: dailyTarget,
            actual: actualPoints,
            newTotal: newTotalOwed
          })

          console.log(`${profile.username}: Penalty issued €${penaltyAmount} (Total: €${newTotalOwed})`)
        } else {
          // No penalty needed, just update last check date
          await supabase
            .from('profiles')
            .update({ last_penalty_check: yesterdayStr })
            .eq('id', profile.id)

          console.log(`${profile.username}: No penalty - target met`)
        }

      } catch (error) {
        console.error(`Error processing ${profile.username}:`, error)
        continue
      }
    }

    const result = {
      message: 'Daily penalty check completed',
      date: yesterdayStr,
      usersChecked: profiles.length,
      penaltiesIssued: totalPenaltiesIssued,
      penalties: penaltyResults
    }

    console.log('Penalty check result:', result)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Daily penalty check failed:', error)
    return NextResponse.json(
      {
        error: 'Daily penalty check failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}