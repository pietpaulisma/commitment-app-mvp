import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calculateDailyTarget, getDaysSinceStart } from '@/utils/targetCalculation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create a Supabase client with service role key to bypass RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const today = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
    }

    // Get all users in the group
    const { data: groupUsers, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, personal_color, custom_icon')
      .eq('group_id', groupId)

    if (usersError) {
      console.error('Error fetching group users:', usersError)
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    if (!groupUsers || groupUsers.length === 0) {
      return NextResponse.json({ squad: [] })
    }

    // Debug: Check what dates exist in logs table
    const { data: recentLogs } = await supabaseAdmin
      .from('logs')
      .select('date, user_id, points')
      .in('user_id', groupUsers.map(u => u.id))
      .order('date', { ascending: false })
      .limit(20)

    const uniqueDates = [...new Set(recentLogs?.map(l => l.date) || [])]
    console.log('API - Recent log dates in DB:', uniqueDates.slice(0, 5))
    console.log('API - Looking for date:', today)

    // Fetch exercises to identify recovery types (manual join to be safe)
    const { data: exercisesData, error: exercisesError } = await supabaseAdmin
      .from('exercises')
      .select('id, type')

    if (exercisesError) {
      console.error('Error fetching exercises:', exercisesError)
    }

    const exerciseTypeMap = new Map(exercisesData?.map(e => [e.id, e.type]) || [])

    // Fetch logs for today to calculate points
    const { data: todayLogs, error: logsError } = await supabaseAdmin
      .from('logs')
      .select('user_id, points, exercise_id')
      .eq('date', today)
      .in('user_id', groupUsers.map(u => u.id))

    if (logsError) {
      console.error('Error fetching logs:', logsError)
      return NextResponse.json({ error: logsError.message }, { status: 500 })
    }

    console.log('API - Group users:', groupUsers.length)
    console.log('API - Logs found for', today, ':', todayLogs?.length || 0)

    // Get group settings for recovery day logic
    const { data: groupSettings } = await supabaseAdmin
      .from('group_settings')
      .select('rest_days, recovery_days')
      .eq('group_id', groupId)
      .maybeSingle()

    const restDays = groupSettings?.rest_days || [1]
    const recoveryDays = groupSettings?.recovery_days || [5]

    // Check if today (requested date) is a recovery day
    // We must use the requested date 'today' to determine the day of week, not server time
    const todayDateObj = new Date(today)
    const currentDayOfWeek = todayDateObj.getDay()
    const isRecoveryDay = recoveryDays.includes(currentDayOfWeek)

    // Get group start date for target calculation
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('start_date')
      .eq('id', groupId)
      .single()

    const daysSinceStart = group?.start_date ? getDaysSinceStart(group.start_date) : 1

    // Calculate daily target (base calculation)
    const dailyTarget = calculateDailyTarget({
      daysSinceStart,
      weekMode: 'insane',
      restDays,
      recoveryDays,
      currentDayOfWeek // Pass the correct day of week
    })

    // Process logs with recovery capping (same logic as RectangularDashboard)
    const memberPointsMap = new Map()
    todayLogs?.forEach(log => {
      if (!memberPointsMap.has(log.user_id)) {
        memberPointsMap.set(log.user_id, { regular: 0, recovery: 0 })
      }

      const current = memberPointsMap.get(log.user_id)
      const type = exerciseTypeMap.get(log.exercise_id)

      if (type === 'recovery') {
        current.recovery += log.points
      } else {
        current.regular += log.points
      }
    })

    // Apply recovery capping for each member
    const pointsByUser = new Map<string, number>()
    groupUsers.forEach(u => {
      if (memberPointsMap.has(u.id)) {
        const { regular, recovery } = memberPointsMap.get(u.id)
        let effectiveRecovery = recovery

        if (!isRecoveryDay && recovery > 0) {
          const maxRecoveryAllowed = Math.floor(dailyTarget * 0.25)
          effectiveRecovery = Math.min(recovery, maxRecoveryAllowed)
        }

        pointsByUser.set(u.id, regular + effectiveRecovery)
      } else {
        pointsByUser.set(u.id, 0)
      }
    })

    console.log('API - Users with points today:', pointsByUser.size)

    // Get profiles with week_mode and sick_mode to calculate targets
    const { data: profilesWithMode } = await supabaseAdmin
      .from('profiles')
      .select('id, week_mode, is_sick_mode')
      .in('id', groupUsers.map(u => u.id))

    // Map users to squad data with proper individual targets
    const squad = groupUsers.map(u => {
      const points = pointsByUser.get(u.id) || 0
      const profileMode = profilesWithMode?.find(p => p.id === u.id)
      const memberWeekMode = profileMode?.week_mode as 'sane' | 'insane' | null
      const isSickMode = profileMode?.is_sick_mode || false

      // Calculate individual daily target using same logic as RectangularDashboard
      const memberDailyTarget = calculateDailyTarget({
        daysSinceStart,
        weekMode: memberWeekMode || 'insane', // Default to insane if null
        restDays,
        recoveryDays,
        currentDayOfWeek
      })

      const pct = Math.round((points / memberDailyTarget) * 100)

      return {
        id: u.id,
        username: u.username,
        personal_color: u.personal_color,
        custom_icon: u.custom_icon,
        target: memberDailyTarget,
        points,
        pct,
        is_complete: pct >= 100,
        is_sick_mode: isSickMode,
        week_mode: memberWeekMode || 'insane'
      }
    })

    return NextResponse.json({ squad, date: today })
  } catch (error) {
    console.error('Error in squad-status API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
