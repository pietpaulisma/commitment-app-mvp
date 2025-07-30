'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

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
      {/* Dashboard-style Header */}
      <div className="px-4 pt-8 pb-6">
        <h1 className="text-4xl font-black text-white mb-2">Profile</h1>
        <p className="text-xl text-gray-300">Hey, {username}!</p>
      </div>

      <div className="px-4 space-y-6">

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