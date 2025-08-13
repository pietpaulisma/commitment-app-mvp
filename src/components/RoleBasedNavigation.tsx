'use client'

import { useProfile } from '@/hooks/useProfile'
import Link from 'next/link'

export default function RoleBasedNavigation() {
  const { profile, loading, isSupremeAdmin, isGroupAdmin, hasAdminPrivileges } = useProfile()

  if (loading || !profile) {
    return null
  }

  return (
    <nav className="bg-gray-900/30 border-b border-gray-800 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" prefetch={true} className="text-xl font-bold text-white">
              Commitment App
            </Link>
            
            <div className="hidden md:flex space-x-6">
              <Link 
                href="/dashboard" 
                prefetch={true}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              
              <Link 
                href="/workout" 
                prefetch={true}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Log Workout
              </Link>

              <Link 
                href="/leaderboard" 
                prefetch={true}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Leaderboard
              </Link>

              <Link 
                href="/targets" 
                prefetch={true}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Targets
              </Link>

              {hasAdminPrivileges && (
                <Link 
                  href="/admin" 
                  prefetch={true}
                  className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
                >
                  Admin Panel
                </Link>
              )}

              {isSupremeAdmin && (
                <>
                  <Link 
                    href="/admin/exercises" 
                    prefetch={true}
                    className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                  >
                    Manage Exercises
                  </Link>
                  <Link 
                    href="/admin/groups" 
                    prefetch={true}
                    className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                  >
                    Manage Groups
                  </Link>
                  <Link 
                    href="/admin/users" 
                    prefetch={true}
                    className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
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
              prefetch={true}
              className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block"
            >
              <span className="text-gray-400">Signed in as </span>
              <span className="font-medium hover:underline text-white">{profile.email}</span>
            </Link>
            
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium border ${
                isSupremeAdmin 
                  ? 'bg-purple-900/50 text-purple-400 border-purple-700'
                  : isGroupAdmin 
                  ? 'bg-orange-900/50 text-orange-400 border-orange-700' 
                  : 'bg-gray-800/50 text-gray-400 border-gray-700'
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