'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RoleBasedNavigation from '@/components/RoleBasedNavigation'
import { supabase } from '@/lib/supabase'

type LeaderboardEntry = {
  user_id: string
  email: string
  location: string
  group_name: string | null
  total_points: number
  total_workouts: number
  avg_points_per_workout: number
  last_workout: string | null
  rank: number
}

type GroupLeaderboard = {
  group_id: string
  group_name: string
  total_points: number
  member_count: number
  avg_points_per_member: number
}

export default function LeaderboardPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  
  const [individualLeaderboard, setIndividualLeaderboard] = useState<LeaderboardEntry[]>([])
  const [groupLeaderboard, setGroupLeaderboard] = useState<GroupLeaderboard[]>([])
  const [timeframe, setTimeframe] = useState<'all' | '30' | '7'>('all')
  const [loading, setLoading] = useState(true)
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && profile) {
      loadLeaderboardData()
    }
  }, [user, profile, timeframe])

  const loadLeaderboardData = async () => {
    if (!user) return

    try {
      // Calculate date filter based on timeframe
      let dateFilter = ''
      if (timeframe !== 'all') {
        const days = timeframe === '30' ? 30 : 7
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        dateFilter = cutoffDate.toISOString()
      }

      // Load all users with their workout stats
      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          id, email, location, group_id,
          groups(name)
        `)

      if (!profiles) return

      // Calculate stats for each user
      const leaderboardData = await Promise.all(
        profiles.map(async (profile) => {
          let query = supabase
            .from('workout_logs')
            .select('points, created_at')
            .eq('user_id', profile.id)

          if (dateFilter) {
            query = query.gte('created_at', dateFilter)
          }

          const { data: workouts } = await query

          const totalPoints = workouts?.reduce((sum, w) => sum + (w.points || 0), 0) || 0
          const totalWorkouts = workouts?.length || 0
          const avgPointsPerWorkout = totalWorkouts > 0 ? totalPoints / totalWorkouts : 0
          
          const lastWorkout = workouts && workouts.length > 0 
            ? workouts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
            : null

          return {
            user_id: profile.id,
            email: profile.email,
            location: profile.location,
            group_name: profile.groups?.name || null,
            total_points: totalPoints,
            total_workouts: totalWorkouts,
            avg_points_per_workout: avgPointsPerWorkout,
            last_workout: lastWorkout,
            rank: 0 // Will be set after sorting
          }
        })
      )

      // Sort by total points and assign ranks
      const sortedLeaderboard = leaderboardData
        .sort((a, b) => b.total_points - a.total_points)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))

      // Find current user's rank
      const userRank = sortedLeaderboard.find(entry => entry.user_id === user.id)

      // Group leaderboard
      const groupStats: Record<string, { total_points: number; member_count: number; group_name: string }> = {}
      
      sortedLeaderboard.forEach(entry => {
        if (entry.group_name) {
          const groupKey = entry.group_name
          if (!groupStats[groupKey]) {
            groupStats[groupKey] = { total_points: 0, member_count: 0, group_name: entry.group_name }
          }
          groupStats[groupKey].total_points += entry.total_points
          groupStats[groupKey].member_count += 1
        }
      })

      const groupLeaderboardData = Object.entries(groupStats)
        .map(([group_id, stats]) => ({
          group_id,
          group_name: stats.group_name,
          total_points: stats.total_points,
          member_count: stats.member_count,
          avg_points_per_member: stats.member_count > 0 ? stats.total_points / stats.member_count : 0
        }))
        .sort((a, b) => b.total_points - a.total_points)

      setIndividualLeaderboard(sortedLeaderboard)
      setGroupLeaderboard(groupLeaderboardData)
      setCurrentUserRank(userRank || null)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTimeframeName = () => {
    switch (timeframe) {
      case '7': return 'Last 7 Days'
      case '30': return 'Last 30 Days'
      default: return 'All Time'
    }
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleBasedNavigation />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
            <p className="text-gray-600">See how you rank against other users</p>
          </div>
          <div className="flex gap-2">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as 'all' | '30' | '7')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="30">Last 30 Days</option>
              <option value="7">Last 7 Days</option>
            </select>
            <button
              onClick={signOut}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading leaderboard...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Your Rank Card */}
            {currentUserRank && (
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow text-white p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Your Rank - {getTimeframeName()}</h3>
                    <p className="text-blue-100">You're doing great! Keep it up!</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">#{currentUserRank.rank}</div>
                    <div className="text-blue-100">{currentUserRank.total_points} points</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Individual Leaderboard */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Individual Leaderboard - {getTimeframeName()}</h3>
                </div>
                
                <div className="overflow-y-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workouts</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {individualLeaderboard.slice(0, 50).map((entry) => (
                        <tr key={entry.user_id} className={`hover:bg-gray-50 ${entry.user_id === user.id ? 'bg-blue-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {entry.rank <= 3 && (
                                <span className="mr-2">
                                  {entry.rank === 1 && '🥇'}
                                  {entry.rank === 2 && '🥈'}
                                  {entry.rank === 3 && '🥉'}
                                </span>
                              )}
                              <span className={`text-sm font-medium ${entry.user_id === user.id ? 'text-blue-600' : 'text-gray-900'}`}>
                                #{entry.rank}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {entry.user_id === user.id ? 'You' : entry.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {entry.group_name || 'No group'} • {entry.location}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {entry.total_points}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.total_workouts}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Group Leaderboard */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Group Leaderboard - {getTimeframeName()}</h3>
                </div>
                
                <div className="overflow-y-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Points</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg/Member</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {groupLeaderboard.map((group, index) => (
                        <tr key={group.group_id} className={`hover:bg-gray-50 ${profile?.groups?.name === group.group_name ? 'bg-green-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {index < 3 && (
                                <span className="mr-2">
                                  {index === 0 && '🥇'}
                                  {index === 1 && '🥈'}
                                  {index === 2 && '🥉'}
                                </span>
                              )}
                              <span className={`text-sm font-medium ${profile?.groups?.name === group.group_name ? 'text-green-600' : 'text-gray-900'}`}>
                                #{index + 1}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {group.group_name}
                              {profile?.groups?.name === group.group_name && ' (Your group)'}
                            </div>
                            <div className="text-sm text-gray-500">{group.member_count} members</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {group.total_points}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {group.avg_points_per_member.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {groupLeaderboard.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No group data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}