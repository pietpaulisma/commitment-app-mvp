'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { XMarkIcon } from '@heroicons/react/24/outline'

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

  useEffect(() => {
    if (isOpen && user && profile?.group_id) {
      console.log('Loading exercises for group:', profile.group_id)
      loadExercises()
    }
  }, [isOpen, user, profile?.group_id])

  const getExerciseEmoji = (exercise: Exercise): string => {
    const name = exercise.name.toLowerCase()
    const type = exercise.type.toLowerCase()
    
    // Specific exercise mappings
    if (name.includes('push') || name.includes('press')) return '💪'
    if (name.includes('pull') || name.includes('row')) return '🦵'
    if (name.includes('squat')) return '🏃'
    if (name.includes('deadlift')) return '🏋️'
    if (name.includes('run') || name.includes('jog')) return '🏃'
    if (name.includes('walk')) return '🚶'
    if (name.includes('swim')) return '🏊'
    if (name.includes('cycle') || name.includes('bike')) return '🚴'
    if (name.includes('plank')) return '🧘'
    if (name.includes('stretch') || name.includes('yoga')) return '🧘'
    if (name.includes('cardio')) return '❤️'
    
    // Type-based mappings
    if (type === 'strength') return '💪'
    if (type === 'cardio') return '❤️'
    if (type === 'flexibility') return '🧘'
    if (type === 'recovery') return '😴'
    if (type === 'endurance') return '🏃'
    
    return '🏋️' // Default gym emoji
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
      
      // Get exercises for the group
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
      const exerciseList = groupExercises?.map(ge => ge.exercises).filter(Boolean) || []
      console.log('Processed exercise list:', exerciseList)
      
      // Get today's workout counts
      const { data: todayLogs } = await supabase
        .from('logs')
        .select('exercise_id, count, duration')
        .eq('user_id', user.id)
        .eq('date', today)
      
      // Get yesterday's workouts for recommendations
      const { data: yesterdayLogs } = await supabase
        .from('logs')
        .select('exercise_id, exercises(name, type)')
        .eq('user_id', user.id)
        .eq('date', yesterday)
      
      // Process exercises with progress
      const exercisesWithProgress: ExerciseWithProgress[] = exerciseList.map(exercise => {
        const todayCount = todayLogs?.filter(log => log.exercise_id === exercise.id).length || 0
        const emoji = getExerciseEmoji(exercise)
        
        return {
          ...exercise,
          todayCount,
          emoji
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
    setSelectedExercise(exercise)
    setQuantity(defaultQuantity.toString())
    setWeight('')
  }

  if (!isOpen) return null

  const groupedExercises = {
    strength: exercises.filter(ex => ex.type === 'strength'),
    cardio: exercises.filter(ex => ex.type === 'cardio'),
    flexibility: exercises.filter(ex => ex.type === 'flexibility'),
    recovery: exercises.filter(ex => ex.type === 'recovery'),
    endurance: exercises.filter(ex => ex.type === 'endurance')
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-gray-900">
          <h3 className="text-lg font-bold text-white">Log Workout</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
          {exercisesLoading && (
            <div className="text-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-blue-500 mx-auto"></div>
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
            <div className="bg-gray-800 border border-gray-600 p-4 mb-4">
              <h4 className="text-white font-semibold mb-2">Debug: {exercises.length} exercises loaded</h4>
              <div className="text-xs text-gray-400">
                {exercises.slice(0, 3).map(ex => ex.name).join(', ')}
                {exercises.length > 3 && '...'}
              </div>
            </div>
          {/* Recommended Workouts */}
          {recommendedExercises.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Recommended for You</h4>
              <div className="space-y-3">
                {recommendedExercises.map((rec, index) => (
                  <button
                    key={rec.exercise.id}
                    onClick={() => quickAddExercise(rec.exercise)}
                    className={`w-full p-4 border-l-4 text-left transition-colors ${
                      rec.priority === 'high' 
                        ? 'bg-blue-900/30 border-blue-400 hover:bg-blue-900/50' 
                        : 'bg-green-900/30 border-green-400 hover:bg-green-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{rec.exercise.emoji}</span>
                        <div>
                          <div className="font-semibold text-white">{rec.exercise.name}</div>
                          <div className="text-xs text-gray-400">{rec.reason}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-300">
                        {rec.exercise.points_per_unit} pts/{rec.exercise.unit}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All Exercises by Category */}
          {Object.entries(groupedExercises).map(([type, typeExercises]) => {
            if (typeExercises.length === 0) return null
            
            return (
              <div key={type}>
                <h4 className="text-lg font-semibold text-white mb-4 capitalize">
                  {type} {type === 'strength' ? '💪' : type === 'cardio' ? '❤️' : type === 'flexibility' ? '🧘' : type === 'recovery' ? '😴' : '🏃'}
                </h4>
                <div className="space-y-2">
                  {typeExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => quickAddExercise(exercise)}
                      className={`w-full p-4 text-left transition-colors border ${
                        exercise.todayCount > 0
                          ? 'bg-green-900/30 border-green-600 hover:bg-green-900/50'
                          : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{exercise.emoji}</span>
                          <div>
                            <div className="font-medium text-white">{exercise.name}</div>
                            <div className="text-xs text-gray-400">
                              {exercise.points_per_unit} pts/{exercise.unit}
                              {exercise.is_weighted && ' • Weighted'}
                              {exercise.is_time_based && ' • Timed'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {exercise.todayCount > 0 && (
                            <div className="text-sm font-bold text-green-400">
                              Done {exercise.todayCount}x today
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            Tap to log
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Manual Exercise Selection */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Exercise</label>
              <select 
                value={selectedExercise?.id || ''} 
                onChange={(e) => {
                  const exercise = exercises.find(ex => ex.id === e.target.value)
                  setSelectedExercise(exercise || null)
                }}
                className="w-full px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-700 text-white"
              >
                <option value="">Or select manually...</option>
                {Object.entries(groupedExercises).map(([type, typeExercises]) => {
                  if (typeExercises.length === 0) return null
                  return (
                    <optgroup key={type} label={`${type.charAt(0).toUpperCase() + type.slice(1)} Exercises`}>
                      {typeExercises.map(exercise => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.emoji} {exercise.name} ({exercise.points_per_unit} pts/{exercise.unit})
                          {exercise.todayCount > 0 ? ` - Done ${exercise.todayCount}x today` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
            </div>

            {selectedExercise && (
              <>
                {/* Exercise Info */}
                <div className={`p-3 ${
                  selectedExercise.type === 'recovery' ? 'bg-blue-900/30 border border-blue-700' : 'bg-gray-700 border border-gray-600'
                }`}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-200">Type: {selectedExercise.type}</span>
                    <span className="font-bold text-green-400">{selectedExercise.points_per_unit} pts/{selectedExercise.unit}</span>
                  </div>
                  {selectedExercise.type === 'recovery' && (
                    <div className="text-xs text-blue-400 mt-1">
                      💡 Recovery exercises help with rest and mobility
                    </div>
                  )}
                </div>
                
                {/* Quantity Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {selectedExercise.is_time_based ? 'Duration' : 'Quantity'} 
                    <span className="text-gray-400 ml-1">({selectedExercise.unit})</span>
                  </label>
                  <input 
                    type="number" 
                    step="any" 
                    min="0" 
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-700 text-white"
                    placeholder={`Enter ${selectedExercise.is_time_based ? 'duration' : 'quantity'}`}
                    required
                  />
                </div>

                {/* Weight Input */}
                {selectedExercise.is_weighted && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Weight (kg)</label>
                    <input 
                      type="number" 
                      step="any" 
                      min="0" 
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-700 text-white"
                      placeholder="Enter weight (optional)"
                    />
                  </div>
                )}

                {/* Points Preview */}
                {quantity && (
                  <div className="bg-green-900/30 border border-green-700 p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-300">Points:</span>
                      <span className="text-xl font-bold text-green-400">{calculatePoints()}</span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Logging...' : 'Log Workout'}
                </button>
              </>
            )}
          </form>
            </>
          )}
        </div>
    </div>
  )
}