import { supabase } from '@/lib/supabase'
import { getWeekStartDate, getTodayDateString, RECOVERY_DAY_TARGET_MINUTES } from './targetCalculation'

export interface UserRecoveryDay {
  id: string
  user_id: string
  week_start_date: string
  used_date: string
  recovery_minutes: number
  is_complete: boolean
  created_at: string
  updated_at: string
}

/**
 * Check if user has already used their recovery day this week
 */
export async function hasUsedRecoveryDayThisWeek(userId: string): Promise<boolean> {
  const weekStart = getWeekStartDate()
  
  const { data, error } = await supabase
    .from('user_recovery_days')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start_date', weekStart)
    .maybeSingle()
  
  if (error) {
    console.error('Error checking recovery day usage:', error)
    return false
  }
  
  return !!data
}

/**
 * Check if user has an active recovery day today
 */
export async function getActiveRecoveryDay(userId: string): Promise<UserRecoveryDay | null> {
  const today = getTodayDateString()
  
  const { data, error } = await supabase
    .from('user_recovery_days')
    .select('*')
    .eq('user_id', userId)
    .eq('used_date', today)
    .maybeSingle()
  
  if (error) {
    console.error('Error fetching active recovery day:', error)
    return null
  }
  
  return data
}

/**
 * Activate recovery day for today
 */
export async function activateRecoveryDay(userId: string): Promise<UserRecoveryDay | null> {
  const weekStart = getWeekStartDate()
  const today = getTodayDateString()
  
  const { data, error } = await supabase
    .from('user_recovery_days')
    .insert({
      user_id: userId,
      week_start_date: weekStart,
      used_date: today,
      recovery_minutes: 0,
      is_complete: false
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error activating recovery day:', error)
    return null
  }
  
  return data
}

/**
 * Update recovery day progress (minutes logged)
 */
export async function updateRecoveryDayProgress(
  userId: string, 
  minutes: number
): Promise<UserRecoveryDay | null> {
  const today = getTodayDateString()
  const isComplete = minutes >= RECOVERY_DAY_TARGET_MINUTES
  
  const { data, error } = await supabase
    .from('user_recovery_days')
    .update({
      recovery_minutes: minutes,
      is_complete: isComplete,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('used_date', today)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating recovery day progress:', error)
    return null
  }
  
  return data
}

/**
 * Cancel/undo recovery day for today
 * Returns true if successful, false otherwise
 */
export async function cancelRecoveryDay(userId: string): Promise<boolean> {
  const today = getTodayDateString()
  
  const { error } = await supabase
    .from('user_recovery_days')
    .delete()
    .eq('user_id', userId)
    .eq('used_date', today)
  
  if (error) {
    console.error('Error cancelling recovery day:', error)
    return false
  }
  
  return true
}

/**
 * Get recovery day status for multiple users (for squad display)
 */
export async function getRecoveryDayStatusForUsers(userIds: string[]): Promise<Map<string, UserRecoveryDay>> {
  const today = getTodayDateString()
  
  const { data, error } = await supabase
    .from('user_recovery_days')
    .select('*')
    .in('user_id', userIds)
    .eq('used_date', today)
  
  if (error) {
    console.error('Error fetching recovery day status for users:', error)
    return new Map()
  }
  
  const statusMap = new Map<string, UserRecoveryDay>()
  data?.forEach(record => {
    statusMap.set(record.user_id, record)
  })
  
  return statusMap
}

/**
 * Check if a specific date was a recovery day for a user
 * Used for chart displays
 */
export async function wasRecoveryDay(userId: string, date: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_recovery_days')
    .select('id')
    .eq('user_id', userId)
    .eq('used_date', date)
    .maybeSingle()
  
  if (error) {
    console.error('Error checking if date was recovery day:', error)
    return false
  }
  
  return !!data
}

/**
 * Get all recovery days for a user in a date range
 * Used for chart displays
 */
export async function getRecoveryDaysInRange(
  userId: string, 
  startDate: string, 
  endDate: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('user_recovery_days')
    .select('used_date')
    .eq('user_id', userId)
    .gte('used_date', startDate)
    .lte('used_date', endDate)
  
  if (error) {
    console.error('Error fetching recovery days in range:', error)
    return new Set()
  }
  
  return new Set(data?.map(d => d.used_date) || [])
}
