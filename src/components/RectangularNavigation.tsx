'use client'

import { useProfile } from '@/hooks/useProfile'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChatBubbleLeftRightIcon,
  UserIcon,
  XMarkIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import GroupChat from '@/components/GroupChat'
import MobileWorkoutLogger from '@/components/MobileWorkoutLogger'
import { supabase } from '@/lib/supabase'
import { createCumulativeGradient } from '@/utils/gradientUtils'
import { useAuth } from '@/contexts/AuthContext'
import { useWeekMode } from '@/contexts/WeekModeContext'
import { calculateDailyTarget, getDaysSinceStart } from '@/utils/targetCalculation'

// Helper function for organic gradients in bottom navigation
const getOrganicGradient = (colorClass: string) => {
  const gradientMap: Record<string, string> = {
    'bg-blue-500': 'radial-gradient(ellipse 200% 100% at 50% 0%, #3b82f6 0%, #2563eb 30%, #1d4ed8 60%, #1e40af 100%)',
    'bg-blue-700': 'radial-gradient(ellipse 200% 100% at 50% 0%, #1d4ed8 0%, #1e40af 30%, #1e3a8a 60%, #172554 100%)'
  }
  return gradientMap[colorClass] || colorClass
}

interface RectangularNavigationProps {
  isScrolled?: boolean
  onWorkoutModalStateChange?: (isOpen: boolean) => void
  onChatModalStateChange?: (isOpen: boolean) => void
  hideSettingsIcons?: boolean
}

