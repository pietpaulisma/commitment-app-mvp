'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RoleBasedNavigation from '@/components/RoleBasedNavigation'
import { supabase } from '@/lib/supabase'

type GroupSettings = {
  id: string
  group_id: string
  daily_target_base: number
  daily_increment: number
  penalty_amount: number
  recovery_percentage: number
  current_pot: number
}

type DailyCheckin = {
  id: string
  user_id: string
  checkin_date: string
  target_points: number
  total_points: number
  recovery_points: number
  is_complete: boolean
  penalty_paid: boolean
  penalty_amount: number
}

type TargetProgress = {
  date: string
  target: number
  earned: number
  isComplete: boolean
  penaltyAmount: number
  streak: number
}

export default function TargetsPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  
  const [groupSettings, setGroupSettings] = useState<GroupSettings | null>(null)
  const [recentProgress, setRecentProgress] = useState<TargetProgress[]>([])
  const [todayProgress, setTodayProgress] = useState<TargetProgress | null>(null)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [totalPenalties, setTotalPenalties] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && profile) {
      loadTargetData()
    }
  }, [user, profile])

  const loadTargetData = async () => {
    if (!user || !profile?.group_id) {
      setLoading(false)
      return
    }

    try {
      // Load group settings
      const { data: settings, error: settingsError } = await supabase
        .from('group_settings')
        .select('*')
        .eq('group_id', profile.group_id)
        .single()

      if (settingsError) throw settingsError

      // Load recent daily checkins for this user
      const { data: checkins, error: checkinsError } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('checkin_date', { ascending: false })
        .limit(30)

      if (checkinsError) throw checkinsError

      // Calculate target progression for the last 30 days
      const today = new Date()
      const progressData: TargetProgress[] = []
      let currentStreakCount = 0
      let longestStreakCount = 0
      let tempStreak = 0
      let totalPenaltyAmount = 0

      for (let i = 29; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateString = date.toISOString().split('T')[0]

        // Calculate target for this date
        const daysSinceStart = Math.floor((date.getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
        const target = settings.daily_target_base + (settings.daily_increment * Math.max(0, daysSinceStart))

        // Find checkin for this date
        const checkin = checkins?.find(c => c.checkin_date === dateString)
        
        const earned = checkin?.total_points || 0
        const isComplete = checkin?.is_complete || false
        const penaltyAmount = checkin?.penalty_amount || 0

        if (penaltyAmount > 0) {
          totalPenaltyAmount += penaltyAmount
        }

        // Calculate streaks
        if (isComplete) {
          tempStreak++
          if (i === 0) { // Today or most recent
            currentStreakCount = tempStreak
          }
        } else {
          if (tempStreak > longestStreakCount) {
            longestStreakCount = tempStreak
          }
          tempStreak = 0
        }

        progressData.push({
          date: dateString,
          target,
          earned,
          isComplete,
          penaltyAmount,
          streak: tempStreak
        })
      }

      // Final streak check
      if (tempStreak > longestStreakCount) {
        longestStreakCount = tempStreak
      }

      setGroupSettings(settings)
      setRecentProgress(progressData.reverse()) // Chronological order
      setTodayProgress(progressData[progressData.length - 1])
      setCurrentStreak(currentStreakCount)
      setLongestStreak(longestStreakCount)
      setTotalPenalties(totalPenaltyAmount)
    } catch (error) {
      console.error('Error loading target data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysUntilTarget = (target: number, currentPoints: number, avgPointsPerWorkout: number = 50) => {
    if (currentPoints >= target) return 0
    const remainingPoints = target - currentPoints
    return Math.ceil(remainingPoints / avgPointsPerWorkout)
  }

  const getTargetCompletionRate = () => {
    const completedDays = recentProgress.filter(p => p.isComplete).length
    return recentProgress.length > 0 ? (completedDays / recentProgress.length) * 100 : 0
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

  if (!profile.group_id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <RoleBasedNavigation />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Daily Targets</h1>
            <p className="text-gray-600">You need to be assigned to a group to track daily targets.</p>
            <p className="text-gray-600">Contact an administrator to join a group.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleBasedNavigation />
      
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daily Targets</h1>
            <p className="text-gray-600">Track your daily target progression and performance</p>
          </div>
          <button
            onClick={signOut}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading target data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Today's Target Card */}
            {todayProgress && (
              <div className={`rounded-lg shadow p-6 ${
                todayProgress.isComplete ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'
              } text-white`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {todayProgress.isComplete ? "🎯 Today's Target Complete!" : "🎯 Today's Target"}
                    </h3>
                    <div className="space-y-1">
                      <p className="text-sm opacity-90">Target: {todayProgress.target} points</p>
                      <p className="text-sm opacity-90">Earned: {todayProgress.earned} points</p>
                      <p className="text-sm opacity-90">
                        Remaining: {Math.max(0, todayProgress.target - todayProgress.earned)} points
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {Math.round((todayProgress.earned / todayProgress.target) * 100)}%
                    </div>
                    <div className="text-sm opacity-90">
                      {todayProgress.isComplete ? 'Complete' : 'Progress'}
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="bg-white bg-opacity-30 rounded-full h-2">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-300"
                      style={{ width: `${Math.min(100, (todayProgress.earned / todayProgress.target) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">Current Streak</div>
                <div className="text-2xl font-bold text-green-600">{currentStreak} days</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">Longest Streak</div>
                <div className="text-2xl font-bold text-blue-600">{longestStreak} days</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">Completion Rate</div>
                <div className="text-2xl font-bold text-purple-600">{getTargetCompletionRate().toFixed(1)}%</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">Total Penalties</div>
                <div className="text-2xl font-bold text-red-600">${totalPenalties.toFixed(2)}</div>
              </div>
            </div>

            {/* Target Settings */}
            {groupSettings && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Target Settings</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Base Daily Target</label>
                      <p className="text-lg font-semibold text-gray-900">{groupSettings.daily_target_base} points</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Daily Increment</label>
                      <p className="text-lg font-semibold text-gray-900">+{groupSettings.daily_increment} points/day</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Penalty Amount</label>
                      <p className="text-lg font-semibold text-gray-900">${groupSettings.penalty_amount}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Group Penalty Pot</label>
                      <p className="text-lg font-semibold text-gray-900">${groupSettings.current_pot.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progress History */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">30-Day Progress History</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earned</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penalty</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentProgress.slice(-14).reverse().map((progress, index) => {
                      const progressPercentage = (progress.earned / progress.target) * 100
                      return (
                        <tr key={progress.date} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(progress.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {progress.target}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {progress.earned}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${progress.isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(100, progressPercentage)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{progressPercentage.toFixed(1)}%</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              progress.isComplete ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {progress.isComplete ? 'Complete' : 'Incomplete'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {progress.penaltyAmount > 0 ? `$${progress.penaltyAmount}` : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}