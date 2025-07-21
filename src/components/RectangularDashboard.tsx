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
      const { data: members } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .eq('group_id', profile.group_id)

      if (!members) return

      // Get today's progress for each member
      const membersWithProgress = await Promise.all(
        members.map(async (member) => {
          const { data: todayLogs } = await supabase
            .from('logs')
            .select('points')
            .eq('user_id', member.id)
            .eq('date', today)

          const todayPoints = todayLogs?.reduce((sum, log) => sum + log.points, 0) || 0
          
          return {
            ...member,
            todayPoints,
            dailyTarget: 100, // Default target for now
            isCurrentUser: member.id === user?.id
          }
        })
      )

      // Sort by points descending, with current user highlighted
      membersWithProgress.sort((a, b) => b.todayPoints - a.todayPoints)
      setGroupMembers(membersWithProgress)
    } catch (error) {
      console.error('Error loading group members:', error)
    }
  }

  const loadGroupStats = async () => {
    if (!profile?.group_id) return

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

      // Calculate money in pot (example: 1 point = $0.10)
      const moneyInPot = totalPoints * 0.10

      setGroupStats({
        totalPoints,
        moneyInPot,
        memberCount: members.length
      })
    } catch (error) {
      console.error('Error loading group stats:', error)
      // Set default stats if error
      setGroupStats({
        totalPoints: 0,
        moneyInPot: 0,
        memberCount: 0
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

        // Load group members and their daily progress
        await loadGroupMembers()
        await loadGroupStats()

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
                  <p className="text-gray-400 text-sm font-medium -mt-2">
                    {getCurrentDayName()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white">
                    {timeLeft}
                  </div>
                  <div className="text-sm text-gray-400 font-medium -mt-2">
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
            
            {groupStats ? (
              <>
                {/* Hero Stats - Full Width */}
                <div className="-mx-4 mb-6">
                  <div className="px-6 py-8 bg-gray-900/50 border-b-4 border-gray-700">
                    <div className="text-center">
                      <div className="text-6xl font-black text-emerald-400 mb-2">
                        ${groupStats.moneyInPot.toFixed(0)}
                      </div>
                      <div className="text-lg text-gray-300 font-medium uppercase tracking-wide">
                        Money in Pot
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-6 py-8 bg-gradient-to-r from-green-900/40 to-green-800/20 border-b-4 border-green-500">
                    <div className="text-center">
                      <div className="text-6xl font-black text-green-400 mb-2">
                        {(groupStats.totalPoints / 1000).toFixed(1)}k
                      </div>
                      <div className="text-lg text-gray-300 font-medium uppercase tracking-wide">
                        Total Points
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Detailed Stats - Full Width Bars */}
                <div className="-mx-4 space-y-1">
                  <div className="px-6 py-4 bg-gray-900/30 border-l-4 border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-white">Active Members</span>
                      <span className="text-2xl font-bold text-orange-400">{groupStats.memberCount}</span>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-gray-900/30 border-l-4 border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-white">Avg Points/Day</span>
                      <span className="text-2xl font-bold text-orange-400">{Math.round(groupStats.totalPoints / Math.max(1, challengeDay))}</span>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-gray-900/30 border-l-4 border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-white">Challenge Day</span>
                      <span className="text-2xl font-bold text-orange-400">{challengeDay}</span>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-gray-900/30 border-l-4 border-green-600">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-white">Points per $</span>
                      <span className="text-2xl font-bold text-green-400">10</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="-mx-4 mb-6">
                  <div className="px-6 py-12 bg-gray-900/30 border-b-4 border-gray-600">
                    <div className="animate-pulse bg-gradient-to-r from-gray-800 to-gray-700 rounded h-16 mb-4"></div>
                    <div className="animate-pulse bg-gradient-to-r from-gray-700 to-gray-600 rounded h-6"></div>
                  </div>
                  <div className="px-6 py-12 bg-gray-900/30 border-b-4 border-gray-600">
                    <div className="animate-pulse bg-gradient-to-r from-gray-800 to-gray-700 rounded h-16 mb-4"></div>
                    <div className="animate-pulse bg-gradient-to-r from-gray-700 to-gray-600 rounded h-6"></div>
                  </div>
                </div>
                <div className="-mx-4 space-y-1">
                  <div className="px-6 py-4 bg-gray-900/30 border-l-4 border-gray-600">
                    <div className="animate-pulse bg-gradient-to-r from-gray-800 to-gray-700 rounded h-8"></div>
                  </div>
                  <div className="px-6 py-4 bg-gray-900/30 border-l-4 border-gray-600">
                    <div className="animate-pulse bg-gradient-to-r from-gray-800 to-gray-700 rounded h-8"></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}