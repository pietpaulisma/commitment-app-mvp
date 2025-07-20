'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import RoleBasedNavigation from '@/components/RoleBasedNavigation'

export default function AdminPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading, isSupremeAdmin, isGroupAdmin, hasAdminPrivileges } = useProfile()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!profileLoading && profile && !hasAdminPrivileges) {
      router.push('/dashboard')
    }
  }, [profile, profileLoading, hasAdminPrivileges, router])

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

  if (!user || !profile || !hasAdminPrivileges) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleBasedNavigation />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600">
              {isSupremeAdmin ? 'Supreme Admin Dashboard' : 'Group Admin Dashboard'}
            </p>
          </div>
          <button
            onClick={signOut}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Group Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Management</h3>
            <div className="space-y-2">
              <a 
                href="/admin/groups" 
                className="block w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-center"
              >
                View My Group
              </a>
              {isSupremeAdmin && (
                <a 
                  href="/admin/groups/all" 
                  className="block w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 text-center"
                >
                  All Groups
                </a>
              )}
            </div>
          </div>

          {/* Member Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Members</h3>
            <div className="space-y-2">
              <a 
                href="/admin/members" 
                className="block w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 text-center"
              >
                Manage Members
              </a>
              <a 
                href="/admin/leaderboard" 
                className="block w-full bg-yellow-600 text-white py-2 rounded-md hover:bg-yellow-700 text-center"
              >
                Leaderboard
              </a>
            </div>
          </div>

          {/* Supreme Admin Only */}
          {isSupremeAdmin && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Management</h3>
              <div className="space-y-2">
                <a 
                  href="/admin/exercises" 
                  className="block w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 text-center"
                >
                  Manage Exercises
                </a>
                <a 
                  href="/admin/group-exercises" 
                  className="block w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 text-center"
                >
                  Assign Exercises to Groups
                </a>
                <a 
                  href="/admin/users" 
                  className="block w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 text-center"
                >
                  All Users
                </a>
              </div>
            </div>
          )}

          {/* Reports */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reports</h3>
            <div className="space-y-2">
              <button className="w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700">
                Activity Report
              </button>
              <button className="w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700">
                Points Summary
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}