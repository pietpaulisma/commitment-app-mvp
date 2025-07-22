'use client'

import { useProfile } from '@/hooks/useProfile'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChatBubbleLeftRightIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import GroupChat from '@/components/GroupChat'
import WorkoutModal from '@/components/WorkoutModal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function RectangularNavigation() {
  const { profile, loading } = useProfile()
  const { user } = useAuth()
  const pathname = usePathname()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isWorkoutOpen, setIsWorkoutOpen] = useState(false)
  const [dailyProgress, setDailyProgress] = useState(0)
  const [dailyTarget, setDailyTarget] = useState(100)
  const [accentColor, setAccentColor] = useState('blue')
  const [groupName, setGroupName] = useState('')

  const isOnProfilePage = pathname === '/profile'

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

      // Get today's target based on day type
      let target = 100
      let restDays = [1] // Default Monday
      let recoveryDays = [5] // Default Friday
      
      try {
        if (profile.group_id) {
          // Load group and group settings
          const { data: group } = await supabase
            .from('groups')
            .select('start_date, name')
            .eq('id', profile.group_id)
            .single()
          
          setGroupName(group?.name || '')

          const { data: groupSettings, error: settingsError } = await supabase
            .from('group_settings')
            .select('*')
            .eq('group_id', profile.group_id)
            .maybeSingle()

          if (!settingsError && groupSettings) {
            restDays = groupSettings.rest_days || [1]
            recoveryDays = groupSettings.recovery_days || [5]
            setAccentColor(groupSettings.accent_color || 'blue')
            
            const daysSinceStart = group?.start_date 
              ? Math.floor((new Date().getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24))
              : Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
            
            target = groupSettings.daily_target_base + (groupSettings.daily_increment * Math.max(0, daysSinceStart))
          }
        }
      } catch (error) {
        console.log('Group settings not available, using defaults')
      }

      // Adjust target based on day type
      const currentDayOfWeek = new Date().getDay()
      if (restDays.includes(currentDayOfWeek)) {
        target = 0 // Rest day - no points required
      } else if (recoveryDays.includes(currentDayOfWeek)) {
        target = 375 // Recovery day - 15 minutes of recovery (25 points/min * 15 min)
      }

      setDailyProgress(todayPoints)
      setDailyTarget(target)
    } catch (error) {
      console.error('Error loading daily progress:', error)
    }
  }

  const getAccentColor = () => {
    const colorMap = {
      'blue': 'bg-purple-600',
      'green': 'bg-yellow-600', 
      'purple': 'bg-purple-600',
      'orange': 'bg-yellow-600',
      'red': 'bg-purple-600',
      'cyan': 'bg-yellow-600'
    }
    return colorMap[accentColor as keyof typeof colorMap] || colorMap.blue
  }

  if (loading || !profile) {
    return null
  }

  const progressPercentage = dailyTarget > 0 ? Math.min(100, (dailyProgress / dailyTarget) * 100) : 0
  const isComplete = progressPercentage >= 100
  const accentBg = getAccentColor()

  return (
    <>
      {/* Bottom Navigation - Modern Clean Design */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-700 z-50">
        <div className="flex">
          {/* Progress Bar Button (80% width) */}
          <button
            onClick={() => setIsWorkoutOpen(true)}
            className={`flex-1 relative h-16 ${dailyProgress > 0 ? accentBg : 'bg-gray-900'} border-r border-gray-700 overflow-hidden group hover:opacity-90 transition-opacity duration-200`}
          >
            {/* Progress Background */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-green-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
            
            {/* Button Content */}
            <div className="relative h-full flex items-center justify-between px-6 text-white">
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm tracking-tight uppercase">
                  {isComplete ? 'Complete!' : 'Log Workout'}
                </span>
                <span className="text-xs opacity-75 font-medium">
                  {dailyProgress}/{dailyTarget} pts
                </span>
              </div>
              
              <div className="flex flex-col items-end justify-center h-full">
                <span className="text-3xl font-black tracking-tight leading-none">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
            </div>

            {/* Subtle glow when complete */}
            {isComplete && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
            )}
          </button>

          {/* Chat Button (20% width) */}
          <button
            onClick={() => setIsChatOpen(true)}
            disabled={!profile.group_id}
            className={`w-16 h-16 flex items-center justify-center transition-colors duration-200 rounded-none ${
              profile.group_id 
                ? 'bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white' 
                : 'bg-gray-950 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Header */}
      <nav className="lg:hidden sticky top-0 z-50 bg-gray-950 border-b border-gray-900">
        <div className="px-4">
          <div className="flex justify-between items-center py-3">
            <div className="text-lg text-white">
              <div className="text-2xl font-bold">The Commitment</div>
            </div>

            <Link 
              href={isOnProfilePage ? "/dashboard" : "/profile"} 
              className="text-gray-300 hover:text-white transition-colors duration-200"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {isOnProfilePage ? (
                  <span className="text-white text-lg font-bold">×</span>
                ) : (
                  <UserIcon className="w-6 h-6 text-gray-300" />
                )}
              </div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Desktop Navigation (Modern Clean) */}
      <nav className="hidden lg:block sticky top-0 z-40 bg-gray-950 border-b border-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center py-4">
            <div className="text-xl text-white">
              <div className="text-2xl font-bold">The Commitment</div>
            </div>

            <div className="flex items-center space-x-4">
              <Link 
                href={isOnProfilePage ? "/dashboard" : "/profile"} 
                className="text-sm text-gray-300 hover:text-white flex items-center space-x-2 font-medium border border-gray-700 hover:border-gray-600 px-3 py-2 transition-colors duration-200"
              >
                <span>{isOnProfilePage ? "Back to Dashboard" : "Profile"}</span>
                <div className={`w-6 h-6 ${accentBg} flex items-center justify-center`}>
                  {isOnProfilePage ? (
                    <span className="text-white text-lg font-bold">×</span>
                  ) : (
                    <UserIcon className="w-4 h-4 text-white" />
                  )}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </nav>


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