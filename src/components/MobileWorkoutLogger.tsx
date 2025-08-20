'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createCumulativeGradient } from '@/utils/gradientUtils'
import { calculateDailyTarget, getDaysSinceStart } from '@/utils/targetCalculation'
import { useWeekMode } from '@/contexts/WeekModeContext'
import { getUserColor, getUserColorHover } from '@/utils/colorUtils'

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
  const { weekMode, setWeekModeWithSync, isWeekModeAvailable } = useWeekMode()
  const [user, setUser] = useState<any>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [quantity, setQuantity] = useState('')
  const [weight, setWeight] = useState('')
  const [todaysLogs, setTodaysLogs] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)
  const [dailyTarget, setDailyTarget] = useState(0)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [hasFlexibleRestDay, setHasFlexibleRestDay] = useState(false)
  const [weekStartDate, setWeekStartDate] = useState<Date | null>(null)
  const [progressAnimated, setProgressAnimated] = useState(false)
  const [isRecoveryDay, setIsRecoveryDay] = useState(false)

  // Helper function to check if today is a recovery day
  const checkIfRecoveryDay = async () => {
    if (!userProfile?.group_id) return false
    
    try {
      const { data: groupSettings } = await supabase
        .from('group_settings')
        .select('recovery_days')
        .eq('group_id', userProfile.group_id)
        .maybeSingle()
      
      const today = new Date()
      const currentDayOfWeek = today.getDay()
      const recoveryDays = groupSettings?.recovery_days || [5]
      const isRecovery = recoveryDays.includes(currentDayOfWeek)
      
      setIsRecoveryDay(isRecovery)
      return isRecovery
    } catch (error) {
      console.error('Error checking recovery day:', error)
      return false
    }
  }

  // Get category colors - single tint for progress bar, variations for individual exercises
  const getCategoryColor = (type: string, exerciseId: string, forProgressBar = false) => {
    if (forProgressBar) {
      // Single tint for total progress bar
      const singleTints = {
        'all': '#3b82f6', // Single blue
        'recovery': '#22c55e', // Single green
        'sports': '#a855f7', // Single purple
      }
      return singleTints[type as keyof typeof singleTints] || singleTints['all']
    }
    
    // Variations for individual exercises
    const variations = {
      'all': ['#3b82f6', '#4285f4', '#4f94ff', '#5ba3ff'], // Blue variations
      'recovery': ['#22c55e', '#16a34a', '#15803d', '#166534'], // Green variations  
      'sports': ['#a855f7', '#9333ea', '#7c3aed', '#6d28d9'], // Purple variations
    }
    
    const colorArray = variations[type as keyof typeof variations] || variations['all']
    const colorIndex = exerciseId.charCodeAt(0) % colorArray.length
    return colorArray[colorIndex]
  }

  // Get colors based on week mode like dashboard
  const getModeColor = () => {
    switch (weekMode) {
      case 'sane':
        return '#3b82f6' // Blue for sane mode
      case 'insane':
        return '#ef4444' // Red for insane mode
      default:
        return '#3b82f6' // Default to blue
    }
  }
  
  const userColor = getModeColor()
  const userColorHover = getUserColorHover(userColor)

  // Get exercise segments for stacked gradient progress bar
  const getExerciseSegments = () => {
    const total = getCappedTotalPoints()
    const overallProgress = Math.min(100, (total / dailyTarget) * 100)
    
    if (total === 0 || todaysLogs.length === 0) {
      return []
    }

    let currentPosition = 0
    const segments = todaysLogs.map(log => {
      const effectivePoints = getEffectivePoints(log)
      const exercisePercentage = (effectivePoints / total) * overallProgress
      const segment = {
        color: getCategoryColor(log.exercises?.type || 'all', log.exercise_id),
        start: currentPosition,
        end: currentPosition + exercisePercentage,
        points: effectivePoints,
        exerciseId: log.exercise_id,
        type: log.exercises?.type || 'all'
      }
      currentPosition += exercisePercentage
      return segment
    })

    return segments
  }

  // Now using shared gradient utility function

  useEffect(() => {
    loadData()
  }, [])

  const checkFlexibleRestDay = async (userId: string) => {
    try {
      // Get current week's Monday
      const today = new Date()
      const currentDay = today.getDay()
      const daysToMonday = currentDay === 0 ? 6 : currentDay - 1 // 0 = Sunday, 1 = Monday
      const monday = new Date(today)
      monday.setDate(today.getDate() - daysToMonday)
      monday.setHours(0, 0, 0, 0)
      setWeekStartDate(monday)

      const mondayString = monday.toISOString().split('T')[0]

      // Check if flexible rest day has been used this week
      const { data: usedRestDay } = await supabase
        .from('flexible_rest_days')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', mondayString)
        .maybeSingle()

      // If already used this week, don't show button
      if (usedRestDay) {
        setHasFlexibleRestDay(false)
        return
      }

      // Check if user achieved double target on Monday
      const { data: mondayLogs } = await supabase
        .from('logs')
        .select('points')
        .eq('user_id', userId)
        .eq('date', mondayString)

      const mondayPoints = mondayLogs?.reduce((sum, log) => sum + log.points, 0) || 0
      
      // Get Monday's target (which is now double the normal amount)
      const { data: profile } = await supabase
        .from('profiles')
        .select('group_id')
        .eq('id', userId)
        .single()

      if (profile?.group_id) {
        const { data: group } = await supabase
          .from('groups')
          .select('start_date')
          .eq('id', profile.group_id)
          .single()

        if (group?.start_date) {
          const daysSinceStart = Math.floor((monday.getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24))
          const baseTarget = 1 + Math.max(0, daysSinceStart)
          const mondayTarget = baseTarget * 2 // Monday target is double

          if (mondayPoints >= mondayTarget) {
            setHasFlexibleRestDay(true)
          }
        }
      }
    } catch (error) {
      console.error('Error checking flexible rest day:', error)
    }
  }

  const useFlexibleRestDay = async () => {
    if (!user || !weekStartDate) return

    try {
      const mondayString = weekStartDate.toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]

      // Record that the flexible rest day was used
      const { error } = await supabase
        .from('flexible_rest_days')
        .insert({
          user_id: user.id,
          week_start_date: mondayString,
          used_date: today,
          earned_date: mondayString
        })

      if (error) {
        console.error('Error using flexible rest day:', error)
        alert('Error using flexible rest day. Please try again.')
        return
      }

      // Hide the button
      setHasFlexibleRestDay(false)
      
      // Show success message
      alert('🎉 Flexible rest day activated! You can skip today\'s workout without penalty.')
      
    } catch (error) {
      console.error('Error using flexible rest day:', error)
      alert('Error using flexible rest day. Please try again.')
    }
  }

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
        } else {
          // Fallback if no group - set a reasonable default
          setDailyTarget(1)
        }
      }

      const { data: exerciseData } = await supabase
        .from('exercises')
        .select('*')
        .order('name')
      
      setExercises(exerciseData || [])

      if (user) {
        await loadTodaysLogs(user.id)
        await checkFlexibleRestDay(user.id)
        await checkIfRecoveryDay()
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
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
        // Get group settings for recovery/rest days and week mode
        const { data: groupSettings } = await supabase
          .from('group_settings')
          .select('*')
          .eq('group_id', profile.group_id)
          .maybeSingle()

        // Calculate today's target using centralized utility
        const daysSinceStart = getDaysSinceStart(group.start_date)
        const target = calculateDailyTarget({
          daysSinceStart,
          weekMode: weekMode, // Use individual user's mode from context
          restDays: groupSettings?.rest_days || [1],
          recoveryDays: groupSettings?.recovery_days || [5]
        })
        
        setDailyTarget(target)

        const todayString = new Date().toISOString().split('T')[0]
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

  async function loadTodaysLogs(userId: string) {
    try {
      const today = new Date().toISOString().split('T')[0]
      console.log('Loading logs for date:', today, 'user:', userId)
      const { data } = await supabase
        .from('logs')
        .select(`
          *,
          exercises (*)
        `)
        .eq('user_id', userId)
        .eq('date', today)
        .order('timestamp', { ascending: false })

      console.log('Loaded logs:', data)
      setTodaysLogs(data || [])
      
      // Trigger subtle animation after data loads
      setTimeout(() => setProgressAnimated(true), 200)
    } catch (error) {
      console.error('Error loading logs:', error)
    }
  }

  async function updateDailyCheckin() {
    if (!user || !userProfile?.group_id) return

    try {
      const todayString = new Date().toISOString().split('T')[0]
      const totalPoints = getCappedTotalPoints()
      const recoveryPoints = getRecoveryPoints()
      
      // Get group settings to check if today is a recovery day
      const { data: groupSettings } = await supabase
        .from('group_settings')
        .select('recovery_days')
        .eq('group_id', userProfile.group_id)
        .maybeSingle()
      
      const today = new Date()
      const currentDayOfWeek = today.getDay()
      const recoveryDays = groupSettings?.recovery_days || [5]
      const isRecoveryDay = recoveryDays.includes(currentDayOfWeek)
      
      // On recovery days, only recovery points count towards completion
      const isComplete = isRecoveryDay 
        ? recoveryPoints >= dailyTarget 
        : totalPoints >= dailyTarget

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

  const checkAutomaticModeSwitch = async () => {
    // Only check if user has the necessary data and is in sane mode
    if (!user || !userProfile?.group_id || weekMode !== 'sane') {
      return
    }

    // Check if mode switching is available for this group
    const { data: group } = await supabase
      .from('groups')
      .select('start_date')
      .eq('id', userProfile.group_id)
      .single()

    if (!group?.start_date) {
      return
    }

    const daysSinceStart = getDaysSinceStart(group.start_date)
    if (!isWeekModeAvailable(daysSinceStart)) {
      return
    }

    try {
      // Get current total points for today
      const currentTotalPoints = getTotalPoints()

      // Only proceed if they've actually done some exercise
      if (currentTotalPoints <= 0) {
        return
      }

      // Get group settings to calculate insane target
      const { data: groupSettings } = await supabase
        .from('group_settings')
        .select('rest_days, recovery_days')
        .eq('group_id', userProfile.group_id)
        .single()

      const restDays = groupSettings?.rest_days || [1]
      const recoveryDays = groupSettings?.recovery_days || [5]

      // Calculate what the insane target would be for today
      const insaneTargetForToday = calculateDailyTarget({
        daysSinceStart,
        weekMode: 'insane',
        restDays,
        recoveryDays
      })

      // If user met/exceeded insane target while in sane mode, switch to insane
      if (currentTotalPoints >= insaneTargetForToday) {
        await setWeekModeWithSync('insane', user.id)
        console.log(`Auto-switched to insane mode! Points: ${currentTotalPoints}, Insane target: ${insaneTargetForToday}`)
        
        // Recalculate daily target with new mode
        await loadDailyTarget(user.id, userProfile)
        
        // Show mode switch notification
        alert(`🔥 INSANE MODE ACTIVATED! You exceeded the insane target (${insaneTargetForToday}) with ${currentTotalPoints} points!`)
      }
    } catch (error) {
      console.error('Error checking automatic mode switch:', error)
      // Silently fail - don't interrupt the user's workout flow
    }
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
        await checkIfRecoveryDay() // Refresh recovery day status
        
        // Check for automatic mode switching after exercise submission
        await checkAutomaticModeSwitch()
        
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

  const getCappedTotalPoints = () => {
    const regularPoints = todaysLogs
      .filter(log => log.exercises?.type !== 'recovery')
      .reduce((total, log) => total + log.points, 0)
    
    const recoveryPoints = getRecoveryPoints()
    
    console.log('getCappedTotalPoints:', { 
      todaysLogsLength: todaysLogs.length, 
      regularPoints, 
      recoveryPoints, 
      dailyTarget, 
      isRecoveryDay 
    })
    
    // On recovery days, no cap applies
    if (isRecoveryDay) {
      return regularPoints + recoveryPoints
    }
    
    // Recovery is capped at 25% of daily target (fixed amount)
    // Ensure dailyTarget is at least 1 to prevent division issues
    const effectiveDailyTarget = Math.max(1, dailyTarget)
    const maxRecoveryAllowed = Math.floor(effectiveDailyTarget * 0.25)
    const effectiveRecoveryPoints = Math.min(recoveryPoints, maxRecoveryAllowed)
    
    const total = regularPoints + effectiveRecoveryPoints
    console.log('getCappedTotalPoints result:', total)
    return total
  }

  const getEffectivePoints = (log: WorkoutLog) => {
    // For non-recovery exercises, always use full points
    if (log.exercises?.type !== 'recovery') {
      return log.points
    }

    // On recovery days, use full points
    if (isRecoveryDay) {
      return log.points
    }

    // Recovery is capped at 25% of daily target (fixed amount)
    const maxRecoveryAllowed = Math.floor(dailyTarget * 0.25)
    const totalRecoveryPoints = getRecoveryPoints()
    
    if (totalRecoveryPoints === 0) return 0
    if (totalRecoveryPoints <= maxRecoveryAllowed) {
      return log.points // No cap needed
    }

    // Proportionally reduce this recovery exercise based on fixed cap
    const recoveryRatio = maxRecoveryAllowed / totalRecoveryPoints
    return Math.floor(log.points * recoveryRatio)
  }

  const getRecoveryPercentage = () => {
    const total = getTotalPoints()
    if (total === 0) return 0
    return Math.round((getRecoveryPoints() / total) * 100)
  }

  const quickAddExercise = (exercise: Exercise, defaultQuantity: number = 0) => {
    setSelectedExercise(exercise)
    setQuantity(defaultQuantity.toString())
    setWeight('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-white/10 mx-auto" style={{ borderTopColor: userColor }}></div>
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
    <>
      <style jsx>{`
        .focus-ring:focus {
          ring-color: ${userColor};
        }
        .btn-hover:hover {
          background-color: ${userColorHover} !important;
        }
      `}</style>
      
      {/* Daily Target Progress Header - Copy exact navigation button structure */}
      {dailyTarget > 0 && (
        <div 
          className="relative bg-gray-900 overflow-hidden border-t border-gray-700"
          style={{ height: '56px', minHeight: '56px', maxHeight: '56px' }}
        >
          {/* Stacked gradient progress bar background with subtle animation */}
          <div 
            className="absolute left-0 top-0 bottom-0 transition-all duration-600 ease-out"
            style={{ 
              width: progressAnimated ? '100%' : '80%',
              background: isRecoveryDay 
                ? createCumulativeGradient(todaysLogs?.filter(log => log.exercises?.type === 'recovery') || [], dailyTarget)
                : createCumulativeGradient(todaysLogs || [], dailyTarget),
              // Force cache invalidation
              transform: `translateZ(${Date.now() % 1000}px)`
            }}
          />
          
          {/* Content */}
          <div className="relative h-full flex items-center justify-between px-4 text-white">
            <div className="flex flex-col items-start">
              <span className="font-bold text-xs tracking-tight uppercase">
                LOG WORKOUT
              </span>
              <span className="text-xs opacity-75 font-medium">
                {isRecoveryDay ? getRecoveryPoints() : getCappedTotalPoints()}/{Math.max(1, dailyTarget)} pts
              </span>
            </div>
            
            <div className="flex flex-col items-end justify-center h-full">
              <span className="text-2xl font-black tracking-tight leading-none">
                {Math.round((isRecoveryDay ? getRecoveryPoints() : getCappedTotalPoints()) / Math.max(1, dailyTarget) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-black pb-20">

      {/* Flexible Rest Day Section */}
      {hasFlexibleRestDay && (
        <div className="bg-black border-t border-white/10">
          <div className="px-4 py-6">
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-600/30 rounded-3xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-green-400 mb-1">🎉 Flexible Rest Day Earned!</div>
                  <div className="text-xs text-gray-300">You crushed Monday's double target. Use this to skip any day this week.</div>
                </div>
                <button 
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-3xl text-sm font-medium transition-colors"
                  onClick={useFlexibleRestDay}
                >
                  Use Rest Day
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-0">
        {/* Quick Add Section */}
        <div id="quick-add" className="bg-black">
          <div className="py-3">
            <h3 className="text-2xl font-bold text-white mb-3 px-4">Quick Add</h3>
            
            <div className="px-1">
              <div className="grid grid-cols-2 gap-1 mx-1 mb-1">
                {popularExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => quickAddExercise(exercise)}
                    className="bg-gray-900/30 backdrop-blur-xl hover:bg-gray-900/40 text-white p-3 rounded-3xl transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-2xl border border-white/5 mb-1"
                  >
                    <div className="text-center">
                      <div className="text-lg font-black mb-1" style={{ color: userColor }}>{exercise.points_per_unit}</div>
                      <div className="text-sm font-medium mb-1">{exercise.name}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">per {exercise.unit}</div>
                    </div>
                  </button>
                ))}
              </div>

              {recoveryExercises.length > 0 && (
                <>
                  <div className="mb-1">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wide px-3">Recovery Exercises</span>
                  </div>
                  <div className="space-y-1">
                    {recoveryExercises.map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => quickAddExercise(exercise, 5)}
                        className="w-full bg-gray-900/30 backdrop-blur-xl hover:bg-gray-900/40 text-white p-3 rounded-3xl transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-2xl border border-white/5 mb-1"
                      >
                        <div className="flex justify-between items-center">
                          <div className="text-left">
                            <div className="text-sm font-medium">{exercise.name}</div>
                            <div className="text-xs text-gray-400">Recovery Exercise</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black" style={{ color: userColor }}>{exercise.points_per_unit}</div>
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
          <div className="py-3">
            <h3 className="text-2xl font-bold text-white mb-3 px-4">Log Workout</h3>
            
            <div className="px-1">
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Exercise Selection */}
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1 px-3">Exercise</label>
                  <select 
                    value={selectedExercise?.id || ''} 
                    onChange={(e) => handleExerciseChange(e.target.value)}
                    className="w-full px-4 py-3 border border-white/5 rounded-3xl focus:outline-none focus:ring-2 focus:ring-2 text-base bg-gray-900/30 backdrop-blur-xl text-white mx-1"
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
                    <div className="bg-gray-900/30 backdrop-blur-xl rounded-3xl p-4 shadow-2xl border border-white/5">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium text-white">{selectedExercise.name}</div>
                          <div className="text-xs text-gray-400 uppercase tracking-wide">
                            {selectedExercise.type} exercise
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black" style={{ color: userColor }}>{selectedExercise.points_per_unit}</div>
                          <div className="text-xs text-gray-400">per {selectedExercise.unit}</div>
                        </div>
                      </div>
                      {selectedExercise.type === 'recovery' && (
                        <div className="text-xs text-gray-500 mt-2 border-t border-white/10 pt-2">
                          Recovery exercises help with rest and mobility
                        </div>
                      )}
                    </div>
                    
                    {/* Quantity Input */}
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1 px-3">
                        {selectedExercise.is_time_based ? 'Duration' : 'Quantity'} ({selectedExercise.unit})
                      </label>
                      <input 
                        type="number" 
                        step="any" 
                        min="0" 
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full px-4 py-3 border border-white/5 rounded-3xl focus:outline-none focus:ring-2 focus:ring-2 text-base bg-gray-900/30 backdrop-blur-xl text-white mx-1"
                        placeholder={`Enter ${selectedExercise.is_time_based ? 'duration' : 'quantity'}`}
                        required
                      />
                    </div>

                    {/* Weight Input */}
                    {selectedExercise.is_weighted && (
                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1 px-3">Weight (kg)</label>
                        <input 
                          type="number" 
                          step="any" 
                          min="0" 
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="w-full px-4 py-3 border border-white/5 rounded-3xl focus:outline-none focus:ring-2 focus:ring-2 text-base bg-gray-900/30 backdrop-blur-xl text-white mx-1"
                          placeholder="Enter weight (optional)"
                        />
                      </div>
                    )}

                    {/* Points Preview - Compact */}
                    {quantity && (
                      <div className="bg-gray-900/30 backdrop-blur-xl rounded-2xl p-2 border border-white/5 mx-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">Points:</span>
                          <div className="text-right">
                            {(() => {
                              const rawPoints = calculatePoints()
                              
                              // Check if this recovery exercise would be capped
                              if (selectedExercise && selectedExercise.type === 'recovery' && !isRecoveryDay && rawPoints > 0) {
                                const currentRecoveryPoints = getRecoveryPoints()
                                const maxRecoveryAllowed = Math.floor(dailyTarget * 0.25)
                                const totalRecoveryAfter = currentRecoveryPoints + rawPoints
                                
                                if (totalRecoveryAfter > maxRecoveryAllowed) {
                                  const effectiveRecoveryAdd = Math.max(0, maxRecoveryAllowed - currentRecoveryPoints)
                                  return (
                                    <div>
                                      <span className="text-lg font-bold text-orange-400">{effectiveRecoveryAdd}</span>
                                      <span className="text-xs text-gray-500 ml-1">/{rawPoints}</span>
                                      <div className="text-xs text-orange-400 mt-1">25% cap</div>
                                    </div>
                                  )
                                }
                              }
                              
                              return <span className="text-lg font-bold" style={{ color: userColor }}>{rawPoints}</span>
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button 
                      type="submit"
                      className="w-full text-black px-4 py-3 rounded-3xl transition-all duration-300 font-black text-lg shadow-2xl hover:scale-105 btn-hover relative overflow-hidden -mx-1"
                      style={{ 
                        backgroundColor: userColor,
                        background: `linear-gradient(135deg, ${userColor}ff 0%, ${userColor}cc 50%, ${userColor}ff 100%)`,
                        minHeight: '48px'
                      }}
                    >
                      <span className="relative z-10 flex items-center justify-center h-full">LOG WORKOUT</span>
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Today's Summary Section */}
        <div id="todays-summary" className="bg-black">
          <div className="py-3">
            <h3 className="text-2xl font-bold text-white mb-3 px-4">Today's Summary</h3>
            
            <div className="px-1">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-1 mb-3 mx-1">
                <div className="bg-gray-900/30 backdrop-blur-xl p-3 border border-white/5 rounded-3xl shadow-2xl">
                  <div className="text-center">
                    <div className="text-3xl font-black mb-1" style={{ color: userColor }}>{getTotalPoints()}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Total Points</div>
                  </div>
                </div>
                <div className="bg-gray-900/30 backdrop-blur-xl p-3 border border-white/5 rounded-3xl shadow-2xl">
                  <div className="text-center">
                    <div className="text-3xl font-black mb-1" style={{ color: userColor }}>{getRecoveryPercentage()}%</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Recovery</div>
                  </div>
                </div>
              </div>

              {/* Recovery Warning */}
              {getRecoveryPercentage() > 25 && (
                <div className="bg-gray-900/30 backdrop-blur-xl border border-white/5 rounded-3xl p-3 mb-3 mx-1">
                  <div className="text-center">
                    <div className="text-sm font-medium mb-1" style={{ color: userColor }}>Recovery Notice</div>
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
                  <div className="text-center py-8 bg-gray-900/30 backdrop-blur-xl rounded-3xl">
                    <p className="text-gray-400 font-medium">No workouts logged yet</p>
                    <p className="text-gray-500 text-sm mt-1">Start your first workout above</p>
                  </div>
                ) : (
                  <div>
                    {todaysLogs.slice(0, 5).map(log => {
                      const exerciseColor = getCategoryColor(log.exercises?.type || 'all', log.exercise_id)
                      const effectivePoints = getEffectivePoints(log)
                      const progressPercentage = Math.min(100, (effectivePoints / Math.max(1, dailyTarget)) * 100) // Percentage of daily target this exercise represents
                      const isRecoveryExercise = log.exercises?.type === 'recovery'
                      const isPointsCapped = isRecoveryExercise && !isRecoveryDay && effectivePoints < log.points
                      
                      return (
                        <div key={log.id} className="bg-gray-900/30 backdrop-blur-xl relative overflow-hidden rounded-3xl shadow-2xl border border-white/5 hover:shadow-xl transition-all duration-300 mb-1">
                          {/* Liquid gradient background for logged exercise */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out"
                            style={{ 
                              width: '100%',
                              background: progressPercentage === 0 
                                ? 'transparent'
                                : `linear-gradient(to right, 
                                  ${exerciseColor}80 0%, 
                                  ${exerciseColor}cc ${Math.max(0, progressPercentage - 15)}%, 
                                  ${exerciseColor}60 ${progressPercentage}%, 
                                  rgba(0,0,0,0.3) ${Math.min(100, progressPercentage + 20)}%)`
                            }}
                          />
                          
                          {/* Content */}
                          <div className="relative p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-sm font-medium text-white">{log.exercises?.name || 'Unknown'}</div>
                                <div className="text-xs text-gray-400">
                                  {log.count || log.duration} {log.exercises?.unit || ''}
                                  {isRecoveryExercise && (
                                    <span className="ml-2 text-xs text-gray-500">• Recovery</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-black text-white">
                                  {effectivePoints}
                                </div>
                                <div className="text-xs text-gray-400">pts</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
    </>
  )
}