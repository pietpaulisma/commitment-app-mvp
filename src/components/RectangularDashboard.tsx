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
    const bgColor = accentColor.replace('text-', 'bg-').replace('-400', '')
    
    return (
      <div key={index} className={`relative ${bgColor} rounded-lg ${layoutClasses} overflow-hidden`}>
        <div className="p-3 h-full flex flex-col justify-center text-center">
          <div className="text-xs text-black/70 uppercase tracking-wide font-bold mb-1">{stat.title}</div>
          <div className="text-4xl font-black text-black leading-none mb-1">
            {stat.value}
          </div>
          {stat.name && (
            <div className="text-sm text-black/80 font-bold">
              {stat.name}
            </div>
          )}
          {stat.subtitle && (
            <div className="text-xs text-black/60 font-medium">{stat.subtitle}</div>
          )}
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
        <div className="p-2 h-full flex flex-col">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{stat.title}</div>
          
          {/* 24-hour grid (6x4) */}
          <div className="flex-1 grid grid-cols-6 grid-rows-4 gap-1">
            {data.map((hour: any, i: number) => {
              const intensity = (hour.activity / maxActivity) * 100
              const isHigh = intensity > 70
              
              return (
                <div
                  key={i}
                  className={`rounded transition-all duration-500 ${
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
          
          <div className="text-xs text-gray-500 mt-2 text-center">
            Peak: {data.find((h: any) => h.activity === maxActivity)?.hour || 0}:00
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
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{stat.title}</div>
          
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
          <div className="text-xs text-gray-400 uppercase tracking-wide font-bold mb-1">{stat.title}</div>
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
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{stat.title}</div>
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

  // Countdown bar chart - Square typography-focused birthday countdown
  if (stat.type === 'countdown_bar') {
    const daysUntil = stat.daysUntil || 0
    const maxDays = 365
    const progressPercentage = Math.max(0, ((maxDays - daysUntil) / maxDays) * 100)
    
    return (
      <div key={index} className={`relative bg-gray-900/20 rounded-lg ${layoutClasses} overflow-hidden`}>
        <div className="p-4 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="text-left">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{stat.title}</div>
            <div className={`text-2xl font-bold ${accentColor} leading-tight mb-1`}>
              {stat.name}
            </div>
            <div className="text-sm text-gray-300 mb-3">
              {daysUntil === 0 ? 'Today!' : 
               daysUntil === 1 ? 'Tomorrow' : 
               `${daysUntil} days`}
            </div>
          </div>
          
          {/* Countdown Progress Bar */}
          <div className="mb-3">
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div 
                className={`h-1 rounded-full transition-all duration-1000 ${
                  daysUntil <= 7 ? 'bg-orange-400' : 'bg-gray-500'
                }`}
                style={{ 
                  width: `${progressPercentage}%`,
                  animation: 'slideInLeft 1.2s ease-out forwards'
                }}
              />
            </div>
          </div>
          
          {/* Double Points Notice */}
          {stat.doublePoints && (
            <div className="text-left">
              <div className={`text-xs ${accentColor} font-semibold uppercase tracking-wide`}>
                🎉 Double Point Target
              </div>
              <div className="text-xs text-gray-500">
                Birthday workouts count 2x
              </div>
            </div>
          )}
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
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{stat.title}</div>
            {recordDay && (
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${accentColor}`}>
                  {recordDay.points} PT
                </span>
                <span className="text-xs text-gray-500">MAX {recordDay.day}</span>
              </div>
            )}
          </div>
          
          {/* Vertical Bar Chart */}
          <div className="flex-1 flex items-end justify-center gap-1 px-2">
            {data.map((point: any, i: number) => {
              const height = Math.max(2, (point.points / maxValue) * 70)
              const isRecord = i === recordIndex
              
              return (
                <div
                  key={i}
                  className="flex flex-col items-center"
                >
                  {/* Vertical bar */}
                  <div
                    className={`w-1 transition-all duration-700 ${
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
        <div className={`text-xs font-bold ${textColor} uppercase tracking-wide mb-1`}>{stat.title}</div>
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
    // Use time remaining percentage to determine color progression
    // Early day (lots of time left): happy green
    // Mid day (some time left): neutral blue/purple  
    // Late day (little time left): warning yellow then orange
    
    if (timeRemainingPercentage <= 20) {
      // Less than 20% of day left: urgent orange
      return 'bg-orange-400'
    } else if (timeRemainingPercentage <= 40) {
      // Less than 40% of day left: warning yellow
      return 'bg-yellow-400'
    } else if (timeRemainingPercentage <= 70) {
      // Mid-day: neutral purple
      return 'bg-purple-400'
    } else {
      // Early day: happy green
      return 'bg-green-400'
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
      case 'A': return 'col-span-1 row-span-1 h-32' // 1×1 square
      case 'B1': return 'col-span-1 row-span-2 h-64' // 1×2 tall (top part)
      case 'B2': return 'hidden' // 1×2 tall (bottom part - handled by B1)
      case 'C1': return 'col-span-2 row-span-1 h-32' // 2×1 wide (left part)  
      case 'C2': return 'hidden' // 2×1 wide (right part - handled by C1)
      case 'square': return 'col-span-1 row-span-1 h-32' // 1×1 square (alias)
      case 'col-span-2': return 'col-span-2 row-span-1 h-32' // 2×1 wide
      case 'vertical': return 'col-span-1 row-span-2 h-64' // 1×2 vertical rectangle
      default: return 'col-span-1 row-span-1 h-32'
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

        // Load group members
        await loadGroupMembers()

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
    <div className="min-h-screen bg-black pb-32">
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
          <div className="relative px-4 py-6">
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
      )}


      <div className="space-y-0">
        {/* Group Status */}
        <div id="group-status" className="bg-black">
          <div className="px-4 py-3">
            <h3 className="text-xl font-bold text-white mb-3">Status</h3>
            
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
                          {/* Progress bar */}
                          <div 
                            className={`h-full ${userColor} transition-all duration-500 ease-out ${
                              isLeftColumn ? 'origin-right' : 'origin-left'
                            }`}
                            style={{ 
                              width: `${Math.min(100, progressPercentage)}%`,
                              marginLeft: isLeftColumn && progressPercentage > 0 ? 'auto' : '0'
                            }}
                          />
                          
                          {/* Content overlay */}
                          <div className={`absolute inset-0 flex items-center ${
                            isLeftColumn ? 'justify-start pl-4' : 'justify-end pr-4'
                          }`}>
                            <div className={`flex items-center gap-2 ${
                              isLeftColumn ? 'flex-row-reverse' : 'flex-row'
                            }`}>
                              <div className="text-black font-black text-lg">{progressPercentage}%</div>
                              <span className="text-black font-bold text-sm">
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


      </div>
    </div>
  )
}