export default function RectangularNavigation({ isScrolled = false, onWorkoutModalStateChange, onChatModalStateChange, hideSettingsIcons = false }: RectangularNavigationProps) {
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
  const [todayLogs, setTodayLogs] = useState<any[]>([])
  const [progressAnimated, setProgressAnimated] = useState(false)
  const [showXInChatButton, setShowXInChatButton] = useState(false)
  const [isChatAnimating, setIsChatAnimating] = useState(false)

  const isOnProfilePage = pathname === '/profile'

  const handleWorkoutButtonClick = () => {
    // Open modal first
    setIsWorkoutOpen(true)
    onWorkoutModalStateChange?.(true)
    
    // Start button animation synchronized with modal
    setTimeout(() => {
      setIsAnimating(true)
    }, 50) // Match modal's delay
  }

  const handleWorkoutCloseStart = () => {
    // Start button animation immediately when modal close begins
    setIsAnimating(false)
    // Show X in chat button briefly, then flip back to chat
    setShowXInChatButton(true)
    setTimeout(() => {
      setShowXInChatButton(false)
    }, 200) // Flip back to chat after 200ms
  }

  const handleChatButtonClick = () => {
    // Open modal first
    setIsChatOpen(true)
    onChatModalStateChange?.(true)
    
    // Start button animation synchronized with modal
    setTimeout(() => {
      setIsChatAnimating(true)
    }, 50) // Match modal's delay
  }

  const handleChatCloseStart = () => {
    // Start button animation immediately when modal close begins
    setIsChatAnimating(false)
    // Show X in chat button briefly, then flip back to chat
    setShowXInChatButton(true)
    setTimeout(() => {
      setShowXInChatButton(false)
    }, 200) // Flip back to chat after 200ms
  }

  const handleWorkoutClose = () => {
    setIsWorkoutOpen(false)
    onWorkoutModalStateChange?.(false)
  }

  const handleChatClose = () => {
    setIsChatOpen(false)
    onChatModalStateChange?.(false)
  }

  useEffect(() => {
    if (user && profile) {
      loadDailyProgress()
    }
  }, [user, profile, weekMode])

  // Get exercise segments for stacked gradient progress bar
  const getExerciseSegments = (todayLogs: any[]) => {
    const total = todayLogs?.reduce((sum, log) => sum + log.points, 0) || 0
    const overallProgress = Math.min(100, (total / dailyTarget) * 100)
    
    if (total === 0 || !todayLogs || todayLogs.length === 0) {
      return []
    }

    let currentPosition = 0
    const segments = todayLogs.map(log => {
      const exercisePercentage = (log.points / total) * overallProgress
      const segment = {
        color: getCategoryColor(log.exercises?.type || 'all', log.exercise_id),
        start: currentPosition,
        end: currentPosition + exercisePercentage,
        points: log.points,
        exerciseId: log.exercise_id,
        type: log.exercises?.type || 'all'
      }
      currentPosition += exercisePercentage
      return segment
    })

    return segments
  }

  // Get category colors - single tint for progress bar, variations for individual exercises
  const getCategoryColor = (type: string, exerciseId: string, forProgressBar = false) => {
    if (forProgressBar) {
      // Single tint for total progress bar
      const singleTints = {
        'all': '#3b82f6', // Single blue
        'recovery': '#22c55e', // Single green
        'sports': '#a855f7', // Single purple
      }
      return singleTints[type as keyof typeof singleTints] || singleTints['all']
    }
    
    // Variations for individual exercises
    const variations = {
      'all': ['#3b82f6', '#4285f4', '#4f94ff', '#5ba3ff'], // Blue variations
      'recovery': ['#22c55e', '#16a34a', '#15803d', '#166534'], // Green variations  
      'sports': ['#a855f7', '#9333ea', '#7c3aed', '#6d28d9'], // Purple variations
    }
    
    const colorArray = variations[type as keyof typeof variations] || variations['all']
    const colorIndex = exerciseId.charCodeAt(0) % colorArray.length
    return colorArray[colorIndex]
  }


  const loadDailyProgress = async () => {
    if (!user || !profile) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get today's points with exercise types and exercise_id
      const { data: todayLogs } = await supabase
        .from('logs')
        .select(`
          points,
          exercise_id,
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
      setTodayLogs(todayLogs || [])
      
      // Trigger subtle animation after data loads
      setTimeout(() => setProgressAnimated(true), 200)
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
            className="flex-1 relative h-16 bg-gray-900 border-r border-gray-700 overflow-hidden group hover:opacity-90 transition-all duration-500 ease-out"
            style={{
              transform: isAnimating ? 'translate3d(0, -100%, 0)' : 'translate3d(0, 0, 0)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              touchAction: 'manipulation'
            }}
          >
            {/* Stacked gradient progress background with subtle animation */}
            <div 
              className="absolute left-0 top-0 bottom-0 transition-all duration-600 ease-out"
              style={{ 
                width: progressAnimated ? '100%' : '80%',
                background: createCumulativeGradient(todayLogs || [], dailyTarget),
                // Force cache invalidation
                transform: `translateZ(${Date.now() % 1000}px)`
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
            onClick={handleChatButtonClick}
            disabled={!profile.group_id}
            className={`w-16 h-16 flex items-center justify-center transition-all duration-500 ease-out rounded-none relative overflow-hidden ${
              profile.group_id 
                ? 'bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white' 
                : 'bg-gray-950 text-gray-500 cursor-not-allowed'
            }`}
            style={{
              transform: (isAnimating || isChatAnimating) ? 'translate3d(0, -100%, 0)' : 'translate3d(0, 0, 0)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              touchAction: 'manipulation'
            }}
          >
            {/* Chat Icon (visible when showXInChatButton is false) */}
            <div 
              className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
              style={{
                transform: showXInChatButton ? 'translateY(64px)' : 'translateY(0px)'
              }}
            >
              <ChatBubbleLeftRightIcon className="w-6 h-6" />
            </div>
            
            {/* X Icon (slides down from above when showXInChatButton is true) */}
            <div 
              className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
              style={{
                transform: showXInChatButton ? 'translateY(0px)' : 'translateY(-64px)'
              }}
            >
              <XMarkIcon className="w-6 h-6" />
            </div>
          </button>
        </div>
      </div>

      {/* Fixed Profile Icon - Always in top right with safe area */}
      {!hideSettingsIcons && (
        <div 
          className="lg:hidden fixed right-4 z-[60]"
          style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}
        >
          <Link 
            href={isOnProfilePage ? "/dashboard" : "/profile"} 
            className="flex items-center justify-center transition-all duration-200 hover:opacity-80"
          >
            {isOnProfilePage ? (
              <span className="text-white text-2xl font-bold drop-shadow-lg">×</span>
            ) : (
              <CogIcon className="w-6 h-6 text-white drop-shadow-lg" />
            )}
          </Link>
        </div>
      )}

      
      {/* Mobile Sticky Header - Only appears when scrolled - Logo handled by dashboard */}
      {isScrolled && (
        <nav 
          className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-md transition-opacity duration-500"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex justify-start items-center py-6 px-4 pr-20">
            {/* Logo now handled by dashboard page for smooth transitions */}
          </div>
          {/* Border positioned below logo area */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-800 ml-28 lg:ml-32"></div>
        </nav>
      )}

      {/* Fixed Profile Icon - Desktop */}
      {!hideSettingsIcons && (
        <div className="hidden lg:block fixed top-4 right-8 z-[60]">
          <Link 
            href={isOnProfilePage ? "/dashboard" : "/profile"} 
            className="text-sm text-white hover:text-white flex items-center space-x-3 font-medium transition-all duration-200 hover:opacity-80"
          >
            <span className="drop-shadow-lg">{isOnProfilePage ? "Back to Dashboard" : "Settings"}</span>
            <div className="flex items-center justify-center">
              {isOnProfilePage ? (
                <span className="text-white text-xl font-bold drop-shadow-lg">×</span>
              ) : (
                <CogIcon className="w-5 h-5 text-white drop-shadow-lg" />
              )}
            </div>
          </Link>
        </div>
      )}

      
      {/* Desktop Sticky Header - Only appears when scrolled - Logo handled by dashboard */}
      {isScrolled && (
        <nav className="hidden lg:block fixed top-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-md transition-opacity duration-500">
          <div className="flex justify-start items-center py-6 px-8 pr-32 max-w-7xl mx-auto">
            {/* Logo now handled by dashboard page for smooth transitions */}
          </div>
          {/* Border positioned below logo area */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-800 ml-28 lg:ml-32"></div>
        </nav>
      )}


      {/* Group Chat Modal */}
      <GroupChat 
        isOpen={isChatOpen} 
        onClose={handleChatClose}
        onCloseStart={handleChatCloseStart}
      />

      {/* Workout Modal - Temporarily disabled for deployment */}
      {false && (
        <div>Workout Modal Placeholder</div>
      )}
    </>
  )
}