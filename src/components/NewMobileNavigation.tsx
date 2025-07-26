'use client'

import { useProfile } from '@/hooks/useProfile'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  HomeIcon, 
  ChatBubbleLeftRightIcon,
  UserIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  UserIcon as UserIconSolid
} from '@heroicons/react/24/solid'
import GroupChat from '@/components/GroupChat'
import WorkoutModal from '@/components/WorkoutModal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function NewMobileNavigation() {
  const { profile, loading } = useProfile()
  const { user } = useAuth()
  const pathname = usePathname()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isWorkoutOpen, setIsWorkoutOpen] = useState(false)
  const [dailyProgress, setDailyProgress] = useState(0)
  const [dailyTarget, setDailyTarget] = useState(100)

  useEffect(() => {
    if (user && profile) {
      loadDailyProgress()
    }
  }, [user, profile])

  const loadDailyProgress = async () => {
    if (!user || !profile) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get today's points
      const { data: todayLogs } = await supabase
        .from('logs')
        .select('points')
        .eq('user_id', user.id)
        .eq('date', today)

      const todayPoints = todayLogs?.reduce((sum, log) => sum + log.points, 0) || 0

      // Get today's target
      let target = 100
      if (profile.group_id) {
        const { data: groupSettings, error: settingsError } = await supabase
          .from('group_settings')
          .select('*')
          .eq('group_id', profile.group_id)
          .maybeSingle()
        
        if (settingsError) {
          console.log('Error loading group settings:', settingsError)
        }

        if (groupSettings) {
          // Get group start date for proper target calculation
          const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('start_date')
            .eq('id', profile.group_id)
            .single()

          const daysSinceStart = group?.start_date 
            ? Math.floor((new Date().getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24))
            : Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
          
          target = groupSettings.daily_target_base + (groupSettings.daily_increment * Math.max(0, daysSinceStart))
        }
      }

      setDailyProgress(todayPoints)
      setDailyTarget(target)
    } catch (error) {
      console.error('Error loading daily progress:', error)
    }
  }

  if (loading || !profile) {
    return null
  }

  const progressPercentage = dailyTarget > 0 ? Math.min(100, (dailyProgress / dailyTarget) * 100) : 0

  return (
    <>
      {/* Top Header with User Profile */}
      <div className="lg:hidden bg-gray-900 shadow-sm border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Commitment App</h1>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">{profile.email}</span>
            </div>
          </div>
          <Link href="/profile" className="flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
          </Link>
        </div>
      </div>

      {/* Bottom Navigation - 3 Button Layout */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow-lg">
        <div className="relative flex justify-between items-center px-8 py-4">
          {/* Home Button */}
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center p-3 rounded-full transition-colors ${
              pathname === '/dashboard'
                ? 'text-blue-400 bg-blue-900/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {pathname === '/dashboard' ? (
              <HomeIconSolid className="w-6 h-6" />
            ) : (
              <HomeIcon className="w-6 h-6" />
            )}
            <span className="text-xs mt-1">Home</span>
          </Link>

          {/* Center Workout Button with Progress Circle */}
          <button
            onClick={() => setIsWorkoutOpen(true)}
            className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full shadow-lg transform transition-transform hover:scale-105 active:scale-95"
          >
            {/* Progress Circle Background */}
            <svg className="absolute inset-0 w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="3"
                fill="none"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="white"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${progressPercentage * 1.76} 176`}
                className="transition-all duration-500"
              />
            </svg>
            
            {/* Plus Icon */}
            <PlusIcon className="w-8 h-8 text-white z-10" />
            
            {/* Progress Percentage */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <span className="text-xs font-bold text-white bg-black bg-opacity-50 px-1 rounded">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </button>

          {/* Chat Button */}
          <button
            onClick={() => setIsChatOpen(true)}
            className={`flex flex-col items-center justify-center p-3 rounded-full transition-colors ${
              'text-gray-400 hover:text-gray-200'
            }`}
            disabled={!profile.group_id}
          >
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Chat</span>
          </button>
        </div>
      </div>

      {/* Desktop Navigation (Simplified) */}
      <nav className="hidden lg:block bg-gray-900 shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold text-white">
                Commitment App
              </Link>
              
              <div className="flex space-x-6">
                <Link 
                  href="/dashboard" 
                  className="text-gray-300 hover:text-white"
                >
                  Dashboard
                </Link>
                
                <button
                  onClick={() => setIsWorkoutOpen(true)}
                  className="text-gray-300 hover:text-white"
                >
                  Log Workout
                </button>

                {profile.group_id && (
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="text-gray-300 hover:text-white flex items-center space-x-1"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    <span>Group Chat</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link 
                href="/profile" 
                className="text-sm text-gray-300 hover:text-white flex items-center space-x-2"
              >
                <span>Profile</span>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="lg:hidden h-16"></div>

      {/* Group Chat Modal */}
      <GroupChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />

      {/* Workout Modal */}
      <WorkoutModal 
        isOpen={isWorkoutOpen} 
        onClose={() => setIsWorkoutOpen(false)}
        onWorkoutAdded={loadDailyProgress}
      />
    </>
  )
}