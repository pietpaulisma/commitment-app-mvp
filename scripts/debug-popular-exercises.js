#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function debugPopularExercises() {
    console.log('🔍 Debugging popular exercises query...\n')

    try {
        // Get all group members
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, group_id')
            .limit(5)

        if (!profiles || profiles.length === 0) {
            console.log('❌ No profiles found')
            return
        }

        const profile = profiles[0]
        console.log('👤 Using profile:', profile.username, 'Group ID:', profile.group_id)

        // Get all group members
        const { data: members } = await supabase
            .from('profiles')
            .select('id')
            .eq('group_id', profile.group_id)

        console.log('👥 Group has', members?.length, 'members')

        if (!members || members.length === 0) {
            console.log('❌ No group members found')
            return
        }

        const memberIds = members.map(m => m.id)
        console.log('📋 Member IDs:', memberIds.join(', '))

        // Get start of current week (Monday) - using LOCAL date not UTC
        const now = new Date()
        const day = now.getDay()
        const diff = day === 0 ? -6 : 1 - day // Days to get to Monday
        const monday = new Date(now)
        monday.setDate(now.getDate() + diff)
        monday.setHours(0, 0, 0, 0)
        // Use local date format to avoid UTC conversion shifting the date
        const year = monday.getFullYear()
        const month = String(monday.getMonth() + 1).padStart(2, '0')
        const dayOfMonth = String(monday.getDate()).padStart(2, '0')
        const mondayStr = `${year}-${month}-${dayOfMonth}` // Format: YYYY-MM-DD

        console.log('\n📅 Today:', now.toISOString().split('T')[0])
        console.log('📅 Monday (week start):', mondayStr)

        // Get logs for this week with sport_name
        const { data: weekLogs, error: logsError } = await supabase
            .from('logs')
            .select('exercise_id, points, sport_name, date, exercises(name, type)')
            .in('user_id', memberIds)
            .gte('date', mondayStr)

        console.log('\n📊 This week query results:')
        console.log('   - Total logs found this week:', weekLogs?.length || 0)

        // Also check last week
        const lastMonday = new Date(monday)
        lastMonday.setDate(monday.getDate() - 7)
        const lastMondayStr = `${lastMonday.getFullYear()}-${String(lastMonday.getMonth() + 1).padStart(2, '0')}-${String(lastMonday.getDate()).padStart(2, '0')}`

        console.log('📅 Last Monday:', lastMondayStr)

        const { data: lastWeekLogs } = await supabase
            .from('logs')
            .select('exercise_id, points, sport_name, date, exercises(name, type)')
            .in('user_id', memberIds)
            .gte('date', lastMondayStr)
            .lt('date', mondayStr)

        console.log('   - Total logs found last week:', lastWeekLogs?.length || 0)

        // Check ALL logs for today (any user)
        const todayStr = now.toISOString().split('T')[0]
        const { data: todayLogs } = await supabase
            .from('logs')
            .select('*, exercises(name, type), profiles(username)')
            .eq('date', todayStr)

        console.log('\n📊 ALL logs for TODAY (' + todayStr + '):')
        console.log('   - Total logs found:', todayLogs?.length || 0)
        if (todayLogs && todayLogs.length > 0) {
            console.log('\n   Breakdown by user:')
            todayLogs.forEach(log => {
                console.log(`   - ${log.profiles?.username}: ${log.exercises?.name} (${log.sport_name || 'N/A'}), ${log.points} pts at ${log.created_at}`)
            })
        }

        // Check the most recent logs from ALL dates (without joins to avoid schema cache issues)
        const { data: recentLogs, error: recentError } = await supabase
            .from('logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10)

        console.log('\n📊 10 MOST RECENT logs (all dates):')
        if (recentError) {
            console.log('   ❌ Error fetching recent logs:', recentError.message)
        } else if (recentLogs && recentLogs.length > 0) {
            recentLogs.forEach((log, i) => {
                console.log(`   ${i + 1}. User: ${log.user_id.substring(0, 8)}..., Exercise: ${log.exercise_id}, Sport: ${log.sport_name || 'N/A'}, ${log.points} pts`)
                console.log(`      Date: ${log.date}, Created: ${log.created_at}`)
            })
        } else {
            console.log('   ⚠️  No logs found in logs table at all!')
        }

        // Check workout_logs table instead
        const { data: workoutLogs, error: workoutError } = await supabase
            .from('workout_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10)

        console.log('\n📊 10 MOST RECENT workout_logs (checking alternate table):')
        if (workoutError) {
            console.log('   ❌ Error:', workoutError.message)
        } else if (workoutLogs && workoutLogs.length > 0) {
            workoutLogs.forEach((log, i) => {
                console.log(`   ${i + 1}. User: ${log.user_id.substring(0, 8)}..., Exercise: ${log.exercise_id}, Sport: ${log.sport_name || 'N/A'}, ${log.points} pts`)
                console.log(`      Date: ${log.date}, Created: ${log.created_at}`)
            })
        } else {
            console.log('   ⚠️  No logs in workout_logs either')
        }

        console.log('\n📊 Query results:')
        console.log('   - Total logs found:', weekLogs?.length || 0)

        if (logsError) {
            console.error('❌ Query error:', logsError)
            return
        }

        if (weekLogs && weekLogs.length > 0) {
            console.log('\n📝 Sample logs (first 5):')
            weekLogs.slice(0, 5).forEach((log, i) => {
                console.log(`   ${i + 1}. Exercise: ${log.exercises?.name}, Sport: ${log.sport_name || 'N/A'}, Points: ${log.points}, Date: ${log.date}`)
            })

            // Sum points per exercise (group sports by sport_name)
            const exerciseCount = new Map()
            weekLogs.forEach(log => {
                // Use sport_name if available, otherwise use exercise name
                const displayName = log.sport_name || log.exercises?.name || 'Unknown'

                // For sports, group by sport_name to aggregate all intensities
                const isSport = log.exercises?.type === 'sport' || log.sport_name
                const groupKey = isSport && log.sport_name ? `sport:${log.sport_name}` : log.exercise_id

                const current = exerciseCount.get(groupKey)
                if (current) {
                    current.count += log.points
                } else {
                    exerciseCount.set(groupKey, { name: displayName, count: log.points })
                }
            })

            // Get top 5 exercises sorted by total points
            const topExercises = Array.from(exerciseCount.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)

            console.log('\n🏆 Top 5 Exercises:')
            topExercises.forEach((ex, i) => {
                console.log(`   ${i + 1}. ${ex.name}: ${ex.count} points`)
            })

            console.log('\n✅ Debug complete - data is being processed correctly')
        } else {
            console.log('\n⚠️  No logs found for this week')
            console.log('   This means either:')
            console.log('   1. No workouts have been logged since Monday')
            console.log('   2. The date range calculation is incorrect')
            console.log('   3. There are no members in this group')
        }

    } catch (error) {
        console.error('❌ Error:', error.message)
    }
}

debugPopularExercises()
