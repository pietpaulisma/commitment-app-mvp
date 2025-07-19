'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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

export default function MobileProfile() {
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

      const dayCount: Record<string, number> = {}
      workouts.forEach(workout => {
        const day = new Date(workout.created_at).toLocaleDateString('en-US', { weekday: 'long' })
        dayCount[day] = (dayCount[day] || 0) + 1
      })
      const bestDay = Object.keys(dayCount).reduce((a, b) => dayCount[a] > dayCount[b] ? a : b, 'None')

      // Simple streak calculation
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('checkin_date, is_complete')
        .eq('user_id', user.id)
        .order('checkin_date', { ascending: false })
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
        <h1 className="text-xl font-bold text-gray-900 text-center">Profile</h1>
        <p className="text-sm text-gray-600 text-center">Manage your settings</p>
      </div>

      <div className="p-4 space-y-4">
        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">👤</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{profile.email}</h2>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${
              profile.role === 'supreme_admin' 
                ? 'bg-purple-100 text-purple-800'
                : profile.role === 'group_admin' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {profile.role === 'supreme_admin' ? 'Supreme Admin' : 
               profile.role === 'group_admin' ? 'Group Admin' : 'Member'}
            </span>
            <div className="text-sm text-gray-600 mt-2">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Workout Statistics */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 text-sm">Loading stats...</p>
          </div>
        ) : workoutStats ? (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-4">Workout Statistics</h3>
            
            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{workoutStats.total_workouts}</div>
                <div className="text-sm text-gray-600">Total Workouts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{workoutStats.total_points}</div>
                <div className="text-sm text-gray-600">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{workoutStats.avg_points_per_workout.toFixed(1)}</div>
                <div className="text-sm text-gray-600">Avg/Workout</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{workoutStats.current_streak}</div>
                <div className="text-sm text-gray-600">Current Streak</div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between">
                <span className="text-gray-600">First Workout:</span>
                <span className="text-gray-900">
                  {workoutStats.first_workout 
                    ? new Date(workoutStats.first_workout).toLocaleDateString()
                    : 'No workouts yet'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Workout:</span>
                <span className="text-gray-900">
                  {workoutStats.last_workout 
                    ? new Date(workoutStats.last_workout).toLocaleDateString()
                    : 'No workouts yet'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Most Active Day:</span>
                <span className="text-gray-900">{workoutStats.best_day}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-4 text-center text-gray-500">
            No workout data available
          </div>
        )}

        {/* Profile Settings */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Weight */}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                placeholder="e.g., New York, USA"
                required
              />
            </div>

            {/* Preferences */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Preferences</h4>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.is_weekly_mode}
                  onChange={(e) => setFormData({ ...formData, is_weekly_mode: e.target.checked })}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Weekly mode (targets reset weekly)
                </span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.use_ip_location}
                  onChange={(e) => setFormData({ ...formData, use_ip_location: e.target.checked })}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Use IP-based location detection
                </span>
              </label>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={signOut}
          className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 font-medium transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}