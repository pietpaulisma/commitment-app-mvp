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
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-black border-4 border-white w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b-4 border-white sticky top-0 bg-red-600">
          <h3 className="text-xl font-black text-white uppercase tracking-wider">LOG WORKOUT</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-yellow-400 transition-colors p-2 border-2 border-white hover:border-yellow-400"
          >
            <XMarkIcon className="w-6 h-6" strokeWidth={3} />
          </button>
        </div>

        <div className="p-6 space-y-6 bg-gray-900">
          {/* Quick Add Buttons */}
          {popularExercises.length > 0 && (
            <div>
              <h4 className="text-lg font-black text-white mb-4 uppercase tracking-wider">QUICK ADD</h4>
              <div className="grid grid-cols-2 gap-3">
                {popularExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => quickAddExercise(exercise)}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-4 text-sm font-bold transition-colors border-2 border-white hover:border-yellow-400 uppercase"
                  >
                    <div className="font-black">{exercise.name}</div>
                    <div className="text-xs font-bold">{exercise.points_per_unit} PTS/{exercise.unit.toUpperCase()}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recovery Exercises */}
          {recoveryExercises.length > 0 && (
            <div>
              <h4 className="text-lg font-black text-white mb-4 uppercase tracking-wider">RECOVERY</h4>
              <div className="grid grid-cols-1 gap-3">
                {recoveryExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => quickAddExercise(exercise, 5)}
                    className="bg-green-600 hover:bg-green-500 text-white p-4 text-sm font-bold transition-colors border-2 border-white hover:border-yellow-400 uppercase"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black">{exercise.name}</span>
                      <span className="text-xs font-bold">{exercise.points_per_unit} PTS/{exercise.unit.toUpperCase()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Exercise Selection */}
          <form onSubmit={handleSubmit} className="space-y-6 border-t-4 border-white pt-6">
            <div>
              <label className="block text-lg font-black text-white mb-3 uppercase tracking-wider">EXERCISE</label>
              <select 
                value={selectedExercise?.id || ''} 
                onChange={(e) => {
                  const exercise = exercises.find(ex => ex.id === e.target.value)
                  setSelectedExercise(exercise || null)
                }}
                className="w-full px-4 py-3 border-2 border-white focus:outline-none focus:border-yellow-400 text-sm bg-black text-white font-bold uppercase"
              >
                <option value="">SELECT AN EXERCISE...</option>
                <optgroup label="REGULAR EXERCISES">
                  {exercises.filter(ex => ex.type !== 'recovery').map(exercise => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name.toUpperCase()} ({exercise.points_per_unit} PTS/{exercise.unit.toUpperCase()})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="RECOVERY EXERCISES">
                  {exercises.filter(ex => ex.type === 'recovery').map(exercise => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name.toUpperCase()} ({exercise.points_per_unit} PTS/{exercise.unit.toUpperCase()})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {selectedExercise && (
              <>
                {/* Exercise Info */}
                <div className={`p-4 border-2 ${
                  selectedExercise.type === 'recovery' ? 'bg-blue-600 border-white' : 'bg-purple-600 border-white'
                }`}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-black text-white uppercase">TYPE: {selectedExercise.type.toUpperCase()}</span>
                    <span className="font-black text-yellow-400">{selectedExercise.points_per_unit} PTS/{selectedExercise.unit.toUpperCase()}</span>
                  </div>
                  {selectedExercise.type === 'recovery' && (
                    <div className="text-xs text-white font-bold uppercase mt-2">
                      💡 RECOVERY HELPS WITH REST AND MOBILITY
                    </div>
                  )}
                </div>
                
                {/* Quantity Input */}
                <div>
                  <label className="block text-lg font-black text-white mb-3 uppercase tracking-wider">
                    {selectedExercise.is_time_based ? 'DURATION' : 'QUANTITY'} 
                    <span className="text-gray-400 ml-2">({selectedExercise.unit.toUpperCase()})</span>
                  </label>
                  <input 
                    type="number" 
                    step="any" 
                    min="0" 
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-white focus:outline-none focus:border-yellow-400 text-lg bg-black text-white font-bold"
                    placeholder={`ENTER ${selectedExercise.is_time_based ? 'DURATION' : 'QUANTITY'}`}
                    required
                  />
                </div>

                {/* Weight Input */}
                {selectedExercise.is_weighted && (
                  <div>
                    <label className="block text-lg font-black text-white mb-3 uppercase tracking-wider">WEIGHT (KG)</label>
                    <input 
                      type="number" 
                      step="any" 
                      min="0" 
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-white focus:outline-none focus:border-yellow-400 text-lg bg-black text-white font-bold"
                      placeholder="ENTER WEIGHT (OPTIONAL)"
                    />
                  </div>
                )}

                {/* Points Preview */}
                {quantity && (
                  <div className="bg-green-600 border-2 border-white p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-white uppercase tracking-wider">POINTS:</span>
                      <span className="text-3xl font-black text-yellow-400">{calculatePoints()}</span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-4 px-6 border-2 border-white hover:bg-green-500 hover:border-yellow-400 transition-colors font-black uppercase tracking-wider text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'LOGGING...' : 'LOG WORKOUT'}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}