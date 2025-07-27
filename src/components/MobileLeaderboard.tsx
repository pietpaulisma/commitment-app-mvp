'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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

export default function MobileLeaderboard() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  
  const [individualLeaderboard, setIndividualLeaderboard] = useState<LeaderboardEntry[]>([])
  const [groupLeaderboard, setGroupLeaderboard] = useState<GroupLeaderboard[]>([])
  const [timeframe, setTimeframe] = useState<'all' | '30' | '7'>('all')
  const [loading, setLoading] = useState(true)
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null)
  const [activeTab, setActiveTab] = useState<'individual' | 'groups'>('individual')

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
      let dateFilter = ''
      if (timeframe !== 'all') {
        const days = timeframe === '30' ? 30 : 7
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        dateFilter = cutoffDate.toISOString()
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          id, email, location, group_id,
          groups(name)
        `)

      if (!profiles) return

      const leaderboardData = await Promise.all(
        profiles.map(async (profile) => {
          let query = supabase
            .from('logs')
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
            rank: 0
          }
        })
      )

      const sortedLeaderboard = leaderboardData
        .sort((a, b) => b.total_points - a.total_points)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))

      const userRank = sortedLeaderboard.find(entry => entry.user_id === user.id)

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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return null
    }
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold text-gray-900 text-center">Leaderboard</h1>
        <p className="text-sm text-gray-600 text-center">See how you rank</p>
      </div>

      {/* Timeframe Filter */}
      <div className="p-4">
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as 'all' | '30' | '7')}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
        >
          <option value="all">All Time</option>
          <option value="30">Last 30 Days</option>
          <option value="7">Last 7 Days</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading leaderboard...</p>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {/* Your Rank Card */}
          {currentUserRank && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow text-white p-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Your Rank - {getTimeframeName()}</h3>
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">#{currentUserRank.rank}</div>
                    <div className="text-blue-100 text-sm">Position</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{currentUserRank.total_points}</div>
                    <div className="text-blue-100 text-sm">Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{currentUserRank.total_workouts}</div>
                    <div className="text-blue-100 text-sm">Workouts</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Selector */}
          <div className="bg-white rounded-xl shadow-sm p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setActiveTab('individual')}
                className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                  activeTab === 'individual'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                  activeTab === 'groups'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Groups
              </button>
            </div>
          </div>

          {/* Individual Leaderboard */}
          {activeTab === 'individual' && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Individual Rankings</h3>
              {individualLeaderboard.slice(0, 20).map((entry) => (
                <div 
                  key={entry.user_id} 
                  className={`bg-white rounded-xl p-4 shadow-sm ${
                    entry.user_id === user.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">
                          {getRankIcon(entry.rank) || `#${entry.rank}`}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {entry.user_id === user.id ? 'You' : entry.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {entry.group_name || 'No group'} • {entry.location}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">{entry.total_points}</div>
                      <div className="text-sm text-gray-500">{entry.total_workouts} workouts</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Group Leaderboard */}
          {activeTab === 'groups' && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Group Rankings</h3>
              {groupLeaderboard.map((group, index) => (
                <div 
                  key={group.group_id} 
                  className={`bg-white rounded-xl p-4 shadow-sm ${
                    profile?.groups?.name === group.group_name ? 'ring-2 ring-green-500 bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">
                          {getRankIcon(index + 1) || `#${index + 1}`}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {group.group_name}
                          {profile?.groups?.name === group.group_name && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Your group
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {group.member_count} members
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">{group.total_points}</div>
                      <div className="text-sm text-gray-500">
                        {group.avg_points_per_member.toFixed(1)} avg
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {groupLeaderboard.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No group data available</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}