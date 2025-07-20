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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || !hasAdminPrivileges) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      <RoleBasedNavigation />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 mt-1">
              {isSupremeAdmin ? 'Supreme Admin Dashboard' : 'Group Admin Dashboard'}
            </p>
          </div>
          <button
            onClick={signOut}
            className="bg-red-600 text-white px-6 py-3 hover:bg-red-700 font-semibold transition-colors border border-red-500"
          >
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Group Management */}
          <div className="bg-gray-900 border border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-6 border-b border-gray-700 pb-2">Group Management</h3>
            <div className="space-y-3">
              <a 
                href="/admin/groups" 
                className="block w-full bg-blue-600 text-white py-3 hover:bg-blue-500 text-center font-semibold transition-colors border border-blue-500"
              >
                View My Group
              </a>
              {isSupremeAdmin && (
                <a 
                  href="/admin/groups/all" 
                  className="block w-full bg-purple-600 text-white py-3 hover:bg-purple-500 text-center font-semibold transition-colors border border-purple-500"
                >
                  All Groups
                </a>
              )}
            </div>
          </div>

          {/* Member Management */}
          <div className="bg-gray-900 border border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-6 border-b border-gray-700 pb-2">Members</h3>
            <div className="space-y-3">
              <a 
                href="/admin/members" 
                className="block w-full bg-green-600 text-white py-3 hover:bg-green-500 text-center font-semibold transition-colors border border-green-500"
              >
                Manage Members
              </a>
              <a 
                href="/admin/leaderboard" 
                className="block w-full bg-yellow-600 text-white py-3 hover:bg-yellow-500 text-center font-semibold transition-colors border border-yellow-500"
              >
                Leaderboard
              </a>
            </div>
          </div>

          {/* Supreme Admin Only */}
          {isSupremeAdmin && (
            <div className="bg-gray-900 border border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-6 border-b border-gray-700 pb-2">System Management</h3>
              <div className="space-y-3">
                <a 
                  href="/admin/exercises" 
                  className="block w-full bg-purple-600 text-white py-3 hover:bg-purple-500 text-center font-semibold transition-colors border border-purple-500"
                >
                  Manage Exercises
                </a>
                <a 
                  href="/admin/group-exercises" 
                  className="block w-full bg-green-600 text-white py-3 hover:bg-green-500 text-center font-semibold transition-colors border border-green-500"
                >
                  Assign Exercises to Groups
                </a>
                <a 
                  href="/admin/users" 
                  className="block w-full bg-indigo-600 text-white py-3 hover:bg-indigo-500 text-center font-semibold transition-colors border border-indigo-500"
                >
                  All Users
                </a>
              </div>
            </div>
          )}

          {/* Reports */}
          <div className="bg-gray-900 border border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-6 border-b border-gray-700 pb-2">Reports</h3>
            <div className="space-y-3">
              <button className="w-full bg-gray-600 text-white py-3 hover:bg-gray-500 font-semibold transition-colors border border-gray-500">
                Activity Report
              </button>
              <button className="w-full bg-gray-600 text-white py-3 hover:bg-gray-500 font-semibold transition-colors border border-gray-500">
                Points Summary
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}