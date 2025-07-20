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

      // Get today's target (fallback to 100 if group_settings table doesn't exist)
      let target = 100
      try {
        if (profile.group_id) {
          const { data: groupSettings } = await supabase
            .from('group_settings')
            .select('*')
            .eq('group_id', profile.group_id)
            .single()

          if (groupSettings) {
            const daysSinceStart = Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
            target = groupSettings.daily_target_base + (groupSettings.daily_increment * Math.max(0, daysSinceStart))
          }
        }
      } catch (error) {
        console.log('Group settings not available, using default target of 100')
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
  const isComplete = progressPercentage >= 100

  return (
    <>
      {/* Bottom Navigation - Modern Clean Design */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700">
        <div className="flex">
          {/* Progress Bar Button (80% width) */}
          <button
            onClick={() => setIsWorkoutOpen(true)}
            className="flex-1 relative h-16 bg-blue-600 border-r border-gray-700 overflow-hidden group hover:bg-blue-500 transition-colors duration-200"
          >
            {/* Progress Background */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-green-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
            
            {/* Button Content */}
            <div className="relative h-full flex items-center justify-between px-6 text-white">
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold">
                  {isComplete ? 'Complete!' : 'Log Workout'}
                </span>
                <span className="text-xs opacity-75">
                  {dailyProgress}/{dailyTarget} points
                </span>
              </div>
              
              <div className="flex flex-col items-end">
                <span className="text-xl font-bold">
                  {Math.round(progressPercentage)}%
                </span>
                <span className="text-xs opacity-75">
                  {isComplete ? '🎉' : '💪'}
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
            className={`w-20 h-16 flex items-center justify-center transition-colors duration-200 ${
              profile.group_id 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white' 
                : 'bg-gray-900 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Header */}
      <nav className="lg:hidden sticky top-0 z-40 bg-black border-b border-gray-800">
        <div className="px-4">
          <div className="flex justify-between items-center py-3">
            <div className="text-lg font-bold text-white">
              Commitment App
            </div>

            <Link 
              href={isOnProfilePage ? "/dashboard" : "/profile"} 
              className="text-gray-300 hover:text-white transition-colors duration-200"
            >
              <div className="w-8 h-8 bg-blue-600 flex items-center justify-center">
                {isOnProfilePage ? (
                  <span className="text-white text-lg font-bold">×</span>
                ) : (
                  <UserIcon className="w-4 h-4 text-white" />
                )}
              </div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Desktop Navigation (Modern Clean) */}
      <nav className="hidden lg:block sticky top-0 z-40 bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center py-4">
            <div className="text-xl font-bold text-white">
              Commitment App
            </div>

            <div className="flex items-center space-x-4">
              <Link 
                href={isOnProfilePage ? "/dashboard" : "/profile"} 
                className="text-sm text-gray-300 hover:text-white flex items-center space-x-2 font-medium border border-gray-700 hover:border-gray-600 px-3 py-2 transition-colors duration-200"
              >
                <span>{isOnProfilePage ? "Back to Dashboard" : "Profile"}</span>
                <div className="w-8 h-8 bg-blue-600 flex items-center justify-center">
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

      {/* Spacer for mobile bottom nav */}
      <div className="h-16"></div>

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