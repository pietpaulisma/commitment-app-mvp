'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RoleBasedNavigation from '@/components/RoleBasedNavigation'
import { supabase } from '@/lib/supabase'

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
  best_day: string | null
  current_streak: number
}

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
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
      // Load all workout logs for the user
      const { data: workouts } = await supabase
        .from('workout_logs')
        .select('points, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (!workouts || workouts.length === 0) {
        setWorkoutStats({
          total_workouts: 0,
          total_points: 0,
          avg_points_per_workout: 0,
          first_workout: null,
          last_workout: null,
          best_day: null,
          current_streak: 0
        })
        return
      }

      const totalWorkouts = workouts.length
      const totalPoints = workouts.reduce((sum, w) => sum + (w.points || 0), 0)
      const avgPointsPerWorkout = totalPoints / totalWorkouts

      const firstWorkout = workouts[0].created_at
      const lastWorkout = workouts[workouts.length - 1].created_at

      // Calculate best day of week
      const dayCount: Record<string, number> = {}
      workouts.forEach(workout => {
        const day = new Date(workout.created_at).toLocaleDateString('en-US', { weekday: 'long' })
        dayCount[day] = (dayCount[day] || 0) + 1
      })
      const bestDay = Object.keys(dayCount).reduce((a, b) => dayCount[a] > dayCount[b] ? a : b, 'None')

      // Calculate current streak
      let currentStreak = 0
      const today = new Date()
      const recentWorkouts = workouts.reverse() // Most recent first
      
      for (const workout of recentWorkouts) {
        const workoutDate = new Date(workout.created_at)
        const daysDiff = Math.floor((today.getTime() - workoutDate.getTime()) / (1000 * 3600 * 24))
        
        if (daysDiff <= currentStreak + 1) {
          currentStreak++
        } else {
          break
        }
      }

      setWorkoutStats({
        total_workouts: totalWorkouts,
        total_points: totalPoints,
        avg_points_per_workout: avgPointsPerWorkout,
        first_workout: firstWorkout,
        last_workout: lastWorkout,
        best_day: bestDay,
        current_streak: currentStreak
      })
    } catch (error) {
      console.error('Error loading workout stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id)

      if (error) throw error

      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSaving(false)
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
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
            <p className="text-gray-600">Manage your account settings and view your workout statistics</p>
          </div>
          <button
            onClick={signOut}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Settings */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Profile Settings</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Account Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile.role === 'supreme_admin' 
                    ? 'bg-purple-100 text-purple-800'
                    : profile.role === 'group_admin' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {profile.role === 'supreme_admin' ? 'Supreme Admin' : 
                   profile.role === 'group_admin' ? 'Group Admin' : 'Member'}
                </span>
              </div>

              {/* Preferred Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Weight (kg)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={formData.preferred_weight}
                  onChange={(e) => setFormData({ ...formData, preferred_weight: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., New York, USA"
                  required
                />
              </div>

              {/* Preferences */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Preferences</h4>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_weekly_mode"
                    checked={formData.is_weekly_mode}
                    onChange={(e) => setFormData({ ...formData, is_weekly_mode: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_weekly_mode" className="ml-2 text-sm text-gray-700">
                    Enable weekly mode (targets reset weekly instead of daily)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="use_ip_location"
                    checked={formData.use_ip_location}
                    onChange={(e) => setFormData({ ...formData, use_ip_location: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="use_ip_location" className="ml-2 text-sm text-gray-700">
                    Use IP-based location detection
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Workout Statistics */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Workout Statistics</h3>
            </div>
            
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading stats...</p>
              </div>
            ) : workoutStats ? (
              <div className="p-6 space-y-6">
                {/* Key Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{workoutStats.total_workouts}</div>
                    <div className="text-sm text-gray-500">Total Workouts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{workoutStats.total_points}</div>
                    <div className="text-sm text-gray-500">Total Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{workoutStats.avg_points_per_workout.toFixed(1)}</div>
                    <div className="text-sm text-gray-500">Avg Points/Workout</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{workoutStats.current_streak}</div>
                    <div className="text-sm text-gray-500">Current Streak</div>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">First Workout:</span>
                    <span className="text-sm text-gray-900">
                      {workoutStats.first_workout 
                        ? new Date(workoutStats.first_workout).toLocaleDateString()
                        : 'No workouts yet'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Last Workout:</span>
                    <span className="text-sm text-gray-900">
                      {workoutStats.last_workout 
                        ? new Date(workoutStats.last_workout).toLocaleDateString()
                        : 'No workouts yet'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Most Active Day:</span>
                    <span className="text-sm text-gray-900">{workoutStats.best_day}</span>
                  </div>
                </div>

                {/* Member Since */}
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Member Since:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                No workout data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}