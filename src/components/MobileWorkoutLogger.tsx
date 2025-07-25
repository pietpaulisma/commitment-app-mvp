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
        // Get group start date for proper target calculation
        const { data: group } = await supabase
          .from('groups')
          .select('start_date')
          .eq('id', profile.group_id)
          .single()

        const today = new Date()
        const daysSinceStart = group?.start_date 
          ? Math.floor((today.getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((today.getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
        const target = groupSettings.daily_target_base + (groupSettings.daily_increment * Math.max(0, daysSinceStart))
        
        setDailyTarget(target)

        const todayString = today.toISOString().split('T')[0]
        const { data: existingCheckin } = await supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', userId)
          .eq('date', todayString)
          .single()

        if (!existingCheckin) {
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-gray-800 border-t-orange-400 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white mb-2">Access Required</p>
          <p className="text-gray-400">Please log in to track your workouts.</p>
        </div>
      </div>
    )
  }

  const popularExercises = exercises.filter(ex => ex.type !== 'recovery').slice(0, 6)
  const recoveryExercises = exercises.filter(ex => ex.type === 'recovery').slice(0, 3)

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Daily Target Progress Header */}
      {dailyTarget > 0 && (
        <div className="bg-black border-b border-gray-800 relative overflow-hidden">
          {/* Progress bar background */}
          <div 
            className="absolute right-0 top-0 bottom-0 bg-orange-400 transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(100, (getTotalPoints() / dailyTarget) * 100)}%` }}
          />
          
          {/* Content */}
          <div className="relative px-4 py-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-4xl font-black text-white">{getTotalPoints()}</span>
                  <span className="text-2xl font-thin text-white">PT</span>
                </div>
                <p className="text-sm font-medium -mt-1 text-white">
                  {getTotalPoints() >= dailyTarget ? "Target Complete!" : `${Math.max(0, dailyTarget - getTotalPoints())} remaining`}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-white">
                  {Math.round((getTotalPoints() / dailyTarget) * 100)}%
                </div>
                <div className="text-sm font-medium -mt-1 text-white">
                  complete
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-0">
        {/* Quick Add Section */}
        <div id="quick-add" className="bg-black">
          <div className="py-6">
            <h3 className="text-2xl font-bold text-white mb-6 px-4">Quick Add</h3>
            
            <div className="px-4">
              <div className="grid grid-cols-2 gap-3 mb-6">
                {popularExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => quickAddExercise(exercise)}
                    className="bg-gray-900/30 hover:bg-gray-900/40 text-white p-4 rounded-lg transition-all duration-300 hover:scale-105"
                  >
                    <div className="text-center">
                      <div className="text-lg font-black text-orange-400 mb-1">{exercise.points_per_unit}</div>
                      <div className="text-sm font-medium mb-1">{exercise.name}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">per {exercise.unit}</div>
                    </div>
                  </button>
                ))}
              </div>

              {recoveryExercises.length > 0 && (
                <>
                  <div className="mb-3">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">Recovery Exercises</span>
                  </div>
                  <div className="space-y-2">
                    {recoveryExercises.map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => quickAddExercise(exercise, 5)}
                        className="w-full bg-gray-900/30 hover:bg-gray-900/40 text-white p-4 rounded-lg transition-all duration-300 hover:scale-105"
                      >
                        <div className="flex justify-between items-center">
                          <div className="text-left">
                            <div className="text-sm font-medium">{exercise.name}</div>
                            <div className="text-xs text-gray-400">Recovery Exercise</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-orange-400">{exercise.points_per_unit}</div>
                            <div className="text-xs text-gray-400">per {exercise.unit}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Log Workout Section */}
        <div id="log-workout" className="bg-black">
          <div className="py-6">
            <h3 className="text-2xl font-bold text-white mb-6 px-4">Log Workout</h3>
            
            <div className="px-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Exercise Selection */}
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wide mb-3">Exercise</label>
                  <select 
                    value={selectedExercise?.id || ''} 
                    onChange={(e) => handleExerciseChange(e.target.value)}
                    className="w-full px-4 py-4 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-base bg-gray-900/30 text-white"
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
                    <div className="bg-gray-900/30 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium text-white">{selectedExercise.name}</div>
                          <div className="text-xs text-gray-400 uppercase tracking-wide">
                            {selectedExercise.type} exercise
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-orange-400">{selectedExercise.points_per_unit}</div>
                          <div className="text-xs text-gray-400">per {selectedExercise.unit}</div>
                        </div>
                      </div>
                      {selectedExercise.type === 'recovery' && (
                        <div className="text-xs text-gray-500 mt-2 border-t border-gray-800 pt-2">
                          Recovery exercises help with rest and mobility
                        </div>
                      )}
                    </div>
                    
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
                      className="w-full bg-orange-400 text-black py-4 px-4 rounded-lg hover:bg-orange-500 transition-all duration-300 font-black text-lg shadow-sm hover:scale-105"
                    >
                      LOG WORKOUT
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Today's Summary Section */}
        <div id="todays-summary" className="bg-black">
          <div className="py-6">
            <h3 className="text-2xl font-bold text-white mb-6 px-4">Today's Summary</h3>
            
            <div className="px-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-0 mb-6 border border-gray-800 rounded-lg overflow-hidden">
                <div className="bg-gray-900/30 p-4 border-r border-gray-800">
                  <div className="text-center">
                    <div className="text-3xl font-black text-orange-400 mb-1">{getTotalPoints()}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Total Points</div>
                  </div>
                </div>
                <div className="bg-gray-900/30 p-4">
                  <div className="text-center">
                    <div className="text-3xl font-black text-orange-400 mb-1">{getRecoveryPercentage()}%</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Recovery</div>
                  </div>
                </div>
              </div>

              {/* Recovery Warning */}
              {getRecoveryPercentage() > 25 && (
                <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4 mb-6">
                  <div className="text-center">
                    <div className="text-sm font-medium text-orange-400 mb-1">Recovery Notice</div>
                    <div className="text-xs text-gray-400">
                      Recovery exercises exceed 25% of your daily total
                    </div>
                  </div>
                </div>
              )}

              {/* Today's Workouts */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs text-gray-400 uppercase tracking-wide">Today's Workouts</h4>
                  <span className="text-xs text-gray-500">({todaysLogs.length})</span>
                </div>
                
                {todaysLogs.length === 0 ? (
                  <div className="text-center py-8 bg-gray-900/30 rounded-lg">
                    <p className="text-gray-400 font-medium">No workouts logged yet</p>
                    <p className="text-gray-500 text-sm mt-1">Start your first workout above</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todaysLogs.slice(0, 5).map(log => (
                      <div key={log.id} className="bg-gray-900/30 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-medium text-white">{log.exercises?.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-400">
                              {log.count || log.duration} {log.exercises?.unit || ''}
                              {log.exercises?.type === 'recovery' && (
                                <span className="ml-2 text-xs text-gray-500">• Recovery</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-orange-400">{log.points}</div>
                            <div className="text-xs text-gray-400">pts</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {todaysLogs.length > 5 && (
                      <div className="text-center text-xs text-gray-500 py-2">
                        +{todaysLogs.length - 5} more workouts
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}