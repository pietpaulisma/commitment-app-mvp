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
  const [restDays, setRestDays] = useState<number[]>([1]) // Default Monday (1)
  const [recoveryDays, setRecoveryDays] = useState<number[]>([5]) // Default Friday (5)
  const [accentColor, setAccentColor] = useState('blue') // Default blue

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
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      
      const timeDiff = endOfDay.getTime() - now.getTime()
      const hours = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      
      setTimeLeft(`${hours}h ${minutes}m`)
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
        primary: 'text-blue-400',
        bg: 'bg-blue-900/50',
        border: 'border-blue-400',
        borderL: 'border-l-blue-500'
      },
      'green': {
        primary: 'text-green-400',
        bg: 'bg-green-900/50',
        border: 'border-green-400',
        borderL: 'border-l-green-500'
      },
      'purple': {
        primary: 'text-purple-400',
        bg: 'bg-purple-900/50',
        border: 'border-purple-400',
        borderL: 'border-l-purple-500'
      },
      'orange': {
        primary: 'text-orange-400',
        bg: 'bg-orange-900/50',
        border: 'border-orange-400',
        borderL: 'border-l-orange-500'
      },
      'red': {
        primary: 'text-red-400',
        bg: 'bg-red-900/50',
        border: 'border-red-400',
        borderL: 'border-l-red-500'
      },
      'cyan': {
        primary: 'text-cyan-400',
        bg: 'bg-cyan-900/50',
        border: 'border-cyan-400',
        borderL: 'border-l-cyan-500'
      }
    }
    return colorMap[accentColor as keyof typeof colorMap] || colorMap.blue
  }

  const getDayTypeDisplay = () => {
    const colors = getAccentColors()
    switch (dayType) {
      case 'rest':
        return { title: 'Rest Day', subtitle: 'No exercises required', emoji: '😴', color: colors.primary }
      case 'recovery':
        return { title: 'Recovery Day', subtitle: '15 min recovery exercises', emoji: '🧘', color: 'text-green-400' }
      default:
        return { title: 'Training Day', subtitle: 'Complete your daily target', emoji: '💪', color: colors.primary }
    }
  }

  const getCurrentDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[new Date().getDay()]
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

        // Try to load group settings for rest/recovery days
        try {
          const { data: groupSettings } = await supabase
            .from('group_settings')
            .select('rest_days, recovery_days, accent_color')
            .eq('group_id', profile.group_id)
            .single()

          if (groupSettings) {
            setRestDays(groupSettings.rest_days || [1]) // Default Monday
            setRecoveryDays(groupSettings.recovery_days || [5]) // Default Friday
            setAccentColor(groupSettings.accent_color || 'blue') // Default blue
          }
        } catch (error) {
          console.log('Group settings not available, using defaults')
        }
      }

      // Get recent chat messages
      if (profile.group_id) {
        const { data: chatData } = await supabase
          .from('chat_messages')
          .select(`
            id,
            message,
            created_at,
            user_id,
            profiles (email, role)
          `)
          .eq('group_id', profile.group_id)
          .order('created_at', { ascending: false })
          .limit(5)

        const formattedChats = chatData?.map(chat => ({
          id: chat.id,
          message: chat.message,
          created_at: chat.created_at,
          user_email: chat.profiles?.email || 'Unknown',
          user_role: chat.profiles?.role || 'user',
          is_own_message: chat.user_id === user.id
        })) || []

        setRecentChats(formattedChats)
      }

      // Get recent group activity (workouts from all members)
      let formattedActivity = []
      try {
        if (profile.group_id) {
          const { data: activityData } = await supabase
            .from('logs')
            .select(`
              id,
              user_id,
              points,
              created_at,
              exercises (name),
              profiles!inner (email, group_id)
            `)
            .eq('profiles.group_id', profile.group_id)
            .order('created_at', { ascending: false })
            .limit(8)

          formattedActivity = activityData?.map(activity => ({
          id: activity.id,
          user_email: activity.profiles?.email || 'Unknown',
          exercise_name: activity.exercises?.name || 'Unknown Exercise',
          points: activity.points,
          created_at: activity.created_at,
          is_own_activity: activity.user_id === user.id
        })) || []

          setRecentActivity(formattedActivity)
        }
      } catch (error) {
        console.log('Logs table not accessible, skipping activity data')
        setRecentActivity([])
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
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'supreme_admin':
        return 'text-purple-400'
      case 'group_admin':
        return 'text-blue-400'
      default:
        return 'text-gray-400'
    }
  }

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-500 mx-auto"></div>
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
    <div className="min-h-screen bg-black pb-20 pt-2">
      {/* Time-Based Challenge Header */}
      {groupStartDate && (
        <div className="bg-black border-b border-gray-800">
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-2xl font-black text-white tracking-tight">
                DAY {challengeDay}
              </h2>
              <p className="text-gray-400 text-sm font-medium mt-1">
                {getCurrentDayName()}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Day Type */}
              <div className="text-center">
                <div className="text-3xl mb-2">{dayTypeInfo.emoji}</div>
                <div className={`font-bold text-base tracking-tight uppercase ${dayTypeInfo.color}`}>
                  {dayTypeInfo.title}
                </div>
                <div className="text-xs text-gray-400 mt-1 font-medium">
                  {dayTypeInfo.subtitle}
                </div>
              </div>

              {/* Time Left */}
              <div className="text-center">
                <ClockIcon className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <div className="font-medium text-sm text-gray-300 tracking-tight">
                  {timeLeft} left
                </div>
                <div className="text-xs text-gray-500 mt-1 font-medium">
                  Countdown
                </div>
              </div>
            </div>

            {dayType === 'rest' && (
              <div className={`${colors.bg} p-4 text-center border-l-4 ${colors.border}`}>
                <p className={`${colors.primary.replace('400', '200')} font-medium text-sm`}>
                  🛌 Enjoy your rest day! No exercises required today.
                </p>
              </div>
            )}

            {dayType === 'recovery' && (
              <div className="bg-green-900/50 p-4 text-center border-l-4 border-green-400">
                <p className="text-green-200 font-medium text-sm">
                  🧘 Recovery day: Focus on 15 minutes of stretching, yoga, or meditation.
                </p>
              </div>
            )}

            {dayType === 'normal' && (
              <div className={`${colors.bg} p-4 text-center border-l-4 ${colors.border}`}>
                <p className={`${colors.primary.replace('400', '200')} font-medium text-sm`}>
                  💪 Training day: Complete your daily target to stay on track!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-0">
        {/* Recent Chat Messages */}
        <div className="bg-black border-b border-gray-800">
          <div className="p-4">
            <h3 className="text-lg font-bold text-white mb-4 tracking-tight uppercase">RECENT CHATS</h3>
            {recentChats.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-3">💬</div>
                <p className="text-gray-400 font-medium text-sm">No recent messages</p>
                <p className="text-gray-500 text-xs mt-1 font-medium">Start a conversation with your group!</p>
              </div>
          ) : (
            <div className="space-y-3">
              {recentChats.map((chat) => (
                <div key={chat.id} className={`flex items-start space-x-3 border-l-2 ${colors.borderL} pl-3 py-1`}>
                  <div className="w-6 h-6 bg-gray-700 flex items-center justify-center flex-shrink-0 text-xs">
                    <span className="text-xs font-medium text-gray-300">
                      {chat.user_email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`font-semibold text-xs ${
                        chat.is_own_message ? colors.primary : 'text-white'
                      }`}>
                        {chat.is_own_message ? 'You' : chat.user_email.split('@')[0]}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        {formatTimeAgo(chat.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{chat.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-black">
          <div className="p-4">
            <h3 className="text-lg font-bold text-white mb-4 tracking-tight uppercase">RECENT ACTIVITY</h3>
            {recentActivity.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-3">🏃‍♂️</div>
                <p className="text-gray-400 font-medium text-sm">No recent activity</p>
                <p className="text-gray-500 text-xs mt-1 font-medium">Start logging workouts to see group activity!</p>
              </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-1 border-l-2 border-green-500 pl-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-700 flex items-center justify-center text-xs">
                      <span className="text-xs font-medium text-gray-300">
                        {activity.user_email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold text-xs ${
                          activity.is_own_activity ? colors.primary : 'text-white'
                        }`}>
                          {activity.is_own_activity ? 'You' : activity.user_email.split('@')[0]}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {formatTimeAgo(activity.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 font-medium">{activity.exercise_name}</p>
                    </div>
                  </div>
                  <div className="font-bold text-green-400">
                    +{activity.points}
                  </div>
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