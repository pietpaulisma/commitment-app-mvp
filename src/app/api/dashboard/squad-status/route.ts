import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calculateDailyTarget, getDaysSinceStart, RECOVERY_DAY_TARGET_MINUTES } from '@/utils/targetCalculation'

// Create a Supabase client at runtime to avoid build-time errors
const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
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

    // Get profiles with week_mode, sick_mode, and flexible rest day status to calculate targets
    const { data: profilesWithMode } = await supabaseAdmin
      .from('profiles')
      .select('id, week_mode, is_sick_mode, has_flexible_rest_day')
      .in('id', groupUsers.map(u => u.id))

    // Get active recovery days for all users in the group for today
    const { data: activeRecoveryDays } = await supabaseAdmin
      .from('user_recovery_days')
      .select('user_id, is_complete, recovery_minutes')
      .in('user_id', groupUsers.map(u => u.id))
      .eq('used_date', today)

    // Create a map of user_id -> recovery day info
    const recoveryDayMap = new Map(activeRecoveryDays?.map(rd => [rd.user_id, rd]) || [])

    // Check if today is a rest day
    const isRestDay = restDays.includes(currentDayOfWeek)

    // Map users to squad data with proper individual targets
    const squad = groupUsers.map(u => {
      const points = pointsByUser.get(u.id) || 0
      const profileMode = profilesWithMode?.find(p => p.id === u.id)
      const memberWeekMode = profileMode?.week_mode as 'sane' | 'insane' | null
      const isSickMode = profileMode?.is_sick_mode || false
      const hasFlexibleRestDay = profileMode?.has_flexible_rest_day || false
      
      // Check if user has an active recovery day for today
      const userRecoveryDay = recoveryDayMap.get(u.id)
      const isUserRecoveryDay = !!userRecoveryDay

      // If user has activated their recovery day, use the recovery day target (15 min)
      // Otherwise, calculate the regular daily target
      const memberDailyTarget = isUserRecoveryDay
        ? RECOVERY_DAY_TARGET_MINUTES
        : calculateDailyTarget({
            daysSinceStart,
            weekMode: memberWeekMode || 'insane', // Default to insane if null
            restDays,
            recoveryDays,
            currentDayOfWeek
          })

      // For recovery day users, points are the recovery minutes logged
      const effectivePoints = isUserRecoveryDay 
        ? (userRecoveryDay?.recovery_minutes || 0)
        : points
      
      const pct = Math.round((effectivePoints / memberDailyTarget) * 100)

      return {
        id: u.id,
        username: u.username,
        personal_color: u.personal_color,
        custom_icon: u.custom_icon,
        target: memberDailyTarget,
        points: effectivePoints,
        pct,
        is_complete: pct >= 100,
        is_sick_mode: isSickMode,
        week_mode: memberWeekMode || 'insane',
        is_recovery_day: isUserRecoveryDay,
        has_flexible_rest_day: hasFlexibleRestDay,
        is_rest_day: isRestDay
      }
    })

    return NextResponse.json({ squad, date: today })
  } catch (error) {
    console.error('Error in squad-status API:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { message: errorMessage, stack: errorStack })
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage
    }, { status: 500 })
  }
}
