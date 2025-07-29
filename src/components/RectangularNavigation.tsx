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
}

export default function RectangularNavigation({ isScrolled = false, onWorkoutModalStateChange }: RectangularNavigationProps) {
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

  const isOnProfilePage = pathname === '/profile'

  const handleWorkoutButtonClick = () => {
    setIsAnimating(true)
    // Small delay to ensure animation state is set before opening modal
    setTimeout(() => {
      setIsWorkoutOpen(true)
      onWorkoutModalStateChange?.(true)
    }, 50)
  }

  const handleWorkoutClose = () => {
    setIsWorkoutOpen(false)
    onWorkoutModalStateChange?.(false)
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

  // Get category colors for exercises with variations
  const getCategoryColor = (type: string, exerciseId: string) => {
    const variations = {
      'all': ['#3b82f6', '#4285f4', '#4f94ff', '#5ba3ff'], // More subtle blue variations
      'recovery': ['#22c55e', '#16a34a', '#15803d', '#166534'], // Green variations  
      'sports': ['#a855f7', '#9333ea', '#7c3aed', '#6d28d9'], // Purple variations
    }
    
    const colorArray = variations[type as keyof typeof variations] || variations['all']
    // Use exercise ID to consistently pick a color variation
    const colorIndex = exerciseId.charCodeAt(0) % colorArray.length
    return colorArray[colorIndex]
  }

  // Create single flowing gradient with pronounced organic edges and rounded shapes
  const createCumulativeGradient = (todayLogs: any[]) => {
    const total = todayLogs?.reduce((sum, log) => sum + log.points, 0) || 0
    
    if (total === 0 || !todayLogs || todayLogs.length === 0) {
      // No exercises logged - show empty state
      return `linear-gradient(to right, #000000 0%, #000000 100%)`
    }

    // Calculate the total progress percentage
    const totalProgress = Math.min(100, (total / dailyTarget) * 100)
    
    // Create gradient stops with pronounced organic variation
    const gradientStops = []
    let cumulativePercent = 0
    
    todayLogs.forEach((log, index) => {
      const exercisePercent = (log.points / total) * totalProgress
      const color = getCategoryColor(log.exercises?.type || 'all', log.exercise_id)
      
      // Much more pronounced organic variation for visible rounded/diagonal edges
      const baseVariation = Math.sin(log.exercise_id.charCodeAt(0) * 0.5) * 8 // -8 to +8% variation
      const startPercent = Math.max(0, cumulativePercent + baseVariation)
      const endPercent = cumulativePercent + exercisePercent
      
      // Create organic shape with multiple transition points
      const organicMid = endPercent + Math.cos(log.exercise_id.charCodeAt(1) * 0.3) * 6 // More variation
      
      gradientStops.push(`${color} ${startPercent}%`)
      gradientStops.push(`${color}ee ${Math.max(startPercent, endPercent - 3)}%`)
      gradientStops.push(`${color}aa ${organicMid}%`)
      gradientStops.push(`${color}44 ${Math.min(100, organicMid + 8)}%`)
      
      cumulativePercent += exercisePercent
    })
    
    // Create very organic, rounded transition to black
    if (totalProgress < 100) {
      // Multiple organic variation points for curved/diagonal effect
      const organicPoint1 = totalProgress + Math.sin(total * 0.2) * 12 // Large variation
      const organicPoint2 = totalProgress + Math.cos(total * 0.15) * 8
      const organicPoint3 = totalProgress + Math.sin(total * 0.25) * 15
      
      // Create multiple transition points for organic bulb shape
      gradientStops.push(`transparent ${Math.max(0, totalProgress - 5)}%`)
      gradientStops.push(`#00000033 ${Math.max(0, organicPoint2)}%`)
      gradientStops.push(`#00000066 ${Math.max(0, organicPoint1)}%`)
      gradientStops.push(`#000000aa ${Math.max(0, organicPoint3)}%`)
      gradientStops.push(`#000000 ${Math.min(100, Math.max(totalProgress + 10, organicPoint3 + 5))}%`)
    }

    return `linear-gradient(to right, ${gradientStops.join(', ')})`
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
            className={`flex-1 relative h-16 bg-gray-900 border-r border-gray-700 overflow-hidden group hover:opacity-90 transition-all duration-500 ease-out ${
              isAnimating ? 'transform -translate-y-full' : 'transform translate-y-0'
            }`}
          >
            {/* Stacked gradient progress background with subtle animation */}
            <div 
              className="absolute left-0 top-0 bottom-0 transition-all duration-600 ease-out"
              style={{ 
                width: progressAnimated ? '100%' : '80%',
                background: createCumulativeGradient(todayLogs)
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

      {/* Fixed Profile Icon - Always in top right with safe area */}
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
            <span className="text-2xl drop-shadow-lg">{profile?.custom_icon || '👤'}</span>
          )}
        </Link>
      </div>

      
      {/* Mobile Sticky Header - Only appears when scrolled - Logo handled by dashboard */}
      {isScrolled && (
        <nav 
          className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-md transition-opacity duration-500"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex justify-start items-center py-4 px-4 pr-20">
            {/* Logo now handled by dashboard page for smooth transitions */}
          </div>
          {/* Border positioned below logo area */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-800 ml-28 lg:ml-32"></div>
        </nav>
      )}

      {/* Fixed Profile Icon - Desktop */}
      <div className="hidden lg:block fixed top-4 right-8 z-[60]">
        <Link 
          href={isOnProfilePage ? "/dashboard" : "/profile"} 
          className="text-sm text-white hover:text-white flex items-center space-x-3 font-medium transition-all duration-200 hover:opacity-80"
        >
          <span className="drop-shadow-lg">{isOnProfilePage ? "Back to Dashboard" : "Profile"}</span>
          <div className="flex items-center justify-center">
            {isOnProfilePage ? (
              <span className="text-white text-xl font-bold drop-shadow-lg">×</span>
            ) : (
              <span className="text-xl drop-shadow-lg">{profile?.custom_icon || '👤'}</span>
            )}
          </div>
        </Link>
      </div>

      
      {/* Desktop Sticky Header - Only appears when scrolled - Logo handled by dashboard */}
      {isScrolled && (
        <nav className="hidden lg:block fixed top-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-md transition-opacity duration-500">
          <div className="flex justify-start items-center py-4 px-8 pr-32 max-w-7xl mx-auto">
            {/* Logo now handled by dashboard page for smooth transitions */}
          </div>
          {/* Border positioned below logo area */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-800 ml-28 lg:ml-32"></div>
        </nav>
      )}


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