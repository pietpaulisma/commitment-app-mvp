'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { 
  CogIcon,
  UserGroupIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  AdjustmentsHorizontalIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function NewMobileProfile() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

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
      {/* Header - matches workout page header style */}
      <div className="sticky top-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex">
          {/* Main header area */}
          <div className="flex-1 relative h-16 bg-gray-900 border-r border-gray-700 overflow-hidden">
            <div className="relative h-full flex items-center justify-start px-6 text-white">
              <h1 className="text-2xl font-bold text-white">Profile</h1>
            </div>
          </div>

          {/* Close button - matches workout page X button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-16 h-16 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors duration-200 flex items-center justify-center"
            aria-label="Back to dashboard"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      {/* Welcome message */}
      <div className="px-4 pt-6 pb-6">
        <p className="text-xl text-gray-300">Hey, {username}!</p>
      </div>

      <div className="px-4 space-y-6">

        {/* Admin Tools Section */}
        {(profile.role === 'supreme_admin' || profile.role === 'group_admin') && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Admin Tools</h2>
            <div className="space-y-4">
              {profile.role === 'supreme_admin' && (
                <>
                  <Link 
                    href="/admin"
                    className="w-full bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-gray-600 text-white py-5 px-6 rounded-xl transition-all duration-200 flex items-center gap-4 group"
                  >
                    <CogIcon className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white">System Administration</div>
                      <div className="text-sm text-gray-400">Manage users, settings & system</div>
                    </div>
                    <div className="text-gray-400 group-hover:text-white transition-colors">→</div>
                  </Link>
                  
                  <Link 
                    href="/admin/groups"
                    className="w-full bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-gray-600 text-white py-5 px-6 rounded-xl transition-all duration-200 flex items-center gap-4 group"
                  >
                    <UserGroupIcon className="w-6 h-6 text-green-400 group-hover:text-green-300" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white">Manage All Groups</div>
                      <div className="text-sm text-gray-400">View & edit all workout groups</div>
                    </div>
                    <div className="text-gray-400 group-hover:text-white transition-colors">→</div>
                  </Link>
                  
                  <Link 
                    href="/admin/users"
                    className="w-full bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-gray-600 text-white py-5 px-6 rounded-xl transition-all duration-200 flex items-center gap-4 group"
                  >
                    <UsersIcon className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white">Manage Users</div>
                      <div className="text-sm text-gray-400">User accounts & permissions</div>
                    </div>
                    <div className="text-gray-400 group-hover:text-white transition-colors">→</div>
                  </Link>
                  
                  <Link 
                    href="/admin/exercises"
                    className="w-full bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-gray-600 text-white py-5 px-6 rounded-xl transition-all duration-200 flex items-center gap-4 group"
                  >
                    <ClipboardDocumentListIcon className="w-6 h-6 text-orange-400 group-hover:text-orange-300" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white">Manage Exercises</div>
                      <div className="text-sm text-gray-400">Exercise library & categories</div>
                    </div>
                    <div className="text-gray-400 group-hover:text-white transition-colors">→</div>
                  </Link>
                  
                  <Link 
                    href="/admin/group-exercises"
                    className="w-full bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-gray-600 text-white py-5 px-6 rounded-xl transition-all duration-200 flex items-center gap-4 group"
                  >
                    <AdjustmentsHorizontalIcon className="w-6 h-6 text-cyan-400 group-hover:text-cyan-300" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white">Group Exercises</div>
                      <div className="text-sm text-gray-400">Assign exercises to groups</div>
                    </div>
                    <div className="text-gray-400 group-hover:text-white transition-colors">→</div>
                  </Link>
                </>
              )}
              {(profile.role === 'group_admin' || profile.role === 'supreme_admin') && (
                <Link 
                  href="/group-admin"
                  className="w-full bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-gray-600 text-white py-5 px-6 rounded-xl transition-all duration-200 flex items-center gap-4 group"
                >
                  <UserGroupIcon className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">Group Management</div>
                    <div className="text-sm text-gray-400">Manage your workout group</div>
                  </div>
                  <div className="text-gray-400 group-hover:text-white transition-colors">→</div>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Sign Out Button */}
        <div className="pt-8">
          <button
            onClick={signOut}
            className="w-full bg-red-900/20 hover:bg-red-900/30 border border-red-800/50 hover:border-red-700 text-red-300 hover:text-red-200 py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 font-medium"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}