'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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
  date: string
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
}

export default function MobileTargets() {
  const { user, loading: authLoading } = useAuth()
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
      // Get group settings and group start date
      const { data: settings, error: settingsError } = await supabase
        .from('group_settings')
        .select('*')
        .eq('group_id', profile.group_id)
        .maybeSingle()

      if (settingsError) throw settingsError

      // Get group start date
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('start_date')
        .eq('id', profile.group_id)
        .single()

      if (groupError) throw groupError

      const { data: checkins, error: checkinsError } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(14)

      if (checkinsError) throw checkinsError

      const today = new Date()
      const groupStartDate = new Date(groupData.start_date)
      const progressData: TargetProgress[] = []
      let currentStreakCount = 0
      let longestStreakCount = 0
      let tempStreak = 0
      let totalPenaltyAmount = 0

      for (let i = 13; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateString = date.toISOString().split('T')[0]

        // Use group start date instead of profile creation date
        const daysSinceStart = Math.floor((date.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))
        const target = settings ? settings.daily_target_base + (settings.daily_increment * Math.max(0, daysSinceStart)) : 100

        const checkin = checkins?.find(c => c.date === dateString)
        
        const earned = checkin?.total_points || 0
        const isComplete = checkin?.is_complete || false
        const penaltyAmount = checkin?.penalty_amount || 0

        if (penaltyAmount > 0) {
          totalPenaltyAmount += penaltyAmount
        }

        if (isComplete) {
          tempStreak++
          if (i === 0) {
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
          penaltyAmount
        })
      }

      if (tempStreak > longestStreakCount) {
        longestStreakCount = tempStreak
      }

      setGroupSettings(settings)
      setRecentProgress(progressData.reverse())
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

  const getCompletionRate = () => {
    const completedDays = recentProgress.filter(p => p.isComplete).length
    return recentProgress.length > 0 ? (completedDays / recentProgress.length) * 100 : 0
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

  if (!profile.group_id) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white shadow-sm border-b border-gray-200 p-4">
          <h1 className="text-xl font-bold text-gray-900 text-center">Daily Targets</h1>
        </div>
        <div className="text-center py-12 px-4">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Group Assigned</h2>
          <p className="text-gray-600 mb-4">You need to be assigned to a group to track daily targets.</p>
          <p className="text-gray-600">Contact an administrator to join a group.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold text-gray-900 text-center">Daily Targets</h1>
        <p className="text-sm text-gray-600 text-center">Track your progress</p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading target data...</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Today's Target */}
          {todayProgress && (
            <div className={`rounded-xl shadow-sm p-6 ${
              todayProgress.isComplete 
                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                : 'bg-gradient-to-r from-blue-500 to-blue-600'
            } text-white`}>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-3">
                  {todayProgress.isComplete ? "🎯 Today's Target Complete!" : "🎯 Today's Target"}
                </h3>
                
                <div className="mb-4">
                  <div className="text-3xl font-bold mb-1">
                    {todayProgress.earned} / {todayProgress.target}
                  </div>
                  <div className="text-sm opacity-90">
                    {Math.max(0, todayProgress.target - todayProgress.earned)} points remaining
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white bg-opacity-30 rounded-full h-3 mb-4">
                  <div 
                    className="bg-white rounded-full h-3 transition-all duration-300"
                    style={{ width: `${Math.min(100, (todayProgress.earned / todayProgress.target) * 100)}%` }}
                  ></div>
                </div>
                
                <div className="text-sm opacity-90">
                  {Math.round((todayProgress.earned / todayProgress.target) * 100)}% complete
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className="text-2xl font-bold text-green-600">{currentStreak}</div>
              <div className="text-sm text-gray-600">Current Streak</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className="text-2xl font-bold text-blue-600">{longestStreak}</div>
              <div className="text-sm text-gray-600">Longest Streak</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className="text-2xl font-bold text-purple-600">{getCompletionRate().toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Completion Rate</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className="text-2xl font-bold text-orange-400">${totalPenalties.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Total Penalties</div>
            </div>
          </div>

          {/* Target Settings */}
          {groupSettings && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-lg font-semibold mb-3">Group Settings</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Base Target</div>
                  <div className="font-semibold">{groupSettings.daily_target_base} pts</div>
                </div>
                <div>
                  <div className="text-gray-600">Daily Increase</div>
                  <div className="font-semibold">+{groupSettings.daily_increment} pts</div>
                </div>
                <div>
                  <div className="text-gray-600">Penalty</div>
                  <div className="font-semibold">${groupSettings.penalty_amount}</div>
                </div>
                <div>
                  <div className="text-gray-600">Group Pot</div>
                  <div className="font-semibold">${groupSettings.current_pot.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Progress History - Last 14 Days */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-3">Recent Progress</h3>
            <div className="space-y-3">
              {recentProgress.slice(-7).reverse().map((progress, index) => {
                const progressPercentage = (progress.earned / progress.target) * 100
                const isToday = index === 0
                
                return (
                  <div key={progress.date} className={`p-3 rounded-lg ${
                    isToday ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">
                          {isToday ? 'Today' : new Date(progress.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                        {progress.isComplete && <span className="text-green-600">✓</span>}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">
                          {progress.earned} / {progress.target}
                        </div>
                        {progress.penaltyAmount > 0 && (
                          <div className="text-orange-400 text-xs">-${progress.penaltyAmount}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          progress.isComplete ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, progressPercentage)}%` }}
                      ></div>
                    </div>
                    
                    <div className="text-xs text-gray-600 mt-1">
                      {progressPercentage.toFixed(1)}% complete
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Action */}
          <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl p-4 text-center">
            <div className="mb-3">
              {todayProgress?.isComplete ? (
                <>
                  <div className="text-2xl mb-1">🎉</div>
                  <div className="font-semibold">Great job today!</div>
                  <div className="text-sm opacity-90">Target completed</div>
                </>
              ) : (
                <>
                  <div className="text-2xl mb-1">💪</div>
                  <div className="font-semibold">Keep going!</div>
                  <div className="text-sm opacity-90">You can do this</div>
                </>
              )}
            </div>
            <Link 
              href="/workout"
              className="inline-block bg-white text-blue-600 px-6 py-2 rounded-lg font-medium"
            >
              Log Workout
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}