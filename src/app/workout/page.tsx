'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Exercise = {
  id: string
  name: string
  type: string
  unit: string
  points_per_unit: number
  is_weighted: boolean
  is_time_based: boolean
}

type WorkoutLog = {
  id: string
  exercise_id: string
  count: number
  weight: number
  duration: number
  points: number
  date: string
  exercises?: Exercise
}

export default function WorkoutPage() {
  const [user, setUser] = useState<any>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [quantity, setQuantity] = useState('')
  const [weight, setWeight] = useState('')
  const [todaysLogs, setTodaysLogs] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    
    if (user) {
      await loadExercises()
      await loadTodaysLogs()
    }
    setLoading(false)
  }

  async function loadExercises() {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('name')
    
    setExercises(data || [])
  }

  async function loadTodaysLogs() {
    if (!user) return
    
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('logs')
      .select(`
        *,
        exercises(name, type, unit)
      `)
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: false })

    setTodaysLogs(data || [])
  }

  const handleExerciseChange = (exerciseId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId)
    setSelectedExercise(exercise || null)
    setQuantity('')
    setWeight('')
  }

  const calculatePoints = () => {
    if (!selectedExercise || !quantity) return 0
    return Math.round(parseFloat(quantity) * selectedExercise.points_per_unit)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedExercise || !quantity || !user) return

    const points = calculatePoints()
    const weightValue = parseFloat(weight) || 0

    try {
      const { error } = await supabase
        .from('logs')
        .insert({
          user_id: user.id,
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
        setQuantity('')
        setWeight('')
        setSelectedExercise(null)
        await loadTodaysLogs()
        alert(`Workout logged! Earned ${points} points.`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while logging your workout.')
    }
  }

  const getTotalPoints = () => {
    return todaysLogs.reduce((sum, log) => sum + (log.points || 0), 0)
  }

  const getRecoveryPoints = () => {
    return todaysLogs
      .filter(log => log.exercises?.type === 'recovery')
      .reduce((sum, log) => sum + (log.points || 0), 0)
  }

  const getRecoveryPercentage = () => {
    const total = getTotalPoints()
    const recovery = getRecoveryPoints()
    return total > 0 ? Math.round((recovery / total) * 100) : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h2>
          <p className="text-gray-600 mb-8">You need to be logged in to log workouts.</p>
          <a href="/login" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Workout Logger</h1>
              <p className="text-gray-600">Track your exercises and earn points</p>
            </div>
            <a href="/dashboard" className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Workout Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Log New Workout</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Exercise Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exercise</label>
                  <select 
                    value={selectedExercise?.id || ''} 
                    onChange={(e) => handleExerciseChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    {/* Exercise Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Type:</span>
                        <span className="ml-2">{selectedExercise.type}</span>
                      </div>
                      <div>
                        <span className="font-medium">Points per unit:</span>
                        <span className="ml-2 text-green-600 font-bold">{selectedExercise.points_per_unit}</span>
                      </div>
                    </div>
                    
                    {/* Recovery Badge */}
                    {selectedExercise.type === 'recovery' && (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          🧘 Recovery Exercise (Counts toward 25% max)
                        </span>
                      </div>
                    )}

                    {/* Quantity Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity ({selectedExercise.unit})
                      </label>
                      <input 
                        type="number" 
                        step="any" 
                        min="0" 
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter quantity"
                        required
                      />
                    </div>

                    {/* Weight Input (for weighted exercises) */}
                    {selectedExercise.is_weighted && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                        <input 
                          type="number" 
                          step="any" 
                          min="0" 
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter weight (optional)"
                        />
                      </div>
                    )}

                    {/* Points Preview */}
                    {quantity && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-green-800">Points for this workout:</span>
                          <span className="text-lg font-bold text-green-600">{calculatePoints()}</span>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button 
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                    >
                      Log Workout
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>

          {/* Daily Summary */}
          <div className="space-y-6">
            {/* Today's Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Today's Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Points:</span>
                  <span className="font-bold text-green-600">{getTotalPoints()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Regular Workouts:</span>
                  <span className="font-bold">{getTotalPoints() - getRecoveryPoints()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recovery Workouts:</span>
                  <span className="font-bold text-blue-600">{getRecoveryPoints()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recovery %:</span>
                  <span className="font-bold">{getRecoveryPercentage()}%</span>
                </div>
              </div>

              {/* Recovery Warning */}
              {getRecoveryPercentage() > 25 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Recovery exercises exceed 25% of your daily total.
                  </p>
                </div>
              )}
            </div>

            {/* Recent Workouts */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Today's Workouts</h3>
              <div className="space-y-2">
                {todaysLogs.length === 0 ? (
                  <p className="text-gray-500 text-sm">No workouts logged yet today</p>
                ) : (
                  todaysLogs.map(log => (
                    <div key={log.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <span className="font-medium">{log.exercises?.name || 'Unknown'}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {log.count || log.duration || 0} {log.exercises?.unit || ''}
                        </span>
                        {log.exercises?.type === 'recovery' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded ml-1">Recovery</span>
                        )}
                      </div>
                      <span className="font-bold text-green-600">{log.points} pts</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}