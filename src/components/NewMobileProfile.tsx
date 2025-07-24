'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { 
  CogIcon, 
  ChartBarIcon, 
  UserGroupIcon, 
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  UsersIcon,
  PaintBrushIcon,
  PhotoIcon,
  TrophyIcon,
  FireIcon,
  CalendarIcon,
  ClockIcon
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
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4" 
             style={{ backgroundColor: `${formData.personal_color}40` }}>
            <span className="text-3xl">
              {formData.custom_icon}
            </span>
          </div>
          <h1 className="text-xl font-bold">{profile.email}</h1>
          <div className="flex items-center justify-center space-x-2 mt-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isSupremeAdmin 
                ? 'bg-purple-100 text-purple-800'
                : isGroupAdmin 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {profile.role === 'supreme_admin' ? 'Supreme Admin' : 
               profile.role === 'group_admin' ? 'Group Admin' : 'Member'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Statistics Tabs */}
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveStatsTab('overview')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeStatsTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveStatsTab('detailed')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeStatsTab === 'detailed'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Detailed
            </button>
          </div>

          {/* Overview Tab */}
          {activeStatsTab === 'overview' && workoutStats && (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Typography Stats Block */}
                <div className="col-span-2 relative bg-gray-900/30 rounded-lg overflow-hidden p-4">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="text-white leading-none mb-1">
                      <span className="text-2xl font-thin text-blue-400">★</span>
                      <span className="text-4xl font-black ml-2" style={{ color: formData.personal_color }}>
                        {workoutStats.total_points}
                      </span>
                    </div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">Total Points Earned</div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="bg-gray-900/30 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrophyIcon className="w-5 h-5 text-orange-400 mr-1" />
                    <span className="text-2xl font-bold text-orange-400">{workoutStats.total_workouts}</span>
                  </div>
                  <div className="text-xs text-gray-400">Workouts</div>
                </div>

                <div className="bg-gray-900/30 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <FireIcon className="w-5 h-5 text-red-400 mr-1" />
                    <span className="text-2xl font-bold text-red-400">{workoutStats.current_streak}</span>
                  </div>
                  <div className="text-xs text-gray-400">Day Streak</div>
                </div>

                {/* Horizontal Bar Chart - Weekly Progress */}
                <div className="col-span-2 bg-gray-900/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 text-green-400 mr-2" />
                      <span className="text-sm font-medium text-gray-300">This Week</span>
                    </div>
                    <span className="text-lg font-bold text-green-400">{workoutStats.weekly_total}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 relative overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-green-400 to-blue-400 transition-all duration-700"
                      style={{ width: `${getProgressPercentage(workoutStats.weekly_total, 300)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Goal: 300 points/week</div>
                </div>
              </div>

              {/* Personal Stats */}
              {personalStats && (
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-gray-900/30 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <ClockIcon className="w-4 h-4 text-purple-400 mr-2" />
                      <span className="text-sm text-gray-300">Time Spent</span>
                    </div>
                    <span className="text-sm font-bold text-purple-400">
                      {formatTime(personalStats.total_time_spent)}
                    </span>
                  </div>
                  
                  {personalStats.favorite_exercise && (
                    <div className="bg-gray-900/30 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">🎯</span>
                        <span className="text-sm text-gray-300">Favorite Exercise</span>
                      </div>
                      <span className="text-sm font-medium text-yellow-400">
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
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-900/30 rounded-lg">
                  <div className="text-xl font-bold text-blue-400">{workoutStats.avg_points_per_workout}</div>
                  <div className="text-xs text-gray-400">Avg per Workout</div>
                </div>
                <div className="text-center p-3 bg-gray-900/30 rounded-lg">
                  <div className="text-xl font-bold text-purple-400">{workoutStats.monthly_total}</div>
                  <div className="text-xs text-gray-400">This Month</div>
                </div>
                <div className="text-center p-3 bg-gray-900/30 rounded-lg">
                  <div className="text-xl font-bold text-orange-400">{workoutStats.best_streak}</div>
                  <div className="text-xs text-gray-400">Best Streak</div>
                </div>
                <div className="text-center p-3 bg-gray-900/30 rounded-lg">
                  <div className="text-xl font-bold text-green-400">{workoutStats.workout_frequency}%</div>
                  <div className="text-xs text-gray-400">Frequency</div>
                </div>
              </div>
              
              {personalStats && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                      <span className="text-sm text-gray-300">Member Since</span>
                      <span className="text-sm font-medium text-blue-400">{personalStats.member_since}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                      <span className="text-sm text-gray-300">Active Days</span>
                      <span className="text-sm font-medium text-green-400">{workoutStats.total_days}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                      <span className="text-sm text-gray-300">Achievements</span>
                      <span className="text-sm font-medium text-yellow-400">{personalStats.achievements_count}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin Dashboard */}
        {hasAdminPrivileges && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <ShieldCheckIcon className="w-6 h-6 mr-2" />
                Admin Dashboard
                <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded-full">
                  {isSupremeAdmin ? 'Supreme' : 'Group Admin'}
                </span>
              </h3>
            </div>
            
            <div className="p-4 space-y-3">
              {/* Supreme Admin Functions */}
              {isSupremeAdmin && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-3">Supreme Admin Tools</div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Link 
                      href="/admin/exercises"
                      className="group flex flex-col items-center p-3 bg-purple-900/20 hover:bg-purple-800/30 rounded-lg border border-purple-700/50 transition-all hover:transform hover:scale-105 hover:shadow-lg"
                    >
                      <CogIcon className="w-6 h-6 text-purple-400 mb-2 group-hover:text-purple-300" />
                      <span className="text-xs text-purple-300 font-medium text-center">Exercises</span>
                    </Link>
                    
                    <Link 
                      href="/admin/groups"
                      className="group flex flex-col items-center p-3 bg-purple-900/20 hover:bg-purple-800/30 rounded-lg border border-purple-700/50 transition-all hover:transform hover:scale-105 hover:shadow-lg"
                    >
                      <UserGroupIcon className="w-6 h-6 text-purple-400 mb-2 group-hover:text-purple-300" />
                      <span className="text-xs text-purple-300 font-medium text-center">Groups</span>
                    </Link>
                    
                    <Link 
                      href="/admin/users"
                      className="group flex flex-col items-center p-3 bg-purple-900/20 hover:bg-purple-800/30 rounded-lg border border-purple-700/50 transition-all hover:transform hover:scale-105 hover:shadow-lg"
                    >
                      <UsersIcon className="w-6 h-6 text-purple-400 mb-2 group-hover:text-purple-300" />
                      <span className="text-xs text-purple-300 font-medium text-center">Users</span>
                    </Link>
                    
                    <Link 
                      href="/admin/group-exercises"
                      className="group flex flex-col items-center p-3 bg-purple-900/20 hover:bg-purple-800/30 rounded-lg border border-purple-700/50 transition-all hover:transform hover:scale-105 hover:shadow-lg"
                    >
                      <CogIcon className="w-6 h-6 text-purple-400 mb-2 group-hover:text-purple-300" />
                      <span className="text-xs text-purple-300 font-medium text-center">Group Ex.</span>
                    </Link>
                  </div>
                </div>
              )}
              
              {/* Group Admin Functions */}
              {(isGroupAdmin || (isSupremeAdmin && profile?.group_id)) && (
                <div className="space-y-2">
                  {isSupremeAdmin && <div className="border-t border-gray-700 my-4"></div>}
                  <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-3">Group Management</div>
                  
                  <Link 
                    href="/group-admin"
                    className="group flex items-center justify-between p-4 bg-blue-900/20 hover:bg-blue-800/30 rounded-lg border border-blue-700/50 transition-all hover:transform hover:scale-[1.02] hover:shadow-lg"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                        <UserGroupIcon className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                      </div>
                      <div>
                        <div className="text-blue-300 font-medium text-sm">My Group Dashboard</div>
                        <div className="text-xs text-blue-400/70">Manage members & settings</div>
                      </div>
                    </div>
                    <div className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                      {isSupremeAdmin ? 'Supreme' : 'Admin'}
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Personalization Settings */}
        <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
            <PaintBrushIcon className="w-5 h-5 mr-2" />
            Personalization
          </h3>
          <div className="space-y-4">
            {/* Personal Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Personal Color</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-12 h-12 rounded-lg border-2 border-gray-600 flex items-center justify-center transition-transform hover:scale-105"
                  style={{ backgroundColor: formData.personal_color }}
                >
                  <PaintBrushIcon className="w-5 h-5 text-white" />
                </button>
                <span className="text-sm text-gray-400">Choose your theme color</span>
              </div>
              
              {showColorPicker && (
                <div className="mt-3 grid grid-cols-5 gap-2 p-3 bg-gray-900/50 rounded-lg">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, personal_color: color })}
                      className={`w-10 h-10 rounded-lg border-2 transition-transform hover:scale-110 ${
                        formData.personal_color === color ? 'border-white' : 'border-gray-600'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Custom Icon Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Profile Icon</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="w-12 h-12 rounded-lg border-2 border-gray-600 flex items-center justify-center text-2xl transition-transform hover:scale-105"
                  style={{ backgroundColor: `${formData.personal_color}20` }}
                >
                  {formData.custom_icon}
                </button>
                <span className="text-sm text-gray-400">Pick your profile emoji</span>
              </div>
              
              {showIconPicker && (
                <div className="mt-3 grid grid-cols-8 gap-2 p-3 bg-gray-900/50 rounded-lg">
                  {availableIcons.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setFormData({ ...formData, custom_icon: icon })}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-transform hover:scale-110 ${
                        formData.custom_icon === icon ? 'border-white bg-gray-700' : 'border-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Preferred Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Weight (kg)</label>
              <input 
                type="number" 
                min="0" 
                step="0.1"
                value={formData.preferred_weight}
                onChange={(e) => setFormData({ ...formData, preferred_weight: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 text-sm bg-gray-700 text-white"
                style={{ focusRingColor: formData.personal_color }}
              />
            </div>

            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full text-white py-3 px-4 rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: formData.personal_color,
                ':hover': { backgroundColor: `${formData.personal_color}dd` }
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Additional Features */}
        {personalStats && (
          <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
              <TrophyIcon className="w-5 h-5 mr-2" />
              Achievements & Progress
            </h3>
            
            <div className="space-y-3">
              {/* Achievement Progress Bars */}
              <div className="bg-gray-900/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Workout Warrior</span>
                  <span className="text-xs text-gray-400">{Math.min(workoutStats?.total_workouts || 0, 100)}/100</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-red-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((workoutStats?.total_workouts || 0) / 100 * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="bg-gray-900/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Streak Master</span>
                  <span className="text-xs text-gray-400">{Math.min(workoutStats?.current_streak || 0, 30)}/30</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((workoutStats?.current_streak || 0) / 30 * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Link
                  href="/targets"
                  className="flex items-center justify-center p-2 bg-green-900/20 hover:bg-green-800/30 rounded-lg border border-green-700/50 transition-colors"
                >
                  <span className="text-sm text-green-300 font-medium">View Targets</span>
                </Link>
                <Link
                  href="/leaderboard"
                  className="flex items-center justify-center p-2 bg-yellow-900/20 hover:bg-yellow-800/30 rounded-lg border border-yellow-700/50 transition-colors"
                >
                  <span className="text-sm text-yellow-300 font-medium">Leaderboard</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Sign Out */}
        <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] font-semibold shadow-lg"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}