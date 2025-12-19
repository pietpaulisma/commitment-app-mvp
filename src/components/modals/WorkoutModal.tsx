'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createCumulativeGradient, getExerciseTypeGradient, getButtonGradient, getButtonShadow } from '@/utils/gradientUtils'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useWeekMode } from '@/contexts/WeekModeContext'
import { usePageState } from '@/hooks/usePageState'
import { calculateDailyTarget, getDaysSinceStart, canUseRecoveryDayToday, RECOVERY_DAY_TARGET_MINUTES } from '@/utils/targetCalculation'
import { hasUsedRecoveryDayThisWeek, getActiveRecoveryDay, activateRecoveryDay, updateRecoveryDayProgress, cancelRecoveryDay, type UserRecoveryDay } from '@/utils/recoveryDayHelpers'
import { NotificationService } from '@/services/notificationService'
import { COLORS } from '@/utils/colors'
import {
  X,
  Heart,
  Flame,
  Moon,
  Zap,
  Sparkles,
  ChevronDown,
  Star,
  Activity,
  Smile,
  Calendar,
  Trash2,
  Menu,
  MessageCircle,
  Lock,
  ChevronUp,
  Check,
  Clock,
  Plus,
  Trophy,
  Award
} from 'lucide-react'

type Exercise = {
  id: string
  name: string
  type: string
  unit: string
  points_per_unit: number
  is_weighted: boolean
  is_time_based: boolean
  supports_decreased?: boolean
}

type ExerciseWithProgress = Exercise & {
  todayCount: number
  emoji: string
  lastDone?: string
}


type WorkoutModalProps = {
  isOpen: boolean
  onClose: () => void
  onWorkoutAdded?: () => void
  isAnimating?: boolean
  onCloseStart?: () => void
  onOpenChat?: () => void
}

