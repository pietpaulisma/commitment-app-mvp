'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createCumulativeGradient, getExerciseTypeGradient, getButtonGradient, getButtonShadow } from '@/utils/gradientUtils'
import TimeGradient from './TimeGradient'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useWeekMode } from '@/contexts/WeekModeContext'
import { usePageState } from '@/hooks/usePageState'
import { calculateDailyTarget, getDaysSinceStart } from '@/utils/targetCalculation'
import { NotificationService } from '@/services/notificationService'
import {
  XMarkIcon,
  HeartIcon,
  FireIcon,
  MoonIcon,
  BoltIcon,
  SparklesIcon,
  ChevronDownIcon,
  StarIcon,
  RectangleStackIcon,
  FaceSmileIcon,
  CalendarDaysIcon,
  TrashIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  LockClosedIcon,
  ChevronUpIcon,
  CheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

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
}

export default function WorkoutModal({ isOpen, onClose, onWorkoutAdded, isAnimating = false, onCloseStart }: WorkoutModalProps) {
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
  const [showMotivationalMessage, setShowMotivationalMessage] = useState(false)
  const [lastMinuteCount, setLastMinuteCount] = useState(0) // Track minutes for auto-increment
  const [hasFlexibleRestDay, setHasFlexibleRestDay] = useState(false)
  const [isUsingFlexibleRestDay, setIsUsingFlexibleRestDay] = useState(false)
  const [hasPostedToday, setHasPostedToday] = useState(false)
  const [checkingPostStatus, setCheckingPostStatus] = useState(false)
  const [sportsList, setSportsList] = useState<Array<{ id: string, name: string, emoji: string }>>([])
  const [isDragging, setIsDragging] = useState(false)
  const [sliderPosition, setSliderPosition] = useState(0)
  const [isSliderComplete, setIsSliderComplete] = useState(false)
  const [personalRecord, setPersonalRecord] = useState<number | null>(null)

  const router = useRouter()

  // Motivational messages array
  const motivationalMessages = [
    "Your future self is already clapping.",
    "Sweat = progress in liquid form.",
    "You're lapping everyone still on the couch.",
    "Every rep is a deposit in the badass bank.",
    "Stopwatch says GO, not SCROLL.",
    "You'll be stronger tomorrow because of this second.",
    "This burn is proof you're alive.",
    "Future jeans will thank you.",
    "The timer isn't slowing down — why should you?",
    "Imagine your favorite song playing for you only.",
    "Pretend someone's watching. Move cooler.",
    "If this was Mario Kart, you just hit a speed boost.",
    "Rival just pulled ahead. Catch them.",
    "You just unlocked the 'sweat badge.'",
    "Beat your shadow-self.",
    "The timer is your opponent — don't let it win.",
    "Each second = one XP point. Level up.",
    "Boss fight incoming. Don't drop your guard.",
    "The leaderboard is watching.",
    "Final lap. Sprint!",
    "Your water bottle is judging you.",
    "Stopwatch tattles if you quit.",
    "Resting face detected.",
    "Your mat wants more drama.",
    "Somewhere, your ex is hoping you give up.",
    "Your phone thinks you're scrolling right now.",
    "Push-ups build character. And better selfies.",
    "Burpees: nature's revenge.",
    "Don't let gravity win today.",
    "If you faint, at least do it dramatically.",
    "Somewhere, a llama is proud of you.",
    "This second is sponsored by sore muscles.",
    "Push harder or the toaster rebels.",
    "Someone in space just flexed for you.",
    "Imagine broccoli cheering.",
    "Hamsters think you're fast.",
    "Sweat is your aura shining.",
    "Keep going — pigeons demand it.",
    "A potato just gave up; don't be that potato.",
    "If aliens are watching, impress them.",
    "And here we witness… a hero in action.",
    "Stopwatch approves this effort.",
    "Muscles negotiating… denied.",
    "Behold: cardio royalty.",
    "The prophecy said you wouldn't quit.",
    "Legend says you never stop here.",
    "Your rep is trending worldwide.",
    "Stopwatch whispers: 'Faster.'",
    "Training montage music intensifies.",
    "Scene change: victory incoming.",
    "Don't pause now, your snack isn't ready yet.",
    "One more rep, one less excuse.",
    "Sweat stains > couch cushions.",
    "Stopwatch eats hesitation for breakfast.",
    "Tired is a side effect of awesome.",
    "Your sweatband wants more screen time.",
    "Rest later. Impress now.",
    "Stopwatch believes in you (slightly).",
    "This moment = bragging rights later.",
    "Stopwatch is neutral. You aren't.",
    "You're literally saving the universe (probably).",
    "Faster than a deadline approaching.",
    "Muscles: assemble!",
    "Timer says you're basically a sidekick.",
    "Your cape is invisible but powerful.",
    "Villains take the day off — not you.",
    "Training montage unlocked.",
    "Even Batman does squats.",
    "Stopwatch = super serum drip.",
    "Today's power-up: sweat.",
    "10 more seconds of chaos.",
    "Wheeee — gravity isn't a toy.",
    "Hold tight, ride's not over.",
    "That burn? Front-row ticket vibes.",
    "Endorphins coming up next.",
    "Warning: epic finish ahead.",
    "Think of this as a final boss cutscene.",
    "Stopwatch buckle-up mode engaged.",
    "Ride ends when you say it does.",
    "Push now, laugh later.",
    "Strike like you mean it.",
    "Stopwatch = dojo master.",
    "Don't let your inner ninja nap.",
    "Kick the laziness out.",
    "Every rep is a silent strike.",
    "Sweat = warrior ink.",
    "The floor fears your push-ups.",
    "Stopwatch bows to your discipline.",
    "Warrior mode: active.",
    "Laziness defeated, achievement unlocked.",
    "Boom. Another second gone.",
    "Faster. Louder. Stronger.",
    "Stopwatch doesn't stutter.",
    "Pain = spice of victory.",
    "Don't stop — your playlist hates pauses.",
    "Stopwatch flexed first.",
    "Laugh now, sore tomorrow.",
    "More sweat, fewer regrets.",
    "Stopwatch won't remember, but you will.",
    "Rep after rep = legend unlocked.",
    "TEAR THE FLOOR APART WITH YOUR HANDS.",
    "CRUSH THIS SET LIKE IT OWES YOU MONEY.",
    "DESTROY EVERY SECOND OR BE DESTROYED.",
    "RIP THE LAZINESS OUT OF YOUR BODY.",
    "BREAK LIMITS. BREAK EXCUSES. BREAK EVERYTHING.",
    "SHATTER THE TIMER WITH YOUR SWEAT.",
    "SLAUGHTER THE REPS. NO MERCY.",
    "ANNIHILATE WEAKNESS NOW.",
    "SMASH THROUGH THIS LIKE A RAMPAGING BULL.",
    "OBLITERATE THE NEXT 10 SECONDS.",
    "UNLEASH HELL ON THESE REPS.",
    "GRIND YOUR LIMITS INTO DUST.",
    "TURN FATIGUE INTO ASH.",
    "KILL THE EXCUSES. FEED THE GRIND.",
    "DESTROY THE CLOCK WITH EVERY REP.",
    "MAKE THE TIMER BEG FOR MERCY."
  ]

  // Fetch Personal Record when exercise is selected
  useEffect(() => {
    async function fetchPR() {
      if (!selectedWorkoutExercise || !user) return

      console.log('Fetching PR for:', selectedWorkoutExercise.name, selectedWorkoutExercise.id)

      const { data, error } = await supabase
        .from('workout_logs')
        .select('count')
        .eq('user_id', user.id)
        .eq('exercise_id', selectedWorkoutExercise.id)
        .order('count', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        console.error('Error fetching PR:', error)
      }

      if (data) {
        console.log('PR found:', data.count)
        setPersonalRecord(data.count)
      } else {
        console.log('No PR found')
        setPersonalRecord(null)
      }
    }
    fetchPR()
  }, [selectedWorkoutExercise, user])

  // Debug daily target
  useEffect(() => {
    console.log('Daily Target:', dailyTarget)
    console.log('Daily Progress:', dailyProgress)
    console.log('Remaining:', Math.max(0, dailyTarget - dailyProgress))
  }, [dailyTarget, dailyProgress])

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
        const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
        setMotivationalMessage(randomMessage)
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
          .select('rest_days, recovery_days')
          .eq('group_id', profile.group_id)
          .maybeSingle()
      ])

      if (groupResult.data?.start_date) {
        const daysSinceStart = getDaysSinceStart(groupResult.data.start_date)
        const restDays = settingsResult.data?.rest_days || [1]
        const recoveryDays = settingsResult.data?.recovery_days || [5]

        // Use override mode if provided, otherwise use current context mode
        const targetMode = modeOverride || weekMode

        const target = calculateDailyTarget({
          daysSinceStart,
          weekMode: targetMode,
          restDays,
          recoveryDays
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
    if (groupDaysSinceStart > 0) {
      const newTarget = calculateDailyTarget({
        daysSinceStart: groupDaysSinceStart,
        weekMode: newMode,
        restDays: [1], // Default rest days
        recoveryDays: [5] // Default recovery days  
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
          exercise_id: null, // Special case for flexible rest day
          points: targetPoints,
          date: getLocalDateString(),
          count: 1,
          weight: 0,
          duration: 0,
          note: 'Flexible Rest Day Used'
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
          console.log('🎉 Flexible rest day earned!')

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

      // Load points and recovery days, optionally load target data if not provided
      const loadPromises: any[] = [
        supabase
          .from('logs')
          .select(`
            points,
            exercise_id,
            count,
            duration,
            exercises (name, type, unit, is_time_based)
          `)
          .eq('user_id', user.id)
          .eq('date', today),
        profile?.group_id ? supabase
          .from('group_settings')
          .select('recovery_days')
          .eq('group_id', profile.group_id)
          .maybeSingle() : null
      ]

      // Only load target data if not provided as override
      if (!targetOverride) {
        loadPromises.splice(1, 0, loadGroupDataAndCalculateTarget())
      }

      const results = await Promise.all(loadPromises)
      const pointsResult = results[0] as any
      let targetData: any, groupSettings: any

      if (targetOverride) {
        targetData = { target: targetOverride, daysSinceStart: 0 }
        groupSettings = results[1]
      } else {
        targetData = results[1]
        groupSettings = results[2]
      }

      // Calculate regular and recovery points separately
      const regularPoints = pointsResult.data
        ?.filter((log: any) => log.exercises?.type !== 'recovery')
        ?.reduce((sum: number, log: any) => sum + log.points, 0) || 0

      const recoveryPoints = pointsResult.data
        ?.filter((log: any) => log.exercises?.type === 'recovery')
        ?.reduce((sum: number, log: any) => sum + log.points, 0) || 0

      // Check if today is a recovery day
      const currentDayOfWeek = new Date().getDay()
      const recoveryDays = groupSettings?.data?.recovery_days || [5]
      const isRecoveryDay = recoveryDays.includes(currentDayOfWeek)

      // Calculate daily progress with recovery cap (except on recovery days)
      let effectiveRecoveryPoints = recoveryPoints
      if (!isRecoveryDay && recoveryPoints > 0) {
        const maxRecoveryAllowed = Math.floor(targetData.target * 0.25)
        effectiveRecoveryPoints = Math.min(recoveryPoints, maxRecoveryAllowed)
      }

      const cappedTotalPoints = regularPoints + effectiveRecoveryPoints

      setDailyProgress(cappedTotalPoints)
      setDailyTarget(targetData.target)
      setGroupDaysSinceStart(targetData.daysSinceStart)
      setRecoveryProgress(recoveryPoints) // Keep full recovery points for display
      setTodayLogs(pointsResult.data || [])
    } catch (error) {
      console.error('Error loading daily progress:', error)
    }

    // Check if user earned a flexible rest day
    await checkFlexibleRestDayEarned()
  }

  const loadTodaysWorkouts = async () => {
    if (!user) return

    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: workouts } = await supabase
        .from('logs')
        .select(`
          *,
          exercises (*)
        `)
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


  const getExerciseIcon = (exercise: Exercise) => {
    const name = exercise.name.toLowerCase()

    // Exercise-specific icon mappings using Heroicons
    switch (name) {
      // Strength exercises
      case 'push-ups':
      case 'pushups':
        return <FireIcon className="w-5 h-5 text-gray-400" />
      case 'pull-ups':
      case 'pullups':
        return <BoltIcon className="w-5 h-5 text-gray-400" />
      case 'squats':
        return <HeartIcon className="w-5 h-5 text-gray-400" />
      case 'lunges':
        return <SparklesIcon className="w-5 h-5 text-gray-400" />
      case 'sit-ups':
      case 'situps':
        return <MoonIcon className="w-5 h-5 text-gray-400" />
      case 'dips':
        return <BoltIcon className="w-5 h-5 text-gray-400" />
      case 'jumping jacks':
        return <SparklesIcon className="w-5 h-5 text-gray-400" />

      // Cardio exercises
      case 'running':
        return <BoltIcon className="w-5 h-5 text-gray-400" />
      case 'cycling':
      case 'biking':
        return <HeartIcon className="w-5 h-5 text-gray-400" />
      case 'swimming':
        return <SparklesIcon className="w-5 h-5 text-gray-400" />
      case 'walking':
        return <FireIcon className="w-5 h-5 text-gray-400" />

      // Recovery exercises
      case 'stretching':
        return <SparklesIcon className="w-5 h-5 text-gray-400" />
      case 'yoga':
        return <MoonIcon className="w-5 h-5 text-gray-400" />
      case 'meditation':
        return <MoonIcon className="w-5 h-5 text-gray-400" />
      case 'foam rolling':
      case 'blackrolling':
        return <HeartIcon className="w-5 h-5 text-gray-400" />
      case 'massage':
        return <SparklesIcon className="w-5 h-5 text-gray-400" />
      case 'sauna':
        return <FireIcon className="w-5 h-5 text-gray-400" />
      case 'ice bath':
      case 'cold shower':
        return <BoltIcon className="w-5 h-5 text-gray-400" />

      // Sport activities
      case 'tennis':
        return <BoltIcon className="w-5 h-5 text-gray-400" />
      case 'basketball':
        return <FireIcon className="w-5 h-5 text-gray-400" />
      case 'football':
      case 'soccer':
        return <HeartIcon className="w-5 h-5 text-gray-400" />
      case 'volleyball':
        return <SparklesIcon className="w-5 h-5 text-gray-400" />

      default:
        // Fallback to type-based icons
        const type = exercise.type?.toLowerCase()
        switch (type) {
          case 'strength':
            return <FireIcon className="w-5 h-5 text-gray-400" />
          case 'cardio':
            return <HeartIcon className="w-5 h-5 text-gray-400" />
          case 'flexibility':
            return <SparklesIcon className="w-5 h-5 text-gray-400" />
          case 'recovery':
            return <MoonIcon className="w-5 h-5 text-gray-400" />
          case 'endurance':
            return <BoltIcon className="w-5 h-5 text-gray-400" />
          default:
            return <FireIcon className="w-5 h-5 text-gray-400" />
        }
    }
  }

  const renderFavoriteExerciseButton = (exercise: ExerciseWithProgress) => {
    const exerciseProgress = getExerciseProgress(exercise.id)

    return (
      <div
        key={exercise.id}
        className="w-full relative overflow-hidden transition-all duration-300 mb-1 hover:scale-[1.02]"
      >
        <div className="flex items-center">
          {/* Main content area with progress bar */}
          <div className="flex-1 relative overflow-hidden rounded-3xl mr-2 shadow-2xl border border-white/10 bg-black/70 backdrop-blur-xl">
            {/* Liquid gradient progress bar background */}
            <div
              className="absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out"
              style={{
                width: '100%',
                background: exerciseProgress.percentage === 0
                  ? '#000000'
                  : `linear-gradient(to right, 
                    ${getCategoryColor(exercise.type, exercise.id)} 0%, 
                    ${getCategoryColor(exercise.type, exercise.id)} ${Math.max(0, exerciseProgress.percentage - 5)}%, 
                    ${getCategoryColor(exercise.type, exercise.id)}dd ${exerciseProgress.percentage}%, 
                    #000000 ${Math.min(100, exerciseProgress.percentage + 3)}%)`
              }}
            />

            {/* Main exercise button */}
            <button
              onClick={() => quickAddExercise(exercise)}
              className="w-full p-3 hover:scale-105 transition-all duration-300 relative hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getExerciseIcon(exercise)}
                  <div>
                    <div className="font-medium text-white text-left">{exercise.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-medium text-gray-500">
                    {exercise.points_per_unit % 1 === 0
                      ? exercise.points_per_unit
                      : exercise.points_per_unit.toFixed(2)
                    }
                  </span>
                  <span className="font-thin text-gray-500 ml-1">
                    {('/' + exercise.unit.replace('minute', 'min').replace('hour', 'h'))}
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Reorder icon for favorites */}
          <button
            className="w-12 h-12 bg-black/70 backdrop-blur-xl border border-white/10 hover:bg-black/80 flex items-center justify-center text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-300 transition-all duration-200 shadow-lg flex-shrink-0" style={{ borderRadius: '50%' }}
            aria-label="Reorder favorite"
          >
            <Bars3Icon className="w-4 h-4" />
          </button>
        </div>
      </div>
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
    const exerciseProgress = getExerciseProgress(exercise.id)

    return (
      <div
        key={exercise.id}
        className="w-full relative overflow-hidden transition-all duration-300 mb-1 hover:scale-[1.02]"
      >
        <div className="flex items-center">
          {/* Main content area with progress bar */}
          <div className="flex-1 relative overflow-hidden rounded-3xl mr-2 shadow-2xl border border-white/10 bg-black/70 backdrop-blur-xl">
            {/* Liquid gradient progress bar background */}
            <div
              className="absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out"
              style={{
                width: '100%',
                background: exerciseProgress.percentage === 0
                  ? '#000000'
                  : `linear-gradient(to right, 
                    ${getCategoryColor(exercise.type, exercise.id)} 0%, 
                    ${getCategoryColor(exercise.type, exercise.id)} ${Math.max(0, exerciseProgress.percentage - 5)}%, 
                    ${getCategoryColor(exercise.type, exercise.id)}dd ${exerciseProgress.percentage}%, 
                    #000000 ${Math.min(100, exerciseProgress.percentage + 3)}%)`
              }}
            />

            {/* Main exercise button */}
            <button
              onClick={() => quickAddExercise(exercise)}
              className="w-full p-3 hover:scale-105 transition-all duration-300 relative hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getExerciseIcon(exercise)}
                  <div>
                    <div className="font-medium text-white text-left">{exercise.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-medium text-gray-500">
                    {exercise.points_per_unit % 1 === 0
                      ? exercise.points_per_unit
                      : exercise.points_per_unit.toFixed(2)
                    }
                  </span>
                  <span className="font-thin text-gray-500 ml-1">
                    {('/' + exercise.unit.replace('minute', 'min').replace('hour', 'h'))}
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Star icon button */}
          {showFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(exercise.id)
              }}
              className="w-12 h-12 bg-black/70 backdrop-blur-xl border border-white/10 hover:bg-black/80 flex items-center justify-center transition-all duration-200 shadow-lg flex-shrink-0" style={{ borderRadius: '50%' }}
            >
              {isFavorite ? (
                <StarIconSolid className="w-4 h-4 text-yellow-400" />
              ) : (
                <StarIcon className="w-4 h-4 text-gray-400 hover:text-yellow-400" />
              )}
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderSportButton = (sportName: string, sportEmoji?: string) => {
    return (
      <div
        key={sportName}
        className="w-full relative border-b border-white/10 overflow-hidden transition-all duration-300 bg-black/30 backdrop-blur-sm hover:bg-black/40"
      >
        <div className="flex items-center gap-2">
          {/* Main content area with progress bar - matches header layout */}
          <div className="flex-1 relative overflow-hidden rounded-3xl mr-2 shadow-2xl border border-white/10 bg-black/70 backdrop-blur-xl">
            {/* Gradient background for sports */}
            <div
              className="absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out"
              style={{
                width: '100%',
                background: '#000000'
              }}
            />

            {/* Main sport button */}
            <button
              onClick={() => {
                setSelectedSport(sportName)
                setShowSportSelection(true)
              }}
              className="w-full p-3 hover:scale-105 transition-transform duration-300 relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {sportEmoji ? (
                    <span className="text-2xl">{sportEmoji}</span>
                  ) : (
                    <BoltIcon className="w-6 h-6 text-purple-400" />
                  )}
                  <div>
                    <div className="font-medium text-white text-left">{sportName}</div>
                  </div>
                </div>
                <div className="text-right">
                  <StarIcon className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            </button>
          </div>
        </div>
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

      // Try to get today's workout counts (may fail if logs table doesn't exist)
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

      // Try to get yesterday's workouts (may fail if logs table doesn't exist)
      let yesterdayLogs = []
      try {
        const { data } = await supabase
          .from('logs')
          .select('exercise_id, exercises(name, type)')
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
    console.log('Submitting workout to group:', {
      user_id: user?.id,
      user_email: user?.email,
      profile_group_id: profile?.group_id,
      dailyProgress,
      todayLogs: todayLogs?.length
    });

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
      const exercisesSummary = todayLogs.reduce((acc: any, log) => {
        const exerciseName = log.exercises?.name || 'Unknown Exercise'
        if (acc[exerciseName]) {
          acc[exerciseName].count += log.count || log.duration || 1
          acc[exerciseName].points += log.points
        } else {
          acc[exerciseName] = {
            count: log.count || log.duration || 1,
            points: log.points,
            unit: log.exercises?.unit || 'rep',
            isTimeBased: log.exercises?.is_time_based || false
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
        text: `🎯 Workout completed! ${totalPoints} points achieved`,
        workout_data: workoutData
      })

      // Inserting workout message
      console.log('Inserting workout message:', {
        user_id: user.id,
        group_id: profile.group_id,
        message_length: messageWithData.length,
        message_type: 'workout_completion',
        workoutData: JSON.stringify(workoutData, null, 2)
      });

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

            console.log(`Workout completion notification sent to ${memberIds.length} group members`)
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
              console.log(`Auto-switched to insane mode! Points: ${totalPoints}, Insane target: ${insaneTargetForToday}`)

              // Recalculate target with new mode
              await recalculateTargetWithMode('insane')

              // Show special message for mode switch
              alert(`🔥 INSANE MODE ACTIVATED! You exceeded the insane target (${insaneTargetForToday}) with ${totalPoints} points!`)
            } else {
              // Show normal success message
              alert('🎉 Workout submitted to group chat!')
            }
          } catch (error) {
            console.error('Error checking automatic mode switch:', error)
            // Fallback to normal success message
            alert('🎉 Workout submitted to group chat!')
          }
        } else {
          // Show normal success message
          alert('🎉 Workout submitted to group chat!')
        }

        // Success feedback
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }

        // Update state to reflect successful posting
        setHasPostedToday(true)

        // Clear workout state since it's complete
        clearWorkoutInProgress()

        // Close modal and redirect to chat after submission
        setTimeout(() => {
          onClose()
          router.push('/dashboard?tab=chat')
        }, 1000)
      }
    } catch (error) {
      console.error('Error submitting workout:', error)
      alert('An error occurred while submitting your workout.')
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
            group_id: profile?.group_id,
            exercise_id: selectedWorkoutExercise.id,
            count: selectedWorkoutExercise.unit === 'rep' ? Math.floor(workoutCount) : 0,
            weight: selectedWeight,
            duration: selectedWorkoutExercise.is_time_based ? Math.floor(workoutCount) : 0,
            points: points,
            date: getLocalDateString(),
            timestamp: Date.now(),
            is_decreased: isDecreasedExercise
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

          // Check for automatic mode switching after exercise submission
          await checkAutomaticModeSwitch()

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
        {/* Time-based gradient background with subtle glass layer effect */}
        <TimeGradient className="absolute inset-0 z-[-1] pointer-events-none" intensity={0.15} />
        {/* Header - Reduced height for PWA - Now extends to true top */}
        <div className="sticky top-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center">
            {/* Progress Bar Section - Extends to fill safe area */}
            <div className={`flex-1 relative h-16 ${dailyProgress > 0 ? 'bg-gray-900' : 'bg-gray-900'} border-r border-gray-700 overflow-hidden`}>
              {/* Liquid gradient progress background with subtle animation */}
              <div
                className="absolute left-0 top-0 bottom-0 transition-all duration-600 ease-out"
                style={{
                  width: progressAnimated ? '100%' : '75%',
                  background: createCumulativeGradient(todayLogs || [], dailyTarget, weekMode),
                  opacity: isClosing ? 0 : 1
                }}
              />

              {/* Button Content */}
              <div className="relative h-full flex items-center justify-between px-6 text-white">
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm tracking-tight uppercase">
                    {progressPercentage >= 100 ? 'Complete!' : 'Log Workout'}
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
              {progressPercentage >= 100 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
              )}
            </div>

            {/* Chat → X Button Transition - Extends to fill safe area */}
            <button
              onClick={handleClose}
              className="w-16 h-16 bg-gray-900 border-l border-gray-700 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors duration-200 relative overflow-hidden"
              aria-label="Close workout log"
            >
              {/* Chat Icon (slides up and out when modal reaches top) */}
              <div
                className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
                style={{
                  transform: showIconTransition ? 'translateY(-64px)' : 'translateY(0px)'
                }}
              >
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
              </div>

              {/* X Icon (slides up from below when modal reaches top) */}
              <div
                className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
                style={{
                  transform: showIconTransition ? 'translateY(0px)' : 'translateY(64px)'
                }}
              >
                <XMarkIcon className="w-6 h-6" />
              </div>
            </button>
          </div>
        </div>

        {/* Completed Exercises Section - positioned outside padded container */}
        {!exercisesLoading && exercises.length > 0 && todaysWorkouts.length > 0 && (
          <div
            className="w-full"
            style={{
              background: completedExercisesExpanded
                ? (weekMode === 'insane'
                  ? 'linear-gradient(180deg, #dc2626 0%, #991b1b 50%, #7f1d1d 100%)'
                  : 'linear-gradient(180deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)')
                : 'transparent'
            }}
          >
            <button
              onClick={() => setCompletedExercisesExpanded(!completedExercisesExpanded)}
              className="w-full hover:opacity-80 transition-all duration-200"
              style={{
                background: weekMode === 'insane'
                  ? 'linear-gradient(90deg, #991b1b 0%, #dc2626 50%, #7f1d1d 100%)'
                  : 'linear-gradient(90deg, #1e40af 0%, #3b82f6 50%, #1e3a8a 100%)',
                minHeight: '48px',
                border: 'none',
                outline: 'none',
                boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.1), inset 0 -1px 2px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="flex items-center justify-between px-6 text-white" style={{ minHeight: '48px' }}>
                <span className="font-bold text-sm tracking-tight uppercase">
                  Completed Exercises
                </span>

                <div className="flex items-center space-x-2">
                  <span className="text-xs opacity-75 font-medium">
                    ({todaysWorkouts.length})
                  </span>
                  <div className={`transform transition-transform duration-200 ${completedExercisesExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon className="w-5 h-5 text-gray-300" />
                  </div>
                </div>
              </div>
            </button>

            {todaysWorkouts.length > 0 && completedExercisesExpanded && (
              <div className="space-y-0 mt-3 p-2">
                {getGroupedWorkouts().map((workout: any) => {
                  const exerciseProgress = getExerciseProgress(workout.exercise_id)
                  return (
                    <div
                      key={`${workout.exercise_id}-${workout.weight || 0}`}
                      className="w-full relative overflow-hidden transition-all duration-300 mb-1"
                    >
                      <div className="flex items-center">
                        {/* Main content area with progress bar - matches header layout */}
                        <div className="flex-1 relative overflow-hidden rounded-3xl mr-2 shadow-2xl border border-white/10 bg-black/70 backdrop-blur-xl">
                          {/* Liquid gradient progress bar background */}
                          <div
                            className="absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out"
                            style={{
                              width: '100%',
                              background: exerciseProgress.percentage === 0
                                ? '#000000'
                                : `linear-gradient(to right, 
                                    ${getCategoryColor(workout.exercises?.type || 'all', workout.exercise_id)} 0%, 
                                    ${getCategoryColor(workout.exercises?.type || 'all', workout.exercise_id)} ${Math.max(0, exerciseProgress.percentage - 5)}%, 
                                    ${getCategoryColor(workout.exercises?.type || 'all', workout.exercise_id)}dd ${exerciseProgress.percentage}%, 
                                    #000000 ${Math.min(100, exerciseProgress.percentage + 3)}%)`
                            }}
                          />

                          {/* Exercise content */}
                          <div className="relative p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {getExerciseIcon(workout.exercises)}
                                <div>
                                  <div className="font-medium text-white flex items-center space-x-2">
                                    <span>{workout.exercises?.name || 'Unknown Exercise'}</span>
                                    {workout.weight > 0 && (
                                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                                        {workout.weight} kg
                                      </span>
                                    )}
                                    {workout.exercises?.type === 'recovery' && (
                                      <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Recovery</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                {(() => {
                                  const effectivePoints = workout.logs?.reduce((sum: number, log: any) => sum + getEffectivePoints(log), 0) || 0
                                  const rawPoints = workout.totalPoints
                                  const isRecoveryWorkout = workout.exercises?.type === 'recovery'
                                  const isPointsCapped = isRecoveryWorkout && effectivePoints < rawPoints

                                  return (
                                    <div>
                                      <span className="font-medium text-white">
                                        {effectivePoints % 1 === 0 ? effectivePoints : effectivePoints.toFixed(2)}
                                      </span>
                                      <span className="font-thin text-white ml-1">pts</span>
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expand/Collapse button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Toggle expand state for this workout
                            const workoutKey = `${workout.exercise_id}-${workout.weight || 0}`
                            setExpandedWorkouts(prev => ({
                              ...prev,
                              [workoutKey]: !prev[workoutKey]
                            }))
                          }}
                          className="w-12 h-12 bg-black/70 backdrop-blur-xl border border-white/10 hover:bg-black/80 flex items-center justify-center text-gray-400 hover:text-gray-300 transition-all duration-200 shadow-lg flex-shrink-0" style={{ borderRadius: '50%' }}
                          aria-label="Expand workout details"
                        >
                          <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${expandedWorkouts[`${workout.exercise_id}-${workout.weight || 0}`] ? 'rotate-180' : ''
                            }`} />
                        </button>
                      </div>

                      {/* Individual sets when expanded */}
                      {expandedWorkouts[`${workout.exercise_id}-${workout.weight || 0}`] && (
                        <div className="mt-3 space-y-1">
                          {workout.logs.map((log: any, index: number) => (
                            <div key={log.id} className="w-full relative overflow-hidden transition-all duration-300 mb-1 hover:scale-[1.02]">
                              <div className="flex items-center">
                                {/* Main content area with progress bar - matches exercise layout */}
                                <div className="flex-1 relative overflow-hidden rounded-3xl mr-2 shadow-2xl border border-white/10 bg-black/70 backdrop-blur-xl">
                                  {/* Exercise content */}
                                  <div className="relative p-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <span className="w-6 h-6 rounded-full bg-gray-700 text-gray-300 text-xs flex items-center justify-center font-medium">
                                          {index + 1}
                                        </span>
                                        <div>
                                          <div className="font-medium text-white flex items-center space-x-2">
                                            <span>{log.count || log.duration} {workout.exercises?.unit}</span>
                                            {log.weight > 0 && (
                                              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                                                {log.weight} kg
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-medium text-white">
                                          {getEffectivePoints(log)}
                                        </span>
                                        <span className="font-thin text-white ml-1">pts</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Delete button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteWorkout(log.id)
                                  }}
                                  className="w-12 h-12 bg-black/70 backdrop-blur-xl border border-white/10 hover:bg-black/80 flex items-center justify-center text-gray-400 hover:text-gray-300 transition-all duration-200 shadow-lg flex-shrink-0" style={{ borderRadius: '50%' }}
                                  aria-label="Delete set"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
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
                  <div className="px-4">
                    <div className="text-center py-8 bg-black/30 backdrop-blur-sm rounded-3xl border-2 border-blue-500/50 shadow-2xl">
                      <p className="text-gray-400 font-medium">No workouts logged yet</p>
                      <p className="text-gray-500 text-sm mt-1">Select exercises below to get started</p>
                    </div>
                  </div>
                )}

                {/* Submit to Group Button - appears when target is reached */}
                {dailyProgress >= dailyTarget && dailyTarget > 0 && profile?.group_id && (
                  <div className="px-4 py-6 mt-6">
                    <button
                      onClick={handleSubmitToGroup}
                      disabled={hasPostedToday || checkingPostStatus || loading}
                      className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg ${hasPostedToday
                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                        : checkingPostStatus || loading
                          ? 'bg-gray-500 text-gray-300 cursor-wait'
                          : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white'
                        }`}
                    >
                      {checkingPostStatus
                        ? '⏳ Checking...'
                        : hasPostedToday
                          ? '✅ Already Posted Today'
                          : loading
                            ? '⏳ Posting...'
                            : '🎉 Submit to Group Chat'
                      }
                    </button>
                    <p className="text-center text-sm text-gray-400 mt-2">
                      {hasPostedToday
                        ? 'You can only post your workout once per day'
                        : 'Share your completed workout with the group!'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Favorites Section - Collapsible */}
              {favoriteExercises.length > 0 && (
                <div className="py-3">
                  <button
                    onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                    className="flex items-center justify-between w-full mb-3 px-4 hover:bg-gray-800/30 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <StarIconSolid className="w-6 h-6 text-yellow-400" />
                      <h4 className="text-2xl font-bold text-white">Favorites</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">({favoriteExercises.length})</span>
                      <ChevronDownIcon
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${favoritesExpanded ? 'rotate-180' : ''
                          }`}
                      />
                    </div>
                  </button>
                  {favoritesExpanded && (
                    <div className="space-y-0 mt-6">
                      {favoriteExercises.map((exercise) => renderFavoriteExerciseButton(exercise))}
                    </div>
                  )}
                </div>
              )}

              {/* All Main Exercises - Collapsible */}
              {allExercises.length > 0 && (
                <div className="py-3">
                  <button
                    onClick={() => setAllExercisesExpanded(!allExercisesExpanded)}
                    className="flex items-center justify-between w-full mb-3 px-4 hover:bg-gray-800/30 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <RectangleStackIcon className="w-6 h-6 text-blue-400" />
                      <h4 className="text-2xl font-bold text-white">All Exercises</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">({allExercises.length})</span>
                      <ChevronDownIcon
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${allExercisesExpanded ? 'rotate-180' : ''
                          }`}
                      />
                    </div>
                  </button>
                  {allExercisesExpanded && (
                    <div className="space-y-0 mt-6">
                      {allExercises.map((exercise) => renderExerciseButton(exercise))}
                    </div>
                  )}
                </div>
              )}

              {/* Recovery Exercises - Collapsible */}
              {recoveryExercises.length > 0 && (
                <div className="py-3">
                  <button
                    onClick={() => setRecoveryExpanded(!recoveryExpanded)}
                    className="flex items-center justify-between w-full mb-3 px-4 hover:bg-gray-800/30 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <FaceSmileIcon className="w-6 h-6 text-green-400" />
                      <h4 className="text-2xl font-bold text-white">Recovery</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">({recoveryExercises.length})</span>
                      <ChevronDownIcon
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${recoveryExpanded ? 'rotate-180' : ''
                          }`}
                      />
                    </div>
                  </button>
                  {recoveryExpanded && (
                    <div className="space-y-0 mt-6">
                      {recoveryExercises.map((exercise) => renderExerciseButton(exercise))}
                    </div>
                  )}
                </div>
              )}

              {/* Sports List - Collapsible */}
              {sportsExercises.length > 0 && (
                <div className="py-3">
                  <button
                    onClick={() => setSportsExpanded(!sportsExpanded)}
                    className="flex items-center justify-between w-full mb-3 px-4 hover:bg-gray-800/30 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <BoltIcon className="w-6 h-6 text-purple-400" />
                      <h4 className="text-2xl font-bold text-white">Sports</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">({sportsList.length})</span>
                      <ChevronDownIcon
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${sportsExpanded ? 'rotate-180' : ''
                          }`}
                      />
                    </div>
                  </button>
                  {sportsExpanded && (
                    <div className="space-y-0 mt-6">
                      {sportsList.map((sport) => renderSportButton(sport.name, sport.emoji))}
                    </div>
                  )}
                </div>
              )}

              {/* Week Mode Toggle - Bottom Section */}
              {isWeekModeAvailable(groupDaysSinceStart) && (
                <div className="py-6 px-4">
                  <div className="bg-black/30 backdrop-blur-sm p-4 rounded-lg">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">Week Mode</div>

                    {/* Horizontal Toggle */}
                    <div className="relative bg-gray-800 rounded-full p-1 w-full">
                      <div
                        className={`absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-in-out ${weekMode === 'sane' ? 'left-1 right-1/2' : 'left-1/2 right-1'
                          }`}
                        style={{
                          background: weekMode === 'sane'
                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)'
                            : 'linear-gradient(135deg, #475569 0%, #334155 50%, #1e293b 100%)'
                        }}
                      />

                      <div className="relative flex bg-gray-800/50 rounded-full p-1">
                        {/* Animated background slider */}
                        <div
                          className={`absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-out ${weekMode === 'sane'
                            ? 'left-1 bg-blue-600/30'
                            : 'left-[calc(50%+2px)] bg-red-600/30'
                            }`}
                        />

                        <button
                          onClick={async () => {
                            await setWeekModeWithSync('sane', user?.id)
                            // Recalculate target immediately with the new mode
                            await recalculateTargetWithMode('sane')
                          }}
                          className={`relative flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-full transition-all duration-300 ${weekMode === 'sane'
                            ? 'text-white scale-105'
                            : 'text-gray-400 hover:text-gray-300 scale-100'
                            }`}
                        >
                          <MoonIcon className="w-4 h-4" />
                          <span className="font-medium">Sane</span>
                        </button>

                        <button
                          onClick={async () => {
                            await setWeekModeWithSync('insane', user?.id)
                            // Recalculate target immediately with the new mode
                            await recalculateTargetWithMode('insane')
                          }}
                          className={`relative flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-full transition-all duration-300 ${weekMode === 'insane'
                            ? 'text-white scale-105'
                            : 'text-red-400 hover:text-red-300 scale-100'
                            }`}
                        >
                          <FireIcon className="w-4 h-4" />
                          <span className="font-medium">Insane</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Flexible Rest Day Button */}
              {hasFlexibleRestDay && (
                <div className="py-4 px-4">
                  <button
                    onClick={useFlexibleRestDay}
                    disabled={isUsingFlexibleRestDay}
                    className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 font-medium shadow-lg ${isUsingFlexibleRestDay ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
                    <CalendarDaysIcon className="w-5 h-5" />
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
            {/* Vibrant gradient background */}
            {/* Time-based gradient background */}
            <TimeGradient className="absolute inset-0 pointer-events-none" intensity={0.4} />

            {/* Header styled like clicked exercise button */}
            <div className="relative mb-2 px-4 pt-6 pb-2">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                  <h1 className="text-4xl font-black text-white tracking-tight leading-none">
                    {selectedWorkoutExercise.name}
                  </h1>
                  <div className="flex items-center gap-2">
                    {/* Gradient Pill for Points */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-full px-3 py-1 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all duration-300">
                      {(() => {
                        const currentPoints = getEffectiveWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)
                        const remainingPoints = Math.max(0, dailyTarget - (dailyProgress + currentPoints))

                        if (remainingPoints === 0 && dailyTarget > 0) {
                          return <span className="flex items-center gap-1">🎉 Done!</span>
                        }
                        return `${remainingPoints} left`
                      })()}
                    </div>
                    {/* PR Pill */}
                    <div className="bg-white/10 rounded-full px-3 py-1 text-xs font-medium text-white/70">
                      {personalRecord !== null ? (
                        <>PR: {selectedWorkoutExercise.unit === 'hour' ? `${Math.round(personalRecord * 60)}m` : personalRecord}</>
                      ) : (
                        <span className="opacity-50">No PR</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setWorkoutInputOpen(false)}
                  className="bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden flex">
                {(() => {
                  const currentPoints = getEffectiveWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)
                  const progressPercent = Math.min(100, (dailyProgress / Math.max(1, dailyTarget)) * 100)
                  const currentPercent = Math.min(100 - progressPercent, (currentPoints / Math.max(1, dailyTarget)) * 100)

                  return (
                    <>
                      {/* Already Done */}
                      <div
                        className="h-full bg-blue-500 transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                      {/* Current Input (Pulsing) */}
                      {currentPercent > 0 && (
                        <div
                          className="h-full bg-purple-500 animate-pulse transition-all duration-300 ease-out"
                          style={{ width: `${currentPercent}%` }}
                        />
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Stopwatch Section */}
            <div className="border-b border-white/10 backdrop-blur-sm px-3">
              <button
                onClick={() => setIsStopwatchExpanded(!isStopwatchExpanded)}
                className="w-full py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-5 h-5" style={{ color: userColor }} />
                  <span className="font-medium">Stopwatch</span>
                  <span className="font-sans font-bold" style={{ color: userColor }}>{formatTime(stopwatchTime)}</span>
                </div>
                {isStopwatchExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
              </button>

              {isStopwatchExpanded && (
                <div className="px-4 pb-4 space-y-6 animate-in slide-in-from-top-2 duration-200">
                  {/* Motivational message area - above timer */}
                  <div className="h-12 flex items-center justify-center relative">
                    {showMotivationalMessage && (
                      <div
                        className={`text-center transition-opacity duration-1000 ease-out ${showMotivationalMessage ? 'opacity-100' : 'opacity-0'
                          }`}
                        style={{
                          animation: showMotivationalMessage ? 'fadeInOut 4s ease-in-out' : 'none'
                        }}
                      >
                        <div className="text-sm font-bold text-white whitespace-nowrap" style={{ color: userColor }}>
                          {motivationalMessage}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Large time display */}
                  <div className="text-center">
                    <div className="font-sans text-6xl font-bold tracking-wider" style={{ color: userColor }}>
                      {formatTime(stopwatchTime)}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex justify-center gap-6 mt-8">
                    <div
                      className="w-20 h-20 rounded-full overflow-hidden backdrop-blur-xl border-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.6)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_12px_40px_rgba(0,0,0,0.8)] active:scale-[0.95] transition-all duration-200 relative"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${userColor}FF 0%, ${userColor}DD 50%, ${userColor}BB 100%)`,
                        borderColor: userColor + '60',
                        boxShadow: `inset 0 2px 0 rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${userColor}40`
                      }}
                    >
                      {/* Glass effect overlays */}
                      <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none" />

                      <button
                        onClick={isStopwatchRunning ? pauseStopwatch : startStopwatch}
                        className="absolute inset-0 w-full h-full bg-transparent border-0 rounded-full font-bold text-white text-sm flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors duration-200"
                      >
                        {isStopwatchRunning ? 'Pause' : 'Start'}
                      </button>
                    </div>

                    <div
                      className="w-20 h-20 rounded-full overflow-hidden backdrop-blur-xl border-2 border-zinc-500/60 shadow-[inset_0_2px_0_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.6)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_12px_40px_rgba(0,0,0,0.8)] active:scale-[0.95] transition-all duration-200 relative bg-gradient-to-br from-zinc-600/80 via-zinc-700/90 to-zinc-800/80 hover:from-zinc-500/80 hover:via-zinc-600/90 hover:to-zinc-700/80"
                      style={{
                        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)'
                      }}
                    >
                      {/* Glass effect overlays */}
                      <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none" />

                      <button
                        onClick={resetStopwatch}
                        className="absolute inset-0 w-full h-full bg-transparent border-0 rounded-full font-bold text-white text-sm flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors duration-200"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main scrollable content area - Dynamic content with inputs */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              {/* Interactive Counter Display */}
              {/* Interactive Counter & Quick Add Group */}
              <div className="rounded-3xl bg-zinc-900/50 border border-white/10 overflow-hidden backdrop-blur-md shadow-lg">
                {/* Number display with interactive click zones */}
                <div className="relative h-32 flex items-center justify-center border-b border-white/5 bg-gradient-to-b from-zinc-800/50 to-zinc-900/50">
                  {/* Background glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 blur-xl"></div>

                  {/* Left click zone (decrement) */}
                  <button
                    onClick={() => {
                      const stepAmount = getStepAmount()
                      setWorkoutCount(Math.max(0, parseFloat((workoutCount - stepAmount).toFixed(4))))
                    }}
                    className="absolute left-0 top-0 w-1/3 h-full z-10 flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-all duration-150 active:scale-95 touch-manipulation group/left"
                  >
                    <span className="opacity-0 group-hover/left:opacity-30 text-4xl font-bold transition-opacity duration-200">−</span>
                  </button>

                  {/* Right click zone (increment) */}
                  <button
                    onClick={() => {
                      const stepAmount = getStepAmount()
                      setWorkoutCount(parseFloat((workoutCount + stepAmount).toFixed(4)))
                    }}
                    className="absolute right-0 top-0 w-1/3 h-full z-10 flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-all duration-150 active:scale-95 touch-manipulation group/right"
                  >
                    <span className="opacity-0 group-hover/right:opacity-30 text-4xl font-bold transition-opacity duration-200">+</span>
                  </button>

                  {/* Number display */}
                  <div className="relative z-0 flex flex-col items-center justify-center">
                    <span
                      className="font-sans font-black tabular-nums text-white leading-none tracking-tight drop-shadow-2xl"
                      style={{
                        fontSize: '4.5rem',
                        textShadow: '0 0 30px rgba(255,255,255,0.1)'
                      }}
                    >
                      {(() => {
                        // Format display based on exercise unit
                        if (selectedWorkoutExercise && selectedWorkoutExercise.unit === 'hour') {
                          const minutes = Math.round(workoutCount * 60)
                          return (
                            <>
                              {minutes}
                              <span style={{ fontWeight: '300', fontSize: '0.5em' }}>m</span>
                            </>
                          )
                        }
                        return workoutCount
                      })()}
                    </span>
                    {/* Label inside number display */}
                    <span className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase mt-1">
                      {selectedWorkoutExercise.unit === 'hour' ? 'MINUTES' : 'REPS'}
                    </span>
                  </div>
                </div>

                {/* Quick Add Buttons - Connected below */}
                <div className="grid grid-cols-4 divide-x divide-white/5 bg-white/5">
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
                      onClick={button.action}
                      className="py-4 hover:bg-white/10 active:bg-white/20 transition-colors flex items-center justify-center"
                    >
                      <span className="text-lg font-bold text-white/80">{button.label}</span>
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

                            if (isSelected && !isLocked) {
                              setLockedWeights(prev => ({
                                ...prev,
                                [selectedWorkoutExercise.id]: button.value
                              }))
                            } else if (isLocked) {
                              setLockedWeights(prev => {
                                const newLocked = { ...prev }
                                delete newLocked[selectedWorkoutExercise.id]
                                return newLocked
                              })
                              setSelectedWeight(0)
                            } else {
                              setSelectedWeight(button.value)
                            }
                          }}
                          className={buttonClass}
                        >
                          {isLocked && (
                            <div className="absolute top-1 right-1">
                              <LockClosedIcon className="w-3 h-3 text-amber-500" />
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
            </div>

            {/* Bottom section with calculation and submit - Fixed at bottom */}
            <div className="flex-shrink-0 px-3 py-3 space-y-2 border-t border-white/10 backdrop-blur-sm">
              {/* Decreased/Regular toggle */}
              {selectedWorkoutExercise.supports_decreased && (
                <button
                  onClick={() => setIsDecreasedExercise(!isDecreasedExercise)}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl transition-all duration-200 backdrop-blur-sm relative overflow-hidden ${isDecreasedExercise
                    ? 'bg-gradient-to-b from-amber-600/40 via-amber-700/40 to-amber-800/40 border border-amber-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none'
                    : 'bg-gradient-to-b from-zinc-800/30 via-zinc-900/30 to-black/30 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:from-zinc-800/40 hover:via-zinc-900/40 hover:to-black/40 before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-white/3 before:to-transparent before:pointer-events-none'
                    }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all relative z-10 ${isDecreasedExercise
                    ? 'bg-amber-400 border-amber-400'
                    : 'border-white/30 bg-transparent'
                    }`}>
                    {isDecreasedExercise && <CheckIcon className="w-3 h-3 text-black" />}
                  </div>
                  <span className="font-medium relative z-10 text-center flex-1">
                    {isDecreasedExercise ? 'Decreased (1.5x points)' : 'Regular (1x points)'}
                  </span>
                </button>
              )}

              {/* Calculation breakdown - Inline */}
              <div className="text-center">
                <div className="text-xs text-white/40 font-sans">
                  {(() => {
                    // Calculate the weight multiplier
                    let weightMultiplier = 1
                    if (selectedWorkoutExercise.is_weighted && selectedWeight > 0) {
                      if (selectedWeight >= 10 && selectedWeight < 15) weightMultiplier = 1.5
                      else if (selectedWeight >= 15 && selectedWeight < 20) weightMultiplier = 2
                      else if (selectedWeight >= 20 && selectedWeight < 25) weightMultiplier = 2.5
                      else if (selectedWeight >= 25 && selectedWeight < 30) weightMultiplier = 3
                      else if (selectedWeight >= 30 && selectedWeight < 35) weightMultiplier = 3.5
                      else if (selectedWeight >= 35 && selectedWeight < 40) weightMultiplier = 4
                      else if (selectedWeight >= 40) weightMultiplier = 4.5
                    }

                    const rawPoints = calculateWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)
                    const effectivePoints = getEffectiveWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)

                    let calculation = ""
                    if (selectedWeight === 0) {
                      calculation = `${workoutCount} reps = ${rawPoints} pts`
                    } else {
                      calculation = `${workoutCount} × ${weightMultiplier}x = ${rawPoints} pts`
                    }

                    if (selectedWorkoutExercise.type === 'recovery' && effectivePoints < rawPoints) {
                      calculation += ` → ${effectivePoints} pts (25% cap)`
                    }

                    return calculation
                  })()}
                </div>
              </div>

              {/* Submit button - Always at bottom */}
              <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <button
                  onClick={async () => {
                    if (!user || !selectedWorkoutExercise || workoutCount <= 0 || loading) return

                    setLoading(true)
                    try {
                      const points = calculateWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)

                      const { error } = await supabase
                        .from('logs')
                        .insert({
                          user_id: user.id,
                          group_id: profile?.group_id,
                          exercise_id: selectedWorkoutExercise.id,
                          count: selectedWorkoutExercise.unit === 'rep' ? Math.floor(workoutCount) : 0,
                          weight: selectedWeight,
                          duration: selectedWorkoutExercise.is_time_based ? Math.floor(workoutCount) : 0,
                          points: points,
                          date: getLocalDateString(),
                          timestamp: Date.now(),
                          is_decreased: isDecreasedExercise
                        })

                      if (error) {
                        alert('Error logging workout: ' + error.message)
                      } else {
                        // Refresh data
                        if (onWorkoutAdded) {
                          onWorkoutAdded()
                        }
                        loadDailyProgress()
                        loadTodaysWorkouts()

                        // Check for automatic mode switching after exercise submission
                        await checkAutomaticModeSwitch()

                        // Reset and close
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
                  className={`w-full relative overflow-hidden shadow-xl hover:scale-[1.02] active:scale-95 py-6 rounded-3xl font-bold text-xl transition-all duration-200 touch-manipulation before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-t before:from-transparent before:to-white/10 before:pointer-events-none ${calculateWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise) > 0
                    ? (weekMode === 'insane' ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 border border-red-400/50 text-white shadow-red-500/50' : 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 border border-blue-400/50 text-white shadow-blue-500/50')
                    : 'border border-white/10 bg-black/70 backdrop-blur-xl text-white/40'
                    }`}
                >
                  <span className="relative z-10">
                    {(() => {
                      const rawPoints = calculateWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)
                      const effectivePoints = getEffectiveWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)

                      if (selectedWorkoutExercise.type === 'recovery' && effectivePoints < rawPoints) {
                        return `SUBMIT • ${effectivePoints}/${rawPoints} pts (25% cap)`
                      }

                      return `SUBMIT • ${effectivePoints} pts`
                    })()}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Sport Selection Modal */}
        {showSportSelection && (
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
                        <BoltIcon className="w-6 h-6 text-purple-400" />
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
                      <XMarkIcon className="w-6 h-6" />
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
                        <BoltIcon className="w-5 h-5 text-purple-400" />
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
        )}
      </div>
    </>
  )
}