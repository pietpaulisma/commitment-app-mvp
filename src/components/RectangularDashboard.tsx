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

        const formattedActivity = activityData?.map(activity => ({
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
        <div className="text-center border-4 border-white p-8">
          <div className="animate-spin h-12 w-12 border-4 border-white border-t-red-600 mx-auto"></div>
          <p className="mt-4 text-white font-black uppercase tracking-wider">LOADING...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-black pb-20 pt-8">

      <div className="p-6 space-y-8">
        {/* Recent Chat Messages */}
        <div className="bg-gray-900 border-4 border-white p-6">
          <h3 className="text-xl font-black mb-6 text-white uppercase tracking-wider">RECENT CHATS</h3>
          {recentChats.length === 0 ? (
            <div className="text-center py-8 border-2 border-gray-600">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-gray-300 text-sm font-bold uppercase">NO MESSAGES</p>
              <p className="text-gray-500 text-xs font-bold uppercase mt-1">START TALKING!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentChats.map((chat) => (
                <div key={chat.id} className="flex items-start space-x-4 border-l-4 border-cyan-400 pl-4 py-2">
                  <div className="w-10 h-10 bg-red-600 border-2 border-white flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-black text-white">
                      {chat.user_email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`text-sm font-black uppercase ${
                        chat.is_own_message ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {chat.is_own_message ? 'YOU' : chat.user_email.split('@')[0].toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400 font-bold uppercase">
                        {formatTimeAgo(chat.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 font-medium">{chat.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-900 border-4 border-white p-6">
          <h3 className="text-xl font-black mb-6 text-white uppercase tracking-wider">RECENT ACTIVITY</h3>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 border-2 border-gray-600">
              <div className="text-5xl mb-4">🏃‍♂️</div>
              <p className="text-gray-300 text-sm font-bold uppercase">NO ACTIVITY</p>
              <p className="text-gray-500 text-xs font-bold uppercase mt-1">GET MOVING!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-3 border-l-4 border-green-400 pl-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-600 border-2 border-white flex items-center justify-center">
                      <span className="text-sm font-black text-white">
                        {activity.user_email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-sm font-black uppercase ${
                          activity.is_own_activity ? 'text-yellow-400' : 'text-white'
                        }`}>
                          {activity.is_own_activity ? 'YOU' : activity.user_email.split('@')[0].toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400 font-bold uppercase">
                          {formatTimeAgo(activity.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-200 font-bold uppercase mt-1">{activity.exercise_name}</p>
                    </div>
                  </div>
                  <div className="text-lg font-black text-green-400 border-2 border-green-400 px-3 py-1">
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