export default function WorkoutModal({ isOpen, onClose, onWorkoutAdded, isAnimating = false, onCloseStart, onOpenChat }: WorkoutModalProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { weekMode, setWeekMode, setWeekModeWithSync, isWeekModeAvailable } = useWeekMode()
  const { markWorkoutInProgress, clearWorkoutInProgress } = usePageState()

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

  // Get workout date in user's local timezone (not UTC)
  // This ensures workouts logged late at night count for the correct day
  const getLocalDateString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Get colors based on week mode like dashboard
  const getModeColor = () => {
    switch (weekMode) {
      case 'sane':
        return '#3b82f6' // Blue for sane mode
      case 'insane':
        return '#ef4444' // Red for insane mode
      default:
        return '#3b82f6' // Default to blue
    }
  }

  // Get exercise type colors for workout input
  const getExerciseTypeColors = (exerciseType: string) => {
    switch (exerciseType) {
      case 'recovery':
        return {
          gradient: 'from-green-600 to-emerald-600',
          progressBar: 'bg-green-500',
          currentBar: 'bg-emerald-500'
        }
      case 'sports':
        return {
          gradient: 'from-purple-600 to-violet-600',
          progressBar: 'bg-purple-500',
          currentBar: 'bg-violet-500'
        }
      default: // 'all' or other types
        return {
          gradient: 'from-blue-600 to-indigo-600',
          progressBar: 'bg-blue-500',
          currentBar: 'bg-indigo-500'
        }
    }
  }

  const userColor = getModeColor()
  const [exercises, setExercises] = useState<ExerciseWithProgress[]>([])
  const [loading, setLoading] = useState(false)

  const [exercisesLoading, setExercisesLoading] = useState(false)
  const [isAnimatedIn, setIsAnimatedIn] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [showIconTransition, setShowIconTransition] = useState(false)
  const [dailyProgress, setDailyProgress] = useState(0)
  const [dailyTarget, setDailyTarget] = useState(1)
  const [recoveryProgress, setRecoveryProgress] = useState(0)
  const [groupDaysSinceStart, setGroupDaysSinceStart] = useState(0)
  const [workoutInputOpen, setWorkoutInputOpen] = useState(false)
  const [selectedWorkoutExercise, setSelectedWorkoutExercise] = useState<ExerciseWithProgress | null>(null)
  const [workoutCount, setWorkoutCount] = useState(0)
  const [todaysWorkouts, setTodaysWorkouts] = useState<any[]>([])
  const [todayLogs, setTodayLogs] = useState<any[]>([])
  const [selectedWeight, setSelectedWeight] = useState(0)
  const [isDecreasedExercise, setIsDecreasedExercise] = useState(false)
  const [lockedWeights, setLockedWeights] = useState<Record<string, number>>({})
  const [progressAnimated, setProgressAnimated] = useState(false)
  const [allExercisesExpanded, setAllExercisesExpanded] = useState(false)
  const [recoveryExpanded, setRecoveryExpanded] = useState(false)
  const [sportsExpanded, setSportsExpanded] = useState(false)
  const [favoritesExpanded, setFavoritesExpanded] = useState(false)
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [completedExercisesExpanded, setCompletedExercisesExpanded] = useState(false)
  const [expandedWorkouts, setExpandedWorkouts] = useState<Record<string, boolean>>({})
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set())
  const [showSportSelection, setShowSportSelection] = useState(false)
  const [selectedSport, setSelectedSport] = useState('')
  const [selectedSportType, setSelectedSportType] = useState('')
  const [selectedIntensity, setSelectedIntensity] = useState('')
  const [isStopwatchExpanded, setIsStopwatchExpanded] = useState(false)
  const [stopwatchTime, setStopwatchTime] = useState(0) // in milliseconds
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false)
  const [stopwatchStartTime, setStopwatchStartTime] = useState(0) // timestamp when started
  const [stopwatchPausedDuration, setStopwatchPausedDuration] = useState(0) // accumulated paused time
  const [motivationalMessage, setMotivationalMessage] = useState('')
  const [successOverlay, setSuccessOverlay] = useState<{ show: boolean, message: string, isInsane?: boolean } | null>(null)
  const [showMotivationalMessage, setShowMotivationalMessage] = useState(false)
  const [lastMinuteCount, setLastMinuteCount] = useState(0) // Track minutes for auto-increment
  const [hasFlexibleRestDay, setHasFlexibleRestDay] = useState(false)
  const [isUsingFlexibleRestDay, setIsUsingFlexibleRestDay] = useState(false)
  const [hasPostedToday, setHasPostedToday] = useState(false)
  const [checkingPostStatus, setCheckingPostStatus] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [sportsList, setSportsList] = useState<Array<{ id: string, name: string, emoji: string }>>([])
  const [isDragging, setIsDragging] = useState(false)
  const [sliderPosition, setSliderPosition] = useState(0)
  const [isSliderComplete, setIsSliderComplete] = useState(false)
  const [personalRecord, setPersonalRecord] = useState<number | null>(null)
  const [personalRecordDate, setPersonalRecordDate] = useState<string | null>(null)
  const [groupRecord, setGroupRecord] = useState<number | null>(null)
  const [groupRecordUser, setGroupRecordUser] = useState<string | null>(null)
  
  // Recovery Day state
  const [isRecoveryDayActive, setIsRecoveryDayActive] = useState(false)
  const [recoveryDayData, setRecoveryDayData] = useState<UserRecoveryDay | null>(null)
  const [canUseRecoveryDay, setCanUseRecoveryDay] = useState(false)
  const [isActivatingRecoveryDay, setIsActivatingRecoveryDay] = useState(false)
  const [isCancellingRecoveryDay, setIsCancellingRecoveryDay] = useState(false)

  const router = useRouter()

  // Interesting facts and quotes regarding fitness and human body
  const workoutFacts = [
    "1. Muscles: Your body has over 600 muscles.",
    "2. Heart: Your heart pumps about 2,000 gallons of blood daily.",
    "3. Bones: You are born with 300 bones, but adults have 206.",
    "4. Sweat: You have 2-4 million sweat glands.",
    "5. Steps: 10,000 steps burned about 300-400 calories.",
    "6. Smiling: Uses 17 muscles (frowning uses 43).",
    "7. Tongue: The strongest muscle based on its weight.",
    "8. Brain: Uses 20% of your body's oxygen.",
    "9. Skin: Your largest organ, weighs ~8 lbs.",
    "10. Water: 60% of your body weight is water.",
    "11. Blink: You blink ~15-20 times per minute.",
    "12. Sleep: Muscles grow while you sleep, not while you train.",
    "13. Taste: You lose taste buds as you age.",
    "14. Feet: Contains 25% of all your bones.",
    "15. Hands: Half your hand strength is in your pinky.",
    "16. Nerves: Impulses travel at 170 mph.",
    "17. Fat: 1 lb of fat = 3,500 calories.",
    "18. Music: Can increase workout performance by 15%.",
    "19. Cold: You burn more calories shivering.",
    "20. Habits: Takes ~66 days to form a new habit.",
    "21. Focus: Exercise improves brain plasticity.",
    "22. Stress: Working out reduces cortisol levels.",
    "23. Heart: Exercise expands your arteries.",
    "24. Lungs: Exercise increases lung capacity.",
    "25. Posture: Strong abs improve your posture.",
    "26. Mood: Exercise releases endorphins.",
    "27. Energy: Working out gives you more energy.",
    "28. Goals: Small progress is still progress.",
    "29. Form: Quality over quantity, always.",
    "30. Mind: Your body can stand almost anything.",
    "31. Push: It’s the mind you have to convince.",
    "32. Why: Remember why you started.",
    "33. You: You are your only competition.",
    "34. Now: The only bad workout is the one that didn't happen.",
    "35. Grit: Sweat is just fat crying.",
    "36. Pain: Sore today, strong tomorrow.",
    "37. Limit: Your limit is you."
  ]

  // Fetch Personal Record and Group Record when exercise is selected or modal opens
  useEffect(() => {
    async function fetchRecords() {
      if (!selectedWorkoutExercise || !user || !workoutInputOpen || !profile?.group_id) return

      // Determine which field to query based on exercise type
      const isTimeBased = selectedWorkoutExercise.unit === 'hour' || selectedWorkoutExercise.unit === 'min' || selectedWorkoutExercise.is_time_based
      const field = isTimeBased ? 'duration' : 'count'

      // Fetch personal record with date
      const { data: prData, error: prError } = await supabase
        .from('logs')
        .select(`${field}, date`)
        .eq('user_id', user.id)
        .eq('exercise_id', selectedWorkoutExercise.id)
        .order(field, { ascending: false })
        .limit(1)
        .maybeSingle()

      if (prError && prError.code !== 'PGRST116') {
        console.error('Error fetching PR:', prError)
        setPersonalRecord(null)
        setPersonalRecordDate(null)
      } else if (prData) {
        setPersonalRecord(prData[field as keyof typeof prData] as number)
        setPersonalRecordDate(prData.date)
      } else {
        setPersonalRecord(null)
        setPersonalRecordDate(null)
      }

      // Fetch group record with username
      const { data: groupMembers } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('group_id', profile.group_id)

      if (groupMembers && groupMembers.length > 0) {
        const memberIds = groupMembers.map(m => m.id)
        const memberMap = new Map(groupMembers.map(m => [m.id, m.username]))
        
        const { data: grData, error: grError } = await supabase
          .from('logs')
          .select(`${field}, user_id`)
          .in('user_id', memberIds)
          .eq('exercise_id', selectedWorkoutExercise.id)
          .order(field, { ascending: false })
          .limit(1)
          .maybeSingle()

        if (grError && grError.code !== 'PGRST116') {
          console.error('Error fetching group record:', grError)
          setGroupRecord(null)
          setGroupRecordUser(null)
        } else if (grData) {
          const recordValue = grData[field as keyof typeof grData] as number
          setGroupRecord(recordValue)
          // Get username from our member map
          const recordUsername = memberMap.get(grData.user_id) || null
          setGroupRecordUser(recordUsername)
        } else {
          // No record exists in the group yet for this exercise
          setGroupRecord(null)
          setGroupRecordUser(null)
        }
      }
    }
    fetchRecords()
  }, [selectedWorkoutExercise, user, workoutInputOpen, profile?.group_id])

  // Auto-stop stopwatch when exercise changes or workout is submitted
  useEffect(() => {
    if (!workoutInputOpen || !selectedWorkoutExercise) {
      if (isStopwatchRunning) {
        pauseStopwatch()
      }
    }
  }, [workoutInputOpen, selectedWorkoutExercise])


  // localStorage functions for locked weights
  const saveLockedWeightsToStorage = (weights: Record<string, number>) => {
    try {
      localStorage.setItem('workout-locked-weights', JSON.stringify(weights))
    } catch (error) {
      console.warn('Failed to save locked weights to localStorage:', error)
    }
  }

  const loadLockedWeightsFromStorage = (): Record<string, number> => {
    try {
      const stored = localStorage.getItem('workout-locked-weights')
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.warn('Failed to load locked weights from localStorage:', error)
      return {}
    }
  }

  // Load locked weights from localStorage on component mount
  useEffect(() => {
    const storedWeights = loadLockedWeightsFromStorage()
    setLockedWeights(storedWeights)
  }, [])

  // Save locked weights to localStorage whenever they change
  useEffect(() => {
    saveLockedWeightsToStorage(lockedWeights)
  }, [lockedWeights])

  // Load flexible rest day state from profile
  useEffect(() => {
    if (profile) {
      setHasFlexibleRestDay(profile.has_flexible_rest_day || false)
    }
  }, [profile])

  // Check if user has already posted today
  useEffect(() => {
    if (user && profile?.group_id) {
      checkTodayPostStatus()
    }
  }, [user, profile?.group_id])

  useEffect(() => {
    if (isOpen && user && profile?.group_id) {

      // Mark workout as in progress for state preservation
      markWorkoutInProgress()

      // Prevent background scrolling
      document.body.style.overflow = 'hidden'

      // Only load data if we haven't loaded it already (prevent reload on mode change)
      if (exercises.length === 0) {
        loadExercises()
        loadTodaysWorkouts()
        loadFavoriteExercises()
      }

      // Load sports list from database
      if (sportsList.length === 0) {
        loadSports()
      }

      // Always reload daily progress for target calculation
      loadDailyProgress()

      // Always recheck if user has posted today (important for sick mode changes)
      checkTodayPostStatus()

      // Wait for modal to be fully mounted before starting animation
      setTimeout(() => {
        setIsAnimatedIn(true)

        // Delay icon transition until modal reaches the top (cherry on the cake!)
        setTimeout(() => {
          setShowIconTransition(true)
        }, 400) // Start icon transition near end of modal slide-up
      }, 50) // Small delay to ensure DOM is ready

      // Trigger subtle progress animation after modal loads
      setTimeout(() => setProgressAnimated(true), 300)
    } else if (!isOpen) {
      setIsAnimatedIn(false)
      setIsClosing(false)
      setShowIconTransition(false)

      // Restore background scrolling
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, user, profile?.group_id, weekMode])

  // Cleanup effect to ensure body scroll is restored on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // Stopwatch effect - date-based for background tab support
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        const now = Date.now()
        const elapsed = now - stopwatchStartTime - stopwatchPausedDuration
        setStopwatchTime(Math.max(0, elapsed))
      }, 10)
    }
    return () => clearInterval(interval)
  }, [isStopwatchRunning, stopwatchStartTime, stopwatchPausedDuration])

  // Motivational messages effect - show every 5 seconds while running
  useEffect(() => {
    let messageInterval: NodeJS.Timeout
    let initialTimeout: NodeJS.Timeout

    if (isStopwatchRunning) {
      const showMessage = () => {
        // Randomly pick a fact
        const randomFact = workoutFacts[Math.floor(Math.random() * workoutFacts.length)]
        setMotivationalMessage(randomFact)
        setShowMotivationalMessage(true)

        // Let CSS animation handle the fade out (4 second duration)
        // Reset the message state after animation completes
        setTimeout(() => {
          setShowMotivationalMessage(false)
        }, 4000)
      }

      // Show first message after 1 second
      initialTimeout = setTimeout(showMessage, 1000)

      // Then show every 5 seconds
      messageInterval = setInterval(showMessage, 5000)
    } else {
      setShowMotivationalMessage(false)
    }

    return () => {
      clearInterval(messageInterval)
      clearTimeout(initialTimeout)
    }
  }, [isStopwatchRunning])

  // Auto-increment points when reaching a new minute
  useEffect(() => {
    if (isStopwatchRunning && selectedWorkoutExercise && selectedWorkoutExercise.is_time_based) {
      const currentMinutes = Math.floor(stopwatchTime / 60000)
      if (currentMinutes > lastMinuteCount && currentMinutes > 0) {
        // Determine increment amount based on exercise unit
        const incrementAmount = selectedWorkoutExercise.unit === 'hour'
          ? parseFloat((1 / 60).toFixed(4)) // 1 minute = 1/60 hour, rounded to 4 decimal places
          : 1 // 1 minute for minute-based exercises

        setWorkoutCount(prev => parseFloat((prev + incrementAmount).toFixed(4)))
        setLastMinuteCount(currentMinutes)
      }
    }
  }, [stopwatchTime, isStopwatchRunning, selectedWorkoutExercise, lastMinuteCount])

  // Helper function to get the appropriate step amount for manual increments
  const getStepAmount = () => {
    if (selectedWorkoutExercise && selectedWorkoutExercise.unit === 'hour') {
      return parseFloat((1 / 60).toFixed(4)) // 1 minute = 1/60 hour
    }
    return 1 // 1 minute for minute-based exercises, 1 rep for rep-based exercises
  }

  // Format stopwatch time (mm:ss format)
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Stopwatch controls
  const startStopwatch = () => {
    const now = Date.now()
    if (stopwatchStartTime === 0) {
      // First start - set initial timestamp
      setStopwatchStartTime(now)
    } else {
      // Resume - add the pause duration to accumulated paused time
      setStopwatchPausedDuration(prev => prev + (now - stopwatchStartTime - stopwatchTime))
      setStopwatchStartTime(now)
    }
    setIsStopwatchRunning(true)
  }

  const pauseStopwatch = () => {
    setIsStopwatchRunning(false)
  }

  const resetStopwatch = () => {
    setIsStopwatchRunning(false)
    setStopwatchTime(0)
    setStopwatchStartTime(0)
    setStopwatchPausedDuration(0)
    setLastMinuteCount(0)
    setShowMotivationalMessage(false)
  }

  const handleClose = () => {
    setIsClosing(true)

    // Clear workout in progress state
    clearWorkoutInProgress()

    // Start reverse icon animation immediately - X flips back to chat
    setShowIconTransition(false)

    // Start modal slide down animation
    setIsAnimatedIn(false)

    // Notify parent immediately that close animation started (for button sync)
    if (onCloseStart) {
      onCloseStart()
    }

    // Wait for animation to complete, then actually close
    setTimeout(() => {
      onClose()
    }, 500) // Match the CSS transition duration
  }

  // Shared function to load group data and calculate target
  const loadGroupDataAndCalculateTarget = async (modeOverride?: 'sane' | 'insane') => {
    if (!profile?.group_id) return { target: 1, daysSinceStart: 0 }

    try {
      // Get group start date and settings in parallel
      const [groupResult, settingsResult] = await Promise.all([
        supabase
          .from('groups')
          .select('start_date')
          .eq('id', profile.group_id)
          .single(),
        supabase
          .from('group_settings')
          .select('rest_days')
          .eq('group_id', profile.group_id)
          .maybeSingle()
      ])

      if (groupResult.data?.start_date) {
        const daysSinceStart = getDaysSinceStart(groupResult.data.start_date)
        const restDays = settingsResult.data?.rest_days || [1]

        // Use override mode if provided, otherwise use current context mode
        const targetMode = modeOverride || weekMode

        const target = calculateDailyTarget({
          daysSinceStart,
          weekMode: targetMode,
          restDays,
          isUserRecoveryDay: isRecoveryDayActive
        })

        return { target, daysSinceStart }
      }
    } catch (error) {
      console.error('Error loading group data:', error)
    }

    return { target: 1, daysSinceStart: 0 }
  }

  const recalculateTargetWithMode = async (newMode: 'sane' | 'insane') => {
    // Just recalculate the target locally without reloading data
    // Skip if on recovery day (target is fixed at 15 min)
    if (isRecoveryDayActive) return
    
    if (groupDaysSinceStart > 0) {
      const newTarget = calculateDailyTarget({
        daysSinceStart: groupDaysSinceStart,
        weekMode: newMode,
        restDays: [1] // Default rest days
      })
      setDailyTarget(newTarget)
    }
  }

  const checkAutomaticModeSwitch = async () => {
    // Only check if user is in sane mode and mode switching is available
    if (weekMode !== 'sane' || !isWeekModeAvailable(groupDaysSinceStart) || !profile?.group_id) {
      return
    }

    try {
      // Get current total points for today
      const currentTotalPoints = dailyProgress

      // Only proceed if they've actually done some exercise
      if (currentTotalPoints <= 0) {
        return
      }

      // Calculate what the insane target would be for today
      const { target: insaneTargetForToday } = await loadGroupDataAndCalculateTarget('insane')

      // If user met/exceeded insane target while in sane mode, switch to insane
      if (currentTotalPoints >= insaneTargetForToday) {
        await setWeekModeWithSync('insane', user?.id)

        // Recalculate target with new mode
        await recalculateTargetWithMode('insane')

        // Show mode switch notification
        alert(`🔥 INSANE MODE ACTIVATED! You exceeded the insane target (${insaneTargetForToday}) with ${currentTotalPoints} points!`)
      }
    } catch (error) {
      console.error('Error checking automatic mode switch:', error)
      // Silently fail - don't interrupt the user's workout flow
    }
  }

  // Use flexible rest day function
  const useFlexibleRestDay = async () => {
    if (!user || !profile || isUsingFlexibleRestDay) return

    setIsUsingFlexibleRestDay(true)
    try {
      // Calculate the required points for today based on current mode
      // We use the current weekMode to ensure they get enough points to meet their target
      const { target: targetPoints } = await loadGroupDataAndCalculateTarget()

      // Log the flexible rest day points automatically
      const { error: logError } = await supabase
        .from('logs')
        .insert({
          user_id: user.id,
          exercise_id: 'flexible_rest_day', // Special case for flexible rest day
          points: targetPoints,
          date: getLocalDateString(),
          count: 1,
          weight: 0,
          duration: 0,
          timestamp: Date.now()
        })

      if (logError) throw logError

      // Reset the flexible rest day flag
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ has_flexible_rest_day: false })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Post to group chat
      const { error: chatError } = await supabase
        .from('chat_messages')
        .insert({
          group_id: profile.group_id,
          user_id: user.id,
          message: `🛌 ${profile.username} used their flexible rest day and automatically earned ${targetPoints} points!`,
          message_type: 'system',
          created_at: new Date().toISOString()
        })

      if (chatError) throw chatError

      // Update local state
      setHasFlexibleRestDay(false)

      // Refresh the daily progress
      await loadDailyProgress()

      alert(`✅ Flexible rest day used! You earned ${targetPoints} points automatically.`)

    } catch (error) {
      console.error('Error using flexible rest day:', error)
      alert('❌ Failed to use flexible rest day. Please try again.')
    } finally {
      setIsUsingFlexibleRestDay(false)
    }
  }

  // Check if user should earn a flexible rest day
  const checkFlexibleRestDayEarned = async () => {
    if (!user || !profile || hasFlexibleRestDay) return

    try {
      // Check if today is a rest day
      const today = new Date()
      const currentDayOfWeek = today.getDay()

      // Get group settings to check rest days
      const { data: groupSettings } = await supabase
        .from('group_settings')
        .select('rest_days')
        .eq('group_id', profile.group_id)
        .maybeSingle()

      const restDays = groupSettings?.rest_days || [1] // Default Monday

      if (!restDays.includes(currentDayOfWeek)) {
        return // Not a rest day
      }

      // Calculate the double target for today using INSANE mode explicitly
      // User must hit double the INSANE target to earn a flexible rest day
      const { target: restDayTarget } = await loadGroupDataAndCalculateTarget('insane')

      // Check if user has met the full rest day target (which is already doubled)
      const totalPointsToday = dailyProgress

      if (totalPointsToday >= restDayTarget) {
        // Award flexible rest day
        const { error } = await supabase
          .from('profiles')
          .update({ has_flexible_rest_day: true })
          .eq('id', user.id)

        if (!error) {
          setHasFlexibleRestDay(true)

          // Optional: Show notification
          alert('🎉 Congratulations! You earned a flexible rest day by completing your double Monday target!')
        }
      }
    } catch (error) {
      console.error('Error checking flexible rest day:', error)
    }
  }

  const loadDailyProgress = async (targetOverride?: number) => {
    if (!user || !profile) return

    try {
      const today = new Date().toISOString().split('T')[0]

      // Load points, optionally load target data if not provided
      const loadPromises: any[] = [
        supabase
          .from('logs')
          .select(`
            points,
            exercise_id,
            count,
            duration,
            exercises(id, name, unit, is_time_based, type)
          `)
          .eq('user_id', user.id)
          .eq('date', today)
      ]

      // Only load target data if not provided as override
      if (!targetOverride) {
        loadPromises.push(loadGroupDataAndCalculateTarget())
      }

      const results = await Promise.all(loadPromises)
      const pointsResult = results[0] as any
      const targetData = targetOverride 
        ? { target: targetOverride, daysSinceStart: 0 }
        : results[1]

      // Calculate regular and recovery points separately
      const regularPoints = pointsResult.data
        ?.filter((log: any) => {
          // Find exercise in local state since we can't join
          const exercise = exercises.find(e => e.id === log.exercise_id)
          return exercise?.type !== 'recovery'
        })
        ?.reduce((sum: number, log: any) => sum + log.points, 0) || 0

      const recoveryPoints = pointsResult.data
        ?.filter((log: any) => {
          const exercise = exercises.find(e => e.id === log.exercise_id)
          return exercise?.type === 'recovery'
        })
        ?.reduce((sum: number, log: any) => sum + log.points, 0) || 0

      // Calculate daily progress with recovery cap (recovery day status checked separately)
      let effectiveRecoveryPoints = recoveryPoints
      if (recoveryPoints > 0 && !isRecoveryDayActive) {
        const maxRecoveryAllowed = Math.floor(targetData.target * 0.25)
        effectiveRecoveryPoints = Math.min(recoveryPoints, maxRecoveryAllowed)
      }

      const cappedTotalPoints = regularPoints + effectiveRecoveryPoints

      // Don't override if recovery day is active (recovery day handles its own progress)
      if (!isRecoveryDayActive) {
        setDailyProgress(cappedTotalPoints)
        setDailyTarget(targetData.target)
      }
      setGroupDaysSinceStart(targetData.daysSinceStart)
      setRecoveryProgress(recoveryPoints) // Keep full recovery points for display
      setTodayLogs(pointsResult.data || [])
    } catch (error) {
      console.error('Error loading daily progress:', error)
    }

    // Check if user earned a flexible rest day
    await checkFlexibleRestDayEarned()
    
    // Check recovery day status
    await checkRecoveryDayStatus()
  }

  // Check and load recovery day status
  const checkRecoveryDayStatus = async () => {
    if (!user) return
    
    try {
      // Check if user has an active recovery day today
      const activeRecoveryDay = await getActiveRecoveryDay(user.id)
      
      if (activeRecoveryDay) {
        setIsRecoveryDayActive(true)
        setRecoveryDayData(activeRecoveryDay)
        setCanUseRecoveryDay(false)
        
        // On recovery day, target is 15 minutes
        setDailyTarget(RECOVERY_DAY_TARGET_MINUTES)
        
        // Calculate recovery minutes from today's logs
        const today = new Date().toISOString().split('T')[0]
        const { data: todayLogs } = await supabase
          .from('logs')
          .select('duration, exercises(type)')
          .eq('user_id', user.id)
          .eq('date', today)
        
        const recoveryMinutes = todayLogs
          ?.filter((log: any) => log.exercises?.type === 'recovery')
          ?.reduce((sum: number, log: any) => sum + (log.duration || 0), 0) || 0
        
        setDailyProgress(recoveryMinutes)
        
        // Update progress in database if needed
        if (recoveryMinutes !== activeRecoveryDay.recovery_minutes) {
          await updateRecoveryDayProgress(user.id, recoveryMinutes)
        }
      } else {
        setIsRecoveryDayActive(false)
        setRecoveryDayData(null)
        
        // Check if recovery day is available this week
        const canUseToday = canUseRecoveryDayToday()
        if (canUseToday) {
          const alreadyUsed = await hasUsedRecoveryDayThisWeek(user.id)
          setCanUseRecoveryDay(!alreadyUsed)
        } else {
          setCanUseRecoveryDay(false)
        }
      }
    } catch (error) {
      console.error('Error checking recovery day status:', error)
    }
  }
  
  // Activate recovery day for today
  const handleActivateRecoveryDay = async () => {
    if (!user || isActivatingRecoveryDay) return
    
    setIsActivatingRecoveryDay(true)
    try {
      const newRecoveryDay = await activateRecoveryDay(user.id)
      
      if (newRecoveryDay) {
        setIsRecoveryDayActive(true)
        setRecoveryDayData(newRecoveryDay)
        setCanUseRecoveryDay(false)
        setDailyTarget(RECOVERY_DAY_TARGET_MINUTES)
        setDailyProgress(0)
        
        // Post to group chat if in a group
        if (profile?.group_id) {
          await supabase
            .from('chat_messages')
            .insert({
              group_id: profile.group_id,
              user_id: user.id,
              message: `🧘 ${profile.username} is taking their weekly recovery day! Target: ${RECOVERY_DAY_TARGET_MINUTES} min of recovery.`,
              message_type: 'system',
              created_at: new Date().toISOString()
            })
        }
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }
      } else {
        alert('Could not activate recovery day. The database table may not exist yet - please run the migration first.')
      }
    } catch (error) {
      console.error('Error activating recovery day:', error)
      alert('Error activating recovery day. The database table may not exist yet - please run the migration.')
    } finally {
      setIsActivatingRecoveryDay(false)
    }
  }
  
  // Cancel/undo recovery day
  const handleCancelRecoveryDay = async () => {
    if (!user || isCancellingRecoveryDay) return
    
    setIsCancellingRecoveryDay(true)
    try {
      const success = await cancelRecoveryDay(user.id)
      
      if (success) {
        setIsRecoveryDayActive(false)
        setRecoveryDayData(null)
        setCanUseRecoveryDay(true)
        
        // Reload normal target
        await loadDailyProgress()
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      } else {
        alert('Could not cancel recovery day. Please try again.')
      }
    } catch (error) {
      console.error('Error cancelling recovery day:', error)
      alert('Error cancelling recovery day. Please try again.')
    } finally {
      setIsCancellingRecoveryDay(false)
    }
  }

  const loadTodaysWorkouts = async () => {
    if (!user) return

    try {
      const today = new Date().toISOString().split('T')[0]

      // Fetch workouts with exercise data using a join
      const { data: workouts } = await supabase
        .from('logs')
        .select('*, exercises(*)')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('points', { ascending: false })

      setTodaysWorkouts(workouts || [])
    } catch (error) {
      console.error('Error loading today\'s workouts:', error)
    }
  }

  // Group and merge duplicate exercises with same weight
  const getGroupedWorkouts = () => {
    const grouped = todaysWorkouts.reduce((acc, log) => {
      const key = `${log.exercise_id}-${log.weight || 0}`
      if (!acc[key]) {
        acc[key] = {
          ...log,
          totalCount: log.count || log.duration,
          totalPoints: log.points,
          logs: [log]
        }
      } else {
        acc[key].totalCount += (log.count || log.duration)
        acc[key].totalPoints += log.points
        acc[key].logs.push(log)
      }
      return acc
    }, {} as Record<string, any>)

    return Object.values(grouped)
  }

  const handleWorkoutClick = (workout: any) => {
    // Find the exercise and set it as selected
    const exercise = exercises.find(ex => ex.id === workout.exercise_id)
    if (exercise) {
      setSelectedWorkoutExercise(exercise)
      setWorkoutCount(0)
      setSelectedWeight(workout.weight || 0)
      setWorkoutInputOpen(true)
      // Scroll to top of modal
      const modalElement = document.querySelector('[role="dialog"]')
      if (modalElement) {
        modalElement.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const loadFavoriteExercises = async () => {
    if (!user) return

    try {
      setFavoritesLoading(true)
      const { data: favorites, error } = await supabase
        .from('user_favorite_exercises')
        .select('exercise_id')
        .eq('user_id', user.id)

      if (error) {
        // Favorites table not available - silently ignore
        return
      }

      setFavoriteExerciseIds(favorites?.map(f => f.exercise_id) || [])
    } catch (error) {
      console.error('Error loading favorite exercises:', error)
    } finally {
      setFavoritesLoading(false)
    }
  }

  const toggleFavorite = async (exerciseId: string) => {
    if (!user) return

    try {
      const isFavorite = favoriteExerciseIds.includes(exerciseId)

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('user_favorite_exercises')
          .delete()
          .eq('user_id', user.id)
          .eq('exercise_id', exerciseId)

        if (error) {
          // Cannot remove favorite - table not available
          return
        }

        setFavoriteExerciseIds(prev => prev.filter(id => id !== exerciseId))
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('user_favorite_exercises')
          .insert({ user_id: user.id, exercise_id: exerciseId })

        if (error) {
          // Cannot add favorite - table not available
          return
        }

        setFavoriteExerciseIds(prev => [...prev, exerciseId])
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }


  const getExerciseIcon = (exercise: Exercise | undefined) => {
    if (!exercise) return <span className="text-base">💪</span>
    const name = exercise.name.toLowerCase()

    // Exercise-specific emoji mappings - more fun!
    switch (name) {
      // Strength exercises
      case 'push-ups':
      case 'pushups':
        return <span className="text-base">💪</span>
      case 'pull-ups':
      case 'pullups':
        return <span className="text-base">🦾</span>
      case 'squats':
        return <span className="text-base">🍑</span>
      case 'lunges':
        return <span className="text-base">🦵</span>
      case 'sit-ups':
      case 'situps':
        return <span className="text-base">🔥</span>
      case 'dips':
        return <span className="text-base">💪</span>
      case 'jumping jacks':
        return <span className="text-base">⚡</span>

      // Cardio exercises
      case 'running':
        return <span className="text-base">🏃</span>
      case 'cycling':
      case 'biking':
        return <span className="text-base">🚴</span>
      case 'swimming':
        return <span className="text-base">🏊</span>
      case 'walking':
        return <span className="text-base">🚶</span>

      // Recovery exercises
      case 'stretching':
        return <span className="text-base">🧘</span>
      case 'yoga':
        return <span className="text-base">🧘</span>
      case 'meditation':
        return <span className="text-base">🧘</span>
      case 'foam rolling':
      case 'blackrolling':
        return <span className="text-base">🎯</span>
      case 'massage':
        return <span className="text-base">💆</span>
      case 'sauna':
        return <span className="text-base">🔥</span>
      case 'ice bath':
      case 'cold shower':
        return <span className="text-base">🧊</span>

      // Sport activities
      case 'tennis':
        return <span className="text-base">🎾</span>
      case 'basketball':
        return <span className="text-base">🏀</span>
      case 'football':
      case 'soccer':
        return <span className="text-base">⚽</span>
      case 'volleyball':
        return <span className="text-base">🏐</span>

      default:
        // Fallback to type-based emojis
        const type = exercise.type?.toLowerCase()
        switch (type) {
          case 'strength':
            return <span className="text-base">💪</span>
          case 'cardio':
            return <span className="text-base">❤️</span>
          case 'flexibility':
            return <span className="text-base">🧘</span>
          case 'recovery':
            return <span className="text-base">🌙</span>
          case 'endurance':
            return <span className="text-base">⚡</span>
          default:
            return <span className="text-base">💪</span>
        }
    }
  }

  const renderFavoriteExerciseButton = (exercise: ExerciseWithProgress) => {
    const isFavorite = favoriteExerciseIds.includes(exercise.id)
    const isRecovery = exercise.type === 'recovery'
    const isSports = exercise.type === 'sports'
    const progress = getExerciseProgress(exercise.id)

    // Get gradient and glow based on exercise type
    const progressBarStyle = isSports
      ? {
          background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.4) 0%, rgba(147, 51, 234, 0.3) 100%)',
          boxShadow: '0 0 20px rgba(168, 85, 247, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
        }
      : isRecovery
        ? {
            background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.4) 0%, rgba(22, 163, 74, 0.3) 100%)',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
          }
        : {
            background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.4) 0%, rgba(37, 99, 235, 0.3) 100%)',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
          }

    return (
      <button
        key={exercise.id}
        onClick={() => quickAddExercise(exercise)}
        className="w-full relative flex items-center justify-between py-4 px-4 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors group overflow-hidden"
      >
        {/* Progress Bar Background */}
        <div
          className="absolute inset-y-0 left-0 transition-all duration-500 ease-out z-0"
          style={{
            width: `${progress.percentage}%`,
            ...progressBarStyle
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-blue-500/10 text-blue-400">
            {getExerciseIcon(exercise)}
          </div>

          {/* Name */}
          <div className="text-left">
            <div className="text-sm font-bold text-zinc-100 group-hover:text-white transition-colors uppercase tracking-wider">{exercise.name}</div>
          </div>
        </div>

        {/* Right side */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="text-sm font-light text-zinc-400 group-hover:text-zinc-300 transition-colors tabular-nums">
            {exercise.points_per_unit % 1 === 0
              ? exercise.points_per_unit
              : exercise.points_per_unit.toFixed(2)
            } pts/{exercise.unit}
          </span>

          {/* Star - always visible, filled if favorite */}
          <div
            className="w-8 h-8 rounded-full hover:bg-yellow-500/10 flex items-center justify-center transition-all cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              toggleFavorite(exercise.id)
            }}
          >
            <Star
              size={16}
              className={isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600 hover:text-yellow-500'}
            />
          </div>
        </div>
      </button>
    )
  }

  const getExerciseProgress = (exerciseId: string) => {
    const exerciseLogs = todayLogs?.filter(log => log.exercise_id === exerciseId) || []
    const exercisePoints = exerciseLogs.reduce((sum, log) => sum + log.points, 0)
    const effectivePoints = exerciseLogs.reduce((sum, log) => sum + getEffectivePoints(log), 0)

    // Calculate percentage of daily target this exercise represents (using effective points)
    const progressPercentage = dailyTarget > 0 ? Math.min(100, (effectivePoints / dailyTarget) * 100) : 0

    return {
      points: exercisePoints, // Keep raw points for display
      effectivePoints: effectivePoints,
      percentage: progressPercentage // Use effective points for percentage
    }
  }

  const renderExerciseButton = (exercise: ExerciseWithProgress, showFavorite: boolean = true) => {
    const isFavorite = favoriteExerciseIds.includes(exercise.id)
    const isRecovery = exercise.type === 'recovery'
    const isSports = exercise.type === 'sports'
    const progress = getExerciseProgress(exercise.id)

    // Get gradient and glow based on exercise type
    const progressBarStyle = isSports
      ? {
          background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.4) 0%, rgba(147, 51, 234, 0.3) 100%)',
          boxShadow: '0 0 20px rgba(168, 85, 247, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
        }
      : isRecovery
        ? {
            background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.4) 0%, rgba(22, 163, 74, 0.3) 100%)',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
          }
        : {
            background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.4) 0%, rgba(37, 99, 235, 0.3) 100%)',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
          }

    return (
      <button
        key={exercise.id}
        onClick={() => quickAddExercise(exercise)}
        className="w-full relative flex items-center justify-between py-4 px-4 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors group overflow-hidden"
      >
        {/* Progress Bar Background */}
        <div
          className="absolute inset-y-0 left-0 transition-all duration-500 ease-out z-0"
          style={{
            width: `${progress.percentage}%`,
            ...progressBarStyle
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isFavorite
            ? 'bg-blue-500/10 text-blue-400'
            : isRecovery
              ? 'bg-green-500/10 text-green-400'
              : 'bg-white/5 text-zinc-500 group-hover:bg-white/10 group-hover:text-zinc-300'
            }`}>
            {getExerciseIcon(exercise)}
          </div>

          {/* Name */}
          <div className="text-left">
            <div className="text-sm font-bold text-zinc-100 group-hover:text-white transition-colors uppercase tracking-wider">{exercise.name}</div>
          </div>
        </div>

        {/* Right side */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="text-sm font-light text-zinc-400 group-hover:text-zinc-300 transition-colors tabular-nums">
            {exercise.points_per_unit % 1 === 0
              ? exercise.points_per_unit
              : exercise.points_per_unit.toFixed(2)
            } pts/{exercise.unit}
          </span>

          {/* Star - always visible, filled if favorite */}
          <div
            className="w-8 h-8 rounded-full hover:bg-yellow-500/10 flex items-center justify-center transition-all cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              toggleFavorite(exercise.id)
            }}
          >
            <Star
              size={16}
              className={isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600 hover:text-yellow-500'}
            />
          </div>
        </div>
      </button>
    )
  }

  const renderSportButton = (sportName: string, sportEmoji?: string) => {
    return (
      <div
        key={sportName}
        className="w-full relative border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors group overflow-hidden"
      >
        <button
          onClick={() => {
            setSelectedSport(sportName)
            setShowSportSelection(true)
          }}
          className="w-full p-4 relative flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-purple-500/10 text-purple-400">
              {sportEmoji ? (
                <span className="text-base">{sportEmoji}</span>
              ) : (
                <Zap className="w-5 h-5" />
              )}
            </div>

            {/* Name */}
            <div className="text-left">
              <div className="text-sm font-bold text-zinc-100 group-hover:text-white transition-colors uppercase tracking-wider">{sportName}</div>
            </div>
          </div>

          {/* Right side */}
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-500 group-hover:text-white transition-all">
              <Plus size={18} />
            </div>
          </div>
        </button>
      </div>
    )
  }

  const calculateWorkoutPoints = (exercise: ExerciseWithProgress, count: number, weight: number, isDecreased: boolean) => {
    let points = count * exercise.points_per_unit

    // Apply weight multiplier for weighted exercises
    if (exercise.is_weighted && weight > 0) {
      let weightMultiplier = 1
      if (weight >= 10 && weight < 15) weightMultiplier = 1.5
      else if (weight >= 15 && weight < 20) weightMultiplier = 2
      else if (weight >= 20 && weight < 25) weightMultiplier = 2.5
      else if (weight >= 25 && weight < 30) weightMultiplier = 3
      else if (weight >= 30 && weight < 35) weightMultiplier = 3.5
      else if (weight >= 35 && weight < 40) weightMultiplier = 4
      else if (weight >= 40) weightMultiplier = 4.5

      points *= weightMultiplier
    }

    // Apply decreased exercise bonus (1.5x points)
    if (isDecreased && exercise.supports_decreased) {
      points *= 1.5
    }

    return Math.ceil(points) // Round up to avoid decimal submission errors
  }

  // Get effective points for a workout log considering recovery cap
  const getEffectivePoints = (log: any) => {
    // For non-recovery exercises, always use full points
    if (log.exercises?.type !== 'recovery') {
      return log.points
    }

    // Check if today is a recovery day (need to check recovery days)
    const today = new Date()
    const currentDayOfWeek = today.getDay()
    // Friday is typically recovery day (5), but we should check group settings
    // For now, assume Friday is recovery day - this could be enhanced
    const isRecoveryDay = currentDayOfWeek === 5 // Friday

    // On recovery days, use full points
    if (isRecoveryDay) {
      return log.points
    }

    // Recovery is capped at 25% of daily target (fixed amount)
    const maxRecoveryAllowed = Math.floor(dailyTarget * 0.25)
    const totalRecoveryPoints = todayLogs
      ?.filter(l => l.exercises?.type === 'recovery')
      ?.reduce((total, l) => total + l.points, 0) || 0

    if (totalRecoveryPoints === 0) return 0
    if (totalRecoveryPoints <= maxRecoveryAllowed) {
      return log.points // No cap needed
    }

    // Proportionally reduce this recovery exercise based on fixed cap
    const recoveryRatio = maxRecoveryAllowed / totalRecoveryPoints
    return Math.floor(log.points * recoveryRatio)
  }

  // Get total effective points (capped recovery contribution)
  const getCappedTotalPoints = () => {
    if (!todayLogs || todayLogs.length === 0) return 0

    return todayLogs.reduce((total, log) => total + getEffectivePoints(log), 0)
  }

  // Calculate effective points for a new workout being submitted
  const getEffectiveWorkoutPoints = (exercise: ExerciseWithProgress, count: number, weight: number, isDecreased: boolean) => {
    const rawPoints = calculateWorkoutPoints(exercise, count, weight, isDecreased)

    // For non-recovery exercises, return full points
    if (exercise.type !== 'recovery') {
      return rawPoints
    }

    // Check if today is a recovery day
    const today = new Date()
    const currentDayOfWeek = today.getDay()
    const isRecoveryDay = currentDayOfWeek === 5 // Friday

    if (isRecoveryDay) {
      return rawPoints
    }

    // Recovery is capped at 25% of daily target (fixed amount)
    const maxRecoveryAllowed = Math.floor(dailyTarget * 0.25)
    const currentRecoveryPoints = todayLogs
      ?.filter(l => l.exercises?.type === 'recovery')
      ?.reduce((total, l) => total + l.points, 0) || 0

    const newRecoveryTotal = currentRecoveryPoints + rawPoints

    if (newRecoveryTotal <= maxRecoveryAllowed) {
      return rawPoints // No capping needed
    }

    // Calculate how much of this new exercise would actually contribute
    const availableRecoverySpace = Math.max(0, maxRecoveryAllowed - currentRecoveryPoints)
    return Math.min(rawPoints, availableRecoverySpace)
  }

  const loadExercises = async () => {
    if (!profile?.group_id || !user) {
      return
    }

    try {
      setExercisesLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // First, let's see what's in group_exercises table
      const { data: groupExercises, error: exerciseError } = await supabase
        .from('group_exercises')
        .select(`
          exercises (*)
        `)
        .eq('group_id', profile.group_id)
        .order('exercises(name)')

      if (exerciseError) {
        console.error('Error loading group exercises:', exerciseError)
        return
      }


      // Also get ALL exercises to compare
      const { data: allExercises } = await supabase
        .from('exercises')
        .select('*')


      const exerciseList = (groupExercises?.map(ge => (ge.exercises as any)).filter(Boolean) || [])
        .sort((a: any, b: any) => a.name.localeCompare(b.name))

      // Try to get today's workout counts
      let todayLogs: any[] = []
      try {
        const { data } = await supabase
          .from('logs')
          .select('exercise_id, count, duration')
          .eq('user_id', user.id)
          .eq('date', today)
        todayLogs = data || []
      } catch (error) {
        // Logs table not accessible, skipping progress tracking
      }

      // Try to get yesterday's workouts
      let yesterdayLogs = []
      try {
        const { data } = await supabase
          .from('logs')
          .select('exercise_id')
          .eq('user_id', user.id)
          .eq('date', yesterday)
        yesterdayLogs = data || []
      } catch (error) {
        // Cannot load yesterday logs for recommendations
      }

      // Process exercises with progress
      const exercisesWithProgress: ExerciseWithProgress[] = exerciseList.map(exercise => {
        const todayCount = todayLogs?.filter(log => log.exercise_id === exercise.id).length || 0

        return {
          ...exercise,
          todayCount,
          emoji: '' // Keep for compatibility but will use icons instead
        }
      })

      setExercises(exercisesWithProgress as any)
      setLoading(false)
      setExercisesLoading(false)
    } catch (error) {
      console.error('Error loading exercises:', error)
    } finally {
      setExercisesLoading(false)
    }
  }

  const loadSports = async () => {
    try {
      const { data, error } = await supabase
        .from('sports')
        .select('id, name, emoji')
        .order('name')

      if (error) {
        console.error('Error loading sports:', error)
        return
      }

      setSportsList(data || [])
    } catch (error) {
      console.error('Error loading sports:', error)
    }
  }

  const checkTodayPostStatus = async () => {
    if (!user || !profile?.group_id) return

    try {
      setCheckingPostStatus(true)
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

      // Check if user has already posted a workout completion message today
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('user_id', user.id)
        .eq('group_id', profile.group_id)
        .eq('message_type', 'workout_completion')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`)
        .limit(1)

      if (error) {
        console.error('Error checking today\'s post status:', error)
        return
      }

      setHasPostedToday(data && data.length > 0)
    } catch (error) {
      console.error('Error checking post status:', error)
    } finally {
      setCheckingPostStatus(false)
    }
  }

  const handleSubmitToGroup = async () => {
    // Submitting workout to group
    if (!user || !profile?.group_id || dailyProgress <= 0) {
      console.error('Workout submission blocked:', {
        hasUser: !!user,
        hasGroupId: !!profile?.group_id,
        dailyProgress,
        groupId: profile?.group_id
      })
      alert('Unable to submit workout. Please check your group membership and that you have logged exercises.')
      return
    }

    // Check if user has already posted today
    if (hasPostedToday) {
      alert('🚫 You have already shared your workout to the group chat today. You can only post once per day!')
      return
    }

    try {
      setLoading(true)

      // Calculate total points from today's logs (same data as dailyProgress)
      const totalPoints = dailyProgress

      // Group exercises by type for better presentation
      // Use local exercises state to look up names (more reliable than Supabase join)
      const exercisesSummary = todayLogs.reduce((acc: any, log) => {
        const exercise = exercises.find(e => e.id === log.exercise_id)
        const exerciseName = exercise?.name || log.exercises?.name || 'Unknown Exercise'
        if (acc[exerciseName]) {
          acc[exerciseName].count += log.count || log.duration || 1
          acc[exerciseName].points += log.points
        } else {
          acc[exerciseName] = {
            count: log.count || log.duration || 1,
            points: log.points,
            unit: exercise?.unit || log.exercises?.unit || 'rep',
            isTimeBased: exercise?.is_time_based || log.exercises?.is_time_based || false
          }
        }
        return acc
      }, {})

      // Create workout completion message
      const workoutData = {
        user_id: user.id,
        user_email: profile.email,
        total_points: totalPoints,
        target_points: dailyTarget,
        exercises: exercisesSummary,
        workout_date: getLocalDateString(),
        completed_at: new Date().toISOString(),
        week_mode: weekMode // Include actual week mode when workout was completed
      }

      // Insert into chat as a special workout completion message
      // Store workout data as JSON in the message field
      const messageWithData = JSON.stringify({
        text: submitMessage.trim()
          ? `🎯 Workout completed! ${totalPoints} points achieved\n\n${submitMessage.trim()}`
          : `🎯 Workout completed! ${totalPoints} points achieved`,
        workout_data: workoutData
      })

      // Inserting workout message
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          group_id: profile.group_id,
          message: messageWithData,
          message_type: 'workout_completion'
        })
        .select()


      if (error) {
        console.error('Error submitting to group:', error)
        alert('Error submitting workout to group chat')
      } else {
        // Send workout completion notification to group members
        try {
          // Get all group members except the current user
          const { data: groupMembers } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('group_id', profile.group_id)
            .neq('id', user.id)

          if (groupMembers && groupMembers.length > 0) {
            const memberIds = groupMembers.map(member => member.id)

            // Get group name for notification
            const { data: group } = await supabase
              .from('groups')
              .select('name')
              .eq('id', profile.group_id)
              .single()

            const groupName = group?.name || 'Group'
            const userName = profile.username || 'Someone'

            // Determine achievement level
            const percentage = dailyTarget > 0 ? (totalPoints / dailyTarget) * 100 : 0
            const intensity = weekMode === 'insane' ? 'INSANE' : 'sane'
            let achievementEmoji = '🎯'
            let achievementText = 'completed their workout'

            if (percentage >= 150) {
              achievementEmoji = '🔥'
              achievementText = `crushed their ${intensity} target`
            } else if (percentage >= 120) {
              achievementEmoji = '💪'
              achievementText = `exceeded their ${intensity} target`
            } else if (percentage >= 100) {
              achievementEmoji = '✅'
              achievementText = `met their ${intensity} target`
            } else {
              achievementEmoji = '🏃'
              achievementText = `made progress on their ${intensity} workout`
            }

            const notificationTitle = `${achievementEmoji} ${userName} in ${groupName}`
            const notificationBody = `${achievementText} - ${totalPoints} points earned!`

            // Send notification
            await NotificationService.sendNotification(
              memberIds,
              notificationTitle,
              notificationBody,
              {
                type: 'workout_completion',
                workoutId: data[0]?.id,
                userId: user.id,
                userName: userName,
                groupId: profile.group_id,
                groupName: groupName,
                totalPoints: totalPoints,
                targetPoints: dailyTarget,
                percentage: Math.round(percentage),
                weekMode: weekMode,
                exercises: Object.keys(exercisesSummary).length
              },
              'workout_completions'
            )

          }
        } catch (notificationError) {
          console.error('Error sending workout completion notification:', notificationError)
          // Don't let notification errors break the workout submission
        }
        // Check for automatic mode switching to insane
        if (weekMode === 'sane' && isWeekModeAvailable(groupDaysSinceStart) && totalPoints >= dailyTarget) {
          try {
            // Calculate what insane target would be for today
            const { target: insaneTargetForToday } = await loadGroupDataAndCalculateTarget('insane')

            // If user met/exceeded insane target while in sane mode, switch to insane
            if (totalPoints >= insaneTargetForToday) {
              await setWeekModeWithSync('insane', user?.id)

              // Recalculate target with new mode
              await recalculateTargetWithMode('insane')

              // Show special message for mode switch
              setSuccessOverlay({ show: true, message: `INSANE MODE ACTIVATED! You exceeded ${insaneTargetForToday} pts with ${totalPoints}!`, isInsane: true })
            } else {
              // Show normal success message
              setSuccessOverlay({ show: true, message: 'Workout posted to group!' })
            }
          } catch (error) {
            console.error('Error checking automatic mode switch:', error)
            // Fallback to normal success message
            setSuccessOverlay({ show: true, message: 'Workout posted to group!' })
          }
        } else {
          // Show normal success message
          setSuccessOverlay({ show: true, message: 'Workout posted to group!' })
        }

        // Success feedback
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }

        // Update state to reflect successful posting
        setHasPostedToday(true)
        setSubmitMessage('') // Clear the message input

        // Refresh workout data to show updated progress
        loadDailyProgress()
        loadTodaysWorkouts()

        // Auto navigate to chat after delay
        setTimeout(() => {
          setSuccessOverlay(null)
          onClose()
          if (onOpenChat) {
            onOpenChat()
          }
        }, 2000)
      }
    } catch (error) {
      console.error('Error submitting workout:', error)
      setSuccessOverlay({ show: true, message: 'Error posting workout. Please try again.' })
      setTimeout(() => setSuccessOverlay(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!user) return

    try {
      setLoading(true)

      const { error } = await supabase
        .from('logs')
        .delete()
        .eq('id', workoutId)
        .eq('user_id', user.id) // Security check

      if (error) {
        console.error('Error deleting workout:', error)
        alert('Error deleting workout')
      } else {
        // Refresh data after deletion
        loadDailyProgress()
        loadTodaysWorkouts()

        if (onWorkoutAdded) {
          onWorkoutAdded()
        }

        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      }
    } catch (error) {
      console.error('Error deleting workout:', error)
      alert('An error occurred while deleting the workout.')
    } finally {
      setLoading(false)
    }
  }

  const quickAddExercise = (exercise: ExerciseWithProgress, defaultQuantity: number = 0) => {
    // Check if exercise is a sport type (Light Sport, Medium Sport, Intense Sport) for sport selection
    if (exercise.type === 'sport' || exercise.name.toLowerCase().includes('sport')) {
      // Set the intensity based on the exercise name
      if (exercise.name.toLowerCase().includes('light')) {
        setSelectedIntensity('light')
      } else if (exercise.name.toLowerCase().includes('medium')) {
        setSelectedIntensity('medium')
      } else if (exercise.name.toLowerCase().includes('intense')) {
        setSelectedIntensity('intense')
      }
      setShowSportSelection(true)
      return
    }

    // Reset state and open workout input popup
    setSelectedWorkoutExercise(exercise)
    setWorkoutCount(defaultQuantity || 0) // All exercises start at 0
    setSelectedWeight(lockedWeights[exercise.id] || 0) // Use locked weight for this specific exercise
    setIsDecreasedExercise(false)
    setWorkoutInputOpen(true)
  }

  const handleWeightClick = (weight: number) => {
    if (!selectedWorkoutExercise) return

    if (selectedWeight === weight) {
      if (lockedWeights[selectedWorkoutExercise.id] === weight) {
        // Third click: unlock and deselect
        setLockedWeights(prev => {
          const newLocked = { ...prev }
          delete newLocked[selectedWorkoutExercise.id]
          return newLocked
        })
        setSelectedWeight(0)
      } else {
        // Second click: lock for this specific exercise
        setLockedWeights(prev => ({
          ...prev,
          [selectedWorkoutExercise.id]: weight
        }))
      }
    } else {
      // First click: select
      setSelectedWeight(weight)
    }
  }


  // Slider functions for iPhone-style slide-to-unlock
  const handleSliderStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true)
    setIsSliderComplete(false)
  }

  const handleSliderMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return

    const slider = e.currentTarget as HTMLElement
    const rect = slider.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const position = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))

    setSliderPosition(position)

    // Complete if slider reaches 85% or more
    if (position >= 85 && !isSliderComplete) {
      setIsSliderComplete(true)
    }
  }

  const handleSliderEnd = async () => {
    setIsDragging(false)

    if (isSliderComplete) {
      // Execute the workout save
      if (!user || !selectedWorkoutExercise || workoutCount <= 0) return

      setLoading(true)
      try {
        const points = calculateWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)

        const { error } = await supabase
          .from('logs')
          .insert({
            user_id: user.id,
            exercise_id: selectedWorkoutExercise.id,
            count: selectedWorkoutExercise.unit === 'rep' ? Math.floor(workoutCount) : 0,
            weight: selectedWeight,
            duration: selectedWorkoutExercise.is_time_based ? Math.floor(workoutCount) : 0,
            points: points,
            date: getLocalDateString(),
            timestamp: Date.now()
          })

        if (error) {
          alert('Error logging workout: ' + error.message)
        } else {
          // Reset state
          setWorkoutInputOpen(false)
          setSelectedWorkoutExercise(null)
          setWorkoutCount(0)
          setSelectedWeight(0)
          setIsDecreasedExercise(false)
          setSliderPosition(0)
          setIsSliderComplete(false)

          // Refresh data
          if (onWorkoutAdded) {
            onWorkoutAdded()
          }
          loadDailyProgress()
          loadTodaysWorkouts()

          // Update recovery day progress if on recovery day and this was a recovery exercise
          if (isRecoveryDayActive && selectedWorkoutExercise.type === 'recovery' && selectedWorkoutExercise.is_time_based) {
            const newMinutes = dailyProgress + Math.floor(workoutCount)
            await updateRecoveryDayProgress(user.id, newMinutes)
            setDailyProgress(newMinutes)
          }

          // Check for automatic mode switching after exercise submission (skip on recovery day)
          if (!isRecoveryDayActive) {
            await checkAutomaticModeSwitch()
          }

          // Haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate(100)
          }

          // Call onClose to trigger dashboard reload
          if (onClose) {
            onClose();
          }
        }
      } catch (error) {
        console.error('Error saving workout:', error)
        alert('An error occurred while saving your workout.')
      } finally {
        setLoading(false)
      }
    } else {
      // Reset slider if not completed
      setSliderPosition(0)
      setIsSliderComplete(false)
    }
  }




  if (!isOpen) return null

  // Group exercises by their actual types, with recovery and sports separate
  const allExercises = exercises.filter(ex => ex.type !== 'recovery' && ex.type !== 'sport')

  // Get sport exercises (Light Sport, Medium Sport, Intense Sport)
  const sportsExercises = exercises.filter(ex => ex.type === 'sport')

  // Get favorite exercises
  const favoriteExercises = exercises.filter(ex => favoriteExerciseIds.includes(ex.id))

  // TEMP FIX: Deduplicate recovery exercises by name to handle database duplicates
  const recoveryExercisesRaw = exercises.filter(ex => ex.type === 'recovery')

  // Remove duplicates by exercise name (case insensitive)
  const seenNames = new Set()
  const recoveryExercises = recoveryExercisesRaw.filter(ex => {
    const normalizedName = ex.name.toLowerCase().trim()
    if (seenNames.has(normalizedName)) {
      return false
    }
    seenNames.add(normalizedName)
    return true
  })

  const progressPercentage = dailyTarget > 0 ? (dailyProgress / dailyTarget) * 100 : 0
  const totalRawProgress = todayLogs?.reduce((sum, log) => sum + log.points, 0) || 0
  const recoveryPercentage = totalRawProgress > 0 ? (recoveryProgress / totalRawProgress) * 100 : 0
  const regularPercentage = Math.max(0, progressPercentage - Math.min(25, (recoveryProgress / totalRawProgress) * 100))

  if (!isOpen) return null


  return (
    <>
      {/* Shimmer Animation CSS */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .focus-ring:focus {
          ring-color: #f97316;
        }
        .btn-hover:hover {
          background-color: #ea580c !important;
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          15% { opacity: 1; transform: translateY(0px); }
          85% { opacity: 1; transform: translateY(0px); }
          100% { opacity: 0; transform: translateY(10px); }
        }
      `}</style>

      <div
        className="fixed inset-0 bg-black flex flex-col transition-all duration-500 ease-out shadow-2xl"
        style={{
          transform: isAnimatedIn ? 'translate3d(0, 0, 0)' : 'translate3d(0, 100vh, 0)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          touchAction: 'manipulation',
          zIndex: isClosing ? 40 : 9999, // Slide behind bottom nav (z-50) when closing
          overflow: 'hidden' // Prevent background scrolling
        }}
      >
        {/* Success Overlay */}
        {successOverlay?.show && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`mx-6 p-6 rounded-2xl text-center max-w-sm animate-in zoom-in-95 duration-300 ${
              successOverlay.isInsane 
                ? 'bg-gradient-to-br from-orange-600 to-red-600 shadow-[0_0_60px_rgba(249,115,22,0.5)]' 
                : 'bg-gradient-to-br from-green-600 to-emerald-600 shadow-[0_0_60px_rgba(34,197,94,0.5)]'
            }`}>
              <div className="text-5xl mb-4">
                {successOverlay.isInsane ? '🔥' : '🎉'}
              </div>
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wider">
                {successOverlay.isInsane ? 'INSANE MODE!' : 'SUCCESS!'}
              </h3>
              <p className="text-white/90 font-medium">
                {successOverlay.message}
              </p>
              <div className="mt-4 text-sm text-white/60">
                Opening chat...
              </div>
            </div>
          </div>
        )}

        {/* Time-based gradient background with subtle glass layer effect */}

        {/* Header - Button-style design matching dashboard */}
        <div className="sticky top-0 z-50 px-4 py-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
          <div className="max-w-2xl mx-auto">
            {/* Container with grey outline matching bottom nav */}
            <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-2 shadow-2xl flex items-center gap-3 pr-2">
              {/* Main workout log button */}
              <button
                className="relative flex-1 h-16 rounded-[2rem] flex items-center justify-between px-8 overflow-hidden"
              >
                {/* Background - Changes based on completion and recovery day */}
                <div 
                  className={`absolute inset-0 rounded-[2rem] transition-all duration-500 ${
                    progressPercentage >= 100 
                      ? isRecoveryDayActive
                        ? 'bg-gradient-to-r from-green-600 via-green-500 to-emerald-500'
                        : weekMode === 'insane'
                          ? 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400'
                          : 'bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500'
                      : 'bg-white'
                  }`}
                  style={{
                    boxShadow: progressPercentage >= 100
                      ? isRecoveryDayActive
                        ? 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(22, 163, 74, 0.6)'
                        : weekMode === 'insane'
                          ? 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(234, 88, 12, 0.6)'
                          : 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(29, 78, 216, 0.6)'
                      : 'none'
                  }}
                />

                {/* Progress bar - Only show when not complete */}
                {progressPercentage < 100 && progressPercentage > 0 && (
                  <div
                    className="absolute top-0 left-0 bottom-0 transition-all duration-500 ease-out rounded-l-[2rem]"
                    style={{
                      width: `${progressPercentage}%`,
                      background: isRecoveryDayActive
                        ? 'linear-gradient(90deg, rgb(22, 163, 74) 0%, rgb(34, 197, 94) 40%, rgb(74, 222, 128) 100%)'
                        : weekMode === 'insane'
                          ? 'linear-gradient(90deg, rgb(234, 88, 12) 0%, rgb(249, 115, 22) 40%, rgb(251, 146, 60) 100%)'
                          : 'linear-gradient(90deg, rgb(29, 78, 216) 0%, rgb(37, 99, 235) 40%, rgb(59, 130, 246) 100%)',
                      boxShadow: isRecoveryDayActive
                        ? 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(22, 163, 74, 0.6), 4px 0 20px rgba(34, 197, 94, 0.5), 8px 0 30px rgba(74, 222, 128, 0.3)'
                        : weekMode === 'insane'
                          ? 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(234, 88, 12, 0.6), 4px 0 20px rgba(249, 115, 22, 0.5), 8px 0 30px rgba(251, 146, 60, 0.3)'
                          : 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(29, 78, 216, 0.6), 4px 0 20px rgba(37, 99, 235, 0.5), 8px 0 30px rgba(59, 130, 246, 0.3)'
                    }}
                  />
                )}

                {/* Content */}
                <div className="relative z-10 flex flex-col items-start">
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 ${progressPercentage >= 100 ? 'text-white/80' : 'text-black'}`}>
                    {isRecoveryDayActive ? 'Recovery Day' : "Today's Goal"}
                  </span>
                  <span className={`text-xl font-black tracking-tight leading-none ${progressPercentage >= 100 ? 'text-white' : 'text-black'}`}>
                    {isRecoveryDayActive ? `${dailyProgress}/${RECOVERY_DAY_TARGET_MINUTES} MIN` : 'WORKOUT LOG'}
                  </span>
                </div>

                {/* Percentage */}
                <div className="relative z-10">
                  <span className={`text-sm font-black tabular-nums ${progressPercentage >= 100 ? 'text-white' : 'text-black'}`}>
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
              </button>

              {/* Close button - styled like chat button */}
              <button
                onClick={handleClose}
                className="w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all bg-[#111] hover:bg-[#222] text-white border border-white/10"
                aria-label="Close workout log"
              >
                <div className="relative w-6 h-6">
                  {/* MessageCircle icon - fades out */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${showIconTransition ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                    }`}>
                    <MessageCircle size={26} className="text-white" />
                  </div>
                  {/* X icon - fades in */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${showIconTransition ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                    }`}>
                    <X size={26} className="text-white" />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Subtle hint when target is reached */}
        {dailyProgress >= dailyTarget && dailyTarget > 0 && profile?.group_id && !hasPostedToday && (
          <div className="px-4 pb-3">
            <div className="bg-green-600/10 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-green-400">Target Complete</span>
            </div>
          </div>
        )}

        {/* Completed Exercises Section - Redesigned */}
        {!exercisesLoading && exercises.length > 0 && todaysWorkouts.length > 0 && (
          <div className="w-full px-4 py-0 mb-4">
            {/* Unified container with border */}
            <div className={`bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all duration-200 ${completedExercisesExpanded ? 'bg-black/60 backdrop-blur-xl' : 'hover:bg-white/10'}`}>
              <button
                onClick={() => setCompletedExercisesExpanded(!completedExercisesExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 transition-all duration-200"
              >
                <h3 className="text-xs font-bold uppercase tracking-widest text-white">
                  Completed Exercises ({todaysWorkouts.length})
                </h3>
                <ChevronDown size={16} className={`text-white/60 transition-transform duration-200 ${completedExercisesExpanded ? 'rotate-180' : ''}`} />
              </button>

              {todaysWorkouts.length > 0 && completedExercisesExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {(() => {
                    // Calculate total daily points from all workouts
                    const totalDailyPoints = getGroupedWorkouts().reduce((sum: number, w: any) => {
                      return sum + (w.logs?.reduce((s: number, log: any) => s + getEffectivePoints(log), 0) || 0)
                    }, 0)
                    
                    return getGroupedWorkouts().map((workout: any) => {
                    const effectivePoints = workout.logs?.reduce((sum: number, log: any) => sum + getEffectivePoints(log), 0) || 0
                      const exerciseContributionPercent = totalDailyPoints > 0 ? (effectivePoints / totalDailyPoints) * 100 : 0
                    const isRecovery = workout.exercises?.type === 'recovery'
                    const isSports = workout.exercises?.type === 'sports'
                    const workoutKey = `${workout.exercise_id}-${workout.weight || 0}`
                    const isExpanded = expandedWorkouts[workoutKey]

                    // Get color based on exercise type
                    const colors = isSports
                      ? {
                          bg: 'bg-purple-500/20',
                          gradient: 'linear-gradient(90deg, rgba(168, 85, 247, 0.3) 0%, rgba(147, 51, 234, 0.2) 100%)',
                          glow: '0 0 15px rgba(168, 85, 247, 0.25)',
                            icon: 'bg-purple-500/20 text-purple-400',
                            progress: 'rgba(168, 85, 247, 0.4)'
                        }
                      : isRecovery
                        ? {
                            bg: 'bg-green-500/20',
                            gradient: 'linear-gradient(90deg, rgba(34, 197, 94, 0.3) 0%, rgba(22, 163, 74, 0.2) 100%)',
                            glow: '0 0 15px rgba(34, 197, 94, 0.25)',
                              icon: 'bg-green-500/20 text-green-400',
                              progress: 'rgba(34, 197, 94, 0.4)'
                          }
                        : {
                            bg: 'bg-blue-500/20',
                            gradient: 'linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)',
                            glow: '0 0 15px rgba(59, 130, 246, 0.25)',
                              icon: 'bg-blue-500/20 text-blue-400',
                              progress: 'rgba(59, 130, 246, 0.4)'
                          }

                    return (
                      <div key={workoutKey} className="space-y-2">
                        <button
                          onClick={() => {
                            setExpandedWorkouts(prev => ({
                              ...prev,
                              [workoutKey]: !prev[workoutKey]
                            }))
                          }}
                          className="relative w-full rounded-xl overflow-hidden hover:bg-white/5 transition-all duration-300 flex flex-col"
                        >
                          {/* Gradient background */}
                          <div
                            className="absolute inset-0 transition-all duration-500"
                            style={{
                              background: colors.gradient,
                              boxShadow: colors.glow
                            }}
                          />

                            {/* Progress bar - Contribution to daily total */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                              <div
                                className="h-full transition-all duration-500"
                                style={{
                                  width: `${exerciseContributionPercent}%`,
                                  background: colors.progress,
                                  boxShadow: `0 0 8px ${colors.progress}`
                                }}
                              />
                            </div>

                          {/* Content Layer */}
                          <div className="relative z-10 w-full px-4 py-3 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              {/* Icon */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors.icon}`}>
                                {getExerciseIcon(workout.exercises)}
                              </div>

                              {/* Text Info */}
                              <div className="flex flex-col items-start gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-white uppercase tracking-wide">{workout.sport_name || workout.exercises?.name || 'Unknown'}</span>
                                  {workout.weight > 0 && (
                                    <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-white border border-white/20">
                                      {workout.weight}kg
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                  <span>{workout.logs.length} {workout.logs.length === 1 ? 'set' : 'sets'}</span>
                                  <span>•</span>
                                  <span className="font-bold">{effectivePoints % 1 === 0 ? effectivePoints : effectivePoints.toFixed(1)} pts</span>
                                    <span className="text-white/40">({exerciseContributionPercent.toFixed(0)}%)</span>
                                </div>
                              </div>
                            </div>

                            {/* Right Side: Chevron */}
                            <div className="flex items-center">
                              <ChevronDown size={18} className={`text-white/60 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </button>

                        {/* Individual sets when expanded */}
                        {isExpanded && (
                          <div className="ml-6 space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                            {workout.logs.map((log: any, index: number) => {
                              const setPoints = getEffectivePoints(log)
                              const setContributionPercent = effectivePoints > 0 ? (setPoints / effectivePoints) * 100 : 0
                              
                              return (
                              <div key={log.id} className="relative w-full rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition-all duration-200">
                                  {/* Progress bar - Contribution to exercise total */}
                                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
                                    <div
                                      className="h-full transition-all duration-500"
                                      style={{
                                        width: `${setContributionPercent}%`,
                                        background: colors.progress,
                                        boxShadow: `0 0 6px ${colors.progress}`
                                      }}
                                    />
                                  </div>

                                {/* Content Layer */}
                                <div className="relative z-10 w-full px-4 py-2.5 flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    {/* Set number */}
                                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                                      <span className="text-xs font-bold text-white">{index + 1}</span>
                                    </div>

                                    {/* Text Info */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-white">
                                        {(() => {
                                          const value = log.count || log.duration
                                          const unit = workout.exercises?.unit
                                          // Convert fractional hours to minutes for better display
                                          if (unit === 'hour' && value < 1) {
                                            const minutes = Math.round(value * 60)
                                            return <>{minutes} <span className="text-white/60">min</span></>
                                          }
                                          return <>{value} <span className="text-white/60">{unit}</span></>
                                        })()}
                                      </span>
                                      {log.weight > 0 && (
                                        <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-white border border-white/20">
                                          {log.weight}kg
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right Side: Points & Delete */}
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-white/80 tabular-nums">
                                        {setPoints} <span className="text-xs text-white/50">pts</span>
                                        <span className="text-white/40 ml-1">({setContributionPercent.toFixed(0)}%)</span>
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteWorkout(log.id)
                                      }}
                                      className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                                      aria-label="Delete set"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                    })
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2" style={{ 
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}>
          {exercisesLoading && (
            <div className="text-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-purple-500 mx-auto"></div>
              <p className="mt-2 text-gray-400 text-sm">Loading exercises...</p>
            </div>
          )}

          {!exercisesLoading && exercises.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🏋️</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Exercises Found</h3>
              <p className="text-gray-400 text-sm">No exercises are set up for your group yet.</p>
            </div>
          )}

          {!exercisesLoading && exercises.length > 0 && (
            <>

              {/* Current Workouts Section */}
              <div className="pb-6">

                {todaysWorkouts.length === 0 && (
                  <div className="px-4 my-8">
                    <div className="text-center">
                      <p className="text-zinc-500 font-bold mb-1">No workouts logged yet</p>
                      <p className="text-zinc-600 text-xs">Select exercises below to get started</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recovery Day Banner - Show at top when active */}
              {isRecoveryDayActive && (
                <div className="px-4 mb-6">
                  <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🧘</span>
                      <div>
                        <div className="text-lg font-black text-green-400 uppercase tracking-wider">Recovery Day Active</div>
                        <div className="text-sm text-green-400/70">
                          Complete {RECOVERY_DAY_TARGET_MINUTES} minutes of recovery exercise
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 bg-black/20 rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, (dailyProgress / RECOVERY_DAY_TARGET_MINUTES) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 text-center text-sm font-bold text-green-400">
                      {dailyProgress >= RECOVERY_DAY_TARGET_MINUTES 
                        ? '✅ Recovery complete!' 
                        : `${dailyProgress} / ${RECOVERY_DAY_TARGET_MINUTES} min`}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Favorites Section - Hidden on recovery day */}
              {!isRecoveryDayActive && favoriteExercises.length > 0 && (
                <div className="py-0">
                  <button
                    onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                    className="flex items-center justify-between w-full mb-2 px-4"
                  >
                    <div className="flex items-center gap-4">
                      <Star size={24} className="text-yellow-400 fill-yellow-400" />
                      <h4 className="text-4xl font-black text-white uppercase tracking-tight">FAVS</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 font-bold">({favoriteExercises.length})</span>
                      <ChevronDown
                        size={14}
                        className={`text-zinc-500 transition-transform duration-200 ${favoritesExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {favoritesExpanded && (
                    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                      {favoriteExercises.map((exercise) => renderFavoriteExerciseButton(exercise))}
                    </div>
                  )}
                </div>
              )}

              {/* Reps Exercises Section - Hidden on recovery day */}
              {!isRecoveryDayActive && allExercises.length > 0 && (
                <div className="py-0 mt-8">
                  <button
                    onClick={() => setAllExercisesExpanded(!allExercisesExpanded)}
                    className="flex items-center justify-between w-full mb-2 px-4"
                  >
                    <div className="flex items-center gap-4">
                      <Activity size={24} className={weekMode === 'insane' ? 'text-orange-500' : 'text-blue-400'} />
                      <h4 className="text-4xl font-black text-white uppercase tracking-tight">REPS</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 font-bold">({allExercises.length})</span>
                      <ChevronDown
                        size={14}
                        className={`text-zinc-500 transition-transform duration-200 ${allExercisesExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {allExercisesExpanded && (
                    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                      {allExercises.map((exercise) => renderExerciseButton(exercise))}
                    </div>
                  )}
                </div>
              )}

              {/* Recovery Section - Always visible, expanded by default on recovery day */}
              {recoveryExercises.length > 0 && (
                <div className={`py-0 ${isRecoveryDayActive ? '' : 'mt-8'}`}>
                  <button
                    onClick={() => setRecoveryExpanded(!recoveryExpanded)}
                    className="flex items-center justify-between w-full mb-2 px-4"
                  >
                    <div className="flex items-center gap-4">
                      <Smile size={24} className="text-green-400" />
                      <h4 className="text-4xl font-black text-white uppercase tracking-tight">
                        {isRecoveryDayActive ? 'RECOVERY' : 'HEAL'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 font-bold">({recoveryExercises.length})</span>
                      <ChevronDown
                        size={14}
                        className={`text-zinc-500 transition-transform duration-200 ${(recoveryExpanded || isRecoveryDayActive) ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {(recoveryExpanded || isRecoveryDayActive) && (
                    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                      {recoveryExercises.map((exercise) => renderExerciseButton(exercise))}
                    </div>
                  )}
                </div>
              )}

              {/* Sports Section - Hidden on recovery day */}
              {!isRecoveryDayActive && sportsExercises.length > 0 && (
                <div className="py-0 mt-8">
                  <button
                    onClick={() => setSportsExpanded(!sportsExpanded)}
                    className="flex items-center justify-between w-full mb-2 px-4"
                  >
                    <div className="flex items-center gap-4">
                      <Zap size={24} className="text-purple-400" />
                      <h4 className="text-4xl font-black text-white uppercase tracking-tight">SPORTS</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 font-bold">({sportsList.length})</span>
                      <ChevronDown
                        size={14}
                        className={`text-zinc-500 transition-transform duration-200 ${sportsExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {sportsExpanded && (
                    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                      {sportsList.map((sport) => renderSportButton(sport.name, sport.emoji))}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Actions Section - Unified Component */}
              <div className="px-4 pb-6 mt-8">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                  
{/* Recovery Day Active Banner */}
                  {isRecoveryDayActive && (
                    <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <span className="text-xl">🧘</span>
                          </div>
                          <div>
                            <div className="text-sm font-black text-green-400 uppercase tracking-wider">Recovery Day</div>
                            <div className="text-xs text-green-400/70">
                              {dailyProgress >= RECOVERY_DAY_TARGET_MINUTES
                                ? '✅ Complete!'
                                : `${dailyProgress}/${RECOVERY_DAY_TARGET_MINUTES} min`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {dailyProgress >= RECOVERY_DAY_TARGET_MINUTES && (
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <button
                            onClick={handleCancelRecoveryDay}
                            disabled={isCancellingRecoveryDay}
                            className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isCancellingRecoveryDay ? 'Cancelling...' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Use Recovery Day Button - Only show when available and not already active */}
                  {!isRecoveryDayActive && canUseRecoveryDay && (
                    <button
                      onClick={handleActivateRecoveryDay}
                      disabled={isActivatingRecoveryDay}
                      className={`w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 font-black shadow-lg shadow-green-500/20 ${isActivatingRecoveryDay ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-xl">🧘</span>
                      {isActivatingRecoveryDay ? 'Activating...' : 'USE RECOVERY DAY'}
                    </button>
                  )}
                  
                  {/* Recovery Day Info - Show when available */}
                  {!isRecoveryDayActive && canUseRecoveryDay && (
                    <p className="text-xs text-zinc-500 text-center">
                      Take your weekly recovery day. Complete {RECOVERY_DAY_TARGET_MINUTES} min of recovery exercise.
                    </p>
                  )}
                  
                  {/* Week Mode Toggle - Only show when NOT on recovery day */}
                  {!isRecoveryDayActive && isWeekModeAvailable(groupDaysSinceStart) && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Mode</span>
                      <div className="bg-black/40 p-0.5 rounded-full border border-white/10 flex items-center relative h-10 w-40">
                        {/* Active Background Pill */}
                        <div
                          className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full transition-all duration-300 ease-out ${weekMode === 'sane' ? 'left-0.5 bg-blue-600' : 'left-[calc(50%+2px)] bg-red-600'
                            }`}
                        />

                        <button
                          onClick={async () => {
                            await setWeekModeWithSync('sane', user?.id)
                            await recalculateTargetWithMode('sane')
                          }}
                          className={`flex-1 relative z-10 h-full rounded-full font-black text-xs tracking-widest transition-colors duration-300 ${weekMode === 'sane' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                          SANE
                        </button>

                        <button
                          onClick={async () => {
                            await setWeekModeWithSync('insane', user?.id)
                            await recalculateTargetWithMode('insane')
                          }}
                          className={`flex-1 relative z-10 h-full rounded-full font-black text-xs tracking-widest transition-colors duration-300 ${weekMode === 'insane' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                          INSANE
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  {!isRecoveryDayActive && isWeekModeAvailable(groupDaysSinceStart) && profile?.group_id && (
                    <div className="border-t border-white/10" />
                  )}

                  {/* Submit to Group Section */}
                  {profile?.group_id && (
                    <div className="space-y-3">
                      {/* Optional message input */}
                      {!hasPostedToday && (
                        <div>
                          <input
                            type="text"
                            value={submitMessage}
                            onChange={(e) => setSubmitMessage(e.target.value)}
                            placeholder="Add a message (optional)"
                            maxLength={200}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
                          />
                        </div>
                      )}

                      {/* Submit button */}
                      <button
                        onClick={handleSubmitToGroup}
                        disabled={hasPostedToday || checkingPostStatus || loading || dailyProgress < dailyTarget}
                        className="relative w-full h-14 rounded-xl flex items-center justify-center overflow-hidden transition-all"
                      >
                        {/* Background */}
                        <div className={`absolute inset-0 transition-all ${
                          hasPostedToday
                            ? 'bg-zinc-700'
                            : checkingPostStatus || loading
                              ? 'bg-zinc-700'
                              : dailyProgress < dailyTarget
                                ? 'bg-zinc-800'
                                : 'bg-green-600'
                        }`} />

                        {/* Content */}
                        <div className="relative flex items-center gap-2.5">
                          {checkingPostStatus ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span className="text-sm font-black text-white uppercase tracking-wide">Checking...</span>
                            </>
                          ) : hasPostedToday ? (
                            <>
                              <span className="text-base">✅</span>
                              <span className="text-sm font-black text-zinc-300 uppercase tracking-wide">Posted Today</span>
                            </>
                          ) : loading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span className="text-sm font-black text-white uppercase tracking-wide">Posting...</span>
                            </>
                          ) : dailyProgress < dailyTarget ? (
                            <>
                              <span className="text-base">🎯</span>
                              <span className="text-sm font-black text-zinc-400 uppercase tracking-wide">
                                {dailyProgress}/{dailyTarget} pts
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-base">🎉</span>
                              <span className="text-sm font-black text-white uppercase tracking-wide">Submit to Group</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Flexible Rest Day Button */}
              {hasFlexibleRestDay && (
                <div className="py-4 px-4">
                  <button
                    onClick={useFlexibleRestDay}
                    disabled={isUsingFlexibleRestDay}
                    className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 font-medium shadow-lg ${isUsingFlexibleRestDay ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
                    <Calendar className="w-5 h-5" />
                    {isUsingFlexibleRestDay ? 'Using Flexible Rest Day...' : 'Use Flexible Rest Day'}
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Automatically earn today&apos;s sane mode points and post to chat
                  </p>
                </div>
              )}
            </>
          )}


        </div>

        {/* Workout Input Overlay - Fixed Layout */}
        {workoutInputOpen && selectedWorkoutExercise && (
          <div className="fixed inset-0 bg-black text-white z-[110] flex flex-col animate-in zoom-in-95 duration-300 ease-out" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Header styled like exercise button with gray background and fill behind */}
            <div className="relative border-b border-white/5 bg-white/5">
              <div className="relative w-full flex items-center justify-between py-4 px-4 overflow-hidden">
                {/* Progress Fill - Behind the button */}
                        {(() => {
                  // Calculate progress including current input
                          const currentPoints = getEffectiveWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)
                  const totalPointsWithInput = dailyProgress + currentPoints
                  const progressPercentage = dailyTarget > 0 ? Math.min(100, (totalPointsWithInput / dailyTarget) * 100) : 0
                  
                  const isRecovery = selectedWorkoutExercise.type === 'recovery'
                  const isSports = selectedWorkoutExercise.type === 'sports'
                  
                  const progressBarStyle = isSports
                    ? {
                        background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.4) 0%, rgba(147, 51, 234, 0.3) 100%)',
                        boxShadow: '0 0 20px rgba(168, 85, 247, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                      }
                    : isRecovery
                      ? {
                          background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.4) 0%, rgba(22, 163, 74, 0.3) 100%)',
                          boxShadow: '0 0 20px rgba(34, 197, 94, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                        }
                      : {
                          background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.4) 0%, rgba(37, 99, 235, 0.3) 100%)',
                          boxShadow: '0 0 20px rgba(59, 130, 246, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                        }

                  return (
                    <div
                      className="absolute inset-y-0 left-0 transition-all duration-500 ease-out z-0"
                      style={{
                        width: `${progressPercentage}%`,
                        ...progressBarStyle
                      }}
                    />
                  )
                        })()}

                {/* Left side - Icon and Name */}
                <div className="relative z-10 flex items-center gap-3 flex-1 min-w-0">
                  {/* Icon Circle */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                    selectedWorkoutExercise.type === 'recovery'
                      ? 'bg-green-500/10 text-green-400'
                      : selectedWorkoutExercise.type === 'sports'
                        ? 'bg-purple-500/10 text-purple-400'
                        : 'bg-white/5 text-zinc-500'
                  }`}>
                    {getExerciseIcon(selectedWorkoutExercise)}
                      </div>

                  {/* Name and Points Remaining */}
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-sm font-bold text-zinc-100 uppercase tracking-wider truncate">
                      {selectedWorkoutExercise.name}
                        </div>
                    <span className="text-xs text-zinc-500 font-medium">
                {(() => {
                  const currentPoints = getEffectiveWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)
                        const remainingPoints = Math.max(0, dailyTarget - (dailyProgress + currentPoints))
                        return remainingPoints === 0 && dailyTarget > 0 ? '✓ Done!' : `${remainingPoints} pts left`
                })()}
                    </span>
              </div>
            </div>

                {/* Right side - X button */}
                <div className="relative z-10 shrink-0">
              <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setWorkoutInputOpen(false)
                    }}
                    className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X size={26} className="text-zinc-400 hover:text-white" />
                  </button>
                  </div>
                  </div>
                </div>

            {/* Records bar - PR and Group Record side by side */}
            <div className="mx-3 mt-3 mb-2 grid grid-cols-2 gap-2">
              {/* Personal Record */}
              <div className={`px-3 py-2.5 rounded-lg transition-all ${
                personalRecord !== null && workoutCount > personalRecord
                  ? 'bg-yellow-500/10 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                  : 'bg-white/5 border border-white/10'
              }`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Trophy className={`w-4 h-4 shrink-0 ${
                    personalRecord !== null && workoutCount > personalRecord
                      ? 'text-yellow-400 animate-pulse'
                      : 'text-zinc-500'
                  }`} />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">YOU</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl font-black tabular-nums ${
                    personalRecord !== null && workoutCount > personalRecord
                      ? 'text-yellow-400'
                      : 'text-white'
                  }`}>
                    {personalRecord !== null ? (
                      selectedWorkoutExercise.unit === 'hour' ? `${Math.round(personalRecord * 60)}m` : personalRecord
                    ) : '-'}
                  </span>
                  {personalRecord !== null && workoutCount > personalRecord && (
                    <span className="text-[9px] font-black bg-yellow-400 text-black px-1.5 py-0.5 rounded-full animate-pulse">
                      NEW!
                    </span>
                  )}
                    </div>
                  </div>

              {/* Group Record */}
              <div className={`px-3 py-2.5 rounded-lg ${
                groupRecord !== null 
                  ? 'bg-white/5 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]' 
                  : 'bg-white/5 border border-white/10'
              }`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Award className={`w-4 h-4 shrink-0 ${
                    groupRecord !== null ? 'text-amber-400' : 'text-zinc-500'
                  }`} />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                    {groupRecord !== null && groupRecordUser ? (
                      groupRecordUser === profile?.username ? 'YOU' : (() => {
                        // Get initials from username
                        const parts = groupRecordUser.split(/[\s_-]+/)
                        if (parts.length >= 2) {
                          return (parts[0][0] + parts[1][0]).toUpperCase()
                        }
                        return groupRecordUser.slice(0, 2).toUpperCase()
                      })()
                    ) : 'GROUP'}
                  </span>
                  </div>
                <span className={`text-xl font-black tabular-nums ${
                  groupRecord !== null ? 'text-white' : 'text-zinc-500'
                }`}>
                  {groupRecord !== null ? (
                    selectedWorkoutExercise.unit === 'hour' ? `${Math.round(groupRecord * 60)}m` : groupRecord
                  ) : '-'}
                </span>
                </div>
            </div>

            {/* Main scrollable content area - Dynamic content with inputs */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-4" style={{ 
              paddingBottom: 'env(safe-area-inset-bottom)',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}>
              {/* Interactive Counter Display */}
              {/* Interactive Counter & Quick Add Group */}
              <div className="rounded-3xl bg-zinc-900/50 border border-white/5 overflow-hidden backdrop-blur-sm shadow-xl">
                {/* Number display with interactive click zones - Reduced height */}
                <div className="relative h-32 flex items-center justify-center bg-black/20">

                  {/* Left click zone (decrement) */}
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(5);
                      const stepAmount = getStepAmount()
                      setWorkoutCount(Math.max(0, parseFloat((workoutCount - stepAmount).toFixed(4))))
                    }}
                    className="absolute left-0 top-0 bottom-0 w-24 z-10 flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-all duration-150 touch-manipulation group/left"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover/left:bg-white/10 transition-colors">
                      <span className="text-white/40 group-hover/left:text-white text-3xl font-light transition-colors">–</span>
                    </div>
                  </button>

                  {/* Right click zone (increment) */}
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(5);
                      const stepAmount = getStepAmount()
                      setWorkoutCount(parseFloat((workoutCount + stepAmount).toFixed(4)))
                    }}
                    className="absolute right-0 top-0 bottom-0 w-24 z-10 flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-all duration-150 touch-manipulation group/right"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover/right:bg-white/10 transition-colors">
                      <span className="text-white/40 group-hover/right:text-white text-3xl font-light transition-colors">+</span>
                    </div>
                  </button>

                  {/* Number display */}
                  <div className="relative z-0 flex flex-col items-center justify-center pointer-events-none">
                    <span
                      className="font-sans font-black tabular-nums text-white leading-none tracking-tight"
                      style={{
                        fontSize: '4.5rem',
                        textShadow: '0 0 40px rgba(255,255,255,0.15)'
                      }}
                    >
                      {(() => {
                        // Format display based on exercise unit
                        if (selectedWorkoutExercise && selectedWorkoutExercise.unit === 'hour') {
                          const minutes = Math.round(workoutCount * 60)
                          return (
                            <>
                              {minutes}
                              <span className="text-3xl font-medium opacity-40 ml-1">m</span>
                            </>
                          )
                        }
                        return workoutCount
                      })()}
                    </span>
                    {/* Label inside number display */}
                    <span className="text-white/30 text-xs font-bold tracking-[0.3em] uppercase mt-2 border border-white/10 px-3 py-1 rounded-full">
                      {selectedWorkoutExercise.unit === 'hour' ? 'MINUTES' : selectedWorkoutExercise.unit.toUpperCase() + 'S'}
                    </span>
                  </div>
                </div>

                {/* Quick Add Buttons - Connected below */}
                <div className="grid grid-cols-4 divide-x divide-white/5 bg-white/5 border-t border-white/5">
                  {(() => {
                    const stepAmount = getStepAmount()
                    const isHourBased = selectedWorkoutExercise && selectedWorkoutExercise.unit === 'hour'

                    return [
                      {
                        action: () => setWorkoutCount(Math.max(0, parseFloat((workoutCount - (10 * stepAmount)).toFixed(4)))),
                        label: isHourBased ? '-10m' : '-10'
                      },
                      {
                        action: () => setWorkoutCount(Math.max(0, parseFloat((workoutCount - (5 * stepAmount)).toFixed(4)))),
                        label: isHourBased ? '-5m' : '-5'
                      },
                      {
                        action: () => setWorkoutCount(parseFloat((workoutCount + (5 * stepAmount)).toFixed(4))),
                        label: isHourBased ? '+5m' : '+5'
                      },
                      {
                        action: () => setWorkoutCount(parseFloat((workoutCount + (10 * stepAmount)).toFixed(4))),
                        label: isHourBased ? '+10m' : '+10'
                      }
                    ]
                  })().map((button, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(5);
                        button.action()
                      }}
                      className="py-5 hover:bg-white/10 active:bg-white/20 transition-colors flex items-center justify-center group"
                    >
                      <span className="text-lg font-bold text-white/40 group-hover:text-white transition-colors">{button.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight Selector Section - only show for weighted exercises */}
              {selectedWorkoutExercise.is_weighted && (
                <div className="rounded-3xl bg-zinc-900/50 border border-white/10 overflow-hidden backdrop-blur-md shadow-lg">
                  {/* Top Display */}
                  <div className="relative h-24 flex flex-col items-center justify-center border-b border-white/5 bg-gradient-to-b from-zinc-800/50 to-zinc-900/50">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-white tracking-tight drop-shadow-xl">
                        {selectedWeight === 0 ? 'BW' : selectedWeight}
                      </span>
                      <span className="text-sm font-bold text-white/40 tracking-widest uppercase">
                        {selectedWeight === 0 ? '' : 'KG'}
                      </span>
                    </div>
                    <span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase mt-1">
                      WEIGHT
                    </span>
                  </div>

                  {/* Connected Grid Buttons */}
                  <div className="grid grid-cols-7 divide-x divide-white/5 bg-white/5">
                    {[
                      { label: 'BW', value: 0, multiplier: 1.0 },
                      { label: '10', value: 10, multiplier: 1.5 },
                      { label: '15', value: 15, multiplier: 2.0 },
                      { label: '20', value: 20, multiplier: 2.5 },
                      { label: '25', value: 25, multiplier: 3.0 },
                      { label: '30', value: 30, multiplier: 3.5 },
                      { label: '35', value: 35, multiplier: 4.0 }
                    ].map((button, index) => {
                      const isSelected = selectedWeight === button.value
                      const isLocked = selectedWorkoutExercise && lockedWeights[selectedWorkoutExercise.id] === button.value

                      let buttonClass = 'relative flex flex-col items-center justify-center py-3 transition-all duration-200 hover:bg-white/10 active:bg-white/20'

                      if (isLocked) {
                        buttonClass += ' bg-amber-500/20 hover:bg-amber-500/30'
                      } else if (isSelected) {
                        buttonClass += ' bg-white/10'
                      }

                      return (
                        <button
                          key={index}
                          onClick={() => {
                            if (!selectedWorkoutExercise) return
                            handleWeightClick(button.value)
                          }}
                          className={buttonClass}
                        >
                          {isLocked && (
                            <div className="absolute top-1 right-1">
                              <Lock className="w-3 h-3 text-amber-500" />
                            </div>
                          )}
                          <span className={`text-lg font-bold ${isLocked ? 'text-amber-500' : isSelected ? 'text-white' : 'text-white/60'}`}>
                            {button.label}
                          </span>
                          <span className={`text-[10px] ${isLocked ? 'text-amber-500/80' : isSelected ? 'text-white/80' : 'text-white/30'}`}>
                            ×{button.multiplier}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Decreased/Regular toggle - Separate */}
              {selectedWorkoutExercise.supports_decreased && (
                <div className="px-3 py-2">
                <button
                  onClick={() => setIsDecreasedExercise(!isDecreasedExercise)}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${isDecreasedExercise
                      ? 'bg-amber-500/20 border border-amber-500/30'
                      : 'bg-white/5 border border-white/10'
                      }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isDecreasedExercise
                    ? 'bg-amber-400 border-amber-400'
                    : 'border-white/30 bg-transparent'
                    }`}>
                      {isDecreasedExercise && <Check className="w-2.5 h-2.5 text-black" />}
                  </div>
                    <span className="text-sm font-medium">
                    {isDecreasedExercise ? 'Decreased (1.5x points)' : 'Regular (1x points)'}
                  </span>
                </button>
                </div>
              )}
            </div>

            {/* Bottom section - Stopwatch and Submit */}
            <div className="flex-shrink-0 px-3 pt-3 pb-4 border-t border-white/10 bg-black/50 backdrop-blur-sm space-y-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              
              {/* Stopwatch row with inline controls */}
              <div className="flex items-center gap-2">
                {/* Expand/collapse button */}
                <button
                  onClick={() => setIsStopwatchExpanded(!isStopwatchExpanded)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all ${
                    isStopwatchRunning 
                      ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                      : stopwatchTime > 0
                        ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                        : 'bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${isStopwatchRunning ? 'animate-pulse' : ''}`} />
                  <span className="text-sm font-black tabular-nums">{formatTime(stopwatchTime)}</span>
                  {isStopwatchExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                </button>
                
                {/* Quick play/pause button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    isStopwatchRunning ? pauseStopwatch() : startStopwatch()
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                    isStopwatchRunning
                      ? 'bg-amber-500 text-black hover:bg-amber-600'
                      : 'bg-green-500 text-black hover:bg-green-600'
                  }`}
                  aria-label={isStopwatchRunning ? 'Pause' : 'Start'}
                >
                  {isStopwatchRunning ? (
                    <div className="flex gap-0.5">
                      <div className="w-1 h-3.5 bg-current rounded-sm" />
                      <div className="w-1 h-3.5 bg-current rounded-sm" />
                    </div>
                  ) : (
                    <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-current border-b-[6px] border-b-transparent ml-0.5" />
                  )}
                </button>
              </div>

              {/* Stopwatch expanded controls */}
              {isStopwatchExpanded && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 animate-in slide-in-from-top-2 duration-200">
                  <div className="text-center mb-2">
                    <div className="text-3xl font-black tracking-tight text-white tabular-nums" style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      letterSpacing: '0.05em'
                    }}>
                      {formatTime(stopwatchTime)}
                </div>
              </div>
                  <div className="flex justify-center items-center gap-3">
                    <button
                      onClick={resetStopwatch}
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-95 border border-white/5"
                      aria-label="Reset"
                    >
                      <div className="w-3.5 h-3.5 bg-current rounded-sm opacity-60" />
                    </button>
                    <button
                      onClick={isStopwatchRunning ? pauseStopwatch : startStopwatch}
                      className={`h-10 px-5 rounded-full flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${
                        isStopwatchRunning
                          ? 'bg-amber-500 hover:bg-amber-600 text-black'
                          : 'bg-green-500 hover:bg-green-600 text-black'
                      }`}
                    >
                      <span className="text-xs font-black uppercase tracking-wider">
                        {isStopwatchRunning ? 'Pause' : 'Start'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Submit button - More breathing room */}
                <button
                  onClick={async () => {
                    if (!user || !selectedWorkoutExercise || workoutCount <= 0 || loading) return

                  // Stop stopwatch if running
                  if (isStopwatchRunning) {
                    pauseStopwatch()
                  }

                    setLoading(true)
                    try {
                      const points = calculateWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)

                      const { error } = await supabase
                        .from('logs')
                        .insert({
                          user_id: user.id,
                          exercise_id: selectedWorkoutExercise.id,
                          sport_name: selectedWorkoutExercise.type === 'sport' ? selectedSport : null,
                          count: selectedWorkoutExercise.unit === 'rep' ? Math.floor(workoutCount) : 0,
                          weight: selectedWeight,
                          duration: selectedWorkoutExercise.is_time_based ? Math.floor(workoutCount) : 0,
                          points: points,
                          date: getLocalDateString(),
                          timestamp: Date.now()
                        })

                      if (error) {
                        console.error('Supabase Insert Error:', error)
                        alert('Error logging workout: ' + error.message + '\nCode: ' + error.code)
                      } else {
                        // Refresh data
                        if (onWorkoutAdded) {
                          onWorkoutAdded()
                        }
                        loadDailyProgress()
                        loadTodaysWorkouts()

                        // Check for automatic mode switching after exercise submission
                        await checkAutomaticModeSwitch()

                        // Reset workout input
                        setWorkoutInputOpen(false)
                        setWorkoutCount(0)
                        setSelectedWeight(selectedWorkoutExercise ? (lockedWeights[selectedWorkoutExercise.id] || 0) : 0)
                        setIsDecreasedExercise(false)

                        // Haptic feedback
                        if (navigator.vibrate) {
                          navigator.vibrate(100)
                        }
                      }
                    } catch (error) {
                      console.error('Error saving workout:', error)
                      alert('An error occurred while saving your workout.')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || workoutCount <= 0}
                className={`w-full relative overflow-hidden hover:scale-[1.01] active:scale-95 py-4 rounded-xl font-black transition-all duration-200 touch-manipulation disabled:opacity-50 disabled:scale-100 ${
                  (() => {
                    const currentPoints = getEffectiveWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)
                    const remainingPoints = Math.max(0, dailyTarget - (dailyProgress + currentPoints))
                    const isComplete = remainingPoints === 0 && dailyTarget > 0
                    
                    if (isComplete) {
                      return 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                    }
                    
                    return weekMode === 'insane'
                      ? 'bg-gradient-to-r from-orange-600 to-red-500 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                  })()
                }`}
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  <span className="text-base uppercase tracking-wider">
                    {(() => {
                      const currentPoints = getEffectiveWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)
                      const remainingPoints = Math.max(0, dailyTarget - (dailyProgress + currentPoints))

                      if (remainingPoints === 0 && dailyTarget > 0) {
                        return '🎉 SUBMIT • COMPLETE!'
                      }

                      return 'SUBMIT'
                    })()}
                  </span>
                  <span className="text-sm opacity-90 bg-white/20 px-2 py-0.5 rounded-full">
                    +{getEffectiveWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)} pts
                  </span>
                </div>
                </button>
            </div>
          </div >
        )
        }
        {/* Sport Selection Modal */}
        {
          showSportSelection && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
              <div className="relative bg-black border border-white/10 rounded-3xl max-w-sm w-full max-h-[95vh] overflow-hidden shadow-2xl">

                {/* Header */}
                <div className="relative overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(135deg, #a855f750 0%, #a855f730 50%, transparent 100%)'
                    }}
                  />

                  <div className="relative p-6 border-b border-white/10/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div
                          className="p-3 rounded-2xl"
                          style={{
                            background: 'linear-gradient(135deg, #a855f740 0%, #a855f720 100%)'
                          }}
                        >
                          <Zap className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{selectedSport}</h3>
                          <div className="text-white/80 text-sm">Select intensity level</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowSportSelection(false)}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-110"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Intensity Selection */}
                  <div className="space-y-3">
                    {sportsExercises.map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => {
                          setSelectedWorkoutExercise(exercise)
                          setWorkoutCount(0)
                          setSelectedWeight(0)
                          setIsDecreasedExercise(false)
                          setShowSportSelection(false)
                          setWorkoutInputOpen(true)
                        }}
                        className="w-full bg-black/30 backdrop-blur-sm hover:bg-gray-800/40 border border-white/10/50 hover:border-purple-400/50 text-white py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-between group"
                      >
                        <div className="flex items-center space-x-3">
                          <Zap className="w-5 h-5 text-purple-400" />
                          <div className="text-left">
                            <div className="font-semibold">{exercise.name}</div>
                            <div className="text-sm text-gray-400">{exercise.points_per_unit} pts/{exercise.unit}</div>
                          </div>
                        </div>
                        <div className="text-gray-400 group-hover:text-white transition-colors">→</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </div >
    </>
  )
}