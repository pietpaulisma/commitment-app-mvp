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

type WorkoutModalProps = {
  isOpen: boolean
  onClose: () => void
  onWorkoutAdded?: () => void
}

export default function WorkoutModal({ isOpen, onClose, onWorkoutAdded }: WorkoutModalProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [quantity, setQuantity] = useState('')
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadExercises()
    }
  }, [isOpen])

  const loadExercises = async () => {
    if (!profile?.group_id) return

    try {
      const { data: groupExercises } = await supabase
        .from('group_exercises')
        .select(`
          exercises (*)
        `)
        .eq('group_id', profile.group_id)

      const exerciseList = groupExercises?.map(ge => ge.exercises).filter(Boolean) || []
      setExercises(exerciseList as Exercise[])
    } catch (error) {
      console.error('Error loading exercises:', error)
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

  const quickAddExercise = (exercise: Exercise, defaultQuantity: number = 10) => {
    setSelectedExercise(exercise)
    setQuantity(defaultQuantity.toString())
    setWeight('')
  }

  if (!isOpen) return null

  const popularExercises = exercises.filter(ex => ex.type !== 'recovery').slice(0, 6)
  const recoveryExercises = exercises.filter(ex => ex.type === 'recovery').slice(0, 3)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-600 w-full max-w-md max-h-[90vh] overflow-y-auto">
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

        <div className="p-4 space-y-4">
          {/* Quick Add Buttons */}
          {popularExercises.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">Quick Add</h4>
              <div className="grid grid-cols-2 gap-2">
                {popularExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => quickAddExercise(exercise)}
                    className="bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 p-3 text-sm font-medium transition-colors border border-blue-700"
                  >
                    <div className="font-semibold">{exercise.name}</div>
                    <div className="text-xs opacity-75">{exercise.points_per_unit} pts/{exercise.unit}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recovery Exercises */}
          {recoveryExercises.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">Recovery</h4>
              <div className="grid grid-cols-1 gap-2">
                {recoveryExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => quickAddExercise(exercise, 5)}
                    className="bg-green-900/50 hover:bg-green-800/50 text-green-300 p-3 text-sm font-medium transition-colors border border-green-700"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{exercise.name}</span>
                      <span className="text-xs opacity-75">{exercise.points_per_unit} pts/{exercise.unit}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                <option value="">Select an exercise...</option>
                <optgroup label="Regular Exercises">
                  {exercises.filter(ex => ex.type !== 'recovery').map(exercise => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name} ({exercise.points_per_unit} pts/{exercise.unit})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Recovery Exercises">
                  {exercises.filter(ex => ex.type === 'recovery').map(exercise => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name} ({exercise.points_per_unit} pts/{exercise.unit})
                    </option>
                  ))}
                </optgroup>
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
        </div>
      </div>
    </div>
  )
}