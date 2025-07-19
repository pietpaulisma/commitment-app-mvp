'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import RoleBasedNavigation from '@/components/RoleBasedNavigation'

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading, isSupremeAdmin, isGroupAdmin, hasAdminPrivileges } = useProfile()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

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
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {profile.email}</p>
          </div>
          <button
            onClick={signOut}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Points:</span>
                <span className="font-bold text-green-600">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Streak:</span>
                <span className="font-bold text-blue-600">0 days</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <a href="/workout" className="block w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-center">
                Log Workout
              </a>
              <button className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">
                View Progress
              </button>
              {hasAdminPrivileges && (
                <a href="/admin" className="block w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 text-center">
                  Admin Panel
                </a>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <p className="text-gray-500 text-sm">No workouts logged yet</p>
          </div>
        </div>
      </div>
    </div>
  )
}