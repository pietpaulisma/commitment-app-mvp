'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createCumulativeGradient, getExerciseTypeGradient, getButtonGradient, getButtonShadow } from '@/utils/gradientUtils'
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
  ChatBubbleLeftRightIcon
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
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithProgress | null>(null)
  const [quantity, setQuantity] = useState('0')
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(false)

  // Helper function to get user's personal color or default
  const getUserColor = () => {
    return profile?.personal_color || '#f97316' // Default to orange
  }

  // Helper function to get darker version of user's color for hover states
  const getUserColorHover = () => {
    const color = getUserColor()
    // Convert hex to RGB and darken it
    const hex = color.replace('#', '')
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 20)
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 20)
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 20)
    return `rgb(${r}, ${g}, ${b})`
  }
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
  const [favoritesExpanded, setFavoritesExpanded] = useState(true)
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [showSportSelection, setShowSportSelection] = useState(false)
  const [selectedSport, setSelectedSport] = useState('')
  const [selectedSportType, setSelectedSportType] = useState('')
  const [selectedIntensity, setSelectedIntensity] = useState('medium')

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
  }, [isOpen, user, profile?.group_id])

  // Cleanup effect to ensure body scroll is restored on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

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
  }

  const loadDailyProgress = async () => {
    if (!user || !profile) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Load points and target data in parallel
      const [pointsResult, targetData] = await Promise.all([
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
        loadGroupDataAndCalculateTarget()
      ])

      const todayPoints = pointsResult.data?.reduce((sum, log) => sum + log.points, 0) || 0
      const recoveryPoints = pointsResult.data
        ?.filter(log => log.exercises?.type === 'recovery')
        ?.reduce((sum, log) => sum + log.points, 0) || 0

      setDailyProgress(todayPoints)
      setDailyTarget(targetData.target)
      setGroupDaysSinceStart(targetData.daysSinceStart)
      setRecoveryProgress(recoveryPoints)
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
      setWorkoutCount('')
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
        className={`w-full relative border-b border-white/5 overflow-hidden transition-all duration-300 rounded-3xl mb-4 shadow-2xl hover:shadow-xl hover:scale-[1.02] ${
          exercise.todayCount > 0
            ? 'bg-black/40 backdrop-blur-sm hover:bg-black/60'
            : 'bg-black/30 backdrop-blur-sm hover:bg-black/50'
        }`}
      >
        <div className="flex">
          {/* Main content area with progress bar - matches header layout */}
          <div className="flex-1 relative overflow-hidden">
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
              className="w-full p-3 hover:scale-105 transition-all duration-300 relative rounded-lg hover:shadow-lg"
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
                    /{exercise.unit.replace('minute', 'min').replace('hour', 'h')}
                  </span>
                </div>
              </div>
            </button>
          </div>
          
          {/* Reorder icon for favorites - matches header X button layout */}
          <button
            className="w-16 flex items-center justify-center text-gray-500 cursor-grab active:cursor-grabbing hover:text-gray-300 transition-all duration-200 rounded-r-lg"
            aria-label="Reorder favorite"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  const getExerciseProgress = (exerciseId: string) => {
    const exercisePoints = todaysWorkouts
      .filter(workout => workout.exercise_id === exerciseId)
      .reduce((sum, workout) => sum + workout.points, 0)
    
    // Calculate percentage of daily target this exercise represents
    const progressPercentage = dailyTarget > 0 ? Math.min(100, (exercisePoints / dailyTarget) * 100) : 0
    
    return {
      points: exercisePoints,
      percentage: progressPercentage
    }
  }

  const renderExerciseButton = (exercise: ExerciseWithProgress, showFavorite: boolean = true) => {
    const isFavorite = favoriteExerciseIds.includes(exercise.id)
    const exerciseProgress = getExerciseProgress(exercise.id)
    
    return (
      <div
        key={exercise.id}
        className={`w-full relative border-b border-white/5 overflow-hidden transition-all duration-300 rounded-3xl mb-4 shadow-2xl hover:shadow-xl hover:scale-[1.02] ${
          exercise.todayCount > 0
            ? 'bg-black/40 backdrop-blur-sm hover:bg-black/60'
            : 'bg-black/30 backdrop-blur-sm hover:bg-black/50'
        }`}
      >
        <div className="flex">
          {/* Main content area with progress bar - matches header layout */}
          <div className="flex-1 relative overflow-hidden">
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
              className="w-full p-3 hover:scale-105 transition-all duration-300 relative rounded-lg hover:shadow-lg"
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
                    /{exercise.unit.replace('minute', 'min').replace('hour', 'h')}
                  </span>
                </div>
              </div>
            </button>
          </div>
          
          {/* Right icon button - matches header X button layout */}
          {showFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(exercise.id)
              }}
              className="w-16 flex items-center justify-center hover:bg-gray-800/50 transition-colors duration-200"
            >
              {isFavorite ? (
                <StarIconSolid className="w-5 h-5 text-yellow-400" />
              ) : (
                <StarIcon className="w-5 h-5 text-gray-500 hover:text-yellow-400" />
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
        <div className="flex">
          {/* Main content area with progress bar - matches header layout */}
          <div className="flex-1 relative overflow-hidden">
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
      else if (weight >= 30) weightMultiplier = 3.5
      
      points *= weightMultiplier
    }
    
    // Apply decreased exercise bonus (1.5x points)
    if (isDecreased && exercise.supports_decreased) {
      points *= 1.5
    }
    
    return Math.round(points * 100) / 100 // Round to 2 decimal places
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

      const exerciseList = groupExercises?.map(ge => ge.exercises).filter(Boolean) || []
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

  const calculatePoints = () => {
    if (!selectedExercise || !quantity) return 0
    
    const quantityValue = parseFloat(quantity) || 0
    const weightValue = parseFloat(weight) || 0
    
    let points = quantityValue * selectedExercise.points_per_unit
    
    if (selectedExercise.is_weighted && weightValue > 0) {
      points *= (weightValue / 100 + 1)
    }
    
    return Math.round(points)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedExercise || !quantity || !user) return

    setLoading(true)
    try {
      const points = calculatePoints()
      const weightValue = parseFloat(weight) || 0

      const { error } = await supabase
        .from('logs')
        .insert({
          user_id: user.id,
          group_id: profile?.group_id,
          exercise_id: selectedExercise.id,
          count: selectedExercise.unit === 'rep' ? parseFloat(quantity) : 0,
          weight: weightValue,
          duration: selectedExercise.is_time_based ? parseFloat(quantity) : 0,
          points: points,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now()
        })

      if (error) {
        alert('Error logging workout: ' + error.message)
      } else {
        // Reset form
        setQuantity('0')
        setWeight('')
        setSelectedExercise(null)
        
        // Call callback to refresh data
        if (onWorkoutAdded) {
          onWorkoutAdded()
        }
        
        // Refresh daily progress
        loadDailyProgress()
        loadTodaysWorkouts()
        
        // Close modal
        onClose()
        
        // Haptic feedback on mobile
        if (navigator.vibrate) {
          navigator.vibrate(100)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while logging your workout.')
    } finally {
      setLoading(false)
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
    setWorkoutCount(defaultQuantity || 0)
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
  const recoveryPercentage = dailyTarget > 0 ? Math.min(25, (recoveryProgress / dailyTarget) * 100) : 0
  const regularPercentage = Math.max(0, progressPercentage - recoveryPercentage)

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
          ring-color: ${getUserColor()};
        }
        .btn-hover:hover {
          background-color: ${getUserColorHover()} !important;
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
        {/* Header - EXACT COPY from Dashboard LOG WORKOUT Button */}
        <div className="sticky top-0">
          <div className="flex">
            {/* Progress Bar Section - EXACT copy from RectangularNavigation.tsx line 129-161 */}
            <div className={`flex-1 relative h-16 ${dailyProgress > 0 ? 'bg-gray-900' : 'bg-gray-900'} border-r border-gray-700 overflow-hidden`}>
              {/* Liquid gradient progress background with subtle animation */}
              <div 
                className="absolute left-0 top-0 bottom-0 transition-all duration-600 ease-out"
                style={{ 
                  width: progressAnimated ? '100%' : '75%',
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
              <div className="pb-3 border-b border-white/10">
                
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
                              className="relative bg-black/30 backdrop-blur-sm border-b border-white/5 overflow-hidden cursor-pointer hover:bg-black/50 transition-all duration-300 rounded-3xl mb-4 shadow-2xl hover:shadow-xl hover:scale-[1.02]"
                              onClick={() => handleWorkoutClick(workout)}
                            >
                              <div className="flex">
                                {/* Main content area with progress bar - matches header layout */}
                                <div className="flex-1 relative overflow-hidden">
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
                                        <span className="font-medium text-white">
                                          {workout.totalPoints % 1 === 0 
                                            ? workout.totalPoints 
                                            : workout.totalPoints.toFixed(2)
                                          }
                                        </span>
                                        <span className="font-thin text-white ml-1">pts</span>
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
                                  className="w-16 flex items-center justify-center hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors duration-200"
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
                      <div className="px-4 py-6 mt-4 border-t border-white/10">
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
                    <div className="space-y-0 border-t border-white/10">
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
                    <div className="space-y-0 border-t border-white/10">
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
                    <div className="space-y-0 border-t border-white/10">
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
                    <div className="space-y-0 border-t border-white/10">
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
                            weekMode === 'insane' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
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
              
              {/* Exercise Input Form - Completely Redesigned */}
              {selectedExercise && (
                <div className="bg-black border-t border-white/10">
                  {/* Points Header with Gradient */}
                  <div className="relative overflow-hidden">
                    {/* Gradient Background */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}20 50%, transparent 100%)`
                      }}
                    />
                    <div className="relative p-6">
                      <div className="text-center">
                        <div className="flex justify-center items-center space-x-3 mb-3">
                          {getExerciseIcon(selectedExercise)}
                          <h3 className="text-2xl font-bold text-white">{selectedExercise.name}</h3>
                        </div>
                        <div className="text-6xl font-black mb-2" style={{ color: getCategoryColor(selectedExercise.type, selectedExercise.id) }}>
                          {calculatePoints()}
                        </div>
                        <div className="text-lg text-white font-medium">
                          POINTS EARNED
                        </div>
                        <div className="text-sm text-gray-300">
                          {selectedExercise.points_per_unit} pts per {selectedExercise.unit}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Intensity Selector for Sport */}
                  {selectedExercise.id.startsWith('sport_') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Intensity Level</label>
                      <div className="space-y-2">
                        {[
                          { id: 'light', name: 'Light', points: 125, emoji: '🚶' },
                          { id: 'medium', name: 'Medium', points: 250, emoji: '🏃' },
                          { id: 'intense', name: 'Intense', points: 375, emoji: '💨' }
                        ].map((intensity) => (
                          <button
                            key={intensity.id}
                            type="button"
                            onClick={() => {
                              setSelectedIntensity(intensity.id)
                              // Update the exercise with new points
                              const updatedExercise = {
                                ...selectedExercise,
                                points_per_unit: intensity.points,
                                name: selectedExercise.name.replace(/\(.*\)/, `(${intensity.name})`)
                              }
                              setSelectedExercise(updatedExercise)
                            }}
                            className={`w-full p-3 text-left transition-colors border ${
                              selectedIntensity === intensity.id
                                ? 'bg-purple-900/50 border-blue-500 text-blue-300'
                                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">{intensity.emoji}</span>
                                <span className="font-medium">{intensity.name}</span>
                              </div>
                              <span className="text-sm font-bold">
                                {intensity.points} pts/min
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main Counter Section with Gradient */}
                  <div className="p-6">
                    <div className="relative overflow-hidden rounded-2xl mb-6">
                      {/* Gradient Background */}
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}30 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}10 100%)`
                        }}
                      />
                      
                      <div className="relative p-8">
                        <div className="text-center mb-8">
                          <div className="text-8xl font-black text-white mb-4" style={{ textShadow: '0 0 30px rgba(255,255,255,0.2)' }}>
                            {quantity || '0'}
                          </div>
                          <div className="text-xl text-white font-medium uppercase tracking-wider">
                            {selectedExercise.unit}{selectedExercise.unit !== 'rep' && 's'}
                          </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center justify-center gap-6 mb-8">
                          <button
                            type="button"
                            onClick={() => setQuantity(Math.max(0, parseFloat(quantity || '0') - (selectedExercise.is_time_based ? 5 : 1)).toString())}
                            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold transition-all duration-300 hover:scale-110 active:scale-95"
                            style={{
                              background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40 100%)`,
                              boxShadow: `0 10px 30px ${getCategoryColor(selectedExercise.type, selectedExercise.id)}30`
                            }}
                          >
                            −
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setQuantity((parseFloat(quantity || '0') + (selectedExercise.is_time_based ? 5 : 1)).toString())}
                            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold transition-all duration-300 hover:scale-110 active:scale-95"
                            style={{
                              background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}80 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60 100%)`,
                              boxShadow: `0 10px 30px ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40`
                            }}
                          >
                            +
                          </button>
                        </div>

                        {/* Quick Add Buttons */}
                        <div className="flex justify-center gap-3">
                          {selectedExercise.is_time_based ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setQuantity((parseFloat(quantity || '0') + 15).toString())}
                                className="px-6 py-3 rounded-full text-white font-bold transition-all duration-300 hover:scale-105"
                                style={{
                                  background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}20 100%)`,
                                  border: `2px solid ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60`
                                }}
                              >
                                +15min
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuantity((parseFloat(quantity || '0') + 30).toString())}
                                className="px-6 py-3 rounded-full text-white font-bold transition-all duration-300 hover:scale-105"
                                style={{
                                  background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}20 100%)`,
                                  border: `2px solid ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60`
                                }}
                              >
                                +30min
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setQuantity((parseFloat(quantity || '0') + 5).toString())}
                                className="px-6 py-3 rounded-full text-white font-bold transition-all duration-300 hover:scale-105"
                                style={{
                                  background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}20 100%)`,
                                  border: `2px solid ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60`
                                }}
                              >
                                +5
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuantity((parseFloat(quantity || '0') + 10).toString())}
                                className="px-6 py-3 rounded-full text-white font-bold transition-all duration-300 hover:scale-105"
                                style={{
                                  background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}20 100%)`,
                                  border: `2px solid ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60`
                                }}
                              >
                                +10
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weight & Modifiers Section */}
                  {(selectedExercise.is_weighted || selectedExercise.supports_decreased) && (
                    <div className="px-6 pb-6">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Weight Selection */}
                        {selectedExercise.is_weighted && (
                          <div className="relative overflow-hidden rounded-xl">
                            <div 
                              className="absolute inset-0 opacity-30"
                              style={{
                                background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}20 0%, transparent 100%)`
                              }}
                            />
                            <div className="relative p-4">
                              <div className="text-center text-white font-medium mb-3">Weight</div>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setWeight('0')}
                                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                                    weight === '0' || weight === '' 
                                      ? 'text-white shadow-lg' 
                                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                                  }`}
                                  style={weight === '0' || weight === '' ? {
                                    background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}80 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60 100%)`,
                                    boxShadow: `0 4px 15px ${getCategoryColor(selectedExercise.type, selectedExercise.id)}30`
                                  } : {}}
                                >
                                  Body
                                </button>
                                {[10, 15, 20, 25].map((w) => (
                                  <button
                                    key={w}
                                    type="button"
                                    onClick={() => setWeight(w.toString())}
                                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                                      weight === w.toString() 
                                        ? 'text-white shadow-lg' 
                                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                                    }`}
                                    style={weight === w.toString() ? {
                                      background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}80 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60 100%)`,
                                      boxShadow: `0 4px 15px ${getCategoryColor(selectedExercise.type, selectedExercise.id)}30`
                                    } : {}}
                                  >
                                    {w}kg
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Decreased Exercise Option */}
                        {selectedExercise.supports_decreased && (
                          <div className="relative overflow-hidden rounded-xl">
                            <div 
                              className="absolute inset-0 opacity-30"
                              style={{
                                background: `linear-gradient(135deg, #f59e0b20 0%, transparent 100%)`
                              }}
                            />
                            <div className="relative p-4">
                              <div className="text-center text-white font-medium mb-3">Difficulty</div>
                              <div className="space-y-2">
                                <button
                                  type="button"
                                  onClick={() => setWeight('')} // Using weight state for this toggle
                                  className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                                    weight !== 'decreased' 
                                      ? 'text-white shadow-lg' 
                                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                                  }`}
                                  style={weight !== 'decreased' ? {
                                    background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}80 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60 100%)`,
                                    boxShadow: `0 4px 15px ${getCategoryColor(selectedExercise.type, selectedExercise.id)}30`
                                  } : {}}
                                >
                                  Regular
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWeight('decreased')}
                                  className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                                    weight === 'decreased' 
                                      ? 'text-white shadow-lg' 
                                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                                  }`}
                                  style={weight === 'decreased' ? {
                                    background: `linear-gradient(135deg, #f59e0b80 0%, #f59e0b60 100%)`,
                                    boxShadow: `0 4px 15px #f59e0b30`
                                  } : {}}
                                >
                                  <div>Decreased</div>
                                  <div className="text-xs opacity-75">+50% pts</div>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Slide to Commit Button */}
                  <div className="p-6 pt-0">
                    <div className="relative overflow-hidden rounded-2xl">
                      {/* Gradient Background */}
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(90deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}80 100%)`
                        }}
                      />
                      
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleSubmit(e as any);
                        }}
                        disabled={loading || !quantity || parseFloat(quantity) <= 0}
                        className="relative w-full py-6 px-8 text-black font-black text-xl tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-black/20 rounded-full flex items-center justify-center">
                              <div className="w-0 h-0 border-l-[8px] border-l-black/60 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
                            </div>
                            <span>SLIDE TO COMMIT</span>
                          </div>
                          <div className="text-2xl">
                            {loading ? '⏳' : '🚀'}
                          </div>
                        </div>
                        
                        {/* Shimmer Effect */}
                        <div 
                          className="absolute inset-0 opacity-30"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                            animation: 'shimmer 2s infinite'
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}


        </div>

        {/* Workout Input Overlay - Modern Redesigned */}
        {workoutInputOpen && selectedWorkoutExercise && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[110] flex items-center justify-center p-4">
            <div className="relative bg-black/70 backdrop-blur-xl border border-white/5 rounded-3xl w-96 h-[36rem] overflow-hidden shadow-2xl">
              
              {/* Header - Modern Exercise Button Style with Progress Bar */}
              <div className="relative bg-black/40 backdrop-blur-sm border-b border-white/10 overflow-hidden rounded-t-3xl">
                <div className="flex">
                  {/* Main content area with progress bar - matches exercise button layout */}
                  <div className="flex-1 relative overflow-hidden">
                    {/* Live progress bar background */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 transition-all duration-300 ease-out"
                      style={{ 
                        width: `${Math.min(100, (calculateWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise) / Math.max(1, dailyTarget - dailyProgress)) * 100)}%`,
                        background: getExerciseTypeGradient(selectedWorkoutExercise.type, selectedWorkoutExercise.id, 'linear')
                      }}
                    />
                    
                    {/* Exercise info */}
                    <div className="relative h-16 flex items-center px-4">
                      <div className="flex items-center space-x-3">
                        {getExerciseIcon(selectedWorkoutExercise)}
                        <div>
                          <div className="font-medium text-white text-left">{selectedWorkoutExercise.name}</div>
                          <div className="text-xs text-gray-400">
                            {selectedWorkoutExercise.points_per_unit % 1 === 0 
                              ? selectedWorkoutExercise.points_per_unit 
                              : selectedWorkoutExercise.points_per_unit.toFixed(2)
                            } pts/{selectedWorkoutExercise.unit}
                          </div>
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-xl font-bold text-white">
                          {calculateWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)} pts
                        </div>
                        <div className="text-xs text-gray-400">
                          {Math.max(0, dailyTarget - dailyProgress)} remaining
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Close button - Modern styled */}
                  <button
                    onClick={() => setWorkoutInputOpen(false)}
                    className="w-16 h-16 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-gray-300 hover:text-white transition-all duration-300 hover:scale-105 flex items-center justify-center shadow-lg"
                    aria-label="Close workout input"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="pt-4 px-4 flex-1 flex flex-col">
                {/* Counter Section */}
                <div className="mb-4">
                  {/* Main counter with - and + buttons */}
                  <div className="flex items-center justify-center gap-6 mb-4">
                    <button
                      onClick={() => setWorkoutCount(Math.max(0, workoutCount - 1))}
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold transition-all duration-300 hover:scale-110 active:scale-95 bg-black/40 backdrop-blur-sm border border-white/20 shadow-2xl hover:shadow-xl hover:bg-black/60"
                    >
                      −
                    </button>
                    
                    <input
                      type="number"
                      value={workoutCount || 0}
                      onChange={(e) => setWorkoutCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="text-6xl font-black text-white text-center bg-black/30 backdrop-blur-sm border border-white/20 outline-none w-24 h-20 rounded-2xl shadow-2xl"
                      style={{ textShadow: '0 0 20px rgba(255,255,255,0.5)' }}
                      placeholder="0"
                    />
                    
                    <button
                      onClick={() => setWorkoutCount(workoutCount + 1)}
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold transition-all duration-300 hover:scale-110 active:scale-95 bg-blue-500/40 backdrop-blur-sm border border-blue-400/50 shadow-2xl hover:shadow-xl hover:bg-blue-500/60"
                    >
                      +
                    </button>
                  </div>
                  
                  <div className="text-center text-xs text-white/70 font-medium uppercase tracking-wider mb-3">
                    {selectedWorkoutExercise.unit}{selectedWorkoutExercise.unit !== 'rep' && 's'}
                  </div>

                  {/* Quick adjustment buttons - perfect round circles */}
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setWorkoutCount(Math.max(0, workoutCount - 10))}
                      className="rounded-full flex items-center justify-center text-white font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                        border: '3px solid rgba(0,0,0,0.3)',
                        boxShadow: '0 4px 12px rgba(71, 85, 105, 0.3), inset 0 1px 2px rgba(255,255,255,0.2)'
                      }}
                    >
                      -10
                    </button>
                    <button
                      onClick={() => setWorkoutCount(Math.max(0, workoutCount - 5))}
                      className="rounded-full flex items-center justify-center text-white font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                        border: '3px solid rgba(0,0,0,0.3)',
                        boxShadow: '0 4px 12px rgba(71, 85, 105, 0.3), inset 0 1px 2px rgba(255,255,255,0.2)'
                      }}
                    >
                      -5
                    </button>
                    <button
                      onClick={() => setWorkoutCount(workoutCount + 5)}
                      className="rounded-full flex items-center justify-center text-white font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${getCategoryColor(selectedWorkoutExercise.type, selectedWorkoutExercise.id)}80 0%, ${getCategoryColor(selectedWorkoutExercise.type, selectedWorkoutExercise.id)}60 100%)`,
                        border: '3px solid rgba(0,0,0,0.3)',
                        boxShadow: `0 4px 12px ${getCategoryColor(selectedWorkoutExercise.type, selectedWorkoutExercise.id)}30, inset 0 1px 2px rgba(255,255,255,0.2)`
                      }}
                    >
                      +5
                    </button>
                    <button
                      onClick={() => setWorkoutCount(workoutCount + 10)}
                      className="rounded-full flex items-center justify-center text-white font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${getCategoryColor(selectedWorkoutExercise.type, selectedWorkoutExercise.id)}80 0%, ${getCategoryColor(selectedWorkoutExercise.type, selectedWorkoutExercise.id)}60 100%)`,
                        border: '3px solid rgba(0,0,0,0.3)',
                        boxShadow: `0 4px 12px ${getCategoryColor(selectedWorkoutExercise.type, selectedWorkoutExercise.id)}30, inset 0 1px 2px rgba(255,255,255,0.2)`
                      }}
                    >
                      +10
                    </button>
                  </div>
                </div>

                {/* Weight & Difficulty Options */}
                {(selectedWorkoutExercise.is_weighted || selectedWorkoutExercise.supports_decreased) && (
                  <div className="flex-1 flex flex-col gap-3">
                    {/* Weight Options */}
                    {selectedWorkoutExercise.is_weighted && (
                      <div>
                        <h4 className="text-white font-semibold text-center mb-3 text-xs uppercase tracking-wide">Weight</h4>
                        <div className="flex justify-center">
                          {/* Connected weight grid component - aligned with quick buttons */}
                          <div 
                            className="grid grid-cols-4 gap-0"
                            style={{
                              width: '192px', // Exactly 4 * 48px to match quick adjustment buttons width
                              background: '#374151',
                              border: '2px solid rgba(0,0,0,0.3)',
                              borderRadius: '12px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.1)',
                              overflow: 'hidden'
                            }}
                          >
                            <button
                              onClick={() => handleWeightClick(0)}
                              className="flex items-center justify-center text-xs font-bold transition-all duration-200 hover:brightness-110 relative border-r border-b border-black/20"
                              style={{
                                width: '48px',
                                height: '48px',
                                background: selectedWeight === 0 
                                  ? 'linear-gradient(145deg, #22c55e 0%, #16a34a 30%, #15803d 70%, #166534 100%)'
                                  : 'transparent',
                                color: 'white'
                              }}
                            >
                              Body
                              {lockedWeight === 0 && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                                  <div className="w-1 h-1 bg-black rounded-sm"></div>
                                </div>
                              )}
                            </button>
                            {[5, 10, 15, 20, 25, 30, 35].map((weight, index) => (
                              <button
                                key={weight}
                                onClick={() => handleWeightClick(weight)}
                                className={`flex items-center justify-center text-xs font-bold transition-all duration-200 hover:brightness-110 relative ${
                                  (index + 1) % 4 !== 0 ? 'border-r border-black/20' : ''
                                } ${
                                  index < 3 ? 'border-b border-black/20' : ''
                                }`}
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  background: selectedWeight === weight 
                                    ? 'linear-gradient(145deg, #22c55e 0%, #16a34a 30%, #15803d 70%, #166534 100%)'
                                    : 'transparent',
                                  color: 'white'
                                }}
                              >
                                {weight}
                                {lockedWeight === weight && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                                    <div className="w-1 h-1 bg-black rounded-sm"></div>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Decreased Exercise Toggle */}
                    {selectedWorkoutExercise.supports_decreased && (
                      <div>
                        <h4 className="text-white font-semibold text-center mb-3 text-xs uppercase tracking-wide">Difficulty</h4>
                        <div className="flex justify-center">
                          <div className="relative inline-flex items-center">
                            <button
                              onClick={() => setIsDecreasedExercise(!isDecreasedExercise)}
                              className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
                                isDecreasedExercise 
                                  ? 'bg-amber-500' 
                                  : 'bg-gray-600'
                              }`}
                              style={{
                                boxShadow: isDecreasedExercise 
                                  ? '0 4px 12px rgba(245, 158, 11, 0.4), inset 0 1px 2px rgba(255,255,255,0.2)'
                                  : '0 4px 12px rgba(75, 85, 99, 0.3), inset 0 1px 2px rgba(255,255,255,0.1)'
                              }}
                            >
                              <div
                                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                                  isDecreasedExercise ? 'translate-x-8' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <div className="ml-3 text-white">
                              <div className="text-sm font-medium">
                                {isDecreasedExercise ? 'Decreased' : 'Regular'}
                              </div>
                              {isDecreasedExercise && (
                                <div className="text-xs text-amber-300">+50% points</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Button - matches header shape but bottom filled */}
                <div className="mt-auto -mx-4">
                  <div className="relative bg-black/30 backdrop-blur-sm border-t border-white/10 overflow-hidden">
                    <div className="flex">
                      {/* Main content area - matches header layout */}
                      <div className="flex-1 relative overflow-hidden">
                        {/* Progress background */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 transition-all duration-300 ease-out"
                          style={{ 
                            width: calculateWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise) > 0 ? '100%' : '0%',
                            background: getExerciseTypeGradient(selectedWorkoutExercise.type, selectedWorkoutExercise.id, 'linear')
                          }}
                        />
                        
                        {/* Submit button content */}
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
                                setSelectedWeight(lockedWeight || 0) // Keep locked weight
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
                          className="relative h-16 w-full flex items-center justify-center px-4 text-white font-bold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-2xl shadow-2xl hover:shadow-xl hover:bg-blue-500/30"
                        >
                          <div className="text-center">
                            <div className="text-lg font-bold">
                              {loading ? 'Submitting...' : `Submit ${calculateWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)} points`}
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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