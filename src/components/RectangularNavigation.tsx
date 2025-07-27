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
import TimeGradient from '@/components/TimeGradient'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useWeekMode } from '@/contexts/WeekModeContext'
import { calculateDailyTarget, getDaysSinceStart } from '@/utils/targetCalculation'

export default function RectangularNavigation() {
  const { profile, loading } = useProfile()
  const { user } = useAuth()
  const { weekMode } = useWeekMode()
  const pathname = usePathname()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isWorkoutOpen, setIsWorkoutOpen] = useState(false)
  const [dailyProgress, setDailyProgress] = useState(0)
  const [dailyTarget, setDailyTarget] = useState(100)
  const [recoveryProgress, setRecoveryProgress] = useState(0)
  const [accentColor, setAccentColor] = useState('blue')
  const [groupName, setGroupName] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)

  const isOnProfilePage = pathname === '/profile'

  const handleWorkoutButtonClick = () => {
    setIsAnimating(true)
    // Small delay to ensure animation state is set before opening modal
    setTimeout(() => {
      setIsWorkoutOpen(true)
    }, 50)
  }

  const handleWorkoutClose = () => {
    setIsWorkoutOpen(false)
    // Reset animation state after modal closes
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  useEffect(() => {
    if (user && profile) {
      loadDailyProgress()
    }
  }, [user, profile, weekMode])

  const loadDailyProgress = async () => {
    if (!user || !profile) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get today's points with exercise types
      const { data: todayLogs } = await supabase
        .from('logs')
        .select(`
          points,
          exercises (type)
        `)
        .eq('user_id', user.id)
        .eq('date', today)

      const todayPoints = todayLogs?.reduce((sum, log) => sum + log.points, 0) || 0
      const recoveryPoints = todayLogs
        ?.filter(log => log.exercises?.type === 'recovery')
        ?.reduce((sum, log) => sum + log.points, 0) || 0

      // Calculate target using centralized utility
      let target = 1 // Default base target
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

          if (group?.start_date) {
            const daysSinceStart = getDaysSinceStart(group.start_date)
            
            // Load group settings for other features (rest days, etc.)
            const { data: groupSettings, error: settingsError } = await supabase
              .from('group_settings')
              .select('rest_days, recovery_days, accent_color')
              .eq('group_id', profile.group_id)
              .maybeSingle()

            if (!settingsError && groupSettings) {
              restDays = groupSettings.rest_days || [1]
              recoveryDays = groupSettings.recovery_days || [5]
              setAccentColor(groupSettings.accent_color || 'blue')
            }

            // Calculate target using centralized utility
            target = calculateDailyTarget({
              daysSinceStart,
              weekMode,
              restDays,
              recoveryDays
            })
          }
        }
      } catch (error) {
        console.log('Group settings not available, using defaults')
      }

      setDailyProgress(todayPoints)
      setDailyTarget(target)
      setRecoveryProgress(recoveryPoints)
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

  const progressPercentage = dailyTarget > 0 ? (dailyProgress / dailyTarget) * 100 : 0
  const recoveryPercentage = dailyTarget > 0 ? Math.min(25, (recoveryProgress / dailyTarget) * 100) : 0
  const regularPercentage = Math.max(0, progressPercentage - recoveryPercentage)
  const isComplete = progressPercentage >= 100
  const accentBg = getAccentColor()

  return (
    <>
      {/* Bottom Navigation - Modern Clean Design */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-700 z-50">
        <div className="flex">
          {/* Progress Bar Button (80% width) */}
          <button
            onClick={handleWorkoutButtonClick}
            className={`flex-1 relative h-16 bg-gray-900 border-r border-gray-700 overflow-hidden group hover:opacity-90 transition-all duration-500 ease-out ${
              isAnimating ? 'transform -translate-y-full' : 'transform translate-y-0'
            }`}
          >
            {/* Regular Progress Background */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, regularPercentage))}%` }}
            />
            {/* Recovery Progress Background - positioned adjacent to regular progress */}
            <div 
              className="absolute top-0 bottom-0 bg-blue-700 transition-all duration-500 ease-out"
              style={{ 
                left: `${Math.min(100, Math.max(0, regularPercentage))}%`,
                width: `${Math.min(100 - Math.max(0, regularPercentage), recoveryPercentage)}%`
              }}
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
            className={`w-16 h-16 flex items-center justify-center transition-all duration-500 ease-out rounded-none ${
              profile.group_id 
                ? 'bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white' 
                : 'bg-gray-950 text-gray-500 cursor-not-allowed'
            } ${
              isAnimating ? 'transform -translate-y-full' : 'transform translate-y-0'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Header */}
      <nav className="lg:hidden sticky top-0 z-50 relative overflow-hidden shadow-lg">
        <TimeGradient className="z-0" />
        <div className="px-4 relative z-10">
          <div className="flex justify-between items-center py-4">
            <div className="text-lg text-white">
              <div className="text-3xl font-bold drop-shadow-lg">The Commitment</div>
            </div>

            <Link 
              href={isOnProfilePage ? "/dashboard" : "/profile"} 
              className="p-3 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-xl border border-white/10 transition-all duration-200 hover:border-white/20"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {isOnProfilePage ? (
                  <span className="text-white text-lg font-bold">×</span>
                ) : (
                  <UserIcon className="w-6 h-6 text-white" />
                )}
              </div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Desktop Navigation (Modern Clean) */}
      <nav className="hidden lg:block sticky top-0 z-40 relative overflow-hidden shadow-lg">
        <TimeGradient className="z-0" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex justify-between items-center py-6">
            <div className="text-xl text-white">
              <div className="text-3xl font-bold drop-shadow-lg">The Commitment</div>
            </div>

            <div className="flex items-center space-x-4">
              <Link 
                href={isOnProfilePage ? "/dashboard" : "/profile"} 
                className="text-sm text-white hover:text-white flex items-center space-x-3 font-medium bg-black/30 backdrop-blur-sm hover:bg-black/50 border border-white/10 hover:border-white/20 px-4 py-3 rounded-xl transition-all duration-200"
              >
                <span>{isOnProfilePage ? "Back to Dashboard" : "Profile"}</span>
                <div className="w-6 h-6 flex items-center justify-center">
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
        onClose={handleWorkoutClose}
        onWorkoutAdded={loadDailyProgress}
        isAnimating={isAnimating}
      />
    </>
  )
}