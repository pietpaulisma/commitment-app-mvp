import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateDailyTarget, getDaysSinceStart } from '@/utils/targetCalculation'

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request from Vercel
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting daily penalty check...')

    // Get yesterday's date (the day we're checking penalties for)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayString = yesterday.toISOString().split('T')[0]

    console.log(`Checking penalties for date: ${yesterdayString}`)

    // Get all active users with their groups
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        group_id,
        last_penalty_check,
        total_penalty_owed,
        groups!inner (
          id,
          start_date
        )
      `)
      .not('group_id', 'is', null)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    console.log(`Found ${users.length} users to check`)

    let processedUsers = 0
    let penaltiesIssued = 0
    let errors: string[] = []

    for (const user of users) {
      try {
        // Skip if we already checked this user for yesterday
        if (user.last_penalty_check === yesterdayString) {
          console.log(`Already checked user ${user.id} for ${yesterdayString}`)
          continue
        }

        // Get group settings for this user
        const { data: groupSettings } = await supabaseAdmin
          .from('group_settings')
          .select('rest_days, recovery_days')
          .eq('group_id', user.group_id)
          .single()

        const restDays = groupSettings?.rest_days || [1] // Default Monday
        const recoveryDays = groupSettings?.recovery_days || [5] // Default Friday

        // Check if yesterday was a rest day (skip penalty on rest days)
        const yesterdayDayOfWeek = yesterday.getDay()
        if (restDays.includes(yesterdayDayOfWeek)) {
          console.log(`Skipping user ${user.id} - yesterday was a rest day`)
          // Update last_penalty_check even for rest days to avoid re-processing
          await supabaseAdmin
            .from('profiles')
            .update({ last_penalty_check: yesterdayString })
            .eq('id', user.id)
          
          processedUsers++
          continue
        }

        // Calculate target for yesterday
        const daysSinceStart = getDaysSinceStart(user.groups.start_date)
        const yesterdayTarget = calculateDailyTarget({
          daysSinceStart: daysSinceStart - 1, // -1 because we're checking yesterday
          weekMode: 'sane', // For penalty purposes, use sane target as minimum
          restDays,
          recoveryDays,
          currentDayOfWeek: yesterdayDayOfWeek
        })

        // Get user's actual points for yesterday
        const { data: yesterdayLogs } = await supabaseAdmin
          .from('logs')
          .select('points')
          .eq('user_id', user.id)
          .eq('date', yesterdayString)

        const totalPoints = yesterdayLogs?.reduce((sum, log) => sum + log.points, 0) || 0

        console.log(`User ${user.id}: target=${yesterdayTarget}, actual=${totalPoints}`)

        // Issue penalty if target not met
        if (totalPoints < yesterdayTarget) {
          const penaltyAmount = 10.00 // €10 penalty

          // Insert penalty log
          const { error: logError } = await supabaseAdmin
            .from('penalty_logs')
            .insert({
              user_id: user.id,
              group_id: user.group_id,
              penalty_date: yesterdayString,
              amount: penaltyAmount,
              reason: 'Missed daily target',
              target_points: yesterdayTarget,
              actual_points: totalPoints
            })

          if (logError) {
            console.error(`Error inserting penalty log for user ${user.id}:`, logError)
            errors.push(`Failed to log penalty for user ${user.id}`)
          } else {
            // Update user's total penalty debt
            const newTotal = (user.total_penalty_owed || 0) + penaltyAmount
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({ 
                total_penalty_owed: newTotal,
                last_penalty_check: yesterdayString
              })
              .eq('id', user.id)

            if (updateError) {
              console.error(`Error updating penalty total for user ${user.id}:`, updateError)
              errors.push(`Failed to update penalty total for user ${user.id}`)
            } else {
              console.log(`Penalty issued to user ${user.id}: €${penaltyAmount} (total: €${newTotal})`)
              penaltiesIssued++
            }
          }
        } else {
          console.log(`User ${user.id} met target - no penalty`)
          // Update last_penalty_check to avoid re-processing
          await supabaseAdmin
            .from('profiles')
            .update({ last_penalty_check: yesterdayString })
            .eq('id', user.id)
        }

        processedUsers++

      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError)
        errors.push(`Error processing user ${user.id}: ${userError}`)
      }
    }

    const result = {
      date: yesterdayString,
      processedUsers,
      penaltiesIssued,
      totalPenaltyAmount: penaltiesIssued * 10,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }

    console.log('Daily penalty check completed:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Daily penalty check failed:', error)
    return NextResponse.json({ 
      error: 'Daily penalty check failed', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}