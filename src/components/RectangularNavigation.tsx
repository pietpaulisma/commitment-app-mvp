'use client'

import { useProfile } from '@/hooks/useProfile'
import { useState, useEffect } from 'react'
import Link from 'next/link'
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
      {/* Bottom Navigation - Rectangular Design */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow-lg p-4">
        <div className="flex space-x-3">
          {/* Progress Bar Button (80% width) */}
          <button
            onClick={() => setIsWorkoutOpen(true)}
            className="flex-1 relative h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl overflow-hidden group hover:from-blue-700 hover:to-purple-700 transition-all duration-200 active:scale-98"
          >
            {/* Progress Background */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
            
            {/* Button Content */}
            <div className="relative h-full flex items-center justify-between px-4 text-white">
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium opacity-90">
                  {isComplete ? 'Target Complete!' : 'Log Workout'}
                </span>
                <span className="text-xs opacity-75">
                  {dailyProgress} / {dailyTarget} points
                </span>
              </div>
              
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold">
                  {Math.round(progressPercentage)}%
                </span>
                <span className="text-xs opacity-75">
                  {isComplete ? '🎉' : '💪'}
                </span>
              </div>
            </div>

            {/* Shimmer effect when complete */}
            {isComplete && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 animate-pulse" />
            )}
          </button>

          {/* Chat Button (20% width) */}
          <button
            onClick={() => setIsChatOpen(true)}
            disabled={!profile.group_id}
            className={`w-16 h-14 rounded-xl flex items-center justify-center transition-all duration-200 ${
              profile.group_id 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white active:scale-95' 
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Desktop Navigation (Simplified) */}
      <nav className="hidden lg:block bg-gray-900 shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <div className="text-xl font-bold text-white">
                Commitment App
              </div>
              
              <div className="flex space-x-6">
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
      <div className="h-20"></div>

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