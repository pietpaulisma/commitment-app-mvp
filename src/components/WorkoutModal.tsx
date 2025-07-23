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
  SparklesIcon
} from '@heroicons/react/24/outline'

type Exercise = {
  id: string
  name: string
  type: string
  unit: string
  points_per_unit: number
  is_weighted: boolean
  is_time_based: boolean
}

type ExerciseWithProgress = Exercise & {
  todayCount: number
  emoji: string
  lastDone?: string
}

type RecommendedExercise = {
  exercise: ExerciseWithProgress
  reason: string
  priority: 'high' | 'medium' | 'low'
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
  const [recommendedExercises, setRecommendedExercises] = useState<RecommendedExercise[]>([])
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithProgress | null>(null)
  const [quantity, setQuantity] = useState('')
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(false)
  const [exercisesLoading, setExercisesLoading] = useState(false)
  const [dailyProgress, setDailyProgress] = useState(0)
  const [dailyTarget, setDailyTarget] = useState(100)
  const [showSportSelection, setShowSportSelection] = useState(false)
  const [selectedSportType, setSelectedSportType] = useState('')
  const [selectedIntensity, setSelectedIntensity] = useState('medium')

  useEffect(() => {
    if (isOpen && user && profile?.group_id) {
      console.log('Loading exercises for group:', profile.group_id)
      loadExercises()
      loadDailyProgress()
    }
  }, [isOpen, user, profile?.group_id])

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

          const { data: groupSettings } = await supabase
            .from('group_settings')
            .select('*')
            .eq('group_id', profile.group_id)
            .single()

          if (groupSettings) {
            restDays = groupSettings.rest_days || [1]
            recoveryDays = groupSettings.recovery_days || [5]
            
            const daysSinceStart = group?.start_date 
              ? Math.floor((new Date().getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24))
              : Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
            
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

      setDailyProgress(todayPoints)
      setDailyTarget(target)
    } catch (error) {
      console.error('Error loading daily progress:', error)
    }
  }

  const getExerciseIcon = (exercise: Exercise) => {
    const type = exercise.type.toLowerCase()
    
    // Type-based icon mappings using Heroicons
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
      
      // Generate recommendations
      const recommendations = generateRecommendations(exercisesWithProgress, yesterdayLogs || [])
      
      setExercises(exercisesWithProgress)
      setRecommendedExercises(recommendations)
      console.log('Exercises loaded successfully:', exercisesWithProgress.length)
    } catch (error) {
      console.error('Error loading exercises:', error)
    } finally {
      setExercisesLoading(false)
    }
  }
  
  const generateRecommendations = (exercises: ExerciseWithProgress[], yesterdayLogs: any[]): RecommendedExercise[] => {
    const recommendations: RecommendedExercise[] = []
    
    // Get yesterday's exercise types
    const yesterdayTypes = yesterdayLogs.map(log => log.exercises?.type).filter(Boolean)
    
    // Recommend balance - if they did strength yesterday, suggest cardio/flexibility
    if (yesterdayTypes.includes('strength')) {
      const cardioExercise = exercises.find(ex => ex.type === 'cardio' && ex.todayCount === 0)
      if (cardioExercise) {
        recommendations.push({
          exercise: cardioExercise,
          reason: 'Balance yesterday\'s strength training',
          priority: 'high'
        })
      }
      
      const flexibilityExercise = exercises.find(ex => ex.type === 'flexibility' && ex.todayCount === 0)
      if (flexibilityExercise) {
        recommendations.push({
          exercise: flexibilityExercise,
          reason: 'Recovery and flexibility',
          priority: 'medium'
        })
      }
    }
    
    // If they did cardio yesterday, suggest strength
    if (yesterdayTypes.includes('cardio')) {
      const strengthExercise = exercises.find(ex => ex.type === 'strength' && ex.todayCount === 0)
      if (strengthExercise) {
        recommendations.push({
          exercise: strengthExercise,
          reason: 'Build strength after cardio',
          priority: 'high'
        })
      }
    }
    
    // Always recommend recovery if they haven't done any today
    const recoveryExercise = exercises.find(ex => ex.type === 'recovery' && ex.todayCount === 0)
    if (recoveryExercise && yesterdayLogs.length > 0) {
      recommendations.push({
        exercise: recoveryExercise,
        reason: 'Important for muscle recovery',
        priority: 'medium'
      })
    }
    
    return recommendations.slice(0, 3) // Limit to 3 recommendations
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
    
    setSelectedExercise(exercise)
    setQuantity(defaultQuantity.toString())
    setWeight('')
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
  
  // Get recovery exercises that are NOT already in recommendations to avoid duplicates
  const recommendedExerciseIds = recommendedExercises.map(rec => rec.exercise.id)
  
  // TEMP FIX: Deduplicate recovery exercises by name to handle database duplicates
  const recoveryExercisesRaw = exercises.filter(ex => 
    ex.type === 'recovery' && !recommendedExerciseIds.includes(ex.id)
  )
  
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
  
  const progressPercentage = dailyTarget > 0 ? Math.min(100, (dailyProgress / dailyTarget) * 100) : 0

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header - EXACT COPY from Dashboard LOG WORKOUT Button */}
        <div className="sticky top-0">
          <div className="flex">
            {/* Progress Bar Section - EXACT copy from RectangularNavigation.tsx line 129-161 */}
            <div className={`flex-1 relative h-16 ${dailyProgress > 0 ? 'bg-gray-900' : 'bg-gray-900'} border-r border-gray-700 overflow-hidden`}>
              {/* Progress Background */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-green-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
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
              {/* Recommended Workouts */}
              {recommendedExercises.length > 0 && (
                <div className="py-6">
                  <h4 className="text-2xl font-bold text-white mb-6 px-4">Recommended for You</h4>
                  <div className="space-y-0 border-t border-gray-800">
                    {recommendedExercises.map((rec, index) => (
                      <button
                        key={rec.exercise.id}
                        onClick={() => quickAddExercise(rec.exercise)}
                        className={`w-full p-3 text-left transition-all duration-300 hover:scale-105 border-b border-gray-800 ${
                          rec.priority === 'high' 
                            ? 'bg-gray-900/40 hover:bg-gray-900/50' 
                            : 'bg-gray-900/30 hover:bg-gray-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getExerciseIcon(rec.exercise)}
                            <div>
                              <div className="font-medium text-white">{rec.exercise.name}</div>
                              <div className="text-xs text-gray-400 uppercase tracking-wide">{rec.reason}</div>
                            </div>
                          </div>
                          <div className="text-left min-w-[80px]">
                            <div className="text-base font-black text-white">
                              {rec.exercise.points_per_unit}<span className="font-thin text-sm">/{rec.exercise.unit}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All Main Exercises */}
              {allExercises.length > 0 && (
                <div className="py-6">
                  <h4 className="text-2xl font-bold text-white mb-6 px-4">All Exercises</h4>
                  <div className="space-y-0 border-t border-gray-800">
                    {allExercises.map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => quickAddExercise(exercise)}
                        className={`w-full p-3 text-left transition-all duration-300 hover:scale-105 border-b border-gray-800 ${
                          exercise.todayCount > 0
                            ? 'bg-gray-900/40 hover:bg-gray-900/50'
                            : 'bg-gray-900/30 hover:bg-gray-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getExerciseIcon(exercise)}
                            <div>
                              <div className="font-medium text-white">{exercise.name}</div>
                              {exercise.todayCount > 0 && (
                                <div className="text-xs text-gray-400">
                                  Done {exercise.todayCount}x today
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-left min-w-[80px]">
                            <div className="text-base font-black text-white">
                              {exercise.points_per_unit}<span className="font-thin text-sm">/{exercise.unit}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recovery Exercises at Bottom */}
              {recoveryExercises.length > 0 && (
                <div className="py-6">
                  <h4 className="text-2xl font-bold text-white mb-6 px-4">Recovery</h4>
                  <div className="space-y-0 border-t border-gray-800">
                    {recoveryExercises.map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => quickAddExercise(exercise)}
                        className={`w-full p-3 text-left transition-all duration-300 hover:scale-105 border-b border-gray-800 ${
                          exercise.todayCount > 0
                            ? 'bg-gray-900/40 hover:bg-gray-900/50'
                            : 'bg-gray-900/30 hover:bg-gray-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getExerciseIcon(exercise)}
                            <div>
                              <div className="font-medium text-white">{exercise.name}</div>
                              {exercise.todayCount > 0 && (
                                <div className="text-xs text-gray-400">
                                  Done {exercise.todayCount}x today
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-left min-w-[80px]">
                            <div className="text-base font-black text-white">
                              {exercise.points_per_unit}<span className="font-thin text-sm">/{exercise.unit}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
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
    </div>
  )
}