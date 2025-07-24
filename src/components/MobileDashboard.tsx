'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type DashboardStats = {
  todayPoints: number
  todayTarget: number
  currentStreak: number
  weeklyTotal: number
  groupRank: number
  totalMembers: number
  recentWorkouts: Array<{
    id: string
    exercise_name: string
    points: number
    created_at: string
  }>
}

export default function MobileDashboard() {
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
    }
  }, [user, profile])

  const loadDashboardStats = async () => {
    if (!user || !profile) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoString = weekAgo.toISOString().split('T')[0]

      // Get today's points
      const { data: todayLogs } = await supabase
        .from('logs')
        .select('points')
        .eq('user_id', user.id)
        .eq('date', today)

      const todayPoints = todayLogs?.reduce((sum, log) => sum + log.points, 0) || 0

      // Get today's target
      let todayTarget = 0
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
          const daysSinceStart = Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
          todayTarget = groupSettings.daily_target_base + (groupSettings.daily_increment * Math.max(0, daysSinceStart))
        }
      }

      // Get weekly total
      const { data: weeklyLogs } = await supabase
        .from('logs')
        .select('points')
        .eq('user_id', user.id)
        .gte('date', weekAgoString)

      const weeklyTotal = weeklyLogs?.reduce((sum, log) => sum + log.points, 0) || 0

      // Get recent workouts
      const { data: recentWorkouts } = await supabase
        .from('logs')
        .select(`
          id,
          points,
          created_at,
          exercises (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      const formattedWorkouts = recentWorkouts?.map(workout => ({
        id: workout.id,
        exercise_name: workout.exercises?.name || 'Unknown',
        points: workout.points,
        created_at: workout.created_at
      })) || []

      // Get current streak (simplified)
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

      // Get group rank (simplified)
      let groupRank = 0
      let totalMembers = 0
      if (profile.group_id) {
        const { data: groupMembers } = await supabase
          .from('profiles')
          .select('id')
          .eq('group_id', profile.group_id)

        totalMembers = groupMembers?.length || 0

        // Simple rank calculation based on today's points
        const { data: memberPoints } = await supabase
          .from('logs')
          .select('user_id, points')
          .eq('date', today)
          .in('user_id', groupMembers?.map(m => m.id) || [])

        const memberTotals = new Map()
        memberPoints?.forEach(log => {
          const current = memberTotals.get(log.user_id) || 0
          memberTotals.set(log.user_id, current + log.points)
        })

        const sortedTotals = Array.from(memberTotals.entries())
          .sort((a, b) => b[1] - a[1])

        groupRank = sortedTotals.findIndex(([userId]) => userId === user.id) + 1
      }

      setStats({
        todayPoints,
        todayTarget,
        currentStreak,
        weeklyTotal,
        groupRank,
        totalMembers,
        recentWorkouts: formattedWorkouts
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || !stats) {
    return null
  }

  const progressPercentage = stats.todayTarget > 0 ? (stats.todayPoints / stats.todayTarget) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
          <p className="text-blue-100 mb-4">Let's crush today's target</p>
          
          {/* Today's Progress Circle */}
          <div className="flex justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="white"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(100, progressPercentage) * 3.14} 314`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold">{Math.round(progressPercentage)}%</div>
                  <div className="text-xs opacity-90">complete</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-lg font-semibold mb-1">
            {stats.todayPoints} / {stats.todayTarget} points
          </div>
          <div className="text-sm text-blue-100">
            {Math.max(0, stats.todayTarget - stats.todayPoints)} points remaining
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{stats.currentStreak}</div>
              <div className="text-sm text-gray-400">Day Streak</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.weeklyTotal}</div>
              <div className="text-sm text-gray-400">Week Total</div>
            </div>
          </div>
        </div>

        {/* Group Position */}
        {stats.totalMembers > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-1">Group Position</div>
              <div className="text-3xl font-bold text-purple-600 mb-1">
                #{stats.groupRank}
              </div>
              <div className="text-sm text-gray-600">
                out of {stats.totalMembers} members today
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link 
              href="/workout"
              className="bg-blue-50 hover:bg-blue-100 text-blue-800 p-4 rounded-lg text-center font-medium transition-colors border border-blue-200"
            >
              <div className="text-xl mb-1">💪</div>
              <div>Log Workout</div>
            </Link>
            <Link 
              href="/targets"
              className="bg-purple-50 hover:bg-purple-100 text-purple-800 p-4 rounded-lg text-center font-medium transition-colors border border-purple-200"
            >
              <div className="text-xl mb-1">🎯</div>
              <div>View Targets</div>
            </Link>
            <Link 
              href="/leaderboard"
              className="bg-yellow-50 hover:bg-yellow-100 text-yellow-800 p-4 rounded-lg text-center font-medium transition-colors border border-yellow-200"
            >
              <div className="text-xl mb-1">🏆</div>
              <div>Leaderboard</div>
            </Link>
            <Link 
              href="/profile"
              className="bg-green-50 hover:bg-green-100 text-green-800 p-4 rounded-lg text-center font-medium transition-colors border border-green-200"
            >
              <div className="text-xl mb-1">👤</div>
              <div>Profile</div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-3">Recent Workouts</h3>
          {stats.recentWorkouts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🏃‍♂️</div>
              <p className="text-gray-600 mb-3">No workouts yet</p>
              <Link 
                href="/workout"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Log Your First Workout
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentWorkouts.slice(0, 3).map(workout => (
                <div key={workout.id} className="flex justify-between items-center py-2">
                  <div>
                    <div className="font-medium text-sm">{workout.exercise_name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(workout.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-green-600">
                    +{workout.points} pts
                  </div>
                </div>
              ))}
              {stats.recentWorkouts.length > 3 && (
                <div className="text-center pt-2">
                  <Link 
                    href="/profile"
                    className="text-blue-600 text-sm font-medium"
                  >
                    View all workouts →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Motivational Message */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl p-4 text-center">
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
          ) : progressPercentage >= 50 ? (
            <>
              <div className="text-xl mb-1">💪</div>
              <div className="font-semibold">Keep going!</div>
              <div className="text-sm opacity-90">You're halfway to your goal</div>
            </>
          ) : (
            <>
              <div className="text-xl mb-1">🚀</div>
              <div className="font-semibold">Let's get started!</div>
              <div className="text-sm opacity-90">Every workout counts</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}