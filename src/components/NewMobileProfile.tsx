'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  CogIcon,
  UserGroupIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  AdjustmentsHorizontalIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  SparklesIcon,
  CakeIcon
} from '@heroicons/react/24/outline'
import { SystemMessageConfigAdmin } from './SystemMessageConfigAdmin'
import { supabase } from '@/lib/supabase'

export default function NewMobileProfile() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading, refreshProfile } = useProfile()
  const router = useRouter()
  const [showSystemMessageConfig, setShowSystemMessageConfig] = useState(false)
  const [birthDate, setBirthDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Set birth date from profile when loaded
  useEffect(() => {
    if (profile?.birth_date) {
      setBirthDate(profile.birth_date)
    }
  }, [profile?.birth_date])

  const saveBirthDate = async () => {
    if (!user || !birthDate) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ birth_date: birthDate })
        .eq('id', user.id)

      if (error) throw error

      // Refresh profile to update cache
      await refreshProfile()
      alert('Birthday saved!')
    } catch (error) {
      console.error('Error saving birthday:', error)
      alert('Failed to save birthday')
    } finally {
      setSaving(false)
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

  // Use actual username from profile
  const username = profile.username || 'User'

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header - matches workout page header style */}
      <div className="sticky top-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex">
          {/* Main header area */}
          <div className="flex-1 relative h-16 bg-gray-900 border-r border-gray-700 overflow-hidden">
            <div className="relative h-full flex items-center justify-start px-6 text-white">
              <h1 className="text-2xl font-bold text-white">Settings</h1>
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
      
      <div className="px-4 pt-6 space-y-6">

        {/* Personal Settings Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Personal Settings</h2>
          <div className="space-y-4">
            {/* Birthday Setting */}
            <div className="w-full bg-white/5 border border-gray-700 text-white py-5 px-6 rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <CakeIcon className="w-6 h-6 text-pink-400" />
                <div className="flex-1">
                  <div className="font-semibold text-white">Birthday</div>
                  <div className="text-sm text-gray-400">Set your birthday for countdown stats</div>
                </div>
              </div>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-600 text-white py-2 px-3 rounded-lg focus:outline-none focus:border-pink-400"
                />
                <button
                  onClick={saveBirthDate}
                  disabled={saving || !birthDate}
                  className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {saving ? '...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Tools Section */}
        {(profile.role === 'supreme_admin' || profile.role === 'group_admin') && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Admin Tools</h2>
            <div className="space-y-4">
              {profile.role === 'supreme_admin' && (
                <>
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
                  
                  <button
                    onClick={() => setShowSystemMessageConfig(true)}
                    className="w-full bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-gray-600 text-white py-5 px-6 rounded-xl transition-all duration-200 flex items-center gap-4 group"
                  >
                    <SparklesIcon className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white">System Messages</div>
                      <div className="text-sm text-gray-400">Configure automated chat messages</div>
                    </div>
                    <div className="text-gray-400 group-hover:text-white transition-colors">→</div>
                  </button>
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

      {/* System Message Configuration Modal */}
      {showSystemMessageConfig && (
        <SystemMessageConfigAdmin
          isOpen={showSystemMessageConfig}
          onClose={() => setShowSystemMessageConfig(false)}
        />
      )}
    </div>
  )
}