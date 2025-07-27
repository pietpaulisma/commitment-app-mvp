'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState, memo, useRef } from 'react'
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

// Constant colors array to avoid useMemo issues
const CHART_COLORS = [
  'text-orange-400',
  'text-green-400', 
  'text-purple-400',
  'text-blue-400',
  'text-yellow-400',
  'text-pink-400'
]

// Memoized chart component for performance
const ChartComponent = ({ stat, index, getLayoutClasses }: { stat: any, index: number, getLayoutClasses: (blockType: string) => string }) => {
  // Simple color selection without useMemo to avoid circular dependencies
  const accentColor = CHART_COLORS[index % CHART_COLORS.length] || 'text-blue-400'

  const layoutClasses = getLayoutClasses(stat.layout)

  // Skip placeholder stats from rendering
  if (stat.isPlaceholder) {
    return (
      <div key={index} className={`relative bg-gray-900/10 rounded-lg border-2 border-dashed border-gray-700 ${layoutClasses}`}>
        <div className="p-4 h-full flex flex-col justify-center items-center text-center opacity-30">
          <div className="text-gray-500 text-lg mb-1">{stat.value}</div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">{stat.title}</div>
          <div className="text-xs text-gray-700">{stat.subtitle}</div>
        </div>
      </div>
    )
  }

  // Typography stat - Big number with accent background
  if (stat.type === 'typography_stat') {
    const bgColor = 'bg-gray-900/30' // Use neutral background
    
    return (
      <div key={index} className={`relative ${bgColor} rounded-lg ${layoutClasses} overflow-hidden`}>
        <div className="p-4 h-full flex flex-col">
          <div className="mb-3">
            <div className="text-xs text-white uppercase tracking-wide mb-1">{stat.title}</div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-white leading-none mb-1">
              <span className="text-2xl font-thin">€</span>
              <span className="text-6xl font-black">{stat.value}</span>
            </div>
            {stat.name && (
              <div className="text-sm text-gray-300 font-bold">
                {stat.name}
              </div>
            )}
            {stat.subtitle && (
              <div className="text-xs text-gray-500 font-medium">{stat.subtitle}</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Heatmap grid - 24-hour activity squares
  if (stat.type === 'heatmap_grid') {
    const data = stat.data || []
    const maxActivity = Math.max(...data.map((d: any) => d.activity), 1)
    
    return (
      <div key={index} className={`relative bg-gray-900/20 rounded-lg ${layoutClasses} overflow-hidden`}>
        <div className="p-4 h-full flex flex-col">
          <div className="mb-3">
            <div className="text-xs text-white uppercase tracking-wide mb-1">{stat.title}</div>
          </div>
          
          {/* 24-hour grid (12x2) */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-12 grid-rows-2 gap-1">
              {data.map((hour: any, i: number) => {
                const intensity = (hour.activity / maxActivity) * 100
                const isHigh = intensity > 70
                
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded transition-all duration-500 ${
                      isHigh ? 'bg-orange-400' : 
                      intensity > 30 ? 'bg-gray-500' : 'bg-gray-700'
                    }`}
                    style={{
                      animationDelay: `${i * 30}ms`,
                      animation: 'fadeInScale 0.6s ease-out forwards'
                    }}
                    title={`${hour.hour}:00 - ${hour.activity} logs`}
                  />
                )
              })}
            </div>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Peak: {data.find((h: any) => h.activity === maxActivity)?.hour || '0:00'}
          </div>
        </div>
      </div>
    )
  }

  // Stacked bars for overachievers
  if (stat.type === 'stacked_bars') {
    const data = stat.data || []
    
    return (
      <div key={index} className={`relative bg-gray-900/20 rounded-lg ${layoutClasses} overflow-hidden`}>
        <div className="p-3 h-full flex flex-col">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{stat.title}</div>
          
          <div className="flex-1 flex flex-col justify-center gap-2">
            {data.map((member: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-12 text-xs text-gray-300 font-medium truncate">
                  {member.name}
                </div>
                <div className="flex-1 bg-gray-700 rounded h-4 relative overflow-hidden">
                  <div
                    className={`h-full rounded transition-all duration-700 ${
                      i === 0 ? 'bg-orange-400' : 'bg-gray-500'
                    }`}
                    style={{
                      width: `${Math.min(100, member.percentage)}%`,
                      animationDelay: `${i * 200}ms`,
                      animation: 'slideInLeft 0.8s ease-out forwards'
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-2">
                    <span className="text-xs font-bold text-white">
                      {member.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Time stat with clock icon
  if (stat.type === 'time_stat') {
    const bgColor = accentColor.replace('text-', 'bg-').replace('-400', '-400') + '/20'
    
    return (
      <div key={index} className={`relative ${bgColor} rounded-lg ${layoutClasses} overflow-hidden border border-gray-700/30`}>
        <div className="p-3 h-full flex flex-col justify-center text-center">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{stat.title}</div>
          <div className="text-3xl mb-2">⏰</div>
          <div className={`text-2xl font-black ${accentColor} mb-1 leading-none`}>
            {stat.time}
          </div>
          {stat.subtitle && (
            <div className="text-xs text-gray-400 font-medium">{stat.subtitle}</div>
          )}
        </div>
      </div>
    )
  }

  // Horizontal bar chart - Vertical rectangle with horizontal bars
  if (stat.type === 'horizontal_bar_chart') {
    const data = stat.data || []
    const maxCount = Math.max(...data.map((d: any) => d.count), 1)
    
    return (
      <div key={index} className={`relative bg-gray-900/20 rounded-lg ${layoutClasses} overflow-hidden`}>
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="mb-4">
            <div className="text-xs text-white uppercase tracking-wide mb-1">{stat.title}</div>
            <div className="text-xs text-gray-500">{stat.subtitle}</div>
          </div>
          
          {/* Horizontal Bars */}
          <div className="flex-1 flex flex-col justify-center gap-2">
            {data.map((workout: any, i: number) => {
              const percentage = (workout.count / maxCount) * 100
              const isTop = i === 0
              
              return (
                <div key={i} className="relative">
                  {/* Background bar */}
                  <div className="w-full bg-gray-700 rounded h-6 relative overflow-hidden">
                    {/* Filled bar */}
                    <div 
                      className={`h-full rounded transition-all duration-700 ${
                        isTop ? 'bg-orange-400' : 'bg-gray-500'
                      }`}
                      style={{ 
                        width: `${Math.max(20, percentage)}%`,
                        animationDelay: `${i * 100}ms`,
                        animation: 'slideInLeft 0.8s ease-out forwards'
                      }}
                    />
                    
                    {/* Workout name inside bar */}
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="text-xs font-medium text-white truncate">
                        {workout.name}
                      </span>
                      <span className="ml-auto text-xs font-bold text-white">
                        {workout.count}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Countdown bar chart - Full rectangle bar chart for birthday countdown
  if (stat.type === 'countdown_bar') {
    const daysUntil = stat.daysUntil || 0
    const maxDays = 365
    const progressPercentage = Math.max(0, ((maxDays - daysUntil) / maxDays) * 100)
    
    return (
      <div key={index} className={`relative bg-black rounded-lg ${layoutClasses} overflow-hidden`}>
        {/* Full rectangle progress background */}
        <div 
          className="absolute left-0 top-0 bottom-0 bg-purple-400 transition-all duration-1000 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
        
        {/* Content overlay */}
        <div className="relative p-4 h-full flex flex-col z-10">
          <div className="mb-3">
            <div className="text-xs text-white uppercase tracking-wide mb-1">{stat.title}</div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            {/* Days remaining - big copy */}
            <div className="text-white leading-none mb-1">
              <span className="text-6xl font-black">{daysUntil}</span>
              <span className="text-2xl font-thin ml-1">DAYS</span>
            </div>
            
            {/* Person name with birthday icon */}
            <div className="flex items-center gap-1 text-white">
              <div className="w-3 h-3 bg-white rounded-full relative">
                <div className="absolute top-0.5 left-0.5 w-2 h-1.5 bg-purple-400 rounded-t-full"></div>
              </div>
              <span className="text-sm font-bold">{stat.subtitle}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Line chart - Horizontal rectangular line chart for trends
  if (stat.type === 'line_chart') {
    const data = stat.data || []
    const maxValue = Math.max(...data.map((d: any) => d.points), 1)
    const recordIndex = data.findIndex((d: any) => d.points === maxValue)
    const recordDay = recordIndex >= 0 ? data[recordIndex] : null
    
    return (
      <div key={index} className={`relative bg-gray-900/20 rounded-lg ${layoutClasses} overflow-hidden`}>
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="mb-3">
            <div className="text-xs text-white uppercase tracking-wide mb-1">{stat.title}</div>
            {recordDay && (
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black ${accentColor}`}>
                  {recordDay.points}
                </span>
                <span className={`text-xl font-thin ${accentColor} ml-1`}>
                  PT
                </span>
                <span className="text-xs text-gray-500">MAX {recordDay.day}</span>
              </div>
            )}
          </div>
          
          {/* Vertical Bar Chart */}
          <div className="flex-1 flex items-end gap-1 px-4">
            {data.slice(-40).map((point: any, i: number) => {
              const height = Math.max(2, (point.points / maxValue) * 70)
              const isRecord = data.indexOf(point) === recordIndex
              
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center"
                >
                  {/* Vertical bar */}
                  <div
                    className={`w-0.5 transition-all duration-700 ${
                      isRecord ? 'bg-orange-400' : 'bg-gray-500'
                    }`}
                    style={{ 
                      height: `${height}px`,
                      animationDelay: `${i * 20}ms`,
                      animation: 'slideUpScale 0.8s ease-out forwards',
                      minHeight: '2px'
                    }}
                  />
                  {/* Record highlight dot */}
                  {isRecord && (
                    <div 
                      className="w-2 h-2 bg-orange-400 rounded-full -mt-1 animate-pulse"
                      style={{
                        animationDelay: `${(i * 20) + 400}ms`
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Wide chart - Full width bar chart with enhanced animations and hover
  if (stat.type === 'wide_chart') {
    const maxValue = Math.max(...(stat.data?.map((d: any) => d.points) || [100]))
    const bgColor = accentColor.replace('text-', 'bg-').replace('-400', '-400') + '/20'
    return (
      <div key={index} className={`relative overflow-hidden ${bgColor} rounded-lg ${layoutClasses} group cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105`}>
        {/* Chart implementation continues... */}
        <div className="p-4 h-full flex items-center justify-center">
          <span className={`text-lg font-bold ${accentColor}`}>{stat.title}</span>
        </div>
      </div>
    )
  }

  // Default simple stat display - some get accent backgrounds for visual variety
  const shouldHaveAccentBg = (index % 4 === 1 || index % 4 === 3) // Every 2nd and 4th item
  const bgColor = shouldHaveAccentBg ? 
    accentColor.replace('text-', 'bg-').replace('-400', '') : 
    'bg-gray-900/30'
  const textColor = shouldHaveAccentBg ? 'text-black' : 'text-white'
  const subtitleColor = shouldHaveAccentBg ? 'text-black/70' : 'text-gray-400'
  const valueColor = shouldHaveAccentBg ? 'text-black' : accentColor
  
  return (
    <div key={index} className={`relative ${bgColor} rounded-lg ${layoutClasses} group cursor-pointer hover:shadow-xl transition-all duration-500 ${shouldHaveAccentBg ? 'hover:opacity-90' : 'hover:bg-gray-900/40'}`}>
      <div className="p-3 h-full flex flex-col justify-center items-center text-center">
        <div className={`text-3xl font-black ${valueColor} mb-2 leading-none`}>{stat.value}</div>
        <div className={`text-xs ${textColor} uppercase tracking-wide mb-1`}>{stat.title}</div>
        <div className={`text-xs ${subtitleColor} font-medium`}>{stat.subtitle}</div>
      </div>
    </div>
  )
}

const MemoizedChartComponent = memo(ChartComponent)

export default function RectangularDashboard() {
  // Add keyframe animations for enhanced chart effects
  const chartAnimationStyles = `
    @keyframes slideUpScale {
      0% { transform: scaleY(0); opacity: 0.8; }
      100% { transform: scaleY(1); opacity: 1; }
    }
    @keyframes ringProgress {
      0% { stroke-dashoffset: ${2 * Math.PI * 30}; }
      100% { stroke-dashoffset: 0; }
    }
    @keyframes slideInLeft {
      0% { transform: translateX(-20px); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    @keyframes countUp {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes fadeInScale {
      0% { transform: scale(0.9); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes fadeInUp {
      0% { transform: translateY(10px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
  `
  const { user, loading: authLoading, isDemoMode, exitDemoMode } = useAuth()
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
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())

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

  const getTimeBasedBarColor = () => {
    // Calculate actual hours remaining
    const now = new Date()
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    const hoursRemaining = (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursRemaining <= 1) {
      // Last hour: urgent red
      return 'bg-red-500'
    } else if (hoursRemaining <= 3) {
      // Low time: warning orange
      return 'bg-orange-500'
    } else {
      // Plenty of time: calm blue
      return 'bg-blue-400'
    }
  }

  const getTimeTextColor = () => {
    // Calculate actual hours remaining
    const now = new Date()
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    const hoursRemaining = (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursRemaining <= 1) {
      // Last hour: urgent red text
      return 'text-red-400'
    } else if (hoursRemaining <= 3) {
      // Low time: warning orange text
      return 'text-orange-400'
    } else {
      // Plenty of time: calm blue text
      return 'text-blue-400'
    }
  }


  // Simple time-based gradient calculation without useCallback
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

      // Get group settings and start date for target calculation
      const { data: groupSettings } = await supabase
        .from('group_settings')
        .select('daily_target_base, daily_increment')
        .eq('group_id', profile.group_id)
        .maybeSingle()

      const { data: group } = await supabase
        .from('groups')
        .select('start_date')
        .eq('id', profile.group_id)
        .single()

      // Calculate today's target
      let dailyTarget = 1 // Default fallback (base target = 1)
      if (groupSettings && group?.start_date) {
        const daysSinceStart = Math.floor((new Date().getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24))
        dailyTarget = groupSettings.daily_target_base + (groupSettings.daily_increment * Math.max(0, daysSinceStart))
      } else if (group?.start_date) {
        // Use correct formula even without group settings
        const daysSinceStart = Math.floor((new Date().getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24))
        dailyTarget = 1 + Math.max(0, daysSinceStart)
      }

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
        dailyTarget: dailyTarget,
        isCurrentUser: member.id === user?.id
      }))
      
      // Sort by points descending
      membersWithProgress.sort((a, b) => b.todayPoints - a.todayPoints)
      setGroupMembers(membersWithProgress)
    } catch (error) {
      console.error('Error loading group members:', error)
    }
  }

  const calculateEssentialStats = async () => {
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

      // 1. Group Points (30 days)
      const past30Days = Array.from({length: 30}, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split('T')[0]
      }).reverse()

      const { data: logs } = await supabase
        .from('logs')
        .select('date, points')
        .in('user_id', memberIds)
        .in('date', past30Days)

      const dailyTotals = past30Days.map(date => {
        const dayLogs = logs?.filter(log => log.date === date) || []
        const totalPoints = dayLogs.reduce((sum, log) => sum + log.points, 0)
        return { date, totalPoints }
      })

      const totalGroupPoints = dailyTotals.reduce((sum, day) => sum + day.totalPoints, 0)

      // 2. Money Pot
      const moneyInPot = totalGroupPoints * 0.10
      
      // Find biggest contributor
      const userPointsMap = new Map()
      logs?.forEach(log => {
        userPointsMap.set(log.user_id, (userPointsMap.get(log.user_id) || 0) + log.points)
      })
      
      let biggestContributor = 'No data'
      let maxPoints = 0
      userPointsMap.forEach((points, userId) => {
        if (points > maxPoints) {
          maxPoints = points
          const user = members.find(m => m.id === userId)
          biggestContributor = user?.email.split('@')[0] || 'Unknown'
        }
      })

      // 3. Birthday (fake data for now)
      const nextBirthdayDays = Math.floor(Math.random() * 365) + 1
      const nextBirthdayDate = new Date()
      nextBirthdayDate.setDate(nextBirthdayDate.getDate() + nextBirthdayDays)
      const monthName = nextBirthdayDate.toLocaleString('default', { month: 'long' })
      const dayNum = nextBirthdayDate.getDate()

      // 4. Workout Times
      const { data: timeLogs } = await supabase
        .from('logs')
        .select('created_at')
        .in('user_id', memberIds)

      const hourCounts = new Array(24).fill(0)
      timeLogs?.forEach(log => {
        const hour = new Date(log.created_at).getHours()
        hourCounts[hour]++
      })

      const mostPopularHour = hourCounts.indexOf(Math.max(...hourCounts))
      const peakTime = `${mostPopularHour}:00`

      return {
        groupPoints: {
          title: 'Group Points',
          subtitle: '30-day total',
          value: `${totalGroupPoints} PT`,
          data: dailyTotals.map((day, i) => ({ 
            day: `D${i+1}`, 
            points: day.totalPoints 
          })),
          type: 'line_chart'
        },
        moneyPot: {
          title: 'Money Pot',
          subtitle: `top: ${biggestContributor}`,
          value: Math.max(0, Math.round(moneyInPot * 100) / 100),
          type: 'typography_stat'
        },
        birthday: {
          title: 'Next Birthday',
          subtitle: members[0]?.email?.split('@')[0] || 'Member', // Person whose birthday it is
          value: nextBirthdayDays,
          daysUntil: nextBirthdayDays,
          name: `${monthName} ${dayNum}`,
          doublePoints: true,
          type: 'countdown_bar'
        },
        workoutTimes: {
          title: 'Peak Workout Time',
          subtitle: 'most active hour',
          value: peakTime,
          data: hourCounts.map((count, hour) => ({
            hour: `${hour}:00`,
            count,
            activity: count
          })),
          type: 'heatmap_grid'
        }
      }
    } catch (error) {
      console.error('Error calculating essential stats:', error)
      return null
    }
  }

  const loadGroupStats = async () => {
    if (!profile?.group_id) return

    try {
      const stats = await calculateEssentialStats()
      if (stats) {
        setGroupStats({
          interestingStats: [
            { ...stats.groupPoints, layout: 'col-span-2' }, // Top row - full width
            { ...stats.moneyPot, layout: 'square' },        // Bottom left - square
            { ...stats.birthday, layout: 'square' },        // Bottom right - square  
            { ...stats.workoutTimes, layout: 'col-span-2' } // Bottom - full width rectangle
          ]
        })
      }
    } catch (error) {
      console.error('Error loading group stats:', error)
      setGroupStats({ interestingStats: [] })
    }
  }

  // Predefined 2×4 grid layouts with 8 cells each
  // A = 1×1 (square), B = 1×2 (tall), C = 2×1 (wide)
  const PREDEFINED_LAYOUTS = [
    // Layout 1: A A | A A | B1 A | B2 A  
    [
      { position: 0, type: 'A' }, { position: 1, type: 'A' },
      { position: 2, type: 'A' }, { position: 3, type: 'A' },
      { position: 4, type: 'B1' }, { position: 5, type: 'A' },
      { position: 6, type: 'B2' }, { position: 7, type: 'A' }
    ],
    // Layout 2: C1 C2 | A B1 | A B2 | C1 C2
    [
      { position: 0, type: 'C1' }, { position: 1, type: 'C2' },
      { position: 2, type: 'A' }, { position: 3, type: 'B1' },
      { position: 4, type: 'A' }, { position: 5, type: 'B2' },
      { position: 6, type: 'C1' }, { position: 7, type: 'C2' }
    ],
    // Layout 3: B1 B1 | B2 B2 | A A | C1 C2
    [
      { position: 0, type: 'B1' }, { position: 1, type: 'B1' },
      { position: 2, type: 'B2' }, { position: 3, type: 'B2' },
      { position: 4, type: 'A' }, { position: 5, type: 'A' },
      { position: 6, type: 'C1' }, { position: 7, type: 'C2' }
    ],
    // Layout 4: C1 C2 | C1 C2 | A A | B1 B1
    [
      { position: 0, type: 'C1' }, { position: 1, type: 'C2' },
      { position: 2, type: 'C1' }, { position: 3, type: 'C2' },
      { position: 4, type: 'A' }, { position: 5, type: 'A' },
      { position: 6, type: 'B1' }, { position: 7, type: 'B1' }
    ],
    // Layout 5: A B1 | A B2 | C1 C2 | C1 C2
    [
      { position: 0, type: 'A' }, { position: 1, type: 'B1' },
      { position: 2, type: 'A' }, { position: 3, type: 'B2' },
      { position: 4, type: 'C1' }, { position: 5, type: 'C2' },
      { position: 6, type: 'C1' }, { position: 7, type: 'C2' }
    ],
    // Layout 6: A A | B1 C1 | B2 C2 | A A
    [
      { position: 0, type: 'A' }, { position: 1, type: 'A' },
      { position: 2, type: 'B1' }, { position: 3, type: 'C1' },
      { position: 4, type: 'B2' }, { position: 5, type: 'C2' },
      { position: 6, type: 'A' }, { position: 7, type: 'A' }
    ]
  ]

  // Simple layout classes without useCallback to avoid circular dependencies
  const getLayoutClasses = (blockType: string) => {
    switch (blockType) {
      case 'A': return 'aspect-square' // 1×1 square
      case 'B1': return 'aspect-[1/2]' // 1×2 tall (top part)
      case 'B2': return 'hidden' // 1×2 tall (bottom part - handled by B1)
      case 'C1': return 'aspect-[2/1]' // 2×1 wide (left part)  
      case 'C2': return 'hidden' // 2×1 wide (right part - handled by C1)
      case 'square': return 'aspect-square' // 1×1 square (alias)
      case 'col-span-2': return 'aspect-[2/1]' // 2×1 wide
      case 'vertical': return 'aspect-[1/2]' // 1×2 vertical rectangle
      default: return 'aspect-square'
    }
  }

  // Simple layout selection without useMemo to avoid circular dependencies
  const getSelectedLayout = () => {
    try {
      const currentHour = new Date().getHours()
      const layoutIndex = currentHour % PREDEFINED_LAYOUTS.length
      return PREDEFINED_LAYOUTS[layoutIndex]
    } catch (error) {
      console.error('Error in getSelectedLayout:', error)
      // Return fallback layout
      return PREDEFINED_LAYOUTS[0]
    }
  }

  const getStatLayout = (stats: any[], isShowingAll = false) => {
    
    // Filter out hidden positions (B2, C2)
    const selectedLayout = getSelectedLayout()
    const visiblePositions = selectedLayout.filter(pos => pos.type !== 'B2' && pos.type !== 'C2')
    
    const layouts = []
    let statIndex = 0
    
    if (isShowingAll) {
      // For showing all stats, repeat layouts as needed
      for (let i = 0; i < stats.length; i++) {
        const layoutPos = visiblePositions[i % visiblePositions.length]
        layouts.push({ ...stats[i], layout: layoutPos.type, position: layoutPos.position })
      }
      return layouts
    }
    
    // For main view: use exactly 8 positions but only show visible ones (typically 5-6)
    visiblePositions.forEach((layoutPos) => {
      if (statIndex < stats.length) {
        layouts.push({ ...stats[statIndex], layout: layoutPos.type, position: layoutPos.position })
        statIndex++
      } else {
        // Create placeholder for empty slots
        layouts.push({
          type: 'placeholder',
          layout: layoutPos.type,
          position: layoutPos.position,
          title: 'Coming Soon',
          subtitle: 'More stats',
          value: '...',
          isPlaceholder: true
        })
      }
    })
    
    return layouts
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

        // Load group members and stats
        await Promise.all([loadGroupMembers(), loadGroupStats()])

        // Try to load group settings for rest/recovery days and target calculation
        try {
          const { data: groupSettings, error: settingsError } = await supabase
            .from('group_settings')
            .select('rest_days, recovery_days, accent_color, daily_target_base, daily_increment')
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
    <div className="min-h-screen bg-black pb-32">
      {/* Demo Mode Indicator */}
      {isDemoMode && (
        <div className="bg-orange-900/20 border-b border-orange-600/50 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              <span className="text-orange-200 text-sm font-medium">
                Demo Mode Active - Testing with mock data
              </span>
            </div>
            <button
              onClick={exitDemoMode}
              className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-500 transition-colors"
            >
              Exit Demo Mode
            </button>
          </div>
        </div>
      )}
      
      {/* Inject chart animation styles */}
      <style dangerouslySetInnerHTML={{ __html: chartAnimationStyles }} />
      {/* Time-Based Challenge Header */}
      {groupStartDate && (
        <div className="bg-black border-b border-gray-800 relative overflow-hidden">
          {/* Full-width Bar Chart Background */}
          <div 
            className={`absolute right-0 top-0 bottom-0 transition-all duration-1000 ease-out ${getTimeBasedBarColor()}`}
            style={{ 
              width: `${Math.max(0, 100 - timeRemainingPercentage)}%`
            }}
          />
          
          {/* Content with more vertical padding */}
          <div className="relative px-4 py-10">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-5xl font-thin uppercase tracking-wide text-white">DAY</span>
                  <span className="text-5xl font-black text-white">{challengeDay}</span>
                </div>
                <p className="text-sm font-medium -mt-1 text-white">
                  {getCurrentDayName()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-white">
                  {timeLeft.replace(/h/g, 'h').replace(/m/g, 'm').split('').map((char, i) => (
                    <span key={i} className={char === 'h' || char === 'm' ? 'font-thin' : 'font-black'}>
                      {char}
                    </span>
                  ))}
                </div>
                <div className="text-sm font-medium -mt-1 text-white">
                  remaining
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      <div className="space-y-0">
        {/* Group Status */}
        <div id="group-status" className="bg-black">
          <div className="py-3">
            <h3 className="text-2xl font-bold text-white mb-6 px-4">Status</h3>
            
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
              <div className="space-y-3">
                {/* Group members in rows of 2 */}
                {Array.from({ length: Math.ceil(groupMembers.length / 2) }, (_, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-2 gap-0">
                    {groupMembers.slice(rowIndex * 2, rowIndex * 2 + 2).map((member, colIndex) => {
                      const progressPercentage = Math.round((member.todayPoints / (member.dailyTarget || 100)) * 100)
                      
                      // Default to purple, user can define their own color later
                      const userColor = member.preferredColor || 'bg-purple-400'
                      
                      // Use chat background color (gray-900/30) when no progress
                      const backgroundColor = progressPercentage === 0 ? 'bg-gray-900/30' : 'bg-gray-800'
                      
                      // Left member: center to left edge, Right member: center to right edge
                      const isLeftColumn = colIndex === 0
                      const borderRadius = isLeftColumn ? 'rounded-l-lg' : 'rounded-r-lg'
                      
                      return (
                        <div key={member.id} className={`relative h-12 ${backgroundColor} overflow-hidden ${borderRadius}`}>
                          {/* Progress bar - always fills from left to right */}
                          <div 
                            className={`absolute left-0 top-0 bottom-0 ${userColor} transition-all duration-500 ease-out`}
                            style={{ 
                              width: `${Math.min(100, progressPercentage)}%`
                            }}
                          />
                          
                          {/* Content overlay */}
                          <div className={`absolute inset-0 flex items-center ${
                            isLeftColumn ? 'justify-start pl-4' : 'justify-end pr-4'
                          }`}>
                            <div className={`flex items-center gap-2 ${
                              isLeftColumn ? 'flex-row-reverse' : 'flex-row'
                            }`}>
                              <div className="font-black text-lg text-white">
                                {progressPercentage}%
                              </div>
                              <span className="font-bold text-sm text-white">
                                {member.isCurrentUser ? 'You' : member.email.split('@')[0]}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chats Section */}
        <div id="chats" className="bg-black">
          <div className="py-6">
            <h3 className="text-2xl font-bold text-white mb-6 px-4">Chats</h3>
            
            {recentChats.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-gray-400 font-medium text-lg">No recent messages</p>
                <p className="text-gray-500 text-sm mt-2">Start a conversation with your group</p>
              </div>
            ) : (
              <div className="space-y-1 px-4">
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

        {/* Essential Stats */}
        <div id="group-stats" className="bg-black">
          <div className="py-3">
            <h3 className="text-2xl font-bold text-white mb-6 px-4">Stats</h3>
            
            {groupStats && groupStats.interestingStats && groupStats.interestingStats.length > 0 ? (
              <div className="space-y-0 border-t border-b border-gray-800">
                {/* Top row - Group Points (full width) */}
                <div className="w-full border-b border-gray-800">
                  <MemoizedChartComponent 
                    key={`${groupStats.interestingStats[0].type}-0`}
                    stat={groupStats.interestingStats[0]} 
                    index={0} 
                    getLayoutClasses={getLayoutClasses}
                  />
                </div>
                
                {/* Middle row - Money Pot and Birthday (2 squares) */}
                <div className="grid grid-cols-2 gap-0 border-b border-gray-800">
                  <div className="border-r border-gray-800">
                    <MemoizedChartComponent 
                      key={`${groupStats.interestingStats[1].type}-1`}
                      stat={groupStats.interestingStats[1]} 
                      index={1} 
                      getLayoutClasses={getLayoutClasses}
                    />
                  </div>
                  <MemoizedChartComponent 
                    key={`${groupStats.interestingStats[2].type}-2`}
                    stat={groupStats.interestingStats[2]} 
                    index={2} 
                    getLayoutClasses={getLayoutClasses}
                  />
                </div>
                
                {/* Bottom row - Workout Times (full width rectangle) */}
                <div className="w-full">
                  <MemoizedChartComponent 
                    key={`${groupStats.interestingStats[3].type}-3`}
                    stat={groupStats.interestingStats[3]} 
                    index={3} 
                    getLayoutClasses={getLayoutClasses}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                <div className="p-4 bg-gray-900/30 rounded-lg h-32">
                  <div className="animate-pulse bg-gray-800 h-4 mb-3 rounded w-24"></div>
                  <div className="animate-pulse bg-gray-700 h-8 mb-2 rounded w-16"></div>
                  <div className="animate-pulse bg-gray-600 h-3 rounded w-20"></div>
                </div>
                <div className="grid grid-cols-2 gap-0">
                  <div className="p-4 bg-gray-900/30 rounded-lg h-32">
                    <div className="animate-pulse bg-gray-800 h-4 mb-3 rounded w-24"></div>
                    <div className="animate-pulse bg-gray-700 h-8 mb-2 rounded w-16"></div>
                    <div className="animate-pulse bg-gray-600 h-3 rounded w-20"></div>
                  </div>
                  <div className="p-4 bg-gray-900/30 rounded-lg h-32">
                    <div className="animate-pulse bg-gray-800 h-4 mb-3 rounded w-24"></div>
                    <div className="animate-pulse bg-gray-700 h-8 mb-2 rounded w-16"></div>
                    <div className="animate-pulse bg-gray-600 h-3 rounded w-20"></div>
                  </div>
                </div>
                <div className="p-4 bg-gray-900/30 rounded-lg h-20">
                  <div className="animate-pulse bg-gray-800 h-4 mb-3 rounded w-24"></div>
                  <div className="animate-pulse bg-gray-700 h-8 mb-2 rounded w-16"></div>
                  <div className="animate-pulse bg-gray-600 h-3 rounded w-20"></div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
