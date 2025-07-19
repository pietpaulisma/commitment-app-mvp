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

export default function MobileWorkoutLogger() {
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
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setUserProfile(profile)

        if (profile?.group_id) {
          await loadDailyTarget(user.id, profile)
        }
      }

      const { data: exerciseData } = await supabase
        .from('exercises')
        .select('*')
        .order('name')
      
      setExercises(exerciseData || [])

      if (user) {
        await loadTodaysLogs(user.id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadDailyTarget(userId: string, profile: any) {
    try {
      const { data: groupSettings } = await supabase
        .from('group_settings')
        .select('*')
        .eq('group_id', profile.group_id)
        .single()

      if (groupSettings) {
        const today = new Date()
        const daysSinceStart = Math.floor((today.getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
        const target = groupSettings.daily_target_base + (groupSettings.daily_increment * Math.max(0, daysSinceStart))
        
        setDailyTarget(target)

        const todayString = today.toISOString().split('T')[0]
        const { data: existingCheckin } = await supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', userId)
          .eq('checkin_date', todayString)
          .single()

        if (!existingCheckin) {
          await supabase
            .from('daily_checkins')
            .insert({
              user_id: userId,
              checkin_date: todayString,
              target_points: target,
              total_points: 0,
              recovery_points: 0,
              is_complete: false,
              penalty_paid: false,
              penalty_amount: 0
            })
        }
      }
    } catch (error) {
      console.error('Error loading daily target:', error)
    }
  }

  async function loadTodaysLogs(userId: string) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('logs')
        .select(`
          *,
          exercises (*)
        `)
        .eq('user_id', userId)
        .eq('date', today)
        .order('timestamp', { ascending: false })

      setTodaysLogs(data || [])
    } catch (error) {
      console.error('Error loading logs:', error)
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
        .eq('checkin_date', todayString)
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
        // Show success with haptic feedback on mobile
        if (navigator.vibrate) {
          navigator.vibrate(100)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while logging your workout.')
    }
  }

  const getTotalPoints = () => {
    return todaysLogs.reduce((total, log) => total + log.points, 0)
  }

  const getRecoveryPoints = () => {
    return todaysLogs
      .filter(log => log.exercises?.type === 'recovery')
      .reduce((total, log) => total + log.points, 0)
  }

  const getRecoveryPercentage = () => {
    const total = getTotalPoints()
    if (total === 0) return 0
    return Math.round((getRecoveryPoints() / total) * 100)
  }

  const quickAddExercise = (exercise: Exercise, defaultQuantity: number = 10) => {
    setSelectedExercise(exercise)
    setQuantity(defaultQuantity.toString())
    setWeight('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">Please log in to track your workouts.</p>
        </div>
      </div>
    )
  }

  const popularExercises = exercises.filter(ex => ex.type !== 'recovery').slice(0, 6)
  const recoveryExercises = exercises.filter(ex => ex.type === 'recovery').slice(0, 3)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Daily Target Progress - Mobile First */}
      {dailyTarget > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">
              {getTotalPoints() >= dailyTarget ? "🎯 Target Complete!" : "Today's Target"}
            </h2>
            <div className="text-3xl font-bold mb-2">
              {getTotalPoints()} / {dailyTarget}
            </div>
            <div className="text-sm opacity-90 mb-3">
              {Math.max(0, dailyTarget - getTotalPoints())} points remaining
            </div>
            
            {/* Progress Bar */}
            <div className="bg-white bg-opacity-30 rounded-full h-3 mb-2">
              <div 
                className="bg-white rounded-full h-3 transition-all duration-500"
                style={{ width: `${Math.min(100, (getTotalPoints() / dailyTarget) * 100)}%` }}
              ></div>
            </div>
            <div className="text-sm opacity-90">
              {Math.round((getTotalPoints() / dailyTarget) * 100)}% complete
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Quick Add Buttons */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-3">Quick Add</h3>
          <div className="grid grid-cols-2 gap-3">
            {popularExercises.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => quickAddExercise(exercise)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-800 p-3 rounded-lg text-sm font-medium transition-colors border border-blue-200"
              >
                <div className="font-semibold">{exercise.name}</div>
                <div className="text-xs opacity-75">{exercise.points_per_unit} pts/{exercise.unit}</div>
              </button>
            ))}
          </div>

          {recoveryExercises.length > 0 && (
            <>
              <div className="mt-4 mb-2">
                <span className="text-sm font-medium text-gray-600">Recovery Exercises</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {recoveryExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => quickAddExercise(exercise, 5)}
                    className="bg-green-50 hover:bg-green-100 text-green-800 p-3 rounded-lg text-sm font-medium transition-colors border border-green-200"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{exercise.name}</span>
                      <span className="text-xs opacity-75">{exercise.points_per_unit} pts/{exercise.unit}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Workout Form */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Log Workout</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Exercise Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exercise</label>
              <select 
                value={selectedExercise?.id || ''} 
                onChange={(e) => handleExerciseChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
                {/* Exercise Info Card */}
                <div className={`p-3 rounded-lg ${
                  selectedExercise.type === 'recovery' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Type: {selectedExercise.type}</span>
                    <span className="font-bold text-green-600">{selectedExercise.points_per_unit} pts/{selectedExercise.unit}</span>
                  </div>
                  {selectedExercise.type === 'recovery' && (
                    <div className="text-xs text-blue-600 mt-1">
                      💡 Recovery exercises help with rest and mobility
                    </div>
                  )}
                </div>
                
                {/* Quantity Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedExercise.is_time_based ? 'Duration' : 'Quantity'} 
                    <span className="text-gray-500 ml-1">({selectedExercise.unit})</span>
                  </label>
                  <input 
                    type="number" 
                    step="any" 
                    min="0" 
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder={`Enter ${selectedExercise.is_time_based ? 'duration' : 'quantity'}`}
                    required
                  />
                </div>

                {/* Weight Input */}
                {selectedExercise.is_weighted && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                    <input 
                      type="number" 
                      step="any" 
                      min="0" 
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      placeholder="Enter weight (optional)"
                    />
                  </div>
                )}

                {/* Points Preview */}
                {quantity && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-800">Points for this workout:</span>
                      <span className="text-2xl font-bold text-green-600">{calculatePoints()}</span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white py-4 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-sm"
                >
                  Log Workout
                </button>
              </>
            )}
          </form>
        </div>

        {/* Today's Summary */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Today's Summary</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getTotalPoints()}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getRecoveryPercentage()}%</div>
              <div className="text-sm text-gray-600">Recovery</div>
            </div>
          </div>

          {/* Recovery Warning */}
          {getRecoveryPercentage() > 25 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800 text-center">
                ⚠️ Recovery exercises exceed 25% of your daily total
              </p>
            </div>
          )}

          {/* Today's Workouts */}
          <div>
            <h4 className="font-medium mb-3">Today's Workouts ({todaysLogs.length})</h4>
            {todaysLogs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No workouts logged yet today</p>
            ) : (
              <div className="space-y-2">
                {todaysLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-sm">{log.exercises?.name || 'Unknown'}</span>
                      <div className="text-xs text-gray-500">
                        {log.count || log.duration} {log.exercises?.unit || ''}
                        {log.exercises?.type === 'recovery' && (
                          <span className="ml-2 bg-blue-100 text-blue-800 px-1 rounded text-xs">Recovery</span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-green-600 text-sm">{log.points} pts</span>
                  </div>
                ))}
                {todaysLogs.length > 5 && (
                  <div className="text-center text-sm text-gray-500 py-2">
                    +{todaysLogs.length - 5} more workouts
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}