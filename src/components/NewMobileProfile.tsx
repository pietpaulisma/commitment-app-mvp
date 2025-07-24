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
  UsersIcon
} from '@heroicons/react/24/outline'

type ProfileFormData = {
  preferred_weight: number
  is_weekly_mode: boolean
  location: string
  use_ip_location: boolean
}

type WorkoutStats = {
  total_workouts: number
  total_points: number
  avg_points_per_workout: number
  first_workout: string | null
  last_workout: string | null
  current_streak: number
  weekly_total: number
}

export default function NewMobileProfile() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading, isSupremeAdmin, isGroupAdmin, hasAdminPrivileges } = useProfile()
  const router = useRouter()
  
  const [formData, setFormData] = useState<ProfileFormData>({
    preferred_weight: 70,
    is_weekly_mode: false,
    location: '',
    use_ip_location: false
  })
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (profile) {
      setFormData({
        preferred_weight: profile.preferred_weight,
        is_weekly_mode: profile.is_weekly_mode,
        location: profile.location,
        use_ip_location: profile.use_ip_location
      })
      loadWorkoutStats()
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
          weekly_total: 0
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

      // Get current streak from checkins
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

      setWorkoutStats({
        total_workouts: totalWorkouts,
        total_points: totalPoints,
        avg_points_per_workout: avgPointsPerWorkout,
        first_workout: firstWorkout,
        last_workout: lastWorkout,
        current_streak: currentStreak,
        weekly_total: weeklyTotal
      })
    } catch (error) {
      console.error('Error loading workout stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id)

      if (error) {
        alert('Error updating profile: ' + error.message)
      } else {
        alert('Profile updated successfully!')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('An error occurred while saving your profile.')
    } finally {
      setSaving(false)
    }
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
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold">
              {profile.email.charAt(0).toUpperCase()}
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
        {/* Workout Statistics */}
        {workoutStats && (
          <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
              <ChartBarIcon className="w-5 h-5 mr-2" />
              Workout Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{workoutStats.total_workouts}</div>
                <div className="text-sm text-gray-400">Total Workouts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{workoutStats.total_points}</div>
                <div className="text-sm text-gray-400">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{workoutStats.current_streak}</div>
                <div className="text-sm text-gray-400">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">{workoutStats.weekly_total}</div>
                <div className="text-sm text-gray-400">This Week</div>
              </div>
            </div>
            {workoutStats.avg_points_per_workout > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-400">{workoutStats.avg_points_per_workout}</div>
                  <div className="text-sm text-gray-400">Average Points per Workout</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin Functions */}
        {hasAdminPrivileges && (
          <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
              <ShieldCheckIcon className="w-5 h-5 mr-2" />
              Admin Functions
            </h3>
            <div className="space-y-3">
              {isSupremeAdmin && (
                <>
                  <Link 
                    href="/admin/exercises"
                    className="flex items-center justify-between p-3 bg-purple-900/30 hover:bg-purple-800/30 rounded-lg border border-purple-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <CogIcon className="w-5 h-5 text-purple-400 mr-3" />
                      <span className="text-purple-300 font-medium">Manage Exercises</span>
                    </div>
                    <span className="text-xs text-purple-400">Supreme</span>
                  </Link>
                  <Link 
                    href="/admin/groups"
                    className="flex items-center justify-between p-3 bg-purple-900/30 hover:bg-purple-800/30 rounded-lg border border-purple-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <UserGroupIcon className="w-5 h-5 text-purple-400 mr-3" />
                      <span className="text-purple-300 font-medium">Manage Groups</span>
                    </div>
                    <span className="text-xs text-purple-400">Supreme</span>
                  </Link>
                  <Link 
                    href="/admin/users"
                    className="flex items-center justify-between p-3 bg-purple-900/30 hover:bg-purple-800/30 rounded-lg border border-purple-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <UsersIcon className="w-5 h-5 text-purple-400 mr-3" />
                      <span className="text-purple-300 font-medium">Manage Users</span>
                    </div>
                    <span className="text-xs text-purple-400">Supreme</span>
                  </Link>
                  <Link 
                    href="/admin/group-exercises"
                    className="flex items-center justify-between p-3 bg-purple-900/30 hover:bg-purple-800/30 rounded-lg border border-purple-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <CogIcon className="w-5 h-5 text-purple-400 mr-3" />
                      <span className="text-purple-300 font-medium">Manage Group Exercises</span>
                    </div>
                    <span className="text-xs text-purple-400">Supreme</span>
                  </Link>
                </>
              )}
              
              {(isGroupAdmin || (isSupremeAdmin && profile?.group_id)) && (
                <Link 
                  href="/group-admin"
                  className="flex items-center justify-between p-3 bg-blue-900/30 hover:bg-blue-800/30 rounded-lg border border-blue-700 transition-colors"
                >
                  <div className="flex items-center">
                    <UserGroupIcon className="w-5 h-5 text-blue-400 mr-3" />
                    <span className="text-blue-300 font-medium">Manage My Group</span>
                  </div>
                  <span className="text-xs text-blue-400">
                    {isSupremeAdmin ? 'Supreme' : 'Group Admin'}
                  </span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Profile Settings */}
        <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
            <CogIcon className="w-5 h-5 mr-2" />
            Profile Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Weight (kg)</label>
              <input 
                type="number" 
                min="0" 
                step="0.1"
                value={formData.preferred_weight}
                onChange={(e) => setFormData({ ...formData, preferred_weight: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
              <input 
                type="text" 
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-700 text-white"
                placeholder="Enter your location"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Weekly Mode</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.is_weekly_mode}
                  onChange={(e) => setFormData({ ...formData, is_weekly_mode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Use IP Location</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.use_ip_location}
                  onChange={(e) => setFormData({ ...formData, use_ip_location: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}