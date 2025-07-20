'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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

  const loadDashboardData = async () => {
    if (!user || !profile) return

    try {
      // Get group name
      if (profile.group_id) {
        const { data: group } = await supabase
          .from('groups')
          .select('name')
          .eq('id', profile.group_id)
          .single()
        setGroupName(group?.name || 'Your Group')
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

  return (
    <div className="min-h-screen bg-black pb-20 pt-6">

      <div className="p-4 space-y-6">
        {/* Recent Chat Messages */}
        <div className="bg-gray-900 border border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Recent Chats</h3>
          {recentChats.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-gray-400 text-sm">No recent messages</p>
              <p className="text-gray-500 text-xs">Start a conversation with your group!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentChats.map((chat) => (
                <div key={chat.id} className="flex items-start space-x-3 border-l-2 border-blue-500 pl-3 py-2">
                  <div className="w-8 h-8 bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-gray-300">
                      {chat.user_email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-sm font-medium ${
                        chat.is_own_message ? 'text-blue-400' : 'text-white'
                      }`}>
                        {chat.is_own_message ? 'You' : chat.user_email.split('@')[0]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(chat.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 truncate">{chat.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-900 border border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">🏃‍♂️</div>
              <p className="text-gray-400 text-sm">No recent activity</p>
              <p className="text-gray-500 text-xs">Start logging workouts to see group activity!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-l-2 border-green-500 pl-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-700 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-300">
                        {activity.user_email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${
                          activity.is_own_activity ? 'text-blue-400' : 'text-white'
                        }`}>
                          {activity.is_own_activity ? 'You' : activity.user_email.split('@')[0]}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(activity.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{activity.exercise_name}</p>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-green-400">
                    +{activity.points}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}