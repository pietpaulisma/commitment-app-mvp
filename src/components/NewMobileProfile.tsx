'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { 
  CogIcon, 
  UserGroupIcon, 
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  UsersIcon,
  PaintBrushIcon
} from '@heroicons/react/24/outline'

type ProfileFormData = {
  preferred_weight: number
  personal_color: string
  custom_icon: string
}

type WorkoutStats = {
  total_workouts: number
  total_points: number
  avg_points_per_workout: number
  first_workout: string | null
  last_workout: string | null
  current_streak: number
  weekly_total: number
  monthly_total: number
  best_streak: number
  total_days: number
  workout_frequency: number
}

type PersonalStats = {
  member_since: string
  favorite_exercise: string | null
  total_time_spent: number
  achievements_count: number
}

export default function NewMobileProfile() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading, isSupremeAdmin, isGroupAdmin, hasAdminPrivileges } = useProfile()
  const router = useRouter()
  
  const [formData, setFormData] = useState<ProfileFormData>({
    preferred_weight: 70,
    personal_color: '#3b82f6',
    custom_icon: '💪'
  })
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats | null>(null)
  const [personalStats, setPersonalStats] = useState<PersonalStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeStatsTab, setActiveStatsTab] = useState<'overview' | 'detailed'>('overview')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)

  const availableColors = [
    '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', 
    '#ef4444', '#ec4899', '#84cc16', '#f97316', '#6366f1'
  ]
  
  const availableIcons = [
    '💪', '🏃', '🏋️', '⚡', '🔥', '🎯', '⭐', '🚀', 
    '💎', '🏆', '👑', '🦄', '🌟', '⚽', '🏀', '🎾'
  ]

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (profile) {
      setFormData({
        preferred_weight: profile.preferred_weight,
        personal_color: profile.personal_color || '#3b82f6',
        custom_icon: profile.custom_icon || '💪'
      })
      loadWorkoutStats()
      loadPersonalStats()
    }
  }, [profile])

  const loadWorkoutStats = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Get all workout logs for the user
      const { data: logs } = await supabase
        .from('logs')
        .select('points, date, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (!logs || logs.length === 0) {
        setWorkoutStats({
          total_workouts: 0,
          total_points: 0,
          avg_points_per_workout: 0,
          first_workout: null,
          last_workout: null,
          current_streak: 0,
          weekly_total: 0,
          monthly_total: 0,
          best_streak: 0,
          total_days: 0,
          workout_frequency: 0
        })
        return
      }

      const totalWorkouts = logs.length
      const totalPoints = logs.reduce((sum, log) => sum + log.points, 0)
      const avgPointsPerWorkout = Math.round(totalPoints / totalWorkouts)
      
      const firstWorkout = logs[0]?.created_at || null
      const lastWorkout = logs[logs.length - 1]?.created_at || null

      // Calculate weekly total
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoString = weekAgo.toISOString().split('T')[0]
      
      const weeklyLogs = logs.filter(log => log.date >= weekAgoString)
      const weeklyTotal = weeklyLogs.reduce((sum, log) => sum + log.points, 0)

      // Calculate monthly total
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      const monthAgoString = monthAgo.toISOString().split('T')[0]
      
      const monthlyLogs = logs.filter(log => log.date >= monthAgoString)
      const monthlyTotal = monthlyLogs.reduce((sum, log) => sum + log.points, 0)

      // Get current streak and best streak from checkins
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('date, is_complete')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(100)

      let currentStreak = 0
      let bestStreak = 0
      let tempStreak = 0
      
      if (checkins) {
        // Calculate current streak
        for (const checkin of checkins) {
          if (checkin.is_complete) {
            currentStreak++
          } else {
            break
          }
        }
        
        // Calculate best streak
        for (const checkin of checkins.reverse()) {
          if (checkin.is_complete) {
            tempStreak++
            bestStreak = Math.max(bestStreak, tempStreak)
          } else {
            tempStreak = 0
          }
        }
      }

      // Calculate total active days and frequency
      const firstDate = firstWorkout ? new Date(firstWorkout) : new Date()
      const totalDays = Math.ceil((new Date().getTime() - firstDate.getTime()) / (1000 * 3600 * 24)) || 1
      const workoutFrequency = Math.round((totalWorkouts / totalDays) * 100)

      setWorkoutStats({
        total_workouts: totalWorkouts,
        total_points: totalPoints,
        avg_points_per_workout: avgPointsPerWorkout,
        first_workout: firstWorkout,
        last_workout: lastWorkout,
        current_streak: currentStreak,
        weekly_total: weeklyTotal,
        monthly_total: monthlyTotal,
        best_streak: bestStreak,
        total_days: totalDays,
        workout_frequency: workoutFrequency
      })
    } catch (error) {
      console.error('Error loading workout stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPersonalStats = async () => {
    if (!user || !profile) return
    
    try {
      // Get favorite exercise
      const { data: exerciseStats } = await supabase
        .from('logs')
        .select('exercise_id, exercises(name)')
        .eq('user_id', user.id)
      
      let favoriteExercise = null
      if (exerciseStats && exerciseStats.length > 0) {
        const exerciseCounts = exerciseStats.reduce((acc: Record<string, { count: number, name: string }>, log: any) => {
          const exerciseName = log.exercises?.name || 'Unknown'
          if (!acc[exerciseName]) acc[exerciseName] = { count: 0, name: exerciseName }
          acc[exerciseName].count++
          return acc
        }, {})
        
        const mostFrequent = Object.values(exerciseCounts).sort((a, b) => b.count - a.count)[0]
        favoriteExercise = mostFrequent?.name || null
      }

      // Calculate member since
      const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'
      
      // Calculate total time spent (rough estimate based on average workout time)
      const totalTimeSpent = workoutStats ? workoutStats.total_workouts * 45 : 0 // 45 min average
      
      // Mock achievements count (you can implement actual achievements later)
      const achievementsCount = Math.floor((workoutStats?.total_workouts || 0) / 10) + 
                               Math.floor((workoutStats?.current_streak || 0) / 7)

      setPersonalStats({
        member_since: memberSince,
        favorite_exercise: favoriteExercise,
        total_time_spent: totalTimeSpent,
        achievements_count: achievementsCount
      })
    } catch (error) {
      console.error('Error loading personal stats:', error)
    }
  }

  const handleSave = async () => {
    if (!user) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_weight: formData.preferred_weight,
          personal_color: formData.personal_color,
          custom_icon: formData.custom_icon
        })
        .eq('id', user.id)

      if (error) {
        alert('Error updating profile: ' + error.message)
      } else {
        alert('Profile updated successfully!')
        setShowColorPicker(false)
        setShowIconPicker(false)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('An error occurred while saving your profile.')
    } finally {
      setSaving(false)
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="space-y-0">
        {/* User Info Section */}
        <div className="bg-black border-b border-gray-800">
          <div className="py-6">
            <h3 className="text-2xl font-bold text-white mb-6 px-4">Profile</h3>
            <div className="px-4">
              <div className="bg-gray-900/30 border border-gray-800 p-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-900/30 border border-gray-800 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">{formData.custom_icon}</span>
                  </div>
                  <div className="text-lg font-bold text-white">{profile.email}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">
                    {profile.role === 'supreme_admin' ? 'Supreme Admin' : 
                     profile.role === 'group_admin' ? 'Group Admin' : 'Member'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Statistics Section */}
        <div className="bg-black border-b border-gray-800">
          <div className="py-6">
            <h3 className="text-2xl font-bold text-white mb-6 px-4">Statistics</h3>
            <div className="px-4">
              <div className="flex border-b border-gray-800 mb-6">
                <button
                  onClick={() => setActiveStatsTab('overview')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2 ${
                    activeStatsTab === 'overview'
                      ? 'border-orange-400 text-white'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveStatsTab('detailed')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2 ${
                    activeStatsTab === 'detailed'
                      ? 'border-orange-400 text-white'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Detailed
                </button>
              </div>

              {/* Overview Tab */}
              {activeStatsTab === 'overview' && workoutStats && (
                <div className="space-y-4">
                  {/* Main Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-900/30 border border-gray-800 p-4 text-center">
                      <div className="text-3xl font-black text-orange-400 mb-1">{workoutStats.total_points}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Total Points</div>
                    </div>
                    <div className="bg-gray-900/30 border border-gray-800 p-4 text-center">
                      <div className="text-3xl font-black text-blue-400 mb-1">{workoutStats.total_workouts}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Workouts</div>
                    </div>
                    <div className="bg-gray-900/30 border border-gray-800 p-4 text-center">
                      <div className="text-3xl font-black text-orange-400 mb-1">{workoutStats.current_streak}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Day Streak</div>
                    </div>
                    <div className="bg-gray-900/30 border border-gray-800 p-4 text-center">
                      <div className="text-3xl font-black text-blue-400 mb-1">{workoutStats.weekly_total}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">This Week</div>
                    </div>
                  </div>

                  {/* Weekly Progress */}
                  <div className="bg-gray-900/30 border border-gray-800 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-white">Weekly Goal Progress</span>
                      <span className="text-sm text-gray-400">{workoutStats.weekly_total}/300</span>
                    </div>
                    <div className="relative bg-gray-800 h-3">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-orange-400 transition-all duration-500"
                        style={{ width: `${getProgressPercentage(workoutStats.weekly_total, 300)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  {personalStats && (
                    <div className="space-y-3">
                      <div className="bg-gray-900/30 border border-gray-800 p-3 flex items-center justify-between">
                        <span className="text-sm text-gray-400">Time Spent</span>
                        <span className="text-sm font-medium text-white">
                          {formatTime(personalStats.total_time_spent)}
                        </span>
                      </div>
                      {personalStats.favorite_exercise && (
                        <div className="bg-gray-900/30 border border-gray-800 p-3 flex items-center justify-between">
                          <span className="text-sm text-gray-400">Favorite Exercise</span>
                          <span className="text-sm font-medium text-white">
                            {personalStats.favorite_exercise}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Detailed Tab */}
              {activeStatsTab === 'detailed' && workoutStats && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-900/30 border border-gray-800 p-4 text-center">
                      <div className="text-2xl font-black text-orange-400 mb-1">{workoutStats.avg_points_per_workout}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Avg per Workout</div>
                    </div>
                    <div className="bg-gray-900/30 border border-gray-800 p-4 text-center">
                      <div className="text-2xl font-black text-blue-400 mb-1">{workoutStats.monthly_total}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">This Month</div>
                    </div>
                    <div className="bg-gray-900/30 border border-gray-800 p-4 text-center">
                      <div className="text-2xl font-black text-orange-400 mb-1">{workoutStats.best_streak}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Best Streak</div>
                    </div>
                    <div className="bg-gray-900/30 border border-gray-800 p-4 text-center">
                      <div className="text-2xl font-black text-blue-400 mb-1">{workoutStats.workout_frequency}%</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Frequency</div>
                    </div>
                  </div>
                  
                  {personalStats && (
                    <div className="space-y-3">
                      <div className="bg-gray-900/30 border border-gray-800 p-3 flex items-center justify-between">
                        <span className="text-sm text-gray-400">Member Since</span>
                        <span className="text-sm font-medium text-white">{personalStats.member_since}</span>
                      </div>
                      <div className="bg-gray-900/30 border border-gray-800 p-3 flex items-center justify-between">
                        <span className="text-sm text-gray-400">Active Days</span>
                        <span className="text-sm font-medium text-white">{workoutStats.total_days}</span>
                      </div>
                      <div className="bg-gray-900/30 border border-gray-800 p-3 flex items-center justify-between">
                        <span className="text-sm text-gray-400">Achievements</span>
                        <span className="text-sm font-medium text-white">{personalStats.achievements_count}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Admin Functions */}
        {hasAdminPrivileges && (
          <div className="bg-black border-b border-gray-800">
            <div className="py-6">
              <h3 className="text-2xl font-bold text-white mb-6 px-4">Admin Functions</h3>
              <div className="px-4 space-y-4">
                {/* Supreme Admin Functions */}
                {isSupremeAdmin && (
                  <div className="space-y-3">
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Supreme Admin Tools</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Link 
                        href="/admin/exercises"
                        className="bg-gray-900/30 border border-gray-800 p-4 hover:bg-gray-900/50 transition-colors"
                      >
                        <div className="text-center">
                          <CogIcon className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                          <div className="text-sm font-medium text-white">Exercises</div>
                        </div>
                      </Link>
                      <Link 
                        href="/admin/groups"
                        className="bg-gray-900/30 border border-gray-800 p-4 hover:bg-gray-900/50 transition-colors"
                      >
                        <div className="text-center">
                          <UserGroupIcon className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                          <div className="text-sm font-medium text-white">Groups</div>
                        </div>
                      </Link>
                      <Link 
                        href="/admin/users"
                        className="bg-gray-900/30 border border-gray-800 p-4 hover:bg-gray-900/50 transition-colors"
                      >
                        <div className="text-center">
                          <UsersIcon className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                          <div className="text-sm font-medium text-white">Users</div>
                        </div>
                      </Link>
                      <Link 
                        href="/admin/group-exercises"
                        className="bg-gray-900/30 border border-gray-800 p-4 hover:bg-gray-900/50 transition-colors"
                      >
                        <div className="text-center">
                          <CogIcon className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                          <div className="text-sm font-medium text-white">Group Ex.</div>
                        </div>
                      </Link>
                    </div>
                  </div>
                )}
                
                {/* Group Admin Functions */}
                {(isGroupAdmin || (isSupremeAdmin && profile?.group_id)) && (
                  <div className="space-y-3">
                    {isSupremeAdmin && <div className="border-t border-gray-800 pt-4"></div>}
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Group Management</div>
                    <Link 
                      href="/group-admin"
                      className="bg-gray-900/30 border border-gray-800 p-4 hover:bg-gray-900/50 transition-colors block"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <UserGroupIcon className="w-5 h-5 text-orange-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-white">My Group Dashboard</div>
                            <div className="text-xs text-gray-400">Manage members & settings</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {isSupremeAdmin ? 'Supreme' : 'Admin'}
                        </div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="bg-black border-b border-gray-800">
          <div className="py-6">
            <h3 className="text-2xl font-bold text-white mb-6 px-4">Settings</h3>
            <div className="px-4 space-y-4">
              {/* Personal Color Picker */}
              <div className="bg-gray-900/30 border border-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-white">Personal Color</label>
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-8 h-8 border border-gray-800 flex items-center justify-center"
                    style={{ backgroundColor: formData.personal_color }}
                  >
                    <PaintBrushIcon className="w-4 h-4 text-white" />
                  </button>
                </div>
                
                {showColorPicker && (
                  <div className="grid grid-cols-5 gap-2">
                    {availableColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, personal_color: color })}
                        className={`w-8 h-8 border ${
                          formData.personal_color === color ? 'border-white' : 'border-gray-800'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Icon Picker */}
              <div className="bg-gray-900/30 border border-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-white">Profile Icon</label>
                  <button
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-8 h-8 bg-gray-900/30 border border-gray-800 flex items-center justify-center text-lg"
                  >
                    {formData.custom_icon}
                  </button>
                </div>
                
                {showIconPicker && (
                  <div className="grid grid-cols-8 gap-2">
                    {availableIcons.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setFormData({ ...formData, custom_icon: icon })}
                        className={`w-8 h-8 border flex items-center justify-center text-sm ${
                          formData.custom_icon === icon ? 'border-white bg-gray-700' : 'border-gray-800 hover:bg-gray-700'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Preferred Weight */}
              <div className="bg-gray-900/30 border border-gray-800 p-4">
                <label className="block text-sm font-medium text-white mb-3">Preferred Weight (kg)</label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.1"
                  value={formData.preferred_weight}
                  onChange={(e) => setFormData({ ...formData, preferred_weight: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-400 text-sm bg-gray-800 text-white"
                />
              </div>

              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-orange-400 text-black py-4 px-4 hover:bg-orange-500 transition-colors font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="bg-black">
          <div className="py-6">
            <div className="px-4">
              <button 
                onClick={handleSignOut}
                className="w-full bg-orange-400 text-black py-4 px-4 hover:bg-orange-500 transition-colors font-black text-lg flex items-center justify-center space-x-2"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}