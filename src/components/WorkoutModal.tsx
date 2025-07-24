'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
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
  CalendarDaysIcon
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
}

export default function WorkoutModal({ isOpen, onClose, onWorkoutAdded }: WorkoutModalProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [exercises, setExercises] = useState<ExerciseWithProgress[]>([])
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithProgress | null>(null)
  const [quantity, setQuantity] = useState('')
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(false)
  const [exercisesLoading, setExercisesLoading] = useState(false)
  const [dailyProgress, setDailyProgress] = useState(0)
  const [dailyTarget, setDailyTarget] = useState(100)
  const [recoveryProgress, setRecoveryProgress] = useState(0)
  const [showSportSelection, setShowSportSelection] = useState(false)
  const [selectedSportType, setSelectedSportType] = useState('')
  const [selectedIntensity, setSelectedIntensity] = useState('medium')
  const [workoutInputOpen, setWorkoutInputOpen] = useState(false)
  const [selectedWorkoutExercise, setSelectedWorkoutExercise] = useState<ExerciseWithProgress | null>(null)
  const [workoutCount, setWorkoutCount] = useState(0)
  const [todaysWorkouts, setTodaysWorkouts] = useState<any[]>([])
  const [selectedWeight, setSelectedWeight] = useState(0)
  const [isDecreasedExercise, setIsDecreasedExercise] = useState(false)
  const [allExercisesExpanded, setAllExercisesExpanded] = useState(false)
  const [recoveryExpanded, setRecoveryExpanded] = useState(false)
  const [favoritesExpanded, setFavoritesExpanded] = useState(true)
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)

  useEffect(() => {
    if (isOpen && user && profile?.group_id) {
      console.log('Loading exercises for group:', profile.group_id)
      loadExercises()
      loadDailyProgress()
      loadTodaysWorkouts()
      loadFavoriteExercises()
    }
  }, [isOpen, user, profile?.group_id])

  const loadDailyProgress = async () => {
    if (!user || !profile) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get today's points with exercise types
      const { data: todayLogs } = await supabase
        .from('logs')
        .select(`
          points,
          exercises (type)
        `)
        .eq('user_id', user.id)
        .eq('date', today)

      const todayPoints = todayLogs?.reduce((sum, log) => sum + log.points, 0) || 0
      const recoveryPoints = todayLogs
        ?.filter(log => log.exercises?.type === 'recovery')
        ?.reduce((sum, log) => sum + log.points, 0) || 0

      // Get today's target based on day type
      let target = 100
      let restDays = [1] // Default Monday
      let recoveryDays = [5] // Default Friday
      
      try {
        if (profile.group_id) {
          // Load group and group settings
          const { data: group } = await supabase
            .from('groups')
            .select('start_date')
            .eq('id', profile.group_id)
            .single()

          const { data: groupSettings, error: settingsError } = await supabase
            .from('group_settings')
            .select('*')
            .eq('group_id', profile.group_id)
            .maybeSingle()

          if (settingsError) {
            console.log('Error loading group settings:', settingsError)
          }

          console.log('🔧 Group Settings loaded:', groupSettings)

          if (groupSettings) {
            restDays = groupSettings.rest_days || [1]
            recoveryDays = groupSettings.recovery_days || [5]
            
            const daysSinceStart = group?.start_date 
              ? Math.floor((new Date().getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24))
              : Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
            
            console.log('🎯 Daily Target Calculation:', {
              group_start_date: group?.start_date,
              profile_created_at: profile.created_at,
              daysSinceStart,
              daily_target_base: groupSettings.daily_target_base,
              daily_increment: groupSettings.daily_increment,
              calculated_target: groupSettings.daily_target_base + (groupSettings.daily_increment * Math.max(0, daysSinceStart))
            })
            
            target = groupSettings.daily_target_base + (groupSettings.daily_increment * Math.max(0, daysSinceStart))
          }
        }
      } catch (error) {
        console.log('Group settings not available, using defaults')
      }

      // Adjust target based on day type
      const currentDayOfWeek = new Date().getDay()
      if (restDays.includes(currentDayOfWeek)) {
        target = 0 // Rest day - no points required
      } else if (recoveryDays.includes(currentDayOfWeek)) {
        target = 375 // Recovery day - 15 minutes of recovery (25 points/min * 15 min)
      }

      console.log('🎯 Final daily target set to:', target)
      
      setDailyProgress(todayPoints)
      setDailyTarget(target)
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
        .order('timestamp', { ascending: false })

      setTodaysWorkouts(workouts || [])
    } catch (error) {
      console.error('Error loading today\'s workouts:', error)
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
        {/* Progress bar background */}
        <div 
          className="absolute left-0 top-0 bottom-0 bg-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, exerciseProgress.percentage)}%` }}
        />
        
        <div className="relative flex">
          {/* Main exercise button */}
          <button
            onClick={() => quickAddExercise(exercise)}
            className="flex-1 p-3 hover:scale-105 transition-transform duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getExerciseIcon(exercise)}
                <div>
                  <div className="font-medium text-white text-left">{exercise.name}</div>
                </div>
              </div>
              <div className="text-right min-w-[80px]">
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
          
          {/* Favorite button */}
          {showFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(exercise.id)
              }}
              className="w-12 flex items-center justify-center hover:bg-gray-800/50 transition-colors duration-200"
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

  const quickAddExercise = (exercise: ExerciseWithProgress, defaultQuantity: number = 10) => {
    // Check if exercise name is 'sport' (case insensitive) for sport selection
    if (exercise.name.toLowerCase() === 'sport') {
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

  const handleSportSelection = (sportType: string) => {
    // Create a virtual sport exercise with the selected type
    const sportExercise: ExerciseWithProgress = {
      id: `sport_${selectedIntensity}`,
      name: `${sportType} (${selectedIntensity})`,
      type: 'cardio',
      unit: 'minute',
      points_per_unit: selectedIntensity === 'light' ? 125 : selectedIntensity === 'medium' ? 250 : 375,
      is_weighted: false,
      is_time_based: true,
      todayCount: 0,
      emoji: '🏃'
    }
    
    setSelectedExercise(sportExercise)
    setQuantity('30') // Default 30 minutes
    setWeight('')
    setShowSportSelection(false)
  }

  const sportTypes = [
    { name: 'Canoeing', emoji: '🛶' },
    { name: 'Mountain Biking', emoji: '🚵' },
    { name: 'Surfing', emoji: '🏄' },
    { name: 'Running', emoji: '🏃' },
    { name: 'Swimming', emoji: '🏊' },
    { name: 'Hiking', emoji: '🥾' },
    { name: 'Tennis', emoji: '🎾' },
    { name: 'Football', emoji: '⚽' },
    { name: 'Basketball', emoji: '🏀' },
    { name: 'Volleyball', emoji: '🏐' }
  ]

  if (!isOpen) return null

  // Group exercises by their actual types, with recovery separate
  const allExercises = exercises.filter(ex => ex.type !== 'recovery')
  
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

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header - EXACT COPY from Dashboard LOG WORKOUT Button */}
        <div className="sticky top-0">
          <div className="flex">
            {/* Progress Bar Section - EXACT copy from RectangularNavigation.tsx line 129-161 */}
            <div className={`flex-1 relative h-16 ${dailyProgress > 0 ? 'bg-gray-900' : 'bg-gray-900'} border-r border-gray-700 overflow-hidden`}>
              {/* Regular Progress Background */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, regularPercentage))}%` }}
              />
              {/* Recovery Progress Background - positioned on the right */}
              <div 
                className="absolute right-0 top-0 bottom-0 bg-blue-700 transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, recoveryPercentage)}%` }}
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

            {/* X Button */}
            <button
              onClick={onClose}
              className="w-16 h-16 bg-gray-900 border-l border-gray-700 flex items-center justify-center hover:bg-gray-800 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <XMarkIcon className="w-6 h-6" />
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
              <div className="py-6 border-b border-gray-800">
                <div className="flex items-center space-x-3 mb-6 px-4">
                  <CalendarDaysIcon className="w-6 h-6 text-purple-400" />
                  <h4 className="text-2xl font-bold text-white">Today's Workouts</h4>
                </div>
                
                {todaysWorkouts.length === 0 ? (
                  <div className="px-4">
                    <div className="text-center py-8 bg-gray-900/30 rounded-lg">
                      <p className="text-gray-400 font-medium">No workouts logged yet</p>
                      <p className="text-gray-500 text-sm mt-1">Select exercises below to get started</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0 border-t border-gray-800">
                    {todaysWorkouts.map((workout) => {
                        const exerciseProgress = getExerciseProgress(workout.exercise_id)
                        return (
                          <div key={workout.id} className="relative bg-gray-900/30 border-b border-gray-800 overflow-hidden">
                            {/* Progress bar background */}
                            <div 
                              className="absolute left-0 top-0 bottom-0 bg-blue-500 transition-all duration-500 ease-out"
                              style={{ width: `${Math.min(100, exerciseProgress.percentage)}%` }}
                            />
                            
                            <div className="relative p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  {getExerciseIcon(workout.exercises)}
                                  <div>
                                    <div className="font-medium text-white">{workout.exercises?.name || 'Unknown Exercise'}</div>
                                  </div>
                                </div>
                                <div className="text-right min-w-[80px]">
                                  <span className="font-medium text-white">
                                    {workout.points % 1 === 0 
                                      ? workout.points 
                                      : workout.points.toFixed(2)
                                    }
                                  </span>
                                  <span className="font-thin text-white ml-1">pts</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
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
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                          favoritesExpanded ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                  </button>
                  {favoritesExpanded && (
                    <div className="space-y-0 border-t border-gray-800">
                      {favoriteExercises.map((exercise) => renderExerciseButton(exercise, false))}
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
              
              {/* Exercise Input Form */}
              {selectedExercise && (
                <form onSubmit={handleSubmit} className="p-4 space-y-6 bg-black border-t border-gray-800">
                  <div className="text-center bg-gray-900/30 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-white mb-2">
                      {selectedExercise.emoji} {selectedExercise.name}
                    </h4>
                    <div className="flex justify-center items-baseline space-x-1">
                      <span className="text-2xl font-black text-orange-400">{selectedExercise.points_per_unit}</span>
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
                      className="w-full px-4 py-4 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-base bg-gray-900/30 text-white"
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
                        className="w-full px-4 py-4 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-base bg-gray-900/30 text-white"
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
                          <div className="text-4xl font-black text-orange-400">{calculatePoints()}</div>
                          <div className="text-xs text-gray-400">points</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-400 text-black py-4 px-4 rounded-lg hover:bg-orange-500 transition-all duration-300 font-black text-lg shadow-sm hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? 'LOGGING...' : 'LOG WORKOUT'}
                  </button>
                </form>
              )}
            </>
          )}


          {/* Sport Selection Screen */}
          {showSportSelection && (
            <div className="p-4 space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">🏃 Choose Your Sport</h3>
                <p className="text-gray-400 text-sm">Select the type of sport activity</p>
              </div>

              {/* Sport Types */}
              <div className="space-y-2">
                {sportTypes.map((sport) => (
                  <button
                    key={sport.name}
                    onClick={() => handleSportSelection(sport.name)}
                    className="w-full p-3 text-left transition-colors border-b border-gray-700 bg-gray-800 hover:bg-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{sport.emoji}</span>
                        <div className="font-medium text-white">{sport.name}</div>
                      </div>
                      <div className="text-sm font-bold text-green-400">
                        {selectedIntensity === 'light' ? '125' : selectedIntensity === 'medium' ? '250' : '375'} pts/min
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Intensity Selection */}
              <div className="mt-6 p-4 bg-gray-800 border border-gray-700">
                <h4 className="text-white font-semibold mb-3">Intensity Level</h4>
                <div className="space-y-2">
                  {[
                    { id: 'light', name: 'Light', points: 125, emoji: '🚶' },
                    { id: 'medium', name: 'Medium', points: 250, emoji: '🏃' },
                    { id: 'intense', name: 'Intense', points: 375, emoji: '💨' }
                  ].map((intensity) => (
                    <button
                      key={intensity.id}
                      onClick={() => setSelectedIntensity(intensity.id)}
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

              {/* Back Button */}
              <button
                onClick={() => setShowSportSelection(false)}
                className="w-full bg-gray-700 text-white py-3 px-4 hover:bg-gray-600 transition-colors font-semibold border border-gray-600"
              >
                ← Back to Exercises
              </button>
            </div>
          )}
        </div>

        {/* Workout Input Overlay */}
        {workoutInputOpen && selectedWorkoutExercise && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-10 flex items-center justify-center p-4">
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
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          selectedWeight === 0 
                            ? 'bg-orange-400/20 border border-orange-400/30 text-orange-400' 
                            : 'bg-gray-900/30 border border-gray-800 text-white hover:bg-gray-900/50'
                        }`}
                      >
                        0kg
                      </button>
                      {[10, 15, 20, 25, 30].map((weight) => (
                        <button
                          key={weight}
                          onClick={() => setSelectedWeight(weight)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            selectedWeight === weight 
                              ? 'bg-orange-400/20 border border-orange-400/30 text-orange-400' 
                              : 'bg-gray-900/30 border border-gray-800 text-white hover:bg-gray-900/50'
                          }`}
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
                        className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                          !isDecreasedExercise 
                            ? 'bg-orange-400/20 border border-orange-400/30 text-orange-400' 
                            : 'bg-gray-900/30 border border-gray-800 text-white hover:bg-gray-900/50'
                        }`}
                      >
                        Regular
                      </button>
                      <button
                        onClick={() => setIsDecreasedExercise(true)}
                        className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                          isDecreasedExercise 
                            ? 'bg-orange-400/20 border border-orange-400/30 text-orange-400' 
                            : 'bg-gray-900/30 border border-gray-800 text-white hover:bg-gray-900/50'
                        }`}
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
                      <span className="ml-2 text-orange-400">• +{selectedWeight}kg</span>
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