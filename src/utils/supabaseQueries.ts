import { supabase } from '@/lib/supabase'

// Shared query functions to eliminate duplication

export const getDailyLogs = async (userId: string, date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('logs')
    .select('*, exercises(*)')
    .eq('user_id', userId)
    .eq('date', targetDate)
    .order('created_at', { ascending: false })
    
  if (error) throw error
  return data || []
}

export const getDailyPoints = async (userId: string, date?: string) => {
  const logs = await getDailyLogs(userId, date)
  return logs.reduce((sum, log) => sum + log.points, 0)
}

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    
  if (error) throw error
  return data
}

export const getGroupSettings = async (groupId: string) => {
  const { data, error } = await supabase
    .from('group_settings')
    .select('*')
    .eq('group_id', groupId)
    .maybeSingle()
    
  if (error) throw error
  return data
}

export const getGroupInfo = async (groupId: string) => {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single()
    
  if (error) throw error
  return data
}

export const getExercises = async () => {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name')
    
  if (error) throw error
  return data || []
}

export const checkIfRecoveryDay = async (groupId: string) => {
  try {
    const groupSettings = await getGroupSettings(groupId)
    const today = new Date()
    const currentDayOfWeek = today.getDay()
    const recoveryDays = groupSettings?.recovery_days || [5]
    
    return recoveryDays.includes(currentDayOfWeek)
  } catch (error) {
    console.error('Error checking recovery day:', error)
    return false
  }
}

export const getWorkoutStats = async (userId: string) => {
  const { data: workouts, error } = await supabase
    .from('logs')
    .select('points, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    
  if (error) throw error
  
  if (!workouts || workouts.length === 0) {
    return {
      total_workouts: 0,
      total_points: 0,
      avg_points_per_workout: 0,
      first_workout: null,
      last_workout: null,
      best_day: null,
      current_streak: 0
    }
  }
  
  const totalWorkouts = workouts.length
  const totalPoints = workouts.reduce((sum, w) => sum + w.points, 0)
  const avgPointsPerWorkout = Math.round(totalPoints / totalWorkouts)
  
  return {
    total_workouts: totalWorkouts,
    total_points: totalPoints,
    avg_points_per_workout: avgPointsPerWorkout,
    first_workout: workouts[0]?.created_at,
    last_workout: workouts[totalWorkouts - 1]?.created_at,
    best_day: null, // Could be calculated if needed
    current_streak: 0 // Could be calculated if needed
  }
}