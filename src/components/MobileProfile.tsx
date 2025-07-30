'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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
  
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (profile) {
      loadWorkoutStats()
    }
  }, [profile])

  const loadWorkoutStats = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data: workouts } = await supabase
        .from('logs')
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
        best_day: bestDay,
        current_streak: currentStreak
      })
    } catch (error) {
      console.error('Error loading workout stats:', error)
    } finally {
      setLoading(false)
    }
  }


  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  // Get username from email (part before @)
  const username = profile.email.split('@')[0]

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Dashboard-style Header */}
      <div className="px-4 pt-8 pb-6">
        <h1 className="text-4xl font-black text-white mb-2">Profile</h1>
        <p className="text-xl text-gray-300">Hey, {username}!</p>
      </div>

      <div className="px-4 space-y-6">
        {/* Statistics Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Your Statistics</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
              <p className="mt-2 text-gray-400 text-sm">Loading stats...</p>
            </div>
          ) : workoutStats ? (
            <div className="grid grid-cols-2 gap-0 border border-gray-800 rounded-lg overflow-hidden">
              <div className="bg-gray-900/30 p-4 border-r border-gray-800">
                <div className="text-center">
                  <div className="text-3xl font-black text-white mb-1">{workoutStats.total_workouts}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Total Workouts</div>
                </div>
              </div>
              <div className="bg-gray-900/30 p-4">
                <div className="text-center">
                  <div className="text-3xl font-black text-white mb-1">{workoutStats.total_points}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Total Points</div>
                </div>
              </div>
              <div className="bg-gray-900/30 p-4 border-r border-gray-800 border-t border-gray-800">
                <div className="text-center">
                  <div className="text-3xl font-black text-white mb-1">{workoutStats.avg_points_per_workout.toFixed(1)}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Avg/Workout</div>
                </div>
              </div>
              <div className="bg-gray-900/30 p-4 border-t border-gray-800">
                <div className="text-center">
                  <div className="text-3xl font-black text-white mb-1">{workoutStats.current_streak}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Current Streak</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/30 rounded-lg p-6 text-center text-gray-400">
              No workout data available
            </div>
          )}
        </div>

        {/* Admin Tools Section */}
        {(profile.role === 'supreme_admin' || profile.role === 'group_admin') && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Admin Tools</h2>
            <div className="space-y-3">
              {profile.role === 'supreme_admin' && (
                <>
                  <Link 
                    href="/admin"
                    className="w-full bg-gray-900/30 hover:bg-gray-900/50 text-white py-4 px-6 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium">System Administration</span>
                    <span className="text-gray-400">→</span>
                  </Link>
                  <Link 
                    href="/admin/groups"
                    className="w-full bg-gray-900/30 hover:bg-gray-900/50 text-white py-4 px-6 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium">Manage All Groups</span>
                    <span className="text-gray-400">→</span>
                  </Link>
                </>
              )}
              {(profile.role === 'group_admin' || profile.role === 'supreme_admin') && (
                <Link 
                  href="/group-admin"
                  className="w-full bg-gray-900/30 hover:bg-gray-900/50 text-white py-4 px-6 rounded-lg transition-colors flex items-center justify-between"
                >
                  <span className="font-medium">Group Management</span>
                  <span className="text-gray-400">→</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Subtle Sign Out */}
        <div className="pt-8">
          <button
            onClick={signOut}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}