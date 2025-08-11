'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createCumulativeGradient, getExerciseTypeGradient, getButtonGradient, getButtonShadow } from '@/utils/gradientUtils'
import TimeGradient from './TimeGradient'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useWeekMode } from '@/contexts/WeekModeContext'
import { calculateDailyTarget, getDaysSinceStart } from '@/utils/targetCalculation'
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
  const { weekMode, setWeekMode, isWeekModeAvailable } = useWeekMode()

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
  const [lockedWeight, setLockedWeight] = useState<number | null>(null)
  const [progressAnimated, setProgressAnimated] = useState(false)
  const [allExercisesExpanded, setAllExercisesExpanded] = useState(false)
  const [recoveryExpanded, setRecoveryExpanded] = useState(false)
  const [sportsExpanded, setSportsExpanded] = useState(false)
  const [favoritesExpanded, setFavoritesExpanded] = useState(false)
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [showSportSelection, setShowSportSelection] = useState(false)
  const [selectedSport, setSelectedSport] = useState('')
  const [selectedSportType, setSelectedSportType] = useState('')
  const [isStopwatchExpanded, setIsStopwatchExpanded] = useState(false)
  const [stopwatchTime, setStopwatchTime] = useState(0) // in milliseconds
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false)
  const [stopwatchStartTime, setStopwatchStartTime] = useState(0) // timestamp when started
  const [stopwatchPausedDuration, setStopwatchPausedDuration] = useState(0) // accumulated paused time

  useEffect(() => {
    if (isOpen && user && profile?.group_id) {
      console.log('Loading exercises for group:', profile.group_id)
      console.log('isAnimatedIn before:', isAnimatedIn)
      
      // Prevent background scrolling
      document.body.style.overflow = 'hidden'
      
      loadExercises()
      loadDailyProgress()
      loadTodaysWorkouts()
      loadFavoriteExercises()
      
      // Wait for modal to be fully mounted before starting animation
      setTimeout(() => {
        console.log('Setting isAnimatedIn to true')
        setIsAnimatedIn(true)
        
        // Delay icon transition until modal reaches the top (cherry on the cake!)
        setTimeout(() => {
          console.log('Starting icon transition - chat pushed out by X')
          setShowIconTransition(true)
        }, 400) // Start icon transition near end of modal slide-up
      }, 50) // Small delay to ensure DOM is ready
      
      // Trigger subtle progress animation after modal loads
      setTimeout(() => setProgressAnimated(true), 300)
    } else if (!isOpen) {
      console.log('Setting isAnimatedIn to false')
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

  // Format stopwatch time
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const centiseconds = Math.floor((ms % 1000) / 10)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
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
  }

  const handleClose = () => {
    console.log('Starting close animation')
    setIsClosing(true)
    
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
      console.log('Animation complete, closing modal')
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
    const { target, daysSinceStart } = await loadGroupDataAndCalculateTarget(newMode)
    setDailyTarget(target)
    setGroupDaysSinceStart(daysSinceStart)
    console.log(`Target recalculated for ${newMode} mode:`, target)
    
    // Note: loadDailyProgress() will be called automatically by useEffect when weekMode changes
  }

  const loadDailyProgress = async (targetOverride?: number) => {
    if (!user || !profile) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Load points and recovery days, optionally load target data if not provided
      const loadPromises = [
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
      const pointsResult = results[0]
      let targetData, groupSettings

      if (targetOverride) {
        targetData = { target: targetOverride }
        groupSettings = results[1]
      } else {
        targetData = results[1]
        groupSettings = results[2]
      }

      // Calculate regular and recovery points separately
      const regularPoints = pointsResult.data
        ?.filter(log => log.exercises?.type !== 'recovery')
        ?.reduce((sum, log) => sum + log.points, 0) || 0
      
      const recoveryPoints = pointsResult.data
        ?.filter(log => log.exercises?.type === 'recovery')
        ?.reduce((sum, log) => sum + log.points, 0) || 0

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
        console.log('Favorites table not available:', error.message)
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
          console.log('Cannot remove favorite - table not available:', error.message)
          return
        }

        setFavoriteExerciseIds(prev => prev.filter(id => id !== exerciseId))
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('user_favorite_exercises')
          .insert({ user_id: user.id, exercise_id: exerciseId })

        if (error) {
          console.log('Cannot add favorite - table not available:', error.message)
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
            className="w-12 h-12 bg-black/70 backdrop-blur-xl border border-white/10 hover:bg-black/80 flex items-center justify-center text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-300 transition-all duration-200 shadow-lg flex-shrink-0" style={{borderRadius: '50%'}}
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
              className="w-12 h-12 bg-black/70 backdrop-blur-xl border border-white/10 hover:bg-black/80 flex items-center justify-center transition-all duration-200 shadow-lg flex-shrink-0" style={{borderRadius: '50%'}}
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

  const renderSportButton = (sportName: string) => {
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
                  <BoltIcon className="w-6 h-6 text-purple-400" />
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
      console.log('Cannot load exercises - missing profile or user:', { profile: !!profile, user: !!user })
      return
    }

    try {
      setExercisesLoading(true)
      console.log('Loading exercises for group:', profile.group_id)
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

      console.log('Raw group exercises:', groupExercises)
      console.log('Group exercises count:', groupExercises?.length || 0)
      
      // Also get ALL exercises to compare
      const { data: allExercises } = await supabase
        .from('exercises')
        .select('*')
      
      console.log('Total exercises in database:', allExercises?.length || 0)
      console.log('All exercise names:', allExercises?.map(ex => ex.name) || [])

      const exerciseList = (groupExercises?.map(ge => ge.exercises).filter(Boolean) || [])
        .sort((a, b) => a.name.localeCompare(b.name))
      console.log('Exercises available for workout logging:', exerciseList.length)
      console.log('Available exercise names:', exerciseList.map(ex => ex.name))
      
      // Try to get today's workout counts (may fail if logs table doesn't exist)
      let todayLogs = []
      try {
        const { data } = await supabase
          .from('logs')
          .select('exercise_id, count, duration')
          .eq('user_id', user.id)
          .eq('date', today)
        todayLogs = data || []
      } catch (error) {
        console.log('Logs table not accessible, skipping progress tracking')
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
        console.log('Cannot load yesterday logs for recommendations')
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
      
      setExercises(exercisesWithProgress)
      console.log('Exercises loaded successfully:', exercisesWithProgress.length)
    } catch (error) {
      console.error('Error loading exercises:', error)
    } finally {
      setExercisesLoading(false)
    }
  }



  const handleSubmitToGroup = async () => {
    if (!user || !profile?.group_id || dailyProgress <= 0) return

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
        workout_date: new Date().toISOString().split('T')[0],
        completed_at: new Date().toISOString()
      }
      
      // Insert into chat as a special workout completion message
      // Store workout data as JSON in the message field
      const messageWithData = JSON.stringify({
        text: `🎯 Workout completed! ${totalPoints} points achieved`,
        workout_data: workoutData
      })
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          group_id: profile.group_id,
          message: messageWithData,
          message_type: 'workout_completion'
        })

      if (error) {
        console.error('Error submitting to group:', error)
        alert('Error submitting workout to group chat')
      } else {
        // Success feedback
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }
        
        // Show success message
        alert('🎉 Workout submitted to group chat!')
        
        // Optionally close modal after submission
        setTimeout(() => {
          onClose()
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
    setSelectedWeight(lockedWeight || 0) // Use locked weight if available
    setIsDecreasedExercise(false)
    setWorkoutInputOpen(true)
  }

  const handleWeightClick = (weight: number) => {
    if (selectedWeight === weight) {
      if (lockedWeight === weight) {
        // Third click: unlock and deselect
        setLockedWeight(null)
        setSelectedWeight(0)
      } else {
        // Second click: lock
        setLockedWeight(weight)
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
            count: selectedWorkoutExercise.unit === 'rep' ? workoutCount : 0,
            weight: selectedWeight,
            duration: selectedWorkoutExercise.is_time_based ? workoutCount : 0,
            points: points,
            date: new Date().toISOString().split('T')[0],
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




  // Predefined sports types with better variety
  const sportTypes = [
    'Running',
    'Basketball', 
    'Soccer/Football',
    'Tennis',
    'Swimming',
    'Cycling',
    'Volleyball',
    'Hiking',
    'Rock Climbing',
    'Surfing',
    'Mountain Biking',
    'Canoeing'
  ]

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

  console.log('Rendering modal with isAnimatedIn:', isAnimatedIn)

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
      `}</style>
      
      <div 
        className="fixed inset-0 bg-black flex flex-col transition-all duration-500 ease-out shadow-2xl"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
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
        {/* Header - Reduced height for PWA */}
        <div className="sticky top-0">
          <div className="flex items-center">
            {/* Progress Bar Section - Reduced height for PWA */}
            <div className={`flex-1 relative h-12 ${dailyProgress > 0 ? 'bg-gray-900' : 'bg-gray-900'} border-r border-gray-700 overflow-hidden`}>
              {/* Liquid gradient progress background with subtle animation */}
              <div 
                className="absolute left-0 top-0 bottom-0 transition-all duration-600 ease-out"
                style={{ 
                  width: progressAnimated ? `${Math.min(100, Math.max(0, progressPercentage))}%` : '75%',
                  background: createCumulativeGradient(todayLogs || [], dailyTarget),
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

            {/* Chat → X Button Transition */}
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
                
                {todaysWorkouts.length === 0 ? (
                  <div className="px-4">
                    <div className="text-center py-8 bg-black/30 backdrop-blur-sm rounded-3xl border-2 border-blue-500/50 shadow-2xl">
                      <p className="text-gray-400 font-medium">No workouts logged yet</p>
                      <p className="text-gray-500 text-sm mt-1">Select exercises below to get started</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-0">
                      {getGroupedWorkouts().map((workout) => {
                          const exerciseProgress = getExerciseProgress(workout.exercise_id)
                          return (
                            <div 
                              key={`${workout.exercise_id}-${workout.weight || 0}`} 
                              className="relative overflow-hidden cursor-pointer transition-all duration-300 mb-1 hover:scale-[1.02]"
                              onClick={() => handleWorkoutClick(workout)}
                            >
                              <div className="flex items-center gap-2">
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

                                {/* Delete button - matches header X button layout */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Delete all logs in this group
                                    workout.logs.forEach((log: any) => handleDeleteWorkout(log.id))
                                  }}
                                  className="w-12 h-12 bg-black/70 backdrop-blur-xl border border-white/10 hover:bg-red-600 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 shadow-lg flex-shrink-0" style={{borderRadius: '50%'}}
                                  aria-label="Delete workout"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                    </div>

                    {/* Submit to Group Button - appears when target is reached */}
                    {dailyProgress >= dailyTarget && dailyTarget > 0 && profile?.group_id && (
                      <div className="px-4 py-6 mt-6">
                        <button
                          onClick={handleSubmitToGroup}
                          className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white py-4 px-6 rounded-lg font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                        >
                          🎉 Submit to Group Chat
                        </button>
                        <p className="text-center text-sm text-gray-400 mt-2">
                          Share your completed workout with the group!
                        </p>
                      </div>
                    )}
                  </>
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
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                          favoritesExpanded ? 'rotate-180' : ''
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
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                          allExercisesExpanded ? 'rotate-180' : ''
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
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                          recoveryExpanded ? 'rotate-180' : ''
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
                      <span className="text-sm text-gray-400">({sportTypes.length})</span>
                      <ChevronDownIcon 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                          sportsExpanded ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                  </button>
                  {sportsExpanded && (
                    <div className="space-y-0 mt-6">
                      {sportTypes.map((sportName) => renderSportButton(sportName))}
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
                        className={`absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-in-out ${
                          weekMode === 'sane' ? 'left-1 right-1/2' : 'left-1/2 right-1'
                        }`}
                        style={{
                          background: weekMode === 'sane' 
                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)'
                            : 'linear-gradient(135deg, #475569 0%, #334155 50%, #1e293b 100%)'
                        }}
                      />
                      
                      <div className="relative flex">
                        <button
                          onClick={async () => {
                            setWeekMode('sane')
                            // Recalculate target immediately with the new mode
                            await recalculateTargetWithMode('sane')
                          }}
                          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-full transition-colors ${
                            weekMode === 'sane' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                          }`}
                        >
                          <MoonIcon className="w-4 h-4" />
                          <span className="font-medium">Sane</span>
                        </button>
                        
                        <button
                          onClick={async () => {
                            setWeekMode('insane')
                            // Recalculate target immediately with the new mode
                            await recalculateTargetWithMode('insane')
                          }}
                          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-full transition-colors ${
                            weekMode === 'insane' ? 'text-white bg-red-600/30' : 'text-red-400 hover:text-red-300'
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
            </>
          )}


        </div>

        {/* Workout Input Overlay - Fixed Layout */}
        {workoutInputOpen && selectedWorkoutExercise && (
          <div className="fixed inset-0 bg-black text-white z-[110] flex flex-col animate-in zoom-in-95 duration-300 ease-out" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-3">
              <div className="absolute inset-0" style={{ 
                backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.05) 0%, transparent 25%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 25%)',
                backgroundSize: '100px 100px'
              }}></div>
            </div>

            {/* Header styled like clicked exercise button */}
            <div className="relative overflow-hidden transition-all duration-300 mb-4 px-4 pt-4">
              {/* Compact exercise button with integrated X */}
              <div className="relative overflow-hidden rounded-3xl shadow-xl border border-white/10 bg-black/70 backdrop-blur-xl h-14">
                  {/* Liquid gradient progress bar background - matches exercise button */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out"
                    style={{ 
                      width: '100%',
                      background: (() => {
                        const effectivePoints = getEffectiveWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)
                        const progressPercent = Math.min(100, (effectivePoints / Math.max(1, dailyTarget)) * 100)
                        const color = getCategoryColor(selectedWorkoutExercise.type, selectedWorkoutExercise.id)
                        
                        return `linear-gradient(to right, 
                          ${color} 0%, 
                          ${color} ${Math.max(0, progressPercent - 5)}%, 
                          ${color}dd ${progressPercent}%, 
                          #000000 ${Math.min(100, progressPercent + 3)}%)`
                      })()
                    }}
                  />
                  
                {/* Header content with integrated X button */}
                <div className="w-full px-4 py-2 relative flex items-center h-full">
                  <div className="flex items-center space-x-3 flex-1">
                    {getExerciseIcon(selectedWorkoutExercise)}
                    <div className="font-medium text-white text-left">{selectedWorkoutExercise.name}</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">{calculateWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)} pts</div>
                    </div>
                    {/* Integrated X button */}
                    <button 
                      onClick={() => setWorkoutInputOpen(false)}
                      className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 flex items-center justify-center"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stopwatch Section */}
            <div className="border-b border-white/10 backdrop-blur-sm px-4">
              <button
                onClick={() => setIsStopwatchExpanded(!isStopwatchExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-5 h-5 text-cyan-400" />
                  <span className="font-medium">Stopwatch</span>
                  <span className="font-sans text-cyan-400">{formatTime(stopwatchTime)}</span>
                </div>
                {isStopwatchExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
              </button>
              
              {isStopwatchExpanded && (
                <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  {/* Large time display */}
                  <div className="text-center">
                    <div className="font-sans text-6xl font-bold text-cyan-400 tracking-wider">
                      {formatTime(stopwatchTime)}
                    </div>
                  </div>
                  
                  {/* Controls */}
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={isStopwatchRunning ? pauseStopwatch : startStopwatch}
                      className={`relative overflow-hidden bg-gradient-to-b border shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_12px_rgba(0,0,0,0.4)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_4px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all duration-150 touch-manipulation before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-white/4 before:to-transparent before:pointer-events-none px-6 py-3 rounded-xl flex items-center gap-2 ${
                        isStopwatchRunning 
                          ? 'from-orange-600 via-orange-700 to-orange-800 border-orange-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(234,88,12,0.3)]' 
                          : 'from-green-600 via-green-700 to-green-800 border-green-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(34,197,94,0.3)]'
                      }`}
                    >
                      {isStopwatchRunning ? '⏸️' : '▶️'}
                      {isStopwatchRunning ? 'Pause' : 'Start'}
                    </button>
                    
                    <button
                      onClick={resetStopwatch}
                      className="relative overflow-hidden bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 border border-zinc-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_12px_rgba(0,0,0,0.4)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_4px_rgba(0,0,0,0.2)] hover:from-zinc-600 hover:via-zinc-700 hover:to-zinc-800 active:from-zinc-800 active:via-zinc-900 active:to-black active:scale-[0.98] transition-all duration-150 touch-manipulation before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-white/4 before:to-transparent before:pointer-events-none px-6 py-3 rounded-xl flex items-center gap-2"
                    >
                      🔄 Reset
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto">
              {/* Interactive Counter Display */}
              <div className="relative flex items-center justify-center h-32 group">
                {/* Background glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-transparent to-purple-500/8 rounded-3xl blur-xl"></div>
                
                {/* Number display with interactive click zones */}
                <div className="relative w-full h-full flex items-center justify-center rounded-3xl bg-gradient-to-b from-zinc-800/60 to-zinc-900/60 backdrop-blur-sm border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">
                  {/* Left click zone (decrement) */}
                  <button
                    onClick={() => setWorkoutCount(Math.max(0, workoutCount - 1))}
                    className="absolute left-0 top-0 w-1/3 h-full z-10 flex items-center justify-center hover:bg-white/8 active:bg-white/12 transition-all duration-150 active:scale-95 touch-manipulation"
                  >
                    <span className="opacity-25 hover:opacity-50 active:opacity-70 text-3xl font-bold transition-opacity duration-200">−</span>
                  </button>
                  
                  {/* Right click zone (increment) */}
                  <button
                    onClick={() => setWorkoutCount(workoutCount + 1)}
                    className="absolute right-0 top-0 w-1/3 h-full z-10 flex items-center justify-center hover:bg-white/8 active:bg-white/12 transition-all duration-150 active:scale-95 touch-manipulation"
                  >
                    <span className="opacity-25 hover:opacity-50 active:opacity-70 text-3xl font-bold transition-opacity duration-200">+</span>
                  </button>
                  
                  {/* Number display */}
                  <div className="relative z-0 w-full h-full flex items-center justify-center">
                    <span 
                      className="font-sans font-black tabular-nums text-white leading-none tracking-tight drop-shadow-2xl" 
                      style={{ 
                        fontSize: '5rem',
                        textShadow: '0 0 40px rgba(255,255,255,0.2)' 
                      }}
                    >
                      {workoutCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-4 gap-1">
                {[
                  { action: () => setWorkoutCount(Math.max(0, workoutCount - 10)), label: '-10' },
                  { action: () => setWorkoutCount(Math.max(0, workoutCount - 5)), label: '-5' },
                  { action: () => setWorkoutCount(workoutCount + 5), label: '+5' },
                  { action: () => setWorkoutCount(workoutCount + 10), label: '+10' }
                ].map((button, index) => (
                  <button
                    key={index}
                    onClick={button.action}
                    className="relative overflow-hidden bg-gradient-to-b from-zinc-800/40 to-zinc-900/40 backdrop-blur-sm border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-gradient-to-b hover:from-zinc-800/60 hover:to-zinc-900/60 hover:border-white/15 active:bg-gradient-to-b active:from-zinc-900/60 active:to-black/60 active:scale-[0.96] transition-all duration-150 touch-manipulation aspect-square rounded-2xl flex items-center justify-center"
                  >
                    <span className="text-2xl font-bold">{button.label}</span>
                  </button>
                ))}
              </div>

              {/* Weight Selector Section - only show for weighted exercises */}
              {selectedWorkoutExercise.is_weighted && (
                <div className="space-y-2">
                  <div className="text-center">
                    <div className="text-sm text-white/60 font-medium uppercase tracking-wider">Weight Selection (kg)</div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: 'body', value: 0, multiplier: 1.0 },
                      { label: '10', value: 10, multiplier: 1.5 },
                      { label: '15', value: 15, multiplier: 2.0 },
                      { label: '20', value: 20, multiplier: 2.5 },
                      { label: '25', value: 25, multiplier: 3.0 },
                      { label: '30', value: 30, multiplier: 3.5 },
                      { label: '35', value: 35, multiplier: 4.0 },
                      { label: '40', value: 40, multiplier: 4.5 }
                    ].map((button, index) => {
                    const isSelected = selectedWeight === button.value
                    const isLocked = lockedWeight === button.value
                    
                    let buttonStyle = ''
                    if (isLocked) {
                      buttonStyle = 'relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 border-2 border-amber-300 shadow-[inset_0_2px_0_rgba(255,255,255,0.3),inset_0_0_25px_rgba(245,158,11,0.3),0_0_25px_rgba(245,158,11,0.6)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.35),inset_0_0_30px_rgba(245,158,11,0.35),0_0_30px_rgba(245,158,11,0.7)] active:shadow-[inset_0_3px_0_rgba(255,255,255,0.4),inset_0_0_35px_rgba(245,158,11,0.4),0_0_20px_rgba(245,158,11,0.5)] hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 active:from-amber-500 active:via-amber-600 active:to-amber-700 active:scale-[0.95] transition-all duration-200 touch-manipulation before:absolute before:inset-[2px] before:rounded-[inherit] before:bg-gradient-to-br before:from-white/20 before:via-white/8 before:to-transparent before:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-gradient-to-t after:from-amber-600/20 after:to-transparent after:pointer-events-none'
                    } else if (isSelected) {
                      buttonStyle = 'relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 border-2 border-indigo-400 shadow-[inset_0_2px_0_rgba(255,255,255,0.2),inset_0_0_20px_rgba(99,102,241,0.2),0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.25),inset_0_0_25px_rgba(99,102,241,0.25),0_0_25px_rgba(99,102,241,0.5)] active:shadow-[inset_0_3px_0_rgba(255,255,255,0.3),inset_0_0_30px_rgba(99,102,241,0.3),0_0_15px_rgba(99,102,241,0.3)] hover:from-indigo-400 hover:via-purple-500 hover:to-violet-600 active:from-indigo-600 active:via-purple-700 active:to-violet-800 active:scale-[0.95] transition-all duration-200 touch-manipulation before:absolute before:inset-[2px] before:rounded-[inherit] before:bg-gradient-to-br before:from-white/15 before:via-white/5 before:to-transparent before:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-gradient-to-t after:from-indigo-600/20 after:to-transparent after:pointer-events-none'
                    } else {
                      buttonStyle = 'relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 border-2 border-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.3)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_1px_4px_rgba(0,0,0,0.1)] hover:from-slate-500 hover:via-slate-600 hover:to-slate-700 active:from-slate-700 active:via-slate-800 active:to-slate-900 active:scale-[0.95] transition-all duration-150 touch-manipulation before:absolute before:inset-[2px] before:rounded-[inherit] before:bg-gradient-to-br before:from-white/3 before:to-transparent before:pointer-events-none'
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (isSelected && !isLocked) {
                            setLockedWeight(button.value)
                          } else if (isLocked) {
                            setLockedWeight(null)
                            setSelectedWeight(0)
                          } else {
                            setSelectedWeight(button.value)
                          }
                        }}
                        className={`${buttonStyle} aspect-square rounded-2xl relative`}
                      >
                        {isLocked && (
                          <div className="absolute top-2 right-2 z-20">
                            <LockClosedIcon className="w-4 h-4 text-amber-900 drop-shadow-sm" />
                          </div>
                        )}
                        
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`relative z-10 font-bold ${button.label === 'body' ? 'text-xl' : 'text-3xl'} ${isLocked ? 'text-amber-900' : ''}`}>
                            {button.label}
                          </span>
                        </div>
                        
                        <span className={`absolute bottom-3 left-1/2 transform -translate-x-1/2 text-xs z-10 ${isLocked ? 'text-amber-900/60' : 'text-white/30'}`}>
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
            <div className="flex-shrink-0 p-4 space-y-2 border-t border-white/10 backdrop-blur-sm">
              {/* Decreased/Regular toggle */}
              {selectedWorkoutExercise.supports_decreased && (
                <button
                  onClick={() => setIsDecreasedExercise(!isDecreasedExercise)}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl transition-all duration-200 backdrop-blur-sm relative overflow-hidden ${
                    isDecreasedExercise 
                      ? 'bg-gradient-to-b from-amber-600/40 via-amber-700/40 to-amber-800/40 border border-amber-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none' 
                      : 'bg-gradient-to-b from-zinc-800/30 via-zinc-900/30 to-black/30 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:from-zinc-800/40 hover:via-zinc-900/40 hover:to-black/40 before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-white/3 before:to-transparent before:pointer-events-none'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all relative z-10 ${
                    isDecreasedExercise 
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
                        count: selectedWorkoutExercise.unit === 'rep' ? workoutCount : 0,
                        weight: selectedWeight,
                        duration: selectedWorkoutExercise.is_time_based ? workoutCount : 0,
                        points: points,
                        date: new Date().toISOString().split('T')[0],
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
                      
                      // Reset and close
                      setWorkoutInputOpen(false)
                      setWorkoutCount(0)
                      setSelectedWeight(lockedWeight || 0)
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
                className={`w-full relative overflow-hidden shadow-2xl hover:scale-105 active:scale-95 py-6 rounded-3xl font-black text-xl transition-all duration-200 touch-manipulation ${
                  calculateWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise) > 0
                    ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-700 border border-indigo-400 text-white'
                    : 'border border-white/10 bg-black/70 backdrop-blur-xl text-white/60'
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
                        setWorkoutCount(1)
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