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
  BellIcon,
  HeartIcon,
  PlayIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { SystemMessageConfigAdmin } from './SystemMessageConfigAdmin'
import NotificationSettings from './NotificationSettings'
import { supabase } from '@/lib/supabase'
import packageJson from '../../package.json'

export default function NewMobileProfile() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const [showSystemMessageConfig, setShowSystemMessageConfig] = useState(false)
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [isSickMode, setIsSickMode] = useState(false)
  const [isUpdatingSickMode, setIsUpdatingSickMode] = useState(false)
  const [isRunningCheck, setIsRunningCheck] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load sick mode state from profile
  useEffect(() => {
    if (profile) {
      setIsSickMode(profile.is_sick_mode || false)
    }
  }, [profile])

  // Cleanup effect to prevent state corruption when navigating away
  useEffect(() => {
    return () => {
      // Reset any local state that might interfere with other pages
      setShowSystemMessageConfig(false)
      setShowNotificationSettings(false)
    }
  }, [])

  // Toggle sick mode function
  const toggleSickMode = async () => {
    if (!user || isUpdatingSickMode) return

    setIsUpdatingSickMode(true)
    try {
      const newSickMode = !isSickMode

      const { error } = await supabase
        .from('profiles')
        .update({ is_sick_mode: newSickMode })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating sick mode:', error)
        return
      }

      setIsSickMode(newSickMode)
    } catch (error) {
      console.error('Error toggling sick mode:', error)
    } finally {
      setIsUpdatingSickMode(false)
    }
  }

  const runPenaltyCheck = async () => {
    if (!profile?.group_id || isRunningCheck) return

    if (!confirm('Run yesterday\'s penalty check for all members? This will check who missed their targets and post a summary to the group chat.')) {
      return
    }

    setIsRunningCheck(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Session expired. Please refresh and try again.')
        return
      }

      const response = await fetch('/api/admin/check-all-penalties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error Response:', error)
        const details = typeof error.details === 'object' ? JSON.stringify(error.details, null, 2) : error.details
        const errorMsg = details ? `${error.error}:\n${details}` : (error.error || 'Failed to run penalty check')
        throw new Error(errorMsg)
      }

      const result = await response.json()

      alert(`✅ Penalty check complete!\n\n` +
        `Members checked: ${result.stats.members_checked}/${result.stats.total_members}\n` +
        `New penalties: ${result.stats.penalties_created}\n` +
        `Auto-accepted expired: ${result.stats.auto_accepted}\n\n` +
        `Daily summary posted to group chat.`)

    } catch (error) {
      console.error('Error running penalty check:', error)
      alert(`❌ Failed to run penalty check:\n${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunningCheck(false)
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
            onClick={() => {
              console.log('PWA-DEBUG: Using router.push for proper React navigation')
              router.push('/dashboard')
            }}
            className="w-16 h-16 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors duration-200 flex items-center justify-center"
            aria-label="Back to dashboard"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      <div className="px-4 pt-6 space-y-6">

        {/* User Settings Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Your Settings</h2>
          <div className="space-y-4">
            <button
              onClick={() => setShowNotificationSettings(true)}
              className="w-full bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-gray-600 text-white py-5 px-6 rounded-xl transition-all duration-200 flex items-center gap-4 group"
            >
              <BellIcon className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
              <div className="flex-1 text-left">
                <div className="font-semibold text-white">Notifications</div>
                <div className="text-sm text-gray-400">Push notifications & preferences</div>
              </div>
              <div className="text-gray-400 group-hover:text-white transition-colors">→</div>
            </button>

            {/* Sick Mode Toggle */}
            <div className="w-full bg-white/5 border border-gray-700 text-white py-5 px-6 rounded-xl">
              <div className="flex items-center gap-4">
                <HeartIcon className={`w-6 h-6 ${isSickMode ? 'text-red-400' : 'text-green-400'}`} />
                <div className="flex-1">
                  <div className="font-semibold text-white">Sick Mode</div>
                  <div className="text-sm text-gray-400">
                    {isSickMode ? 'Penalties paused while you recover' : 'Normal penalty system active'}
                  </div>
                </div>
                
                {/* Toggle Switch */}
                <button
                  onClick={toggleSickMode}
                  disabled={isUpdatingSickMode}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    isSickMode ? 'bg-red-500' : 'bg-gray-600'
                  } ${isUpdatingSickMode ? 'opacity-50' : ''}`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                      isSickMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
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
                    href="/admin/sports"
                    className="w-full bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-gray-600 text-white py-5 px-6 rounded-xl transition-all duration-200 flex items-center gap-4 group"
                  >
                    <BoltIcon className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white">Manage Sports</div>
                      <div className="text-sm text-gray-400">Sports library with emojis</div>
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


        {/* Admin: Run Penalty Check Button */}
        {(profile.role === 'group_admin' || profile.role === 'supreme_admin') && (
          <div className="pt-8">
            <button
              onClick={runPenaltyCheck}
              disabled={isRunningCheck}
              className="w-full bg-orange-600/20 hover:bg-orange-600/30 border border-orange-700/50 hover:border-orange-600 text-orange-300 hover:text-orange-200 py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="w-5 h-5" />
              {isRunningCheck ? 'Running Check...' : 'Run Penalty Check'}
            </button>
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

        {/* Version Number */}
        <div className="text-center pt-8 pb-4">
          <p className="text-xs text-gray-500">
            Version {packageJson.version}
          </p>
        </div>
      </div>

      {/* System Message Configuration Modal */}
      {showSystemMessageConfig && (
        <SystemMessageConfigAdmin
          isOpen={showSystemMessageConfig}
          onClose={() => setShowSystemMessageConfig(false)}
        />
      )}

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <NotificationSettings 
            onClose={() => setShowNotificationSettings(false)}
          />
        </div>
      )}
    </div>
  )
}