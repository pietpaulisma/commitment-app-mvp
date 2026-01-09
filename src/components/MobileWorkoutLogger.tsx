'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createCumulativeGradient } from '@/utils/gradientUtils'
import { calculateDailyTarget, getDaysSinceStart, canUseRecoveryDayToday, RECOVERY_DAY_TARGET_MINUTES, getThisWeekMondayString } from '@/utils/targetCalculation'
import { hasUsedRecoveryDayThisWeek, getActiveRecoveryDay, activateRecoveryDay, updateRecoveryDayProgress, cancelRecoveryDay, type UserRecoveryDay } from '@/utils/recoveryDayHelpers'
import { useWeekMode } from '@/contexts/WeekModeContext'
import { getUserColor, getUserColorHover } from '@/utils/colorUtils'
import { COLORS } from '@/utils/colors'

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
  const [recoveryDayData, setRecoveryDayData] = useState<UserRecoveryDay | null>(null)
  const [canUseRecoveryDay, setCanUseRecoveryDay] = useState(false)
  const [isActivatingRecoveryDay, setIsActivatingRecoveryDay] = useState(false)
  const [isCancellingRecoveryDay, setIsCancellingRecoveryDay] = useState(false)
  const [isRestDay, setIsRestDay] = useState(false)
  const [restDays, setRestDays] = useState<number[]>([1]) // Default Monday
  const [groupStartDate, setGroupStartDate] = useState<string | null>(null)
  const [isUsingFlexibleRestDay, setIsUsingFlexibleRestDay] = useState(false)

  // Helper function to check if user has active recovery day today
  const checkIfRecoveryDay = async () => {
    if (!user) return false
    
    try {
      // Check if user has an active recovery day today
      const activeRecoveryDay = await getActiveRecoveryDay(user.id)
      
      if (activeRecoveryDay) {
        setIsRecoveryDay(true)
        setRecoveryDayData(activeRecoveryDay)
        setCanUseRecoveryDay(false)
        setDailyTarget(RECOVERY_DAY_TARGET_MINUTES)
        return true
      } else {
        setIsRecoveryDay(false)
        setRecoveryDayData(null)
        
        // Check if recovery day is available this week
        const canUseToday = canUseRecoveryDayToday()
        if (canUseToday) {
          const alreadyUsed = await hasUsedRecoveryDayThisWeek(user.id)
          setCanUseRecoveryDay(!alreadyUsed)
        } else {
          setCanUseRecoveryDay(false)
        }
        return false
      }
    } catch (error) {
      console.error('Error checking recovery day:', error)
      return false
    }
  }
  
  // Activate recovery day for today
  const handleActivateRecoveryDay = async () => {
    if (!user || isActivatingRecoveryDay) return
    
    setIsActivatingRecoveryDay(true)
    try {
      const newRecoveryDay = await activateRecoveryDay(user.id)
      
      if (newRecoveryDay) {
        setIsRecoveryDay(true)
        setRecoveryDayData(newRecoveryDay)
        setCanUseRecoveryDay(false)
        setDailyTarget(RECOVERY_DAY_TARGET_MINUTES)
        
        // Post to group chat if in a group
        if (userProfile?.group_id) {
          await supabase
            .from('chat_messages')
            .insert({
              group_id: userProfile.group_id,
              user_id: user.id,
              message: `🧘 ${userProfile.username} is taking their weekly recovery day! Target: ${RECOVERY_DAY_TARGET_MINUTES} min of recovery.`,
              message_type: 'system',
              created_at: new Date().toISOString()
            })
        }
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }
      } else {
        alert('Could not activate recovery day. The database table may not exist yet - please run the migration first.')
      }
    } catch (error) {
      console.error('Error activating recovery day:', error)
      alert('Error activating recovery day. The database table may not exist yet - please run the migration.')
    } finally {
      setIsActivatingRecoveryDay(false)
    }
  }
  
  // Cancel/undo recovery day
  const handleCancelRecoveryDay = async () => {
    if (!user || isCancellingRecoveryDay) return
    
    setIsCancellingRecoveryDay(true)
    try {
      const success = await cancelRecoveryDay(user.id)
      
      if (success) {
        setIsRecoveryDay(false)
        setRecoveryDayData(null)
        setCanUseRecoveryDay(true)
        
        // Reload normal target
        if (userProfile) {
          await loadDailyTarget(user.id, userProfile)
        }
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      } else {
        alert('Could not cancel recovery day. Please try again.')
      }
    } catch (error) {
      console.error('Error cancelling recovery day:', error)
      alert('Error cancelling recovery day. Please try again.')
    } finally {
      setIsCancellingRecoveryDay(false)
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
  // On rest days (Monday), always use orange/insane styling
  const getModeColor = () => {
    if (isRestDay) {
      return '#f97316' // Orange for rest day challenge
    }
    switch (weekMode) {
      case 'sane':
        return '#3b82f6' // Blue for sane mode
      case 'insane':
        return '#ef4444' // Red for insane mode
      default:
        return '#3b82f6' // Default to blue
    }
  }
  
  // Effective mode for styling - rest days are always "insane" style
  const effectiveMode = isRestDay ? 'insane' : weekMode
  
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

  const checkFlexibleRestDay = async (userId: string, profile?: any) => {
    try {
      // Get current week's Monday using local timezone
      const mondayString = getThisWeekMondayString()
      
      // Also get the Monday Date object for days since start calculation and weekStartDate state
      const today = new Date()
      const currentDay = today.getDay()
      const daysToMonday = currentDay === 0 ? 6 : currentDay - 1 // 0 = Sunday, 1 = Monday
      const monday = new Date(today)
      monday.setDate(today.getDate() - daysToMonday)
      monday.setHours(0, 0, 0, 0)
      setWeekStartDate(monday)

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

      // First check if profile already has the flag set (earned via WorkoutModal or previous session)
      const profileToCheck = profile || userProfile
      if (profileToCheck?.has_flexible_rest_day) {
        setHasFlexibleRestDay(true)
        return
      }

      // Otherwise, check if user achieved double target on Monday
      const { data: mondayLogs } = await supabase
        .from('logs')
        .select('points')
        .eq('user_id', userId)
        .eq('date', mondayString)

      const mondayPoints = mondayLogs?.reduce((sum, log) => sum + log.points, 0) || 0
      
      // Get Monday's target using the proper calculation with user's week mode
      const groupId = profileToCheck?.group_id
      if (groupId) {
        const { data: group } = await supabase
          .from('groups')
          .select('start_date')
          .eq('id', groupId)
          .single()

        // Get group settings for rest days
        const { data: groupSettings } = await supabase
          .from('group_settings')
          .select('rest_days')
          .eq('group_id', groupId)
          .maybeSingle()

        const configuredRestDays = groupSettings?.rest_days || [1]

        if (group?.start_date) {
          const daysSinceStart = Math.floor((monday.getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24))
          
          // Use the user's week mode (SANE or INSANE) to calculate the proper target
          const userWeekMode = profileToCheck?.week_mode || 'sane'
          const mondayTarget = calculateDailyTarget({
            daysSinceStart,
            weekMode: userWeekMode,
            restDays: configuredRestDays,
            currentDayOfWeek: 1 // Monday
          })

          if (mondayPoints >= mondayTarget) {
            setHasFlexibleRestDay(true)
          }
        }
      }
    } catch (error) {
      console.error('Error checking flexible rest day:', error)
    }
  }

  // Check if user just earned a flexible rest day (called after logging workout on Monday)
  const checkFlexibleRestDayEarned = async () => {
    if (!user || !userProfile || hasFlexibleRestDay) return

    try {
      const today = new Date()
      const currentDayOfWeek = today.getDay()

      // Only check on rest days (Monday by default)
      if (!restDays.includes(currentDayOfWeek)) {
        return
      }

      // Get group start date
      if (!groupStartDate) return

      const daysSinceStart = getDaysSinceStart(groupStartDate)
      const baseTarget = 1 + Math.max(0, daysSinceStart)
      const restDayTarget = baseTarget * 2 // Rest day target is double

      // Check if user has met the target
      const totalPointsToday = getTotalPoints()

      if (totalPointsToday >= restDayTarget) {
        // Award flexible rest day - update profile
        const { error } = await supabase
          .from('profiles')
          .update({ has_flexible_rest_day: true })
          .eq('id', user.id)

        if (!error) {
          setHasFlexibleRestDay(true)

          // Post celebration to group chat
          if (userProfile.group_id) {
            await supabase
              .from('chat_messages')
              .insert({
                group_id: userProfile.group_id,
                user_id: user.id,
                message: `🔥 ${userProfile.username} crushed Monday's double target and earned a flexible rest day! 💪`,
                message_type: 'system',
                created_at: new Date().toISOString()
              })
          }

          // Show celebratory notification
          alert('🎉 AMAZING! You earned a flexible rest day by completing Monday\'s double target! Use it any day this week to skip your workout without penalty!')

          // Haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 100])
          }
        }
      }
    } catch (error) {
      console.error('Error checking flexible rest day earned:', error)
    }
  }

  const useFlexibleRestDay = async () => {
    if (!user || !weekStartDate || !userProfile || isUsingFlexibleRestDay) return

    setIsUsingFlexibleRestDay(true)
    try {
      const mondayString = weekStartDate.toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]

      // Record that the flexible rest day was used
      const { error: insertError } = await supabase
        .from('flexible_rest_days')
        .insert({
          user_id: user.id,
          week_start_date: mondayString,
          used_date: today,
          earned_date: mondayString
        })

      if (insertError) {
        console.error('Error using flexible rest day:', insertError)
        alert('Error using flexible rest day. Please try again.')
        return
      }

      // Auto-log points to fill bar to 100%
      const { error: logError } = await supabase
        .from('logs')
        .insert({
          user_id: user.id,
          exercise_id: 'flexible_rest_day',
          points: dailyTarget,
          date: today,
          count: 1,
          weight: 0,
          duration: 0,
          timestamp: Date.now()
        })

      if (logError) {
        console.error('Error logging flexible rest day points:', logError)
      }

      // Update the profile flag to false
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ has_flexible_rest_day: false })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
      }

      // Post to group chat
      if (userProfile.group_id) {
        await supabase
          .from('chat_messages')
          .insert({
            group_id: userProfile.group_id,
            user_id: user.id,
            message: `🛌 ${userProfile.username} used their flexible rest day and automatically earned ${dailyTarget} points!`,
            message_type: 'system',
            created_at: new Date().toISOString()
          })
      }

      // Reload today's logs to show the new points
      await loadTodaysLogs(user.id)
      await updateDailyCheckin()

      // Hide the button
      setHasFlexibleRestDay(false)
      
      // Show success message
      alert(`✅ Flexible rest day used! You earned ${dailyTarget} points automatically.`)

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100])
      }
      
    } catch (error) {
      console.error('Error using flexible rest day:', error)
      alert('Error using flexible rest day. Please try again.')
    } finally {
      setIsUsingFlexibleRestDay(false)
    }
  }

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      let profile = null
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        profile = profileData
        setUserProfile(profile)
        
        // Sync context with profile's week_mode to ensure consistency
        if (profile?.week_mode && profile.week_mode !== weekMode) {
          setWeekModeWithSync(profile.week_mode, user.id)
        }

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
        await checkFlexibleRestDay(user.id, profile)
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
      // Check if user has active recovery day first
      const activeRecoveryDay = await getActiveRecoveryDay(userId)
      if (activeRecoveryDay) {
        setIsRecoveryDay(true)
        setRecoveryDayData(activeRecoveryDay)
        setDailyTarget(RECOVERY_DAY_TARGET_MINUTES)
        return // Skip normal target calculation for recovery day
      }
      
      // Get group start date first
      const { data: group } = await supabase
        .from('groups')
        .select('start_date')
        .eq('id', profile.group_id)
        .single()

      if (group?.start_date) {
        // Store group start date for later use
        setGroupStartDate(group.start_date)
        
        // Get group settings for rest days
        const { data: groupSettings } = await supabase
          .from('group_settings')
          .select('rest_days, penalty_amount')
          .eq('group_id', profile.group_id)
          .maybeSingle()

        const configuredRestDays = groupSettings?.rest_days || [1]
        setRestDays(configuredRestDays)

        // Check if today is a rest day
        const todayDayOfWeek = new Date().getDay()
        const isTodayRestDay = configuredRestDays.includes(todayDayOfWeek)
        setIsRestDay(isTodayRestDay)

        // Calculate today's target using centralized utility
        // On rest days, we always use the doubled target (which is already handled by calculateDailyTarget)
        const daysSinceStart = getDaysSinceStart(group.start_date)
        // Use week_mode from profile (database) instead of context to avoid race condition
        // where context defaults to 'insane' before database value loads
        const userWeekMode = profile.week_mode || weekMode || 'insane'
        const target = calculateDailyTarget({
          daysSinceStart,
          weekMode: userWeekMode,
          restDays: configuredRestDays,
          isUserRecoveryDay: false
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

      // On user recovery days, only recovery minutes count towards completion
      const isComplete = isRecoveryDay
        ? recoveryPoints >= RECOVERY_DAY_TARGET_MINUTES
        : totalPoints >= dailyTarget

      await supabase
        .from('daily_checkins')
        .update({
          total_points: isRecoveryDay ? recoveryPoints : totalPoints,
          recovery_points: recoveryPoints,
          is_complete: isComplete
        })
        .eq('user_id', user.id)
        .eq('date', todayString)
      
      // Update recovery day progress if on recovery day
      if (isRecoveryDay && recoveryDayData) {
        await updateRecoveryDayProgress(user.id, recoveryPoints)
      }
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
    return Math.floor(parseFloat(quantity) * selectedExercise.points_per_unit)
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
    if (!selectedExercise || !quantity || !user) {
      console.log('[WorkoutLogger] Submission blocked:', { selectedExercise: !!selectedExercise, quantity, user: !!user });
      return;
    }

    const points = calculatePoints()
    const weightValue = parseFloat(weight) || 0

    const logData = {
      user_id: user.id,
      exercise_id: selectedExercise.id,
      count: selectedExercise.unit === 'rep' ? Math.floor(parseFloat(quantity)) : 0,
      weight: weightValue,
      duration: selectedExercise.is_time_based ? Math.floor(parseFloat(quantity)) : 0,
      points: Math.floor(points),
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now()
    };

    console.log('[WorkoutLogger] Submitting workout:', logData);

    try {
      const { error } = await supabase
        .from('logs')
        .insert(logData)

      if (error) {
        console.error('[WorkoutLogger] Insert error:', error);
        alert('Error logging workout: ' + error.message)
      } else {
        console.log('[WorkoutLogger] Workout logged successfully!');
        setQuantity('')
        setWeight('')
        setSelectedExercise(null)
        await loadTodaysLogs(user.id)
        await updateDailyCheckin()
        await checkIfRecoveryDay() // Refresh recovery day status
        
        // Check for automatic mode switching after exercise submission (skip on recovery day)
        if (!isRecoveryDay) {
          await checkAutomaticModeSwitch()
        }
        
        // Check if user just earned a flexible rest day (on rest days)
        await checkFlexibleRestDayEarned()
        
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
      
      {/* Daily Target Progress Header - New design system */}
      {dailyTarget > 0 && (
        <div className="sticky top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div
            className="relative h-16 bg-black overflow-hidden border-b border-white/10"
          >
            {/* Solid gradient progress bar - matching new design system */}
            <div
              className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out ${
                isRecoveryDay
                  ? 'bg-gradient-to-r from-green-500 via-green-600 to-emerald-600'
                  : effectiveMode === 'insane'
                    ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-red-600'
                    : 'bg-gradient-to-r from-blue-400 via-blue-500 to-purple-600'
              }`}
              style={{
                width: `${Math.min(100, (isRecoveryDay ? getRecoveryPoints() : getCappedTotalPoints()) / Math.max(1, dailyTarget) * 100)}%`,
                boxShadow: isRecoveryDay
                  ? '0 0 20px 3px rgba(34, 197, 94, 0.3), 0 0 10px 0px rgba(34, 197, 94, 0.4)'
                  : effectiveMode === 'insane'
                    ? '0 0 20px 3px rgba(249, 115, 22, 0.3), 0 0 10px 0px rgba(249, 115, 22, 0.4)'
                    : '0 0 20px 3px rgba(96, 165, 250, 0.25), 0 0 10px 0px rgba(79, 70, 229, 0.3)'
              }}
            />

            {/* Content */}
            <div className="relative h-full flex items-center justify-between px-6 text-white">
              <div className="flex flex-col items-start">
                <span className="font-bold text-xs tracking-widest uppercase" style={{
                  color: isRecoveryDay ? '#22c55e' : effectiveMode === 'insane' ? COLORS.orange.rgb.primary : COLORS.opal.rgb.primary
                }}>
                  {isRecoveryDay ? '🧘 RECOVERY DAY' : isRestDay ? '🔥 REST DAY CHALLENGE' : 'LOG WORKOUT'}
                </span>
                <span className="text-xs text-zinc-400 font-bold">
                  {isRecoveryDay 
                    ? `${getRecoveryPoints()}/${RECOVERY_DAY_TARGET_MINUTES} min`
                    : `${getCappedTotalPoints()}/${Math.max(1, dailyTarget)} pts`
                  }
                </span>
              </div>

              <div className="flex flex-col items-end justify-center">
                <span className="text-3xl font-black tracking-tight leading-none">
                  {Math.round((isRecoveryDay ? getRecoveryPoints() : getCappedTotalPoints()) / Math.max(1, dailyTarget) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-black pb-20">

{/* Recovery Day Active Banner */}
      {isRecoveryDay && (
        <div className="bg-black border-t border-white/10">
          <div className="px-4 py-4">
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🧘</span>
                  <div>
                    <div className="text-lg font-black text-green-400 uppercase tracking-wider">Recovery Day Active</div>
                    <div className="text-sm text-green-400/70">
                      Complete {RECOVERY_DAY_TARGET_MINUTES} minutes of recovery exercise
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCancelRecoveryDay}
                  disabled={isCancellingRecoveryDay}
                  className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isCancellingRecoveryDay ? 'Cancelling...' : 'Cancel'}
                </button>
              </div>
              <div className="bg-black/20 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, (getRecoveryPoints() / RECOVERY_DAY_TARGET_MINUTES) * 100)}%` }}
                />
              </div>
              <div className="mt-2 text-center text-sm font-bold text-green-400">
                {getRecoveryPoints() >= RECOVERY_DAY_TARGET_MINUTES
                  ? '✅ Recovery complete!'
                  : `${getRecoveryPoints()} / ${RECOVERY_DAY_TARGET_MINUTES} min`}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Special Day Options - Recovery Day & Flex Rest Day side by side */}
      {!isRecoveryDay && (
        <div className="bg-black border-t border-white/10">
          <div className="px-4 py-3 flex gap-2">
            {/* Recovery Day Button */}
            <button
              onClick={handleActivateRecoveryDay}
              disabled={isActivatingRecoveryDay || !canUseRecoveryDay}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                !canUseRecoveryDay
                  ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed border border-zinc-700/30'
                  : isActivatingRecoveryDay 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50' 
                    : 'bg-zinc-900/50 text-green-400 border border-green-500/20 hover:bg-zinc-800/70 hover:border-green-500/40 active:bg-green-500/10 active:border-green-500/50'
              }`}
            >
              <span className={`text-lg ${!canUseRecoveryDay ? 'opacity-40' : ''}`}>🧘</span>
              <span>{isActivatingRecoveryDay ? 'Activating...' : 'Recovery Day'}</span>
            </button>

            {/* Flex Rest Day Button */}
            <button 
              onClick={useFlexibleRestDay}
              disabled={isUsingFlexibleRestDay || !hasFlexibleRestDay}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                !hasFlexibleRestDay
                  ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed border border-zinc-700/30'
                  : isUsingFlexibleRestDay
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                    : 'bg-zinc-900/50 text-amber-400 border border-amber-500/20 hover:bg-zinc-800/70 hover:border-amber-500/40 active:bg-amber-500/10 active:border-amber-500/50'
              }`}
            >
              <span className={`text-lg ${!hasFlexibleRestDay ? 'opacity-40' : ''}`}>🎉</span>
              <span>{isUsingFlexibleRestDay ? 'Using...' : 'Flex Rest Day'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-0">
        {/* Quick Add Section - New design system */}
        <div id="quick-add" className="bg-black">
          <div className="py-4 px-4">
            <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-4">
              {isRecoveryDay ? 'Recovery Exercises' : 'Quick Add'}
            </h3>

            {/* Regular exercises - hidden on recovery day */}
            {!isRecoveryDay && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {popularExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => quickAddExercise(exercise)}
                    className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl transition-all duration-300 border border-white/5"
                  >
                    <div className="text-center">
                      <div className="text-2xl font-black mb-1" style={{
                        color: effectiveMode === 'insane' ? COLORS.orange.rgb.primary : COLORS.opal.rgb.primary
                      }}>
                        {exercise.points_per_unit}
                      </div>
                      <div className="text-sm font-bold mb-1 text-white">{exercise.name}</div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wide font-bold">per {exercise.unit}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Recovery exercises - always visible, prominent on recovery day */}
            {recoveryExercises.length > 0 && (
              <>
                {!isRecoveryDay && (
                  <div className="mb-2">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Recovery Exercises</span>
                  </div>
                )}
                <div className="space-y-2">
                  {recoveryExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => quickAddExercise(exercise, isRecoveryDay ? 15 : 5)}
                      className={`w-full text-white p-4 rounded-xl transition-all duration-300 border ${
                        isRecoveryDay 
                          ? 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30'
                          : 'bg-white/5 hover:bg-white/10 border-white/5'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="text-left">
                          <div className="text-sm font-bold text-white">{exercise.name}</div>
                          <div className="text-xs text-green-500/60 font-bold uppercase tracking-wide">Recovery</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-green-500">{exercise.points_per_unit}</div>
                          <div className="text-xs text-zinc-500 font-bold">per {exercise.unit}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Log Workout Section - New design system */}
        <div id="log-workout" className="bg-black">
          <div className="py-4 px-4">
            <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-4">Log Workout</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Exercise Selection */}
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2 font-bold">Exercise</label>
                <select
                  value={selectedExercise?.id || ''}
                  onChange={(e) => handleExerciseChange(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl outline-none transition-colors text-base bg-white/5 text-white ${
                    isRecoveryDay
                      ? 'border-green-500/30 focus:border-green-500/50'
                      : effectiveMode === 'insane'
                        ? 'border-white/10 focus:border-orange-500/50'
                        : 'border-white/10 focus:border-blue-400/50'
                  }`}
                >
                  <option value="">Select an exercise...</option>
                  {/* Only show recovery exercises on recovery day */}
                  {isRecoveryDay ? (
                    <optgroup label="Recovery Exercises">
                      {exercises.filter(ex => ex.type === 'recovery').map(exercise => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.name} ({exercise.points_per_unit} pts/{exercise.unit})
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    <>
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
                    </>
                  )}
                </select>
              </div>

              {selectedExercise && (
                <>
                  {/* Exercise Info Card */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-white">{selectedExercise.name}</div>
                        <div className="text-xs text-zinc-500 uppercase tracking-wide font-bold">
                          {selectedExercise.type} exercise
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black" style={{
                          color: selectedExercise.type === 'recovery'
                            ? '#22c55e'
                            : effectiveMode === 'insane' ? COLORS.orange.rgb.primary : COLORS.opal.rgb.primary
                        }}>
                          {selectedExercise.points_per_unit}
                        </div>
                        <div className="text-xs text-zinc-500 font-bold">per {selectedExercise.unit}</div>
                      </div>
                    </div>
                    {selectedExercise.type === 'recovery' && (
                      <div className="text-xs text-zinc-500 mt-2 border-t border-white/10 pt-2 font-bold">
                        Recovery exercises help with rest and mobility
                      </div>
                    )}
                  </div>

                  {/* Quantity Input */}
                  <div>
                    <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2 font-bold">
                      {selectedExercise.is_time_based ? 'Duration' : 'Quantity'} ({selectedExercise.unit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl outline-none transition-colors text-base bg-white/5 text-white ${effectiveMode === 'insane'
                        ? 'border-white/10 focus:border-orange-500/50'
                        : 'border-white/10 focus:border-blue-400/50'
                        }`}
                      placeholder={`Enter ${selectedExercise.is_time_based ? 'duration' : 'quantity'}`}
                      required
                    />
                  </div>

                  {/* Weight Input */}
                  {selectedExercise.is_weighted && (
                    <div>
                      <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2 font-bold">Weight (kg)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl outline-none transition-colors text-base bg-white/5 text-white ${effectiveMode === 'insane'
                          ? 'border-white/10 focus:border-orange-500/50'
                          : 'border-white/10 focus:border-blue-400/50'
                          }`}
                        placeholder="Enter weight (optional)"
                      />
                    </div>
                  )}

                  {/* Points Preview */}
                  {quantity && (
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500 font-bold">Points:</span>
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
                                    <span className="text-lg font-black text-orange-400">{effectiveRecoveryAdd}</span>
                                    <span className="text-xs text-zinc-500 ml-1 font-bold">/{rawPoints}</span>
                                    <div className="text-xs text-orange-400 mt-1 font-bold">25% cap</div>
                                  </div>
                                )
                              }
                            }

                            return <span className="text-lg font-black" style={{
                              color: effectiveMode === 'insane' ? COLORS.orange.rgb.primary : COLORS.opal.rgb.primary
                            }}>{rawPoints}</span>
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button - New design system */}
                  <button
                    type="submit"
                    className={`w-full font-black py-4 rounded-xl transition-all duration-300 ${effectiveMode === 'insane'
                      ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white'
                      : 'bg-gradient-to-r from-blue-400 via-blue-500 to-purple-600 text-white'
                      }`}
                    style={{
                      boxShadow: effectiveMode === 'insane'
                        ? '0 0 20px 3px rgba(249, 115, 22, 0.3), 0 0 10px 0px rgba(249, 115, 22, 0.4)'
                        : '0 0 20px 3px rgba(96, 165, 250, 0.25), 0 0 10px 0px rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    LOG WORKOUT
                  </button>
                </>
              )}
            </form>
          </div>
        </div>

        {/* Today's Summary Section - New design system */}
        <div id="todays-summary" className="bg-black">
          <div className="py-4 px-4">
            <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-4">Today's Summary</h3>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-white/5 p-4 border border-white/10 rounded-xl">
                <div className="text-center">
                  <div className="text-3xl font-black mb-1" style={{
                    color: effectiveMode === 'insane' ? COLORS.orange.rgb.primary : COLORS.opal.rgb.primary
                  }}>
                    {getTotalPoints()}
                  </div>
                  <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Total Points</div>
                </div>
              </div>
              <div className="bg-white/5 p-4 border border-white/10 rounded-xl">
                <div className="text-center">
                  <div className="text-3xl font-black mb-1" style={{
                    color: effectiveMode === 'insane' ? COLORS.orange.rgb.primary : COLORS.opal.rgb.primary
                  }}>
                    {getRecoveryPercentage()}%
                  </div>
                  <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Recovery</div>
                </div>
              </div>
            </div>

            {/* Recovery Warning */}
            {getRecoveryPercentage() > 25 && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 mb-4">
                <div className="text-center">
                  <div className="text-sm font-black mb-1 text-orange-400">Recovery Notice</div>
                  <div className="text-xs text-zinc-400 font-bold">
                    Recovery exercises exceed 25% of your daily total
                  </div>
                </div>
              </div>
            )}

            {/* Today's Workouts */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Today's Workouts</h4>
                <span className="text-xs text-zinc-600 font-bold">({todaysLogs.length})</span>
              </div>

              {todaysLogs.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-zinc-400 font-bold">No workouts logged yet</p>
                  <p className="text-zinc-500 text-sm mt-1 font-bold">Start your first workout above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todaysLogs.slice(0, 5).map(log => {
                    const effectivePoints = getEffectivePoints(log)
                    const progressPercentage = Math.min(100, (effectivePoints / Math.max(1, dailyTarget)) * 100)
                    const isRecoveryExercise = log.exercises?.type === 'recovery'

                    return (
                      <div key={log.id} className="bg-white/5 hover:bg-white/10 relative overflow-hidden rounded-xl border border-white/10 transition-all duration-300">
                        {/* Solid gradient background - matching new design system */}
                        <div
                          className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${isRecoveryExercise
                            ? 'bg-gradient-to-r from-green-500 via-green-600 to-emerald-600'
                            : effectiveMode === 'insane'
                              ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-red-600'
                              : 'bg-gradient-to-r from-blue-400 via-blue-500 to-purple-600'
                            }`}
                          style={{
                            width: `${progressPercentage}%`,
                            opacity: 0.3
                          }}
                        />

                        {/* Content */}
                        <div className="relative p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-bold text-white">{log.exercises?.name || 'Unknown'}</div>
                              <div className="text-xs text-zinc-400 font-bold">
                                {log.count || log.duration} {log.exercises?.unit || ''}
                                {isRecoveryExercise && (
                                  <span className="ml-2 text-xs text-green-500/60">• Recovery</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-black text-white">
                                {effectivePoints}
                              </div>
                              <div className="text-xs text-zinc-500 font-bold">pts</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {todaysLogs.length > 5 && (
                    <div className="text-center text-xs text-zinc-500 py-2 font-bold">
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