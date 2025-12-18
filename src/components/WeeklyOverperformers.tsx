'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { Flame } from 'lucide-react'
import { GlassCard } from '@/components/dashboard/v2/GlassCard'
import { CardHeader } from '@/components/dashboard/v2/CardHeader'
import { calculateDailyTarget, getDaysSinceStart } from '@/utils/targetCalculation'
import { COLORS } from '@/utils/colors'

interface OverperformerData {
  id: string
  username: string
  personal_color: string
  overperformance_points: number
  daily_target: number
  total_points: number
  days_overperformed: number
}

interface WeeklyOverperformersProps {
  className?: string
}

export default function WeeklyOverperformers({ className = '' }: WeeklyOverperformersProps) {
  const [overperformers, setOverperformers] = useState<OverperformerData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { profile } = useProfile()

  // Debounce timeout for real-time updates
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchWeeklyOverperformers = async () => {
    if (!user || !profile?.group_id) {
      return
    }

    try {
      setLoading(true)

      // Get the start of current week (Monday) - using local date strings to avoid timezone issues
      const now = new Date()
      const currentDay = now.getDay()
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1 // Convert Sunday (0) to 6

      // Calculate Monday's date in local time
      const mondayDate = new Date(now)
      mondayDate.setDate(now.getDate() - daysFromMonday)

      // Calculate Sunday's date in local time  
      const sundayDate = new Date(mondayDate)
      sundayDate.setDate(mondayDate.getDate() + 6)

      // Format as YYYY-MM-DD strings in local timezone
      const startDateStr = mondayDate.getFullYear() + '-' +
        String(mondayDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(mondayDate.getDate()).padStart(2, '0')

      const endDateStr = sundayDate.getFullYear() + '-' +
        String(sundayDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(sundayDate.getDate()).padStart(2, '0')



      // First, get all group members with valid usernames and their week modes
      const { data: groupMembers, error: membersError } = await supabase
        .from('profiles')
        .select('id, username, personal_color, week_mode')
        .eq('group_id', profile.group_id)
        .not('username', 'is', null)
        .neq('username', '')

      if (membersError) throw membersError

      if (!groupMembers || groupMembers.length === 0) {
        setOverperformers([])
        setError(null)
        return
      }

      // Get weekly logs for all group members
      const memberIds = groupMembers.map(m => m.id)

      const { data: logs, error: logsError } = await supabase
        .from('logs')
        .select('user_id, points, date, exercise_id')
        .in('user_id', memberIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr)

      if (logsError) throw logsError

      // Debug: Log the logs data with enhanced validation
      const uniqueDates = [...new Set(logs?.map(l => l.date) || [])]
      const logsThisWeek = logs?.filter(l => l.date >= startDateStr && l.date <= endDateStr) || []
      const logsOutsideWeek = logs?.filter(l => l.date < startDateStr || l.date > endDateStr) || []

      // Get group settings and group info for target calculation
      const [groupSettingsResult, groupInfoResult] = await Promise.all([
        supabase
          .from('group_settings')
          .select('rest_days, recovery_days, daily_target_base, daily_increment')
          .eq('group_id', profile.group_id)
          .maybeSingle(),
        supabase
          .from('groups')
          .select('start_date')
          .eq('id', profile.group_id)
          .single()
      ])

      if (groupSettingsResult.error) throw groupSettingsResult.error
      if (groupInfoResult.error) throw groupInfoResult.error

      const groupSettings = groupSettingsResult.data
      const groupStartDate = groupInfoResult.data.start_date
      const daysSinceStart = getDaysSinceStart(groupStartDate)
      const restDays = groupSettings?.rest_days || [1]
      const recoveryDays = groupSettings?.recovery_days || [5]

      // Group logs by user and calculate overperformance
      const userStats: {
        [key: string]: {
          member: any
          dailyPoints: { [date: string]: number }
          totalPoints: number
        }
      } = {}

      // Initialize user stats with member data
      groupMembers.forEach(member => {
        userStats[member.id] = {
          member,
          dailyPoints: {},
          totalPoints: 0
        }
      })

      // Aggregate points by user and date - with strict weekly validation and recovery caps
      // First, group logs by user and date to apply recovery caps correctly
      const logsByUserAndDate: { [userId: string]: { [date: string]: any[] } } = {}

      logs?.forEach(log => {
        const userId = log.user_id
        const date = log.date

        // CRITICAL: Validate that log date is within current week boundaries
        if (date < startDateStr || date > endDateStr) {
          console.warn(`WeeklyOverperformers: Skipping log outside week range: ${date} (week: ${startDateStr} to ${endDateStr})`)
          return
        }

        if (!logsByUserAndDate[userId]) {
          logsByUserAndDate[userId] = {}
        }
        if (!logsByUserAndDate[userId][date]) {
          logsByUserAndDate[userId][date] = []
        }

        logsByUserAndDate[userId][date].push(log)
      })

      // Process each user's daily logs and apply recovery caps
      Object.entries(logsByUserAndDate).forEach(([userId, dateEntries]) => {
        if (!userStats[userId]) return

        Object.entries(dateEntries).forEach(([date, dayLogs]) => {
          const dateObj = new Date(date)
          const dayOfWeek = dateObj.getDay()

          // Calculate daily target for recovery cap (25% of target)
          const dailyTarget = calculateDailyTarget({
            daysSinceStart,
            weekMode: userStats[userId].member.week_mode || 'sane',
            restDays,
            recoveryDays,
            currentDayOfWeek: dayOfWeek
          })

          const recoveryCapLimit = Math.round(dailyTarget * 0.25)

          // Separate recovery and non-recovery exercises
          const recoveryExercises = [
            'recovery_meditation', 'recovery_stretching', 'recovery_blackrolling', 'recovery_yoga',
            'meditation', 'stretching', 'yoga', 'foam rolling', 'blackrolling'
          ]
          let totalRecoveryPoints = 0
          let totalNonRecoveryPoints = 0

          dayLogs.forEach(log => {
            if (recoveryExercises.includes(log.exercise_id)) {
              totalRecoveryPoints += log.points
            } else {
              totalNonRecoveryPoints += log.points
            }
          })

          // Apply recovery cap
          const cappedRecoveryPoints = Math.min(totalRecoveryPoints, recoveryCapLimit)
          const totalDayPoints = totalNonRecoveryPoints + cappedRecoveryPoints

          // Store the capped daily total
          if (!userStats[userId].dailyPoints[date]) {
            userStats[userId].dailyPoints[date] = 0
          }

          userStats[userId].dailyPoints[date] = totalDayPoints
          userStats[userId].totalPoints += totalDayPoints
        })
      })

      // Calculate overperformance for each user - only include users with valid usernames
      const overperformanceData: OverperformerData[] = Object.values(userStats)
        .filter(userStat => userStat.member.username && userStat.member.username.trim().length > 0)
        .map(userStat => {
          let totalOverperformance = 0
          let activeDays = 0
          const userWeekMode = userStat.member.week_mode || 'sane'

          // Calculate total overperformance for the week using user's specific week mode
          Object.entries(userStat.dailyPoints).forEach(([date, dailyPoints]) => {
            // ADDITIONAL VALIDATION: Ensure date is within current week
            if (date < startDateStr || date > endDateStr) {
              return
            }

            const dateObj = new Date(date)
            const dayOfWeek = dateObj.getDay()

            // Calculate the specific daily target for this user's week mode
            const targetForDate = calculateDailyTarget({
              daysSinceStart,
              weekMode: userWeekMode,
              restDays,
              recoveryDays,
              currentDayOfWeek: dayOfWeek
            })

            if (dailyPoints > targetForDate) {
              totalOverperformance += (dailyPoints - targetForDate)
              activeDays++
            }
          })

          return {
            id: userStat.member.id,
            username: userStat.member.username,
            personal_color: '', // Will be assigned based on rank after sorting
            overperformance_points: totalOverperformance,
            daily_target: 0, // Dynamic, just placeholder
            total_points: userStat.totalPoints,
            days_overperformed: activeDays
          }
        })
        .filter(user => user.overperformance_points > 0) // Only include users who overperformed
        .sort((a, b) => b.overperformance_points - a.overperformance_points) // Sort by total overperformance
        .slice(0, 5) // Top 5 overperformers
        .map((user, index) => ({
          ...user,
          // >50 points get orange, <=50 get opal blue
          personal_color: user.overperformance_points > 50 ? COLORS.orange.rgb.primary : COLORS.opal.rgb.primary
        }))

      // Debug: Log final results with comprehensive validation
      const allUsers = Object.values(userStats).map(u => ({
        id: u.member.id,
        username: u.member.username,
        week_mode: u.member.week_mode || 'sane',
        hasValidUsername: !!(u.member.username && u.member.username.trim().length > 0),
        totalPointsThisWeek: u.totalPoints,
        dailyPointsThisWeek: u.dailyPoints,
        datesWithPoints: Object.keys(u.dailyPoints).sort(),
        sampleTarget: calculateDailyTarget({
          daysSinceStart,
          weekMode: u.member.week_mode || 'sane',
          restDays,
          recoveryDays,
          currentDayOfWeek: 1
        })
      }))

      // Detailed breakdown for users with significant overperformance
      overperformanceData.forEach(op => {
        if (op.overperformance_points > 50) {
          const userData = allUsers.find(u => u.id === op.id)
        }
      })

      setOverperformers(overperformanceData)
      setError(null)
    } catch (error) {
      console.error('WeeklyOverperformers: Error fetching weekly overperformers:', error)
      setError('Failed to load overperformers data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeeklyOverperformers()

    if (user && profile?.group_id) {
      // Set up real-time subscription to logs table
      const logsSubscription = supabase
        .channel(`weekly-overperformers-${profile.group_id}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'logs'
          },
          (payload) => {
            // Debounced reload - wait for rapid changes to settle
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
            debounceTimeoutRef.current = setTimeout(() => {
              fetchWeeklyOverperformers()
            }, 1000) // 1 second debounce
          }
        )
        .subscribe()

      // Refresh data every 1 minute as fallback (reduced from 5 minutes)
      const interval = setInterval(fetchWeeklyOverperformers, 1 * 60 * 1000)

      return () => {
        clearInterval(interval)
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
        supabase.removeChannel(logsSubscription)
      }
    }
  }, [user?.id, profile?.group_id])

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-white'
      case 2:
        return 'text-white'
      case 3:
        return 'text-white'
      default:
        return 'text-white'
    }
  }

  if (loading) {
    return (
      <GlassCard noPadding className={className}>
        <CardHeader
          title="Weekly Overperformers"
          icon={Flame}
          colorClass="text-orange-500"
          rightContent={
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              Points beyond sane • Resets Monday
            </span>
          }
        />
        <div className="p-4 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white/5 rounded-lg h-12"></div>
            </div>
          ))}
        </div>
      </GlassCard>
    )
  }

  if (error || overperformers.length === 0) {
    return (
      <GlassCard noPadding className={className}>
        <CardHeader
          title="Weekly Overperformers"
          icon={Flame}
          colorClass="text-orange-500"
          rightContent={
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              Points beyond sane • Resets Monday
            </span>
          }
        />
        <div className="text-center py-8">
          <p className="text-sm text-zinc-500">
            {error ? 'Unable to load data' : 'No overperformers this week yet'}
          </p>
        </div>
      </GlassCard>
    )
  }

  // Calculate max overperformance for bar scaling
  const maxOverperformance = Math.max(...overperformers.map(p => p.overperformance_points))

  return (
    <GlassCard noPadding className={className}>
      <CardHeader
        title="Weekly Overperformers"
        icon={Flame}
        colorClass="text-orange-500"
        rightContent="Points beyond sane • Resets Monday"
      />

      <div className="p-4 space-y-2">
        {overperformers.map((performer, index) => {
          const rank = index + 1
          const isCurrentUser = performer.id === user?.id
          const barPercentage = (performer.overperformance_points / maxOverperformance) * 100

          // Determine gradient based on score (>50 = orange, <=50 = opal blue)
          const isOrange = performer.overperformance_points > 50

          return (
            <div
              key={performer.id}
              className={`relative rounded-xl overflow-hidden transition-all duration-300 ${isCurrentUser
                ? 'bg-white/10 border border-white/20'
                : 'bg-white/5 hover:bg-white/10'
                }`}
            >
              {/* Background bar - solid gradient like Time Remaining */}
              <div
                className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${isOrange ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-red-600' : 'bg-gradient-to-r from-blue-400 via-blue-500 to-purple-600'}`}
                style={{
                  width: `${barPercentage}%`,
                }}
              />

              {/* Content */}
              <div className="relative flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-black ${getRankColor(rank)} min-w-[24px] text-zinc-400`}>
                    {rank}
                  </span>

                  <span className={`text-lg font-black uppercase tracking-tighter ${isCurrentUser ? 'text-white' : 'text-zinc-300'
                    }`}>
                    {performer.username.slice(0, 4).toUpperCase()}
                  </span>
                </div>

                <div className="text-right">
                  <div className={`text-sm font-bold ${isCurrentUser ? 'text-white' : 'text-white/90'
                    }`}>
                    +{performer.overperformance_points}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}