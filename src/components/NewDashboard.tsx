'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type GroupMemberStats = {
  id: string
  email: string
  role: string
  todayPoints: number
  todayTarget: number
  currentStreak: number
  isOnline?: boolean
}

type DashboardStats = {
  todayPoints: number
  todayTarget: number
  currentStreak: number
  weeklyTotal: number
  groupRank: number
  totalMembers: number
  groupMembers: GroupMemberStats[]
  groupName: string
}

export default function NewDashboard() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && profile) {
      loadDashboardStats()
      // Set up real-time updates
      const interval = setInterval(loadDashboardStats, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [user, profile])

  const loadDashboardStats = async () => {
    if (!user || !profile) return

    try {
      const today = new Date().toISOString().split('T')[0]

      // Get group name
      let groupName = ''
      if (profile.group_id) {
        const { data: group } = await supabase
          .from('groups')
          .select('name')
          .eq('id', profile.group_id)
          .single()
        groupName = group?.name || 'Your Group'
      }

      // Get current user's stats
      const { data: todayLogs } = await supabase
        .from('logs')
        .select('points')
        .eq('user_id', user.id)
        .eq('date', today)

      const todayPoints = todayLogs?.reduce((sum, log) => sum + log.points, 0) || 0

      // Get target
      let todayTarget = 100
      if (profile.group_id) {
        const { data: groupSettings, error: settingsError } = await supabase
          .from('group_settings')
          .select('*')
          .eq('group_id', profile.group_id)
          .maybeSingle()
        
        if (settingsError) {
          console.log('Error loading group settings:', settingsError)
        }

        if (groupSettings) {
          // Get group start date for proper target calculation
          const { data: group } = await supabase
            .from('groups')
            .select('start_date')
            .eq('id', profile.group_id)
            .single()

          const daysSinceStart = group?.start_date 
            ? Math.floor((new Date().getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24))
            : Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
          todayTarget = groupSettings.daily_target_base + (groupSettings.daily_increment * Math.max(0, daysSinceStart))
        }
      }

      // Get weekly total
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoString = weekAgo.toISOString().split('T')[0]

      const { data: weeklyLogs } = await supabase
        .from('logs')
        .select('points')
        .eq('user_id', user.id)
        .gte('date', weekAgoString)

      const weeklyTotal = weeklyLogs?.reduce((sum, log) => sum + log.points, 0) || 0

      // Get current streak
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('date, is_complete')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30)

      let currentStreak = 0
      if (checkins) {
        for (const checkin of checkins) {
          if (checkin.is_complete) {
            currentStreak++
          } else {
            break
          }
        }
      }

      // Get group members stats
      let groupMembers: GroupMemberStats[] = []
      let groupRank = 0
      let totalMembers = 0

      if (profile.group_id) {
        const { data: groupMembersData } = await supabase
          .from('profiles')
          .select('id, email, role, created_at')
          .eq('group_id', profile.group_id)

        totalMembers = groupMembersData?.length || 0

        // Get today's points for all group members
        const memberIds = groupMembersData?.map(m => m.id) || []
        const { data: memberLogs } = await supabase
          .from('logs')
          .select('user_id, points')
          .eq('date', today)
          .in('user_id', memberIds)

        // Calculate points per member
        const memberPointsMap = new Map()
        memberLogs?.forEach(log => {
          const current = memberPointsMap.get(log.user_id) || 0
          memberPointsMap.set(log.user_id, current + log.points)
        })

        // Get streaks for all members
        const { data: memberCheckins } = await supabase
          .from('daily_checkins')
          .select('user_id, date, is_complete')
          .in('user_id', memberIds)
          .order('date', { ascending: false })

        const memberStreaksMap = new Map()
        memberIds.forEach(memberId => {
          const memberCheckinData = memberCheckins?.filter(c => c.user_id === memberId) || []
          let streak = 0
          for (const checkin of memberCheckinData) {
            if (checkin.is_complete) {
              streak++
            } else {
              break
            }
          }
          memberStreaksMap.set(memberId, streak)
        })

        // Build group members array
        groupMembers = groupMembersData?.map(member => {
          const memberPoints = memberPointsMap.get(member.id) || 0
          
          // Calculate member's target
          let memberTarget = todayTarget // Use same base logic
          if (profile.group_id) {
            const daysSinceStart = Math.floor((new Date().getTime() - new Date(member.created_at).getTime()) / (1000 * 60 * 60 * 24))
            // You can adjust this if members should have different targets
            memberTarget = todayTarget // For now, same target for all
          }

          return {
            id: member.id,
            email: member.email,
            role: member.role,
            todayPoints: memberPoints,
            todayTarget: memberTarget,
            currentStreak: memberStreaksMap.get(member.id) || 0,
            isOnline: false // You can implement this with presence tracking
          }
        }).sort((a, b) => b.todayPoints - a.todayPoints) || []

        // Calculate user's rank
        groupRank = groupMembers.findIndex(member => member.id === user.id) + 1
      }

      setStats({
        todayPoints,
        todayTarget,
        currentStreak,
        weeklyTotal,
        groupRank,
        totalMembers,
        groupMembers,
        groupName
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || !stats) {
    return null
  }

  const progressPercentage = stats.todayTarget > 0 ? (stats.todayPoints / stats.todayTarget) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Personal Stats Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white p-6">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-1">Your Progress</h1>
          <p className="text-blue-100 text-sm mb-4">{stats.groupName}</p>
          
          {/* Personal Progress */}
          <div className="flex justify-center mb-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  stroke="white"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(100, progressPercentage) * 2.83} 283`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-bold">{Math.round(progressPercentage)}%</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-lg font-semibold mb-1">
            {stats.todayPoints} / {stats.todayTarget} points
          </div>
          <div className="text-sm text-blue-100">
            Rank #{stats.groupRank} of {stats.totalMembers}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Personal Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
            <div className="text-center">
              <div className="text-xl font-bold text-orange-400">{stats.currentStreak}</div>
              <div className="text-xs text-gray-400">Day Streak</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{stats.weeklyTotal}</div>
              <div className="text-xs text-gray-400">Week Total</div>
            </div>
          </div>
        </div>

        {/* Group Members Live Status */}
        <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-white">Group Status - Today</h3>
          {stats.groupMembers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-gray-400 mb-3">No group members found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.groupMembers.map((member, index) => {
                const memberProgress = member.todayTarget > 0 ? (member.todayPoints / member.todayTarget) * 100 : 0
                const isCurrentUser = member.id === user.id
                
                return (
                  <div 
                    key={member.id} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isCurrentUser ? 'bg-blue-900/30 border border-blue-700' : 'bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-bold ${
                          index === 0 ? 'text-yellow-400' : 
                          index === 1 ? 'text-gray-300' : 
                          index === 2 ? 'text-orange-400' : 'text-gray-400'
                        }`}>
                          #{index + 1}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${
                          member.isOnline ? 'bg-green-400' : 'bg-gray-500'
                        }`}></div>
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${isCurrentUser ? 'text-blue-300' : 'text-white'}`}>
                          {isCurrentUser ? 'You' : member.email.split('@')[0]}
                          {member.role !== 'user' && (
                            <span className="ml-2 text-xs text-purple-400">
                              {member.role === 'group_admin' ? 'Admin' : 'Supreme'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {member.todayPoints} pts • {member.currentStreak} day streak
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className={`text-sm font-bold ${
                          memberProgress >= 100 ? 'text-green-400' : 
                          memberProgress >= 75 ? 'text-yellow-400' : 'text-gray-400'
                        }`}>
                          {Math.round(memberProgress)}%
                        </div>
                      </div>
                      <div className="w-12 h-2 bg-gray-600 rounded-full">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            memberProgress >= 100 ? 'bg-green-400' : 
                            memberProgress >= 75 ? 'bg-yellow-400' : 'bg-blue-400'
                          }`}
                          style={{ width: `${Math.min(100, memberProgress)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Group Summary */}
        <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
          <h3 className="text-lg font-semibold mb-3 text-white">Group Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">
                {stats.groupMembers.filter(m => (m.todayPoints / m.todayTarget) >= 1).length}
              </div>
              <div className="text-xs text-gray-400">Completed Today</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-400">
                {Math.round(stats.groupMembers.reduce((sum, m) => sum + (m.todayPoints / m.todayTarget), 0) / stats.groupMembers.length * 100) || 0}%
              </div>
              <div className="text-xs text-gray-400">Group Average</div>
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl p-4 text-center">
          {progressPercentage >= 100 ? (
            <>
              <div className="text-xl mb-1">🎉</div>
              <div className="font-semibold">Target Complete!</div>
              <div className="text-sm opacity-90">Great job today!</div>
            </>
          ) : progressPercentage >= 75 ? (
            <>
              <div className="text-xl mb-1">🔥</div>
              <div className="font-semibold">Almost there!</div>
              <div className="text-sm opacity-90">You're so close to your target</div>
            </>
          ) : (
            <>
              <div className="text-xl mb-1">💪</div>
              <div className="font-semibold">Keep pushing!</div>
              <div className="text-sm opacity-90">Tap the workout button to log activity</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}