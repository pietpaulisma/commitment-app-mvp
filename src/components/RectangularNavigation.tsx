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
      {/* Bottom Navigation - Brutalist Design */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t-4 border-white">
        <div className="flex">
          {/* Progress Bar Button (80% width) */}
          <button
            onClick={() => setIsWorkoutOpen(true)}
            className="flex-1 relative h-16 bg-red-600 border-r-4 border-white overflow-hidden group hover:bg-red-500 transition-colors duration-100"
          >
            {/* Progress Background */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-green-400 transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
            
            {/* Button Content */}
            <div className="relative h-full flex items-center justify-between px-6 text-white">
              <div className="flex flex-col items-start">
                <span className="text-sm font-black uppercase tracking-wider">
                  {isComplete ? 'COMPLETE!' : 'WORKOUT'}
                </span>
                <span className="text-xs font-bold uppercase">
                  {dailyProgress}/{dailyTarget} PTS
                </span>
              </div>
              
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black">
                  {Math.round(progressPercentage)}%
                </span>
                <span className="text-xs font-bold">
                  {isComplete ? 'DONE' : 'GO'}
                </span>
              </div>
            </div>

            {/* Flash effect when complete */}
            {isComplete && (
              <div className="absolute inset-0 bg-yellow-400 opacity-30 animate-pulse" />
            )}
          </button>

          {/* Chat Button (20% width) */}
          <button
            onClick={() => setIsChatOpen(true)}
            disabled={!profile.group_id}
            className={`w-20 h-16 flex items-center justify-center transition-colors duration-100 ${
              profile.group_id 
                ? 'bg-blue-600 hover:bg-blue-500 text-white border-2 border-white' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed border-2 border-gray-400'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-8 h-8" />
          </button>
        </div>
      </div>

      {/* Desktop Navigation (Brutalist) */}
      <nav className="hidden lg:block bg-black border-b-4 border-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center py-6">
            <div className="text-2xl font-black text-white uppercase tracking-wider">
              COMMITMENT APP
            </div>

            <div className="flex items-center space-x-6">
              <Link 
                href="/profile" 
                className="text-sm text-white hover:text-yellow-400 flex items-center space-x-3 font-bold uppercase tracking-wide border-2 border-white hover:border-yellow-400 px-4 py-2 transition-colors duration-100"
              >
                <span>PROFILE</span>
                <div className="w-8 h-8 bg-purple-600 border-2 border-white flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
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