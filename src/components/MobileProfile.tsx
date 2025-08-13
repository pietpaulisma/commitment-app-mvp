'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import AuthWrapper from '@/components/shared/AuthWrapper'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { getWorkoutStats } from '@/utils/supabaseQueries'

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
  const { user, signOut } = useAuth()
  const { profile } = useProfile()
  
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile) {
      loadWorkoutStats()
    }
  }, [profile])

  const loadWorkoutStats = async () => {
    if (!user) return

    setLoading(true)
    try {
      const stats = await getWorkoutStats(user.id)
      setWorkoutStats(stats)
    } catch (error) {
      console.error('Error loading workout stats:', error)
    } finally {
      setLoading(false)
    }
  }


  return (
    <AuthWrapper loadingMessage="Loading profile...">
    <div className="min-h-screen bg-black pb-20">
      {/* Dashboard-style Header */}
      <div className="px-4 pt-8 pb-6">
        <h1 className="text-4xl font-black text-white mb-2">Profile</h1>
        <p className="text-xl text-gray-300">Hey, {profile?.username || 'User'}!</p>
      </div>

      <div className="px-4 space-y-6">
        {/* Statistics Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Your Statistics</h2>
          
          {loading ? (
            <div className="py-8">
              <LoadingSpinner size="sm" message="Loading stats..." />
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
        {(profile?.role === 'supreme_admin' || profile?.role === 'group_admin') && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Admin Tools</h2>
            <div className="space-y-3">
              {profile?.role === 'supreme_admin' && (
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
              {(profile?.role === 'group_admin' || profile?.role === 'supreme_admin') && (
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
    </AuthWrapper>
  )
}