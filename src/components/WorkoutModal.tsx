'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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
}

export default function WorkoutModal({ isOpen, onClose, onWorkoutAdded, isAnimating = false }: WorkoutModalProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { weekMode, setWeekMode, isWeekModeAvailable } = useWeekMode()

  // Get category colors for exercises with variations
  const getCategoryColor = (type: string, exerciseId: string) => {
    const variations = {
      'all': ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'], // Blue variations
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
  const [quantity, setQuantity] = useState('')
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
  const [showSportSelection, setShowSportSelection] = useState(false)
  const [selectedSportType, setSelectedSportType] = useState('')
  const [selectedIntensity, setSelectedIntensity] = useState('medium')
  const [groupDaysSinceStart, setGroupDaysSinceStart] = useState(0)
  const [workoutInputOpen, setWorkoutInputOpen] = useState(false)
  const [selectedWorkoutExercise, setSelectedWorkoutExercise] = useState<ExerciseWithProgress | null>(null)
  const [workoutCount, setWorkoutCount] = useState(0)
  const [todaysWorkouts, setTodaysWorkouts] = useState<any[]>([])
  const [selectedWeight, setSelectedWeight] = useState(0)
  const [isDecreasedExercise, setIsDecreasedExercise] = useState(false)
  const [allExercisesExpanded, setAllExercisesExpanded] = useState(false)
  const [recoveryExpanded, setRecoveryExpanded] = useState(false)
  const [sportsExpanded, setSportsExpanded] = useState(false)
  const [favoritesExpanded, setFavoritesExpanded] = useState(true)
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)

  useEffect(() => {
    if (isOpen && user && profile?.group_id) {
      console.log('Loading exercises for group:', profile.group_id)
      console.log('isAnimatedIn before:', isAnimatedIn)
      loadExercises()
      loadDailyProgress()
      loadTodaysWorkouts()
      loadFavoriteExercises()
      
      // Trigger slide-up animation after component mounts
      setTimeout(() => {
        console.log('Setting isAnimatedIn to true')
        setIsAnimatedIn(true)
        
        // Delay icon transition until modal reaches the top (cherry on the cake!)
        setTimeout(() => {
          console.log('Starting icon transition - chat pushed out by X')
          setShowIconTransition(true)
        }, 400) // Start icon transition near end of modal slide-up
      }, 100) // Increased delay to be more visible
    } else if (!isOpen) {
      console.log('Setting isAnimatedIn to false')
      setIsAnimatedIn(false)
      setIsClosing(false)
      setShowIconTransition(false)
    }
  }, [isOpen, user, profile?.group_id])

  const handleClose = () => {
    console.log('Starting close animation')
    setIsClosing(true)
    setShowIconTransition(false) // Reset icons first
    setIsAnimatedIn(false)
    
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
            exercises (type)
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
        className={`w-full relative border-b border-gray-800 overflow-hidden transition-all duration-300 ${
          exercise.todayCount > 0
            ? 'bg-gray-900/40 hover:bg-gray-900/50'
            : 'bg-gray-900/30 hover:bg-gray-900/40'
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
                    ${getCategoryColor(exercise.type, exercise.id)}dd ${Math.max(0, exerciseProgress.percentage - 15)}%, 
                    ${getCategoryColor(exercise.type, exercise.id)}66 ${exerciseProgress.percentage}%, 
                    #000000 ${Math.min(100, exerciseProgress.percentage + 20)}%)`
              }}
            />
            
            {/* Main exercise button */}
            <button
              onClick={() => quickAddExercise(exercise)}
              className="w-full p-3 hover:scale-105 transition-transform duration-300 relative"
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
            className="w-16 flex items-center justify-center text-gray-500 cursor-grab active:cursor-grabbing"
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
        className={`w-full relative border-b border-gray-800 overflow-hidden transition-all duration-300 ${
          exercise.todayCount > 0
            ? 'bg-gray-900/40 hover:bg-gray-900/50'
            : 'bg-gray-900/30 hover:bg-gray-900/40'
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
                    ${getCategoryColor(exercise.type, exercise.id)}dd ${Math.max(0, exerciseProgress.percentage - 15)}%, 
                    ${getCategoryColor(exercise.type, exercise.id)}66 ${exerciseProgress.percentage}%, 
                    #000000 ${Math.min(100, exerciseProgress.percentage + 20)}%)`
              }}
            />
            
            {/* Main exercise button */}
            <button
              onClick={() => quickAddExercise(exercise)}
              className="w-full p-3 hover:scale-105 transition-transform duration-300 relative"
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
        setQuantity('')
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
    if (!user || !profile?.group_id || !todaysWorkouts.length) return

    try {
      setLoading(true)
      
      // Calculate total points
      const totalPoints = todaysWorkouts.reduce((sum, workout) => sum + workout.points, 0)
      
      // Group exercises by type for better presentation
      const exercisesSummary = todaysWorkouts.reduce((acc: any, workout) => {
        const exerciseName = workout.exercises?.name || 'Unknown Exercise'
        if (acc[exerciseName]) {
          acc[exerciseName].count += workout.count || workout.duration || 1
          acc[exerciseName].points += workout.points
        } else {
          acc[exerciseName] = {
            count: workout.count || workout.duration || 1,
            points: workout.points,
            unit: workout.exercises?.unit || 'rep',
            isTimeBased: workout.exercises?.is_time_based || false
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
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          group_id: profile.group_id,
          message: `🎯 Workout completed! ${totalPoints} points achieved`,
          message_type: 'workout_completion',
          workout_data: workoutData
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

  const quickAddExercise = (exercise: ExerciseWithProgress, defaultQuantity: number = 10) => {
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
    setWorkoutCount(defaultQuantity)
    setSelectedWeight(0)
    setIsDecreasedExercise(false)
    setWorkoutInputOpen(true)
    setShowSportSelection(false)
  }

  const calculateSportPoints = () => {
    if (!quantity) return 0
    const pointsPerHour = selectedIntensity === 'light' ? 125 : selectedIntensity === 'medium' ? 250 : 375
    const pointsPerMinute = pointsPerHour / 60
    return Math.round(parseFloat(quantity) * pointsPerMinute)
  }


  const handleSportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedSportType || !quantity) return

    setLoading(true)

    try {
      // Calculate points based on intensity and duration
      const pointsPerHour = selectedIntensity === 'light' ? 125 : selectedIntensity === 'medium' ? 250 : 375
      const pointsPerMinute = pointsPerHour / 60
      const totalPoints = Math.round(parseFloat(quantity) * pointsPerMinute)

      // Log the sport workout with sport_type and sport_intensity
      const { error } = await supabase
        .from('logs')
        .insert({
          user_id: user.id,
          group_id: profile?.group_id,
          exercise_id: `sport_${selectedIntensity}`, // Use the sport intensity exercise ID
          count: 0,
          weight: 0,
          duration: parseFloat(quantity),
          points: totalPoints,
          sport_type: selectedSportType,
          sport_intensity: selectedIntensity,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now()
        })

      if (error) {
        alert('Error logging sport workout: ' + error.message)
      } else {
        // Call callback to refresh data
        if (onWorkoutAdded) {
          onWorkoutAdded()
        }
        
        // Refresh daily progress and workouts
        loadDailyProgress()
        loadTodaysWorkouts()
        
        // Reset form and close modal
        setShowSportSelection(false)
        setSelectedSportType('')
        setQuantity('')
        onClose()
        
        // Haptic feedback on mobile
        if (navigator.vibrate) {
          navigator.vibrate(100)
        }
      }
    } catch (error) {
      console.error('Error logging sport workout:', error)
      alert('An error occurred while logging your sport workout.')
    } finally {
      setLoading(false)
    }
  }

  const sportTypes = [
    'Surfing',
    'Volleyball', 
    'Basketball',
    'Soccer/Football',
    'Tennis',
    'Swimming',
    'Cycling',
    'Running',
    'Hiking',
    'Rock Climbing',
    'Canoeing',
    'Mountain Biking'
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
    <div 
      className="fixed inset-0 bg-black z-[9999] flex flex-col transition-transform duration-500 ease-out"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        transform: isAnimatedIn ? 'translateY(0)' : 'translateY(100vh)'
      }}
    >
        {/* Header - EXACT COPY from Dashboard LOG WORKOUT Button */}
        <div className="sticky top-0">
          <div className="flex">
            {/* Progress Bar Section - EXACT copy from RectangularNavigation.tsx line 129-161 */}
            <div className={`flex-1 relative h-16 ${dailyProgress > 0 ? 'bg-gray-900' : 'bg-gray-900'} border-r border-gray-700 overflow-hidden`}>
              {/* Liquid gradient progress background */}
              <div 
                className="absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out"
                style={{ 
                  width: '100%',
                  background: `linear-gradient(to right, 
                    #3b82f6 0%, 
                    #3b82f6dd ${Math.max(0, regularPercentage - 15)}%, 
                    #3b82f666 ${regularPercentage}%, 
                    ${recoveryPercentage > 0 
                      ? `#1d4ed8aa ${regularPercentage + 5}%, #1d4ed866 ${Math.min(100, regularPercentage + recoveryPercentage)}%, #000000 ${Math.min(100, regularPercentage + recoveryPercentage + 20)}%`
                      : `#000000 ${Math.min(100, regularPercentage + 20)}%`
                    })`,
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

        <div className="flex-1 overflow-y-auto">
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
          
          {!exercisesLoading && exercises.length > 0 && !showSportSelection && (
            <>

              {/* Current Workouts Section */}
              <div className="pb-3 border-b border-gray-800">
                
                {todaysWorkouts.length === 0 ? (
                  <div className="px-4">
                    <div className="text-center py-8 bg-gray-900/30 rounded-lg">
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
                              className="relative bg-gray-900/30 border-b border-gray-800 overflow-hidden cursor-pointer hover:bg-gray-800/30 transition-colors duration-200"
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
                                          ${getCategoryColor(workout.exercises?.type || 'all', workout.exercise_id)}dd ${Math.max(0, exerciseProgress.percentage - 15)}%, 
                                          ${getCategoryColor(workout.exercises?.type || 'all', workout.exercise_id)}66 ${exerciseProgress.percentage}%, 
                                          #000000 ${Math.min(100, exerciseProgress.percentage + 20)}%)`
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
                      <div className="px-4 py-6 mt-4 border-t border-gray-800">
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
                    <div className="space-y-0 border-t border-gray-800">
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
                    <div className="space-y-0 border-t border-gray-800">
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
                    <div className="space-y-0 border-t border-gray-800">
                      {recoveryExercises.map((exercise) => renderExerciseButton(exercise))}
                    </div>
                  )}
                </div>
              )}

              {/* Sports List - Collapsible */}
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
                  <div className="space-y-0 border-t border-gray-800">
                    {sportTypes.map((sport) => (
                      <button
                        key={sport}
                        onClick={() => {
                          setSelectedSportType(sport)
                          setShowSportSelection(true)
                        }}
                        className="w-full transition-colors duration-200 relative bg-gray-900/30 border-b border-gray-800 overflow-hidden"
                      >
                        <div className="flex">
                          <div className="flex-1 relative overflow-hidden">
                            <div className="relative p-4 flex items-center justify-between text-left">
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">🏃</span>
                                <div>
                                  <div className="font-medium text-white">{sport}</div>
                                  <div className="text-xs text-gray-400">Tap to log workout</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <button className="w-16 flex items-center justify-center">
                            <StarIcon className="w-5 h-5 text-gray-500" />
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Week Mode Toggle - Bottom Section */}
              {isWeekModeAvailable(groupDaysSinceStart) && (
                <div className="py-6 px-4">
                  <div className="bg-gray-900/30 p-4 rounded-lg">
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
                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)'
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
              
              {/* Exercise Input Form */}
              {selectedExercise && (
                <form onSubmit={handleSubmit} className="p-4 space-y-6 bg-black border-t border-gray-800">
                  <div className="text-center bg-gray-900/30 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-white mb-2">
                      {selectedExercise.emoji} {selectedExercise.name}
                    </h4>
                    <div className="flex justify-center items-baseline space-x-1">
                      <span className="text-2xl font-black" style={{ color: getUserColor() }}>{selectedExercise.points_per_unit}</span>
                      <span className="text-sm text-gray-400">pts per {selectedExercise.unit}</span>
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

                  {/* Quantity Input */}
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-wide mb-3">
                      {selectedExercise.is_time_based ? 'Duration' : 'Quantity'} ({selectedExercise.unit})
                    </label>
                    <input 
                      type="number" 
                      step="any" 
                      min="0" 
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-4 py-4 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-2 text-base bg-gray-900/30 text-white"
                      placeholder={`Enter ${selectedExercise.is_time_based ? 'duration' : 'quantity'}`}
                      required
                    />
                  </div>

                  {/* Weight Input */}
                  {selectedExercise.is_weighted && (
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-wide mb-3">Weight (kg)</label>
                      <input 
                        type="number" 
                        step="any" 
                        min="0" 
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-4 py-4 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-2 text-base bg-gray-900/30 text-white"
                        placeholder="Enter weight (optional)"
                      />
                    </div>
                  )}

                  {/* Points Preview */}
                  {quantity && (
                    <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Points Earned</div>
                          <div className="text-sm text-white">This workout</div>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-black" style={{ color: getUserColor() }}>{calculatePoints()}</div>
                          <div className="text-xs text-gray-400">points</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full text-black py-4 px-4 rounded-lg transition-all duration-300 font-black text-lg shadow-sm hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ backgroundColor: getUserColor() }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getUserColorHover()}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getUserColor()}
                  >
                    {loading ? 'LOGGING...' : 'LOG WORKOUT'}
                  </button>
                </form>
              )}
            </>
          )}


          {/* Sport Input Screen */}
          {showSportSelection && selectedSportType && (
            <form onSubmit={handleSportSubmit} className="p-4 space-y-6 bg-black border-t border-gray-800">
              <div className="text-center bg-gray-900/30 rounded-lg p-4">
                <h4 className="text-lg font-medium text-white mb-2">
                  🏃 {selectedSportType}
                </h4>
                <div className="flex justify-center items-baseline space-x-1">
                  <span className="text-2xl font-black text-purple-400">
                    {selectedIntensity === 'light' ? '125' : selectedIntensity === 'medium' ? '250' : '375'}
                  </span>
                  <span className="text-sm text-gray-400">pts per hour</span>
                </div>
              </div>
              
              {/* Intensity Selector */}
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
                      onClick={() => setSelectedIntensity(intensity.id)}
                      className={`w-full p-3 text-left transition-colors border ${
                        selectedIntensity === intensity.id
                          ? 'bg-purple-900/50 border-purple-500 text-purple-300'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{intensity.emoji}</span>
                          <span className="font-medium">{intensity.name}</span>
                        </div>
                        <span className="text-sm font-bold">
                          {intensity.points} pts/hr
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Input */}
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wide mb-3">
                  Duration (minutes)
                </label>
                <input 
                  type="number" 
                  step="any" 
                  min="0" 
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-base bg-gray-900/30 text-white"
                  placeholder="Enter duration in minutes"
                  required
                />
              </div>

              {/* Points Preview */}
              {quantity && (
                <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Points Earned</div>
                      <div className="text-sm text-white">This workout</div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black text-purple-400">{calculateSportPoints()}</div>
                      <div className="text-xs text-gray-400">points</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button 
                  type="submit"
                  disabled={loading || !quantity}
                  className="w-full bg-purple-400 text-black py-4 px-4 rounded-lg hover:bg-purple-500 transition-all duration-300 font-black text-lg shadow-sm hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? 'LOGGING...' : 'LOG SPORT WORKOUT'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowSportSelection(false)
                    setSelectedSportType('')
                    setQuantity('')
                  }}
                  className="w-full bg-gray-700 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors font-semibold border border-gray-600"
                >
                  ← Back to Exercises
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Workout Input Overlay */}
        {workoutInputOpen && selectedWorkoutExercise && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-black border border-gray-800 rounded-lg max-w-sm w-full max-h-[90vh] overflow-y-auto">
              
              {/* Header Section - similar to dashboard style */}
              <div className="bg-gray-900/30 border-b border-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getExerciseIcon(selectedWorkoutExercise)}
                    <div>
                      <h3 className="font-medium text-white">{selectedWorkoutExercise.name}</h3>
                      <div className="text-white">
                        <span className="font-medium">
                          {selectedWorkoutExercise.points_per_unit % 1 === 0 
                            ? selectedWorkoutExercise.points_per_unit 
                            : selectedWorkoutExercise.points_per_unit.toFixed(2)
                          }
                        </span>
                        <span className="font-thin text-gray-500 ml-1">
                          /{selectedWorkoutExercise.unit.replace('minute', 'min').replace('hour', 'h')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setWorkoutInputOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Counter Section */}
                <div className="text-center">
                  {/* Big counter display */}
                  <div className="mb-6">
                    <div className="text-6xl font-black text-white mb-2">
                      {workoutCount}
                    </div>
                    <div className="text-sm text-gray-400 uppercase tracking-wide">
                      {selectedWorkoutExercise.unit}
                    </div>
                  </div>
                  
                  {/* Counter buttons */}
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <button
                      onClick={() => setWorkoutCount(Math.max(0, workoutCount - 1))}
                      className="w-12 h-12 bg-gray-900/30 border border-gray-800 rounded-lg flex items-center justify-center text-white text-xl font-bold hover:bg-gray-900/50 transition-colors"
                    >
                      −
                    </button>
                    <button
                      onClick={() => setWorkoutCount(workoutCount + 1)}
                      className="w-12 h-12 bg-gray-900/30 border border-gray-800 rounded-lg flex items-center justify-center text-white text-xl font-bold hover:bg-gray-900/50 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick add buttons */}
                  <div className="flex justify-center gap-2 mb-6">
                    <button
                      onClick={() => setWorkoutCount(workoutCount + 1)}
                      className="px-4 py-2 bg-gray-900/30 border border-gray-800 rounded-lg text-white font-medium hover:bg-gray-900/50 transition-colors text-sm"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => setWorkoutCount(workoutCount + 5)}
                      className="px-4 py-2 bg-gray-900/30 border border-gray-800 rounded-lg text-white font-medium hover:bg-gray-900/50 transition-colors text-sm"
                    >
                      +5
                    </button>
                    <button
                      onClick={() => setWorkoutCount(workoutCount + 10)}
                      className="px-4 py-2 bg-gray-900/30 border border-gray-800 rounded-lg text-white font-medium hover:bg-gray-900/50 transition-colors text-sm"
                    >
                      +10
                    </button>
                  </div>
                </div>

                {/* Weight Options for Weighted Exercises */}
                {selectedWorkoutExercise.is_weighted && (
                  <div>
                    <h4 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Weight (kg)</h4>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <button
                        onClick={() => setSelectedWeight(0)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                          selectedWeight === 0 
                            ? 'text-white' 
                            : 'bg-gray-900/30 border-gray-800 text-white hover:bg-gray-900/50'
                        }`}
                        style={selectedWeight === 0 ? { 
                          backgroundColor: getUserColor() + '33', 
                          borderColor: getUserColor() + '4D', 
                          color: getUserColor() 
                        } : {}}
                      >
                        0kg
                      </button>
                      {[10, 15, 20, 25, 30].map((weight) => (
                        <button
                          key={weight}
                          onClick={() => setSelectedWeight(weight)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                            selectedWeight === weight 
                              ? 'text-white' 
                              : 'bg-gray-900/30 border-gray-800 text-white hover:bg-gray-900/50'
                          }`}
                          style={selectedWeight === weight ? { 
                            backgroundColor: getUserColor() + '33', 
                            borderColor: getUserColor() + '4D', 
                            color: getUserColor() 
                          } : {}}
                        >
                          {weight}kg
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Decreased Exercise Option */}
                {selectedWorkoutExercise.supports_decreased && (
                  <div>
                    <h4 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Exercise Difficulty</h4>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button
                        onClick={() => setIsDecreasedExercise(false)}
                        className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors border ${
                          !isDecreasedExercise 
                            ? 'text-white' 
                            : 'bg-gray-900/30 border-gray-800 text-white hover:bg-gray-900/50'
                        }`}
                        style={!isDecreasedExercise ? { 
                          backgroundColor: getUserColor() + '33', 
                          borderColor: getUserColor() + '4D', 
                          color: getUserColor() 
                        } : {}}
                      >
                        Regular
                      </button>
                      <button
                        onClick={() => setIsDecreasedExercise(true)}
                        className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors border ${
                          isDecreasedExercise 
                            ? 'text-white' 
                            : 'bg-gray-900/30 border-gray-800 text-white hover:bg-gray-900/50'
                        }`}
                        style={isDecreasedExercise ? { 
                          backgroundColor: getUserColor() + '33', 
                          borderColor: getUserColor() + '4D', 
                          color: getUserColor() 
                        } : {}}
                      >
                        Decreased
                        <div className="text-xs opacity-75">+1.5x points</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Points Display */}
                <div className="text-center bg-gray-900/30 rounded-lg p-4 border border-gray-800">
                  <div className="text-2xl font-black text-white mb-1">
                    {calculateWorkoutPoints(selectedWorkoutExercise, workoutCount, selectedWeight, isDecreasedExercise)}
                  </div>
                  <div className="text-sm text-gray-400">
                    points earned
                    {selectedWeight > 0 && (
                      <span className="ml-2" style={{ color: getUserColor() }}>• +{selectedWeight}kg</span>
                    )}
                    {isDecreasedExercise && (
                      <span className="ml-2 text-orange-400">• Decreased</span>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={async () => {
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
                  }}
                  disabled={loading || workoutCount <= 0}
                  className="w-full bg-orange-400 text-black py-4 px-4 rounded-lg hover:bg-orange-500 transition-colors font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                >
                  {loading ? 'SAVING...' : 'SAVE WORKOUT'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}