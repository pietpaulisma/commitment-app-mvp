'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { TrophyIcon, FireIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { calculateDailyTarget, getDaysSinceStart } from '@/utils/targetCalculation'

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
      
      // Debug: Log the current week range with explicit values
      console.log('=== WEEKLY OVERPERFORMERS DEBUG ===')
      console.log('Today:', now.toISOString().split('T')[0])
      console.log('Current day of week:', now.getDay(), '(0=Sunday, 1=Monday)')
      console.log('Start of week (Monday):', startDateStr)
      console.log('End of week (Sunday):', endDateStr)
      console.log('Days from Monday:', daysFromMonday)

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
        .select('user_id, points, date')
        .in('user_id', memberIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr)

      if (logsError) throw logsError
      
      // Debug: Log the logs data
      const uniqueDates = [...new Set(logs?.map(l => l.date) || [])]
      const logsThisWeek = logs?.filter(l => l.date >= startDateStr && l.date <= endDateStr) || []
      
      console.log('Total logs found:', logs?.length || 0)
      console.log('Logs this week (', startDateStr, 'to', endDateStr, '):', logsThisWeek.length)
      console.log('Unique dates in all logs:', uniqueDates.sort())
      console.log('Sample logs:', logs?.slice(0, 3))

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
      
      // Debug: Log target calculation params
      console.log('WeeklyOverperformers: Target calculation params', { 
        groupStartDate, 
        daysSinceStart, 
        restDays, 
        recoveryDays,
        sampleTarget: calculateDailyTarget({
          daysSinceStart,
          weekMode: 'sane',
          restDays,
          recoveryDays,
          currentDayOfWeek: 1 // Monday
        })
      })

      // Group logs by user and calculate overperformance
      const userStats: { [key: string]: { 
        member: any
        dailyPoints: { [date: string]: number }
        totalPoints: number
      } } = {}

      // Initialize user stats with member data
      groupMembers.forEach(member => {
        userStats[member.id] = {
          member,
          dailyPoints: {},
          totalPoints: 0
        }
      })

      // Aggregate points by user and date
      logs?.forEach(log => {
        const userId = log.user_id
        const date = log.date
        
        if (userStats[userId]) {
          if (!userStats[userId].dailyPoints[date]) {
            userStats[userId].dailyPoints[date] = 0
          }
          
          userStats[userId].dailyPoints[date] += log.points
          userStats[userId].totalPoints += log.points
        }
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
            const dateObj = new Date(date)
            const dayOfWeek = dateObj.getDay()
            
            // Calculate the specific daily target for this user's week mode
            const targetForDate = calculateDailyTarget({
              daysSinceStart,
              weekMode: 'sane',
              restDays,
              recoveryDays,
              currentDayOfWeek: dayOfWeek
            })

            if (dailyPoints > targetForDate) {
              totalOverperformance += (dailyPoints - targetForDate)
              activeDays++
            }
          })

          // Use user's specific target for display purposes
          const userTarget = calculateDailyTarget({
            daysSinceStart,
            weekMode: userWeekMode,
            restDays,
            recoveryDays,
            currentDayOfWeek: 1 // Monday as reference
          })

          const result = {
            id: userStat.member.id,
            username: userStat.member.username,
            personal_color: userStat.member.personal_color || '#ef4444',
            overperformance_points: totalOverperformance,
            daily_target: userTarget,
            total_points: userStat.totalPoints,
            days_overperformed: activeDays
          }

          return result
        })
        .filter(user => user.overperformance_points > 0) // Only include users who overperformed
        .sort((a, b) => b.overperformance_points - a.overperformance_points) // Sort by total overperformance
        .slice(0, 5) // Top 5 overperformers

      // Debug: Log final results with week modes
      const allUsers = Object.values(userStats).map(u => ({
        id: u.member.id,
        username: u.member.username,
        week_mode: u.member.week_mode || 'sane',
        hasValidUsername: !!(u.member.username && u.member.username.trim().length > 0),
        totalPoints: u.totalPoints,
        dailyPoints: u.dailyPoints,
        sampleTarget: calculateDailyTarget({
          daysSinceStart,
          weekMode: u.member.week_mode || 'sane',
          restDays,
          recoveryDays,
          currentDayOfWeek: 1
        })
      }))
      
      console.log('WeeklyOverperformers: Final results with individual targets', { 
        allUsers,
        filteredOutUsers: allUsers.filter(u => !u.hasValidUsername),
        overperformers: overperformanceData
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
            console.log('WeeklyOverperformers: Real-time logs change detected:', payload)
            // Debounced reload - wait for rapid changes to settle
            clearTimeout(debounceTimeoutRef.current)
            debounceTimeoutRef.current = setTimeout(() => {
              console.log('WeeklyOverperformers: Reloading data due to logs change')
              fetchWeeklyOverperformers()
            }, 1000) // 1 second debounce
          }
        )
        .subscribe((status) => {
          console.log('WeeklyOverperformers: Subscription status:', status)
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('WeeklyOverperformers: Subscription failed, falling back to polling only')
          }
        })
      
      // Refresh data every 1 minute as fallback (reduced from 5 minutes)
      const interval = setInterval(fetchWeeklyOverperformers, 1 * 60 * 1000)
      
      return () => {
        clearInterval(interval)
        clearTimeout(debounceTimeoutRef.current)
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
        return 'text-orange-500'
    }
  }

  if (loading) {
    return (
      <div className={`bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-3 ${className}`}>
        <div className="flex items-center mb-2">
          <ChartBarIcon className="w-4 h-4 text-white/60 mr-2" />
          <h3 className="text-xs font-light text-white/80 uppercase tracking-widest">
            Weekly Overperformers
          </h3>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-800/50 rounded-lg h-8"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || overperformers.length === 0) {
    return (
      <div className={`bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-3 ${className}`}>
        <div className="flex items-center mb-2">
          <ChartBarIcon className="w-4 h-4 text-white/60 mr-2" />
          <h3 className="text-xs font-light text-white/80 uppercase tracking-widest">
            Weekly Overperformers
          </h3>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-white/60">
            {error ? 'Unable to load data' : 'No overperformers this week yet'}
          </p>
        </div>
      </div>
    )
  }

  // Calculate max overperformance for bar scaling
  const maxOverperformance = Math.max(...overperformers.map(p => p.overperformance_points))

  return (
    <div 
      className={`bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-3 ${className}`}
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
      }}
    >
      <div className="flex items-center mb-2">
        <ChartBarIcon className="w-4 h-4 text-white/60 mr-2" />
        <h3 className="text-xs font-light text-white/80 uppercase tracking-widest">
          Weekly Overperformers
        </h3>
      </div>

      <div className="space-y-1">
        {overperformers.map((performer, index) => {
          const rank = index + 1
          const isCurrentUser = performer.id === user?.id
          const barPercentage = (performer.overperformance_points / maxOverperformance) * 100
          
          return (
            <div
              key={performer.id}
              className={`relative rounded-lg overflow-hidden transition-all duration-300 ${
                isCurrentUser 
                  ? 'bg-white/10 border border-white/20' 
                  : 'bg-gray-900/30 hover:bg-gray-900/50'
              }`}
            >
              {/* Background bar */}
              <div 
                className="absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-500"
                style={{ 
                  width: `${barPercentage}%`,
                  backgroundColor: performer.personal_color 
                }}
              />
              
              {/* Content */}
              <div className="relative flex items-center justify-between p-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-bold ${getRankColor(rank)} min-w-[20px]`}>
                    #{rank}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: performer.personal_color }}
                    />
                    <span className={`text-xs font-medium ${
                      isCurrentUser ? 'text-white' : 'text-white/90'
                    }`}>
                      {performer.username}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-sm font-bold ${
                    isCurrentUser ? 'text-white' : 'text-white/90'
                  }`}>
                    +{performer.overperformance_points}
                  </div>
                  <div className="text-xs text-white/50">
                    this week
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {overperformers.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-xs text-white/60 text-center">
            Total extra points this week • Resets Sunday night
          </p>
        </div>
      )}
    </div>
  )
}