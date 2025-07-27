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

export default function WorkoutLogger() {
  const [user, setUser] = useState<any>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [quantity, setQuantity] = useState('')
  const [weight, setWeight] = useState('')
  const [todaysLogs, setTodaysLogs] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)
  const [dailyTarget, setDailyTarget] = useState(0)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Load user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setUserProfile(profile)

        // Load daily target if user has a group
        if (profile?.group_id) {
          await loadDailyTarget(user.id, profile)
        }
      }

      // Load exercises
      const { data: exerciseData } = await supabase
        .from('exercises')
        .select('*')
        .order('name')
      
      setExercises(exerciseData || [])

      // Load today's logs if user is logged in
      if (user) {
        await loadTodaysLogs(user.id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadTodaysLogs(userId: string) {
    const today = new Date().toISOString().split('T')[0]
    
    try {
      const { data } = await supabase
        .from('logs')
        .select(`
          *,
          exercises(name, type, unit)
        `)
        .eq('user_id', userId)
        .eq('date', today)
        .order('created_at', { ascending: false })

      setTodaysLogs(data || [])
    } catch (error) {
      console.error('Error loading logs:', error)
    }
  }

  async function loadDailyTarget(userId: string, profile: any) {
    try {
      // Get group start date first
      const { data: group } = await supabase
        .from('groups')
        .select('start_date')
        .eq('id', profile.group_id)
        .single()

      if (group?.start_date) {
        // Calculate today's target using correct formula
        const today = new Date()
        const daysSinceStart = Math.floor((today.getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24))
        const target = 1 + Math.max(0, daysSinceStart) // Core app rule: base 1, increment 1
        
        setDailyTarget(target)

        // Get group settings for other features (week mode, etc.) but don't use for target calculation
        const { data: groupSettings } = await supabase
          .from('group_settings')
          .select('*')
          .eq('group_id', profile.group_id)
          .maybeSingle()

        // Check if today's checkin exists, if not create it
        const todayString = today.toISOString().split('T')[0]
        const { data: existingCheckin } = await supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', userId)
          .eq('date', todayString)
          .single()

        if (!existingCheckin) {
          // Create today's checkin record
          await supabase
            .from('daily_checkins')
            .insert({
              user_id: userId,
              date: todayString,
              target_points: target,
              total_points: 0,
              recovery_points: 0,
              is_complete: false,
              penalty_paid: false,
              penalty_amount: groupSettings?.penalty_amount || 10
            })
        }
      } else {
        // Fallback if no group start date
        setDailyTarget(1)
      }
    } catch (error) {
      console.error('Error loading daily target:', error)
    }
  }

  async function updateDailyCheckin() {
    if (!user || !userProfile?.group_id) return

    try {
      const todayString = new Date().toISOString().split('T')[0]
      const totalPoints = getTotalPoints()
      const recoveryPoints = getRecoveryPoints()
      const isComplete = totalPoints >= dailyTarget

      await supabase
        .from('daily_checkins')
        .update({
          total_points: totalPoints,
          recovery_points: recoveryPoints,
          is_complete: isComplete
        })
        .eq('user_id', user.id)
        .eq('date', todayString)
    } catch (error) {
      console.error('Error updating daily checkin:', error)
    }
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
        await loadTodaysLogs(user.id)
        await updateDailyCheckin()
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

  return (
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
          {/* Daily Target Progress */}
          {dailyTarget > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Daily Target Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Target:</span>
                  <span className="font-bold text-blue-600">{dailyTarget} points</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current:</span>
                  <span className="font-bold text-green-600">{getTotalPoints()} points</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-bold text-orange-600">{Math.max(0, dailyTarget - getTotalPoints())} points</span>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round((getTotalPoints() / dailyTarget) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        getTotalPoints() >= dailyTarget ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, (getTotalPoints() / dailyTarget) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mt-3">
                  {getTotalPoints() >= dailyTarget ? (
                    <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-center font-medium">
                      🎯 Daily Target Complete!
                    </div>
                  ) : (
                    <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-center font-medium">
                      💪 Keep Going!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
                        {log.count || log.duration} {log.exercises?.unit || ''}
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
  )
}