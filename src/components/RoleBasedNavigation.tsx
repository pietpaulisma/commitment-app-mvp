'use client'

import { useProfile } from '@/hooks/useProfile'
import Link from 'next/link'

export default function RoleBasedNavigation() {
  const { profile, loading, isSupremeAdmin, isGroupAdmin, hasAdminPrivileges } = useProfile()

  if (loading || !profile) {
    return null
  }

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              Commitment App
            </Link>
            
            <div className="flex space-x-6">
              <Link 
                href="/dashboard" 
                className="text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              
              <Link 
                href="/workout" 
                className="text-gray-600 hover:text-gray-900"
              >
                Log Workout
              </Link>

              <Link 
                href="/leaderboard" 
                className="text-gray-600 hover:text-gray-900"
              >
                Leaderboard
              </Link>

              {isGroupAdmin && !isSupremeAdmin && (
                <Link 
                  href="/group-admin" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Manage Group
                </Link>
              )}

              {hasAdminPrivileges && (
                <Link 
                  href="/admin" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Admin Panel
                </Link>
              )}

              {isSupremeAdmin && (
                <>
                  <Link 
                    href="/admin/exercises" 
                    className="text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Manage Exercises
                  </Link>
                  <Link 
                    href="/admin/groups" 
                    className="text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Manage Groups
                  </Link>
                  <Link 
                    href="/admin/users" 
                    className="text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Manage Users
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link 
              href="/profile" 
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              <span className="text-gray-600">Signed in as </span>
              <span className="font-medium hover:underline">{profile.email}</span>
            </Link>
            
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
      </div>
    </nav>
  )
}