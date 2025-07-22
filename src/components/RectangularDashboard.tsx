'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ClockIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'

type RecentChat = {
  id: string
  message: string
  created_at: string
  user_email: string
  user_role: string
  is_own_message: boolean
}

type RecentActivity = {
  id: string
  user_email: string
  exercise_name: string
  points: number
  created_at: string
  is_own_activity: boolean
}

export default function RectangularDashboard() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const [recentChats, setRecentChats] = useState<RecentChat[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [groupName, setGroupName] = useState('')
  const [groupStartDate, setGroupStartDate] = useState<string | null>(null)
  const [challengeDay, setChallengeDay] = useState(1)
  const [dayType, setDayType] = useState<'rest' | 'recovery' | 'normal'>('normal')
  const [timeLeft, setTimeLeft] = useState('')
  const [timeRemainingPercentage, setTimeRemainingPercentage] = useState(0)
  const [restDays, setRestDays] = useState<number[]>([1]) // Default Monday (1)
  const [recoveryDays, setRecoveryDays] = useState<number[]>([5]) // Default Friday (5)
  const [accentColor, setAccentColor] = useState('blue') // Default blue
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [groupStats, setGroupStats] = useState<any>(null)
  const [selectedStats, setSelectedStats] = useState<string[]>([])
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())
  const [showAllStats, setShowAllStats] = useState(false)
  const [allStats, setAllStats] = useState<any[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && profile) {
      loadDashboardData()
      // Set up real-time updates
      const interval = setInterval(loadDashboardData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [user, profile])

  // Set random stats selection (changes on page refresh)
  useEffect(() => {
    setSelectedStats(getRandomStats())
  }, [user, profile])

  // Reload stats when selection changes
  useEffect(() => {
    if (selectedStats.length > 0 && user && profile) {
      loadGroupStats()
    }
  }, [selectedStats, user, profile])

  // Countdown timer effect
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      
      const timeDiff = endOfDay.getTime() - now.getTime()
      const hours = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      
      // Calculate percentage of day elapsed (for progress bar)
      const totalDayTime = endOfDay.getTime() - startOfDay.getTime()
      const elapsedTime = now.getTime() - startOfDay.getTime()
      const elapsedPercentage = (elapsedTime / totalDayTime) * 100
      
      setTimeLeft(`${hours}h ${minutes}m`)
      setTimeRemainingPercentage(Math.min(100, Math.max(0, elapsedPercentage)))
    }

    updateTimer() // Initial update
    const timer = setInterval(updateTimer, 60000) // Update every minute
    
    return () => clearInterval(timer)
  }, [])

  // Calculate challenge day and day type when group data loads
  useEffect(() => {
    if (groupStartDate) {
      calculateChallengeInfo()
    }
  }, [groupStartDate, restDays, recoveryDays])

  const calculateChallengeInfo = () => {
    if (!groupStartDate) return

    const startDate = new Date(groupStartDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time for accurate day calculation
    
    const timeDiff = today.getTime() - startDate.getTime()
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1 // +1 because day 1 is the start date
    
    setChallengeDay(Math.max(1, daysDiff))
    
    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
    const currentDayOfWeek = today.getDay()
    
    // Determine day type
    if (restDays.includes(currentDayOfWeek)) {
      setDayType('rest')
    } else if (recoveryDays.includes(currentDayOfWeek)) {
      setDayType('recovery')
    } else {
      setDayType('normal')
    }
  }

  const getAccentColors = () => {
    const colorMap = {
      'blue': {
        primary: 'text-purple-400',
        bg: 'bg-purple-900/50',
        border: 'border-purple-400',
        borderL: 'border-l-purple-500'
      },
      'green': {
        primary: 'text-yellow-400',
        bg: 'bg-yellow-900/50',
        border: 'border-yellow-400',
        borderL: 'border-l-yellow-500'
      },
      'purple': {
        primary: 'text-purple-400',
        bg: 'bg-purple-900/50',
        border: 'border-purple-400',
        borderL: 'border-l-purple-500'
      },
      'orange': {
        primary: 'text-yellow-400',
        bg: 'bg-yellow-900/50',
        border: 'border-yellow-400',
        borderL: 'border-l-yellow-500'
      },
      'red': {
        primary: 'text-purple-400',
        bg: 'bg-purple-900/50',
        border: 'border-purple-400',
        borderL: 'border-l-purple-500'
      },
      'cyan': {
        primary: 'text-yellow-400',
        bg: 'bg-yellow-900/50',
        border: 'border-yellow-400',
        borderL: 'border-l-yellow-500'
      }
    }
    return colorMap[accentColor as keyof typeof colorMap] || colorMap.blue
  }

  const getDayTypeDisplay = () => {
    const colors = getAccentColors()
    switch (dayType) {
      case 'rest':
        return { title: 'Rest Day', subtitle: 'No exercises required', color: colors.primary }
      case 'recovery':
        return { title: 'Recovery Day', subtitle: '15 min recovery exercises', color: 'text-green-400' }
      default:
        return { title: 'Training Day', subtitle: 'Complete your daily target', color: colors.primary }
    }
  }

  const getCurrentDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[new Date().getDay()]
  }

  const getAllAvailableStats = () => [
    'total_points_trend',
    'top_workouts_frequency', 
    'top_workouts_points',
    'top_money_contributors',
    'popular_workout_time',
    'flex_rest_days',
    'total_donated_money',
    'longest_streak',
    'most_varied_member',
    'earliest_checkin',
    'latest_checkin',
    'next_birthday',
    'top_overachievers',
    'king_recovery'
  ]

  const getRandomStats = () => {
    const allStats = getAllAvailableStats()
    
    // Simple random shuffle on each refresh
    const shuffled = [...allStats].sort(() => Math.random() - 0.5)
    
    // Ensure we always fill exactly 6 slots
    return shuffled.slice(0, 6)
  }

  const getTimeBasedGradient = () => {
    const now = new Date()
    const hour = now.getHours()
    
    // Early morning (5-7): Soft sunrise colors
    if (hour >= 5 && hour < 7) {
      return 'from-orange-300/20 to-yellow-300/10'
    }
    // Morning (7-10): Bright sunrise
    else if (hour >= 7 && hour < 10) {
      return 'from-orange-400/25 to-yellow-400/15'
    }
    // Mid-morning to afternoon (10-16): Bright day
    else if (hour >= 10 && hour < 16) {
      return 'from-yellow-400/20 to-orange-300/10'
    }
    // Late afternoon (16-18): Golden hour
    else if (hour >= 16 && hour < 18) {
      return 'from-orange-500/25 to-red-400/15'
    }
    // Evening (18-20): Sunset
    else if (hour >= 18 && hour < 20) {
      return 'from-red-500/20 to-purple-500/10'
    }
    // Night (20-24): Deep evening
    else if (hour >= 20 || hour < 5) {
      return 'from-blue-800/20 to-indigo-900/10'
    }
    // Default fallback
    return 'from-orange-600/20 to-orange-500/10'
  }

  const loadGroupMembers = async () => {
    if (!profile?.group_id) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get all group members
      const { data: allMembers } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .eq('group_id', profile.group_id)

      if (!allMembers) return

      // Get today's logs for all members in one query
      const memberIds = allMembers.map(m => m.id)
      const { data: todayLogs } = await supabase
        .from('logs')
        .select('user_id, points')
        .in('user_id', memberIds)
        .eq('date', today)

      // Process members with their points
      const memberPointsMap = new Map()
      todayLogs?.forEach(log => {
        if (!memberPointsMap.has(log.user_id)) {
          memberPointsMap.set(log.user_id, 0)
        }
        memberPointsMap.set(log.user_id, memberPointsMap.get(log.user_id) + log.points)
      })

      // Create final member objects with their points
      const membersWithProgress = allMembers.map(member => ({
        ...member,
        todayPoints: memberPointsMap.get(member.id) || 0,
        dailyTarget: 100,
        isCurrentUser: member.id === user?.id
      }))
      
      // Sort by points descending
      membersWithProgress.sort((a, b) => b.todayPoints - a.todayPoints)
      setGroupMembers(membersWithProgress)
    } catch (error) {
      console.error('Error loading group members:', error)
    }
  }

  const calculateInterestingStat = async (statType: string) => {
    if (!profile?.group_id) return null

    try {
      // Get all group members first
      const { data: members } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('group_id', profile.group_id)

      if (!members || members.length === 0) return null

      const memberIds = members.map(m => m.id)
      const today = new Date().toISOString().split('T')[0]

      switch (statType) {
        case 'total_points_trend':
          // Generate 7 days of mock data
          const weekData = Array.from({length: 7}, (_, i) => ({
            day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
            points: Math.floor(Math.random() * 500) + 200
          }))
          return {
            type: 'wide_chart',
            title: 'Points This Week',
            subtitle: `${weekData.reduce((sum, d) => sum + d.points, 0)} total points`,
            chartType: 'bar',
            data: weekData,
            trendUp: true
          }
        
        case 'top_workouts_frequency': {
          const workouts = ['Push-ups', 'Running', 'Squats', 'Planks', 'Cycling']
          const workoutData = workouts.slice(0, 3).map(workout => ({
            name: workout,
            count: Math.floor(Math.random() * 25) + 5,
            percentage: Math.floor(Math.random() * 40) + 20
          })).sort((a, b) => b.count - a.count)
          
          return {
            type: 'list_chart',
            title: 'Top Workouts',
            subtitle: 'this week',
            data: workoutData
          }
        }
        
        case 'popular_workout_time': {
          // Generate hourly activity data
          const hourlyData = Array.from({length: 24}, (_, hour) => ({
            hour,
            activity: hour >= 6 && hour <= 20 ? Math.floor(Math.random() * 8) + 1 : Math.floor(Math.random() * 2)
          }))
          const peakHour = hourlyData.reduce((peak, current) => 
            current.activity > peak.activity ? current : peak
          )
          
          return {
            type: 'heatmap',
            title: 'Peak Activity',
            value: `${peakHour.hour}:00`,
            subtitle: 'most active hour',
            data: hourlyData
          }
        }
        
        case 'total_donated_money': {
          const currentAmount = Math.floor(Math.random() * 500) + 100
          const target = 1000
          const percentage = (currentAmount / target) * 100
          
          return {
            type: 'progress_ring',
            title: 'Penalty Pot',
            value: `$${currentAmount}`,
            subtitle: `Goal: $${target}`,
            percentage: percentage,
            target: target,
            color: 'red'
          }
        }
        
        case 'longest_streak': {
          const randomMember = members[Math.floor(Math.random() * members.length)]
          const streak = Math.floor(Math.random() * 15) + 1
          // Generate streak visualization data
          const streakData = Array.from({length: 30}, (_, i) => ({
            day: i + 1,
            completed: i < streak || (i >= streak + 3 && Math.random() > 0.3)
          }))
          
          return {
            type: 'streak_grid',
            title: 'Longest Streak',
            value: `${streak} days`,
            subtitle: randomMember.email.split('@')[0],
            data: streakData.slice(-14) // Last 14 days
          }
        }
        
        case 'group_progress': {
          const members_progress = members.slice(0, 4).map(member => ({
            name: member.email.split('@')[0],
            progress: Math.floor(Math.random() * 100),
            trend: Math.random() > 0.5 ? 'up' : 'down'
          })).sort((a, b) => b.progress - a.progress)
          
          return {
            type: 'member_progress',
            title: 'Group Progress',
            subtitle: 'daily targets',
            data: members_progress
          }
        }
        
        case 'top_workouts_points': {
          const workoutData = [
            { name: 'Running', points: Math.floor(Math.random() * 500) + 200 },
            { name: 'Push-ups', points: Math.floor(Math.random() * 400) + 150 },
            { name: 'Squats', points: Math.floor(Math.random() * 300) + 100 }
          ].sort((a, b) => b.points - a.points)
          
          return {
            type: 'list_chart',
            title: 'Top by Points',
            subtitle: 'this week',
            data: workoutData.map(w => ({ name: w.name, count: w.points }))
          }
        }
        
        case 'top_money_contributors': {
          const contributorData = members.slice(0, 3).map(member => ({
            name: member.email.split('@')[0],
            amount: Math.floor(Math.random() * 50) + 10
          })).sort((a, b) => b.amount - a.amount)
          
          return {
            type: 'list_chart',
            title: 'Top Contributors',
            subtitle: 'penalty pot',
            data: contributorData.map(c => ({ name: c.name, count: `$${c.amount}` }))
          }
        }
        
        case 'flex_rest_days': {
          // Generate weekly pattern showing rest days taken
          const weekPattern = Array.from({length: 7}, (_, i) => ({
            day: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i],
            rested: Math.random() > 0.6
          }))
          const restCount = weekPattern.filter(d => d.rested).length
          
          return {
            type: 'weekly_pattern',
            title: 'Rest Days',
            value: `${restCount}/7`,
            subtitle: 'this week',
            data: weekPattern
          }
        }
        
        case 'most_varied_member': {
          const randomMember = members[Math.floor(Math.random() * members.length)]
          const workoutTypes = ['Cardio', 'Strength', 'Flexibility', 'Recovery', 'Sports']
          const variety = Math.floor(Math.random() * 4) + 2
          
          return {
            type: 'variety_chart',
            title: 'Most Varied',
            value: `${variety} types`,
            subtitle: randomMember.email.split('@')[0],
            data: workoutTypes.slice(0, variety).map(type => ({
              name: type,
              active: true
            }))
          }
        }
        
        case 'earliest_checkin': {
          const randomMember = members[Math.floor(Math.random() * members.length)]
          const hour = Math.floor(Math.random() * 4) + 5 // 5-8 AM
          const minute = Math.floor(Math.random() * 60)
          
          return {
            type: 'time_stat',
            title: 'Early Bird',
            value: `${hour}:${String(minute).padStart(2, '0')}`,
            subtitle: randomMember.email.split('@')[0]
          }
        }
        
        case 'latest_checkin': {
          const randomMember = members[Math.floor(Math.random() * members.length)]
          const hour = Math.floor(Math.random() * 3) + 21 // 9-11 PM
          const minute = Math.floor(Math.random() * 60)
          
          return {
            type: 'time_stat',
            title: 'Night Owl',
            value: `${hour}:${String(minute).padStart(2, '0')}`,
            subtitle: randomMember.email.split('@')[0]
          }
        }
        
        case 'next_birthday': {
          const randomMember = members[Math.floor(Math.random() * members.length)]
          const daysUntil = Math.floor(Math.random() * 90) + 1
          
          return {
            type: 'countdown_stat',
            title: 'Next Birthday',
            value: `${daysUntil} days`,
            subtitle: randomMember.email.split('@')[0]
          }
        }
        
        case 'top_overachievers': {
          const overachievers = members.slice(0, 3).map(member => ({
            name: member.email.split('@')[0],
            percentage: Math.floor(Math.random() * 80) + 120
          })).sort((a, b) => b.percentage - a.percentage)
          
          return {
            type: 'percentage_list',
            title: 'Overachievers',
            subtitle: 'above target',
            data: overachievers
          }
        }
        
        case 'king_recovery': {
          const randomMember = members[Math.floor(Math.random() * members.length)]
          const recoveryMinutes = Math.floor(Math.random() * 180) + 60
          
          return {
            type: 'recovery_stat',
            title: 'Recovery King',
            value: `${recoveryMinutes}min`,
            subtitle: randomMember.email.split('@')[0]
          }
        }
      }
    } catch (error) {
      console.error('Error calculating stat:', error)
      return null
    }
  }

  const getStatLayout = (stats: any[], isShowingAll = false) => {
    const layouts = []
    
    if (isShowingAll) {
      // For showing all stats, use repeating pattern that works well
      const allPattern = ['wide', 'square', 'square', 'tall', 'square', 'square']
      
      for (let i = 0; i < stats.length; i++) {
        const layoutType = allPattern[i % allPattern.length]
        layouts.push({ ...stats[i], layout: layoutType })
      }
      
      return layouts
    }
    
    // For main view: ensure exactly 6 stats in proper 2x3 grid
    // Row 1: wide(2 cells)
    // Row 2: square + square  
    // Row 3: tall + square
    const basePattern = ['wide', 'square', 'square', 'tall', 'square', 'square']
    
    // Take exactly 6 stats, padding with empty ones if needed
    const paddedStats = [...stats]
    while (paddedStats.length < 6) {
      paddedStats.push(null)
    }
    
    // Assign layouts to ensure proper grid filling
    for (let i = 0; i < 6; i++) {
      if (paddedStats[i]) {
        const layoutType = basePattern[i]
        layouts.push({ ...paddedStats[i], layout: layoutType })
      } else {
        // Create placeholder stat for empty slots
        layouts.push({
          type: 'placeholder',
          layout: basePattern[i],
          title: 'Coming Soon',
          subtitle: 'More stats coming',
          value: '...',
          isPlaceholder: true
        })
      }
    }
    
    return layouts
  }

  const loadGroupStats = async () => {
    if (!profile?.group_id || selectedStats.length === 0) return

    try {
      // Get all group members first
      const { data: members } = await supabase
        .from('profiles')
        .select('id')
        .eq('group_id', profile.group_id)

      if (!members || members.length === 0) return

      const memberIds = members.map(m => m.id)

      // Get total group points from all members
      const { data: allLogs } = await supabase
        .from('logs')
        .select('points')
        .in('user_id', memberIds)

      const totalPoints = allLogs?.reduce((sum, log) => sum + log.points, 0) || 0
      const moneyInPot = totalPoints * 0.10

      // Calculate ALL 14 interesting stats
      const allStatTypes = getAllAvailableStats()
      const allStatsData = await Promise.all(
        allStatTypes.map(statType => calculateInterestingStat(statType))
      )

      const allStatsWithLayout = getStatLayout(allStatsData.filter(stat => stat !== null), true)
      const selectedStatsData = getStatLayout(
        selectedStats.map(statType => allStatsData[allStatTypes.indexOf(statType)]).filter(stat => stat !== null), false
      )

      // Set all stats at once to avoid glitchy loading - batch state updates
      const newGroupStats = {
        totalPoints,
        moneyInPot,
        memberCount: members.length,
        interestingStats: selectedStatsData
      }
      
      // Use batch state updates and wait for all calculations to complete
      // This prevents individual stats from loading one by one
      setAllStats(allStatsWithLayout)
      
      // Add small delay to ensure smooth rendering
      setTimeout(() => {
        setGroupStats(newGroupStats)
      }, 50)
    } catch (error) {
      console.error('Error loading group stats:', error)
      setGroupStats({
        totalPoints: 0,
        moneyInPot: 0,
        memberCount: 0,
        interestingStats: []
      })
    }
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadDashboardData = async () => {
    if (!user || !profile) return

    try {
      // Get group name and start date
      if (profile.group_id) {
        const { data: group } = await supabase
          .from('groups')
          .select('name, start_date')
          .eq('id', profile.group_id)
          .single()
        setGroupName(group?.name || 'Your Group')
        setGroupStartDate(group?.start_date || null)

        // Load group members and stats in parallel
        await Promise.all([loadGroupMembers(), loadGroupStats()])

        // Try to load group settings for rest/recovery days
        try {
          const { data: groupSettings, error: settingsError } = await supabase
            .from('group_settings')
            .select('rest_days, recovery_days, accent_color')
            .eq('group_id', profile.group_id)
            .maybeSingle()

          if (!settingsError && groupSettings) {
            setRestDays(groupSettings.rest_days || [1]) // Default Monday
            setRecoveryDays(groupSettings.recovery_days || [5]) // Default Friday
            setAccentColor(groupSettings.accent_color || 'blue') // Default blue
          }
        } catch (error) {
          console.log('Group settings not available, using defaults')
        }
      }

      // Load recent chats
      if (profile.group_id) {
        try {
          const { data: chats } = await supabase
            .from('chat_messages')
            .select(`
              id, 
              message, 
              created_at, 
              user_id,
              profiles!inner(email, role)
            `)
            .eq('group_id', profile.group_id)
            .order('created_at', { ascending: false })
            .limit(10)

          const chatsWithOwnership = chats?.map(chat => ({
            ...chat,
            user_email: chat.profiles.email,
            user_role: chat.profiles.role,
            is_own_message: chat.user_id === user.id
          })) || []

          setRecentChats(chatsWithOwnership)
        } catch (error) {
          console.log('Could not load chats:', error)
        }
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes}m`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d`
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'supreme_admin':
        return 'text-purple-400'
      case 'group_admin':
        return 'text-yellow-400'
      default:
        return 'text-purple-300'
    }
  }

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-purple-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const dayTypeInfo = getDayTypeDisplay()
  const colors = getAccentColors()

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Time-Based Challenge Header */}
      {groupStartDate && (
        <div className="bg-black border-b border-gray-800 relative overflow-hidden">
          {/* Progress Background */}
          <div 
            className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r ${getTimeBasedGradient()} transition-all duration-1000 ease-out`}
            style={{ width: `${timeRemainingPercentage}%` }}
          />
          
          {/* Content */}
          <div className="relative px-4 pt-2 pb-4">
            <div className="mb-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-5xl font-thin text-white uppercase tracking-wide">DAY</span>
                    <span className="text-5xl font-black text-white">{challengeDay}</span>
                  </div>
                  <p className="text-gray-400 text-sm font-medium -mt-1">
                    {getCurrentDayName()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white">
                    {timeLeft}
                  </div>
                  <div className="text-sm text-gray-400 font-medium -mt-1">
                    remaining
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      <div className="space-y-0">
        {/* Group Status */}
        <div id="group-status" className="bg-black">
          <div className="px-4 py-6">
            <h3 className="text-2xl font-bold text-white mb-6">Status</h3>
            
            {groupMembers.length === 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-gray-900/30">
                  <div className="animate-pulse bg-gradient-to-r from-gray-800 to-gray-700 rounded h-10 mb-2"></div>
                  <div className="animate-pulse bg-gradient-to-r from-gray-700 to-gray-600 rounded h-4"></div>
                </div>
                <div className="p-3 rounded-lg bg-gray-900/30">
                  <div className="animate-pulse bg-gradient-to-r from-gray-800 to-gray-700 rounded h-10 mb-2"></div>
                  <div className="animate-pulse bg-gradient-to-r from-gray-700 to-gray-600 rounded h-4"></div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {groupMembers.map((member, index) => (
                  <div key={member.id} className={`p-3 rounded-lg ${
                    member.isCurrentUser ? 'bg-gray-900/50' : index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10' : 'bg-gray-900/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-500 text-white' :
                          index === 2 ? 'bg-amber-600 text-black' :
                          'bg-gray-600 text-white'
                        }`}>
                          {member.isCurrentUser ? 'YOU'.slice(0, 2) : member.email.split('@')[0].slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-bold truncate ${
                            member.isCurrentUser ? 'text-white' : index === 0 ? 'text-yellow-400' : 'text-white'
                          }`}>
                            {member.isCurrentUser ? 'You' : member.email.split('@')[0]}
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-2xl font-black text-white">
                          {Math.round((member.todayPoints / (member.dailyTarget || 100)) * 100)}%
                        </div>
                        {member.todayPoints >= (member.dailyTarget || 100) && (
                          <div className="text-xs text-emerald-400 font-medium">✓</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chats Section */}
        <div id="chats" className="bg-black">
          <div className="px-4 py-6">
            <h3 className="text-2xl font-bold text-white mb-6">Chats</h3>
            
            {recentChats.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 font-medium text-lg">No recent messages</p>
                <p className="text-gray-500 text-sm mt-2">Start a conversation with your group</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentChats.slice(0, 7).map((chat) => (
                  <div key={chat.id} className={`px-3 py-2 rounded ${
                    chat.is_own_message ? 'bg-gray-900/50' : 'bg-gray-900/30'
                  }`}>
                    <p className="text-sm text-gray-300">
                      <span className="font-medium text-white mr-2">
                        {chat.is_own_message ? 'You' : chat.user_email.split('@')[0]}:
                      </span>
                      {chat.message}
                      <span className="text-xs text-gray-500 ml-2">
                        {formatTimeAgo(chat.created_at)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Group Stats */}
        <div id="group-stats" className="bg-black">
          <div className="px-4 py-6">
            <h3 className="text-2xl font-bold text-white mb-6">Stats</h3>
            
            {groupStats && groupStats.interestingStats && groupStats.interestingStats.length > 0 ? (
              <>
                {/* Rotating Interesting Stats with Dynamic Layout */}
                <div className={`grid gap-3 ${showAllStats ? 'grid-cols-2 auto-rows-max' : 'grid-cols-2'}`}>
                  {(showAllStats ? allStats : groupStats.interestingStats)?.map((stat: any, index: number) => {
                    const getAccentColor = () => {
                      const colors = [
                        'text-orange-400',
                        'text-green-400', 
                        'text-purple-400',
                        'text-blue-400',
                        'text-yellow-400',
                        'text-pink-400'
                      ]
                      return colors[index % colors.length]
                    }

                    const getLayoutClasses = () => {
                      switch (stat.layout) {
                        case 'wide': return 'col-span-2 h-32' // 2:1 ratio - spans both columns, height = 2 squares
                        case 'tall': return 'col-span-1 h-64' // 1:2 ratio - tall single column, height = 2 squares
                        case 'square': 
                        default: return 'col-span-1 h-32' // 1:1 ratio - single column
                      }
                    }

                    // Skip placeholder stats from rendering
                    if (stat.isPlaceholder) {
                      return (
                        <div key={index} className={`relative bg-gray-900/10 rounded-lg border-2 border-dashed border-gray-700 ${getLayoutClasses()}`}>
                          <div className="p-4 h-full flex flex-col justify-center items-center text-center opacity-30">
                            <div className="text-gray-500 text-lg mb-1">{stat.value}</div>
                            <div className="text-xs text-gray-600 uppercase tracking-wide">{stat.title}</div>
                            <div className="text-xs text-gray-700">{stat.subtitle}</div>
                          </div>
                        </div>
                      )
                    }

                    // Wide chart - Full width bar chart like workout button
                    if (stat.type === 'wide_chart') {
                      const maxValue = Math.max(...(stat.data?.map((d: any) => d.points) || [100]))
                      const bgColor = getAccentColor().replace('text-', 'bg-').replace('-400', '/20')
                      return (
                        <div key={index} className={`relative overflow-hidden ${bgColor} rounded-lg ${getLayoutClasses()}`}>
                          {/* Background progress bars */}
                          <div className="absolute inset-0 flex items-end">
                            {stat.data?.map((item: any, i: number) => (
                              <div key={i} className="flex-1 flex items-end h-full">
                                <div 
                                  className={`w-full transition-all duration-1000 ${getAccentColor().replace('text-', 'bg-').replace('-400', '-500')}`}
                                  style={{ height: `${(item.points / maxValue) * 100}%` }}
                                />
                              </div>
                            )) || []}
                          </div>
                          {/* Content overlay */}
                          <div className="relative p-4 h-full flex flex-col justify-between">
                            <div>
                              <h4 className={`text-lg font-bold ${getAccentColor()}`}>{stat.title}</h4>
                              <p className="text-sm text-gray-400">{stat.subtitle}</p>
                            </div>
                            <div className="flex justify-between items-end">
                              {stat.data?.map((item: any, i: number) => (
                                <div key={i} className="text-center">
                                  <div className="text-xs text-white font-bold">{item.points}</div>
                                  <div className="text-xs text-gray-400">{item.day}</div>
                                </div>
                              )) || []}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // Progress ring - Large typography focus
                    if (stat.type === 'progress_ring') {
                      const ringSize = stat.layout === 'tall' ? 80 : 60
                      const strokeWidth = 6
                      const radius = (ringSize - strokeWidth) / 2
                      const circumference = 2 * Math.PI * radius
                      const strokeOffset = circumference - (stat.percentage || 0) / 100 * circumference
                      
                      return (
                        <div key={index} className={`relative bg-gray-900/30 rounded-lg ${getLayoutClasses()}`}>
                          <div className="p-4 h-full flex flex-col justify-center items-center">
                            <div className="relative mb-4">
                              <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                                <circle 
                                  cx={ringSize/2} cy={ringSize/2} r={radius}
                                  stroke="rgb(55, 65, 81)" strokeWidth={strokeWidth} fill="none"
                                />
                                <circle 
                                  cx={ringSize/2} cy={ringSize/2} r={radius}
                                  className={getAccentColor().replace('text-', 'stroke-')}
                                  strokeWidth={strokeWidth} fill="none"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={strokeOffset}
                                  strokeLinecap="round"
                                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-2xl font-black ${getAccentColor()}`}>{Math.round(stat.percentage || 0)}%</span>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-black text-white mb-1">{stat.value}</div>
                              <div className="text-xs text-gray-400 uppercase tracking-wide">{stat.title}</div>
                              <div className="text-xs text-gray-500">{stat.subtitle}</div>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // List chart
                    if (stat.type === 'list_chart') {
                      return (
                        <div key={index} className={`relative bg-gray-900/30 rounded-lg ${getLayoutClasses()}`}>
                          <div className="p-4 h-full flex flex-col">
                            <div className="mb-3">
                              <h4 className={`text-sm font-bold ${getAccentColor()}`}>{stat.title}</h4>
                              <p className="text-xs text-gray-500">{stat.subtitle}</p>
                            </div>
                            <div className="flex-1 space-y-3">
                              {stat.data?.slice(0, stat.layout === 'tall' ? 4 : 3).map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-1 h-6 ${getAccentColor().replace('text-', 'bg-')}`} />
                                    <span className="text-sm text-white font-medium">{item.name}</span>
                                  </div>
                                  <span className={`text-lg font-black ${getAccentColor()}`}>{item.count}</span>
                                </div>
                              )) || []}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // Heatmap
                    if (stat.type === 'heatmap') {
                      return (
                        <div key={index} className={`relative bg-gray-900/30 rounded-lg ${getLayoutClasses()}`}>
                          <div className="p-4 h-full flex flex-col">
                            <div className="text-center mb-3">
                              <h4 className={`text-sm font-bold ${getAccentColor()}`}>{stat.title}</h4>
                              <div className={`text-2xl font-black ${getAccentColor()}`}>{stat.value}</div>
                              <p className="text-xs text-gray-400">{stat.subtitle}</p>
                            </div>
                            <div className="grid grid-cols-8 gap-1 flex-1">
                              {stat.data?.slice(6, 22).map((item: any, i: number) => (
                                <div 
                                  key={i} 
                                  className={`h-3 rounded-sm ${
                                    item.activity > 5 ? getAccentColor().replace('text-', 'bg-') : 
                                    item.activity > 3 ? getAccentColor().replace('text-', 'bg-').replace('-400', '-300') :
                                    item.activity > 1 ? getAccentColor().replace('text-', 'bg-').replace('-400', '-200') : 'bg-gray-700'
                                  }`}
                                />
                              )) || []}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // Streak grid
                    if (stat.type === 'streak_grid') {
                      return (
                        <div key={index} className={`relative bg-gray-900/30 rounded-lg ${getLayoutClasses()}`}>
                          <div className="p-4 h-full flex flex-col">
                            <div className="mb-3">
                              <h4 className={`text-sm font-bold ${getAccentColor()}`}>{stat.title}</h4>
                              <div className={`text-xl font-black ${getAccentColor()}`}>{stat.value}</div>
                              <p className="text-xs text-gray-400">{stat.subtitle}</p>
                            </div>
                            <div className="grid grid-cols-7 gap-1 flex-1">
                              {stat.data?.map((item: any, i: number) => (
                                <div 
                                  key={i} 
                                  className={`h-4 w-4 rounded-sm ${
                                    item.completed ? getAccentColor().replace('text-', 'bg-') : 'bg-gray-700'
                                  }`}
                                />
                              )) || []}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // Member progress
                    if (stat.type === 'member_progress') {
                      return (
                        <div key={index} className={`relative bg-gray-900/30 rounded-lg ${getLayoutClasses()}`}>
                          <div className="p-4 h-full flex flex-col">
                            <div className="mb-3">
                              <h4 className={`text-sm font-bold ${getAccentColor()}`}>{stat.title}</h4>
                              <p className="text-xs text-gray-400">{stat.subtitle}</p>
                            </div>
                            <div className="space-y-2 flex-1">
                              {stat.data?.map((member: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                  <span className="text-sm text-white">{member.name}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-sm font-bold ${getAccentColor()}`}>{member.progress}%</span>
                                    <span className={`text-xs ${
                                      member.trend === 'up' ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      {member.trend === 'up' ? '↗' : '↘'}
                                    </span>
                                  </div>
                                </div>
                              )) || []}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // Weekly pattern (rest days)
                    if (stat.type === 'weekly_pattern') {
                      return (
                        <div key={index} className={`relative bg-gray-900/30 rounded-lg ${getLayoutClasses()}`}>
                          <div className="p-4 h-full flex flex-col">
                            <div className="text-center mb-3">
                              <h4 className={`text-sm font-bold ${getAccentColor()}`}>{stat.title}</h4>
                              <div className={`text-2xl font-black ${getAccentColor()}`}>{stat.value}</div>
                              <p className="text-xs text-gray-400">{stat.subtitle}</p>
                            </div>
                            <div className="grid grid-cols-7 gap-1 flex-1">
                              {stat.data?.map((item: any, i: number) => (
                                <div key={i} className="text-center">
                                  <div className={`w-4 h-4 rounded-full mx-auto ${
                                    item.rested ? getAccentColor().replace('text-', 'bg-') : 'bg-gray-700'
                                  }`} />
                                  <span className="text-xs text-gray-400 mt-1 block">{item.day}</span>
                                </div>
                              )) || []}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // Variety chart
                    if (stat.type === 'variety_chart') {
                      return (
                        <div key={index} className={`relative bg-gray-900/30 rounded-lg ${getLayoutClasses()}`}>
                          <div className="p-4 h-full flex flex-col">
                            <div className="mb-3">
                              <h4 className={`text-sm font-bold ${getAccentColor()}`}>{stat.title}</h4>
                              <div className={`text-xl font-black ${getAccentColor()}`}>{stat.value}</div>
                              <p className="text-xs text-gray-400">{stat.subtitle}</p>
                            </div>
                            <div className="space-y-2 flex-1">
                              {stat.data?.map((item: any, i: number) => (
                                <div key={i} className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${getAccentColor().replace('text-', 'bg-')}`} />
                                  <span className="text-xs text-white">{item.name}</span>
                                </div>
                              )) || []}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // Simple time/countdown stats - Large typography focus
                    if (stat.type === 'time_stat' || stat.type === 'countdown_stat' || stat.type === 'recovery_stat') {
                      const fontSize = stat.layout === 'tall' ? 'text-6xl' : 'text-4xl'
                      return (
                        <div key={index} className={`relative bg-gray-900/30 rounded-lg ${getLayoutClasses()}`}>
                          <div className="p-4 h-full flex flex-col justify-center items-center text-center">
                            <div className={`${fontSize} font-black ${getAccentColor()} leading-none mb-2`}>
                              {stat.value}
                            </div>
                            <div className="text-sm font-bold text-white uppercase tracking-wide mb-1">
                              {stat.title}
                            </div>
                            <div className="text-xs text-gray-500">{stat.subtitle}</div>
                          </div>
                        </div>
                      )
                    }

                    // Percentage list (overachievers)
                    if (stat.type === 'percentage_list') {
                      return (
                        <div key={index} className={`relative bg-gray-900/30 rounded-lg ${getLayoutClasses()}`}>
                          <div className="p-4 h-full flex flex-col">
                            <div className="mb-3">
                              <h4 className={`text-sm font-bold ${getAccentColor()}`}>{stat.title}</h4>
                              <p className="text-xs text-gray-400">{stat.subtitle}</p>
                            </div>
                            <div className="space-y-2 flex-1">
                              {stat.data?.map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                  <span className="text-sm text-white">{item.name}</span>
                                  <span className={`text-sm font-bold ${getAccentColor()}`}>{item.percentage}%</span>
                                </div>
                              )) || []}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // Default simple stat - Large typography focus
                    return (
                      <div key={index} className={`relative bg-gray-900/30 rounded-lg ${getLayoutClasses()}`}>
                        <div className="p-4 h-full flex flex-col justify-center items-center text-center">
                          <div className={`${stat.layout === 'tall' ? 'text-5xl' : stat.layout === 'wide' ? 'text-3xl' : 'text-4xl'} font-black ${getAccentColor()} leading-none mb-2`}>
                            {stat.value}
                          </div>
                          <div className="text-sm font-bold text-white uppercase tracking-wide mb-1">
                            {stat.title}
                          </div>
                          <div className="text-xs text-gray-400">{stat.subtitle}</div>
                        </div>
                      </div>
                    )
                  }) || []}
                </div>

                {/* View All Button */}
                <div className="mt-6">
                  <button 
                    onClick={() => setShowAllStats(!showAllStats)}
                    className="w-full p-4 bg-gray-900/30 hover:bg-gray-900/50 transition-colors duration-200 text-center rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-300">
                      {showAllStats ? 'Show Less' : `View All ${allStats.length} Stats`}
                    </span>
                    <span className={`ml-2 text-gray-400 transition-transform duration-200 ${showAllStats ? 'rotate-180' : ''}`}>
                      ↓
                    </span>
                  </button>
                </div>

                {/* Note about rotation */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">Stats refresh on page reload • View all in Profile</p>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Loading state that matches the final layout exactly */}
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const layouts = ['wide', 'square', 'square', 'tall', 'square', 'square']
                  const layout = layouts[index]
                  const getSkeletonClasses = () => {
                    switch (layout) {
                      case 'wide': return 'col-span-2 h-32'
                      case 'tall': return 'col-span-1 h-64' 
                      case 'square':
                      default: return 'col-span-1 h-32'
                    }
                  }
                  
                  return (
                    <div key={index} className={`p-4 bg-gray-900/30 rounded-lg ${getSkeletonClasses()}`}>
                      <div className="animate-pulse bg-gray-800 h-4 mb-3 rounded w-24"></div>
                      <div className="animate-pulse bg-gray-700 h-8 mb-2 rounded w-16"></div>
                      <div className="animate-pulse bg-gray-600 h-3 rounded w-20"></div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}