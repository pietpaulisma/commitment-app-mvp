type WeekMode = 'sane' | 'insane'

// Recovery day constants
export const RECOVERY_DAY_TARGET_MINUTES = 15

interface TargetCalculationParams {
  daysSinceStart: number
  weekMode: WeekMode
  restDays?: number[]
  currentDayOfWeek?: number
  isUserRecoveryDay?: boolean // New: whether user has activated their recovery day
}

export function calculateDailyTarget({
  daysSinceStart,
  weekMode,
  restDays = [1], // Default Monday
  currentDayOfWeek = new Date().getDay(),
  isUserRecoveryDay = false
}: TargetCalculationParams): number {
  // If user has activated their recovery day, target is 15 minutes of recovery
  if (isUserRecoveryDay) {
    return RECOVERY_DAY_TARGET_MINUTES
  }
  
  // Base target calculation: 1 + days since start
  let target = 1 + Math.max(0, daysSinceStart)
  
  // Apply week mode logic for groups 448+ days old
  if (daysSinceStart >= 448 && weekMode === 'sane') {
    // Sane mode: weekly progression starting from day 448
    target = 448 + Math.floor((daysSinceStart - 448) / 7)
  }
  // Insane mode continues with daily progression (no change needed)
  
  // Adjust target based on day type
  if (restDays.includes(currentDayOfWeek)) {
    target = target * 2 // Rest day - double points to earn flexible rest day
  }
  
  return target
}

export function getDaysSinceStart(startDate: string): number {
  return Math.floor((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get the Monday (start) of the current week
 * Used to track weekly recovery day usage
 */
export function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Adjust for Sunday (0) to get to Monday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

/**
 * Get today's date as YYYY-MM-DD string in local timezone
 */
export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if recovery day can be used today
 * Recovery days can be used any day except Monday (day 1)
 */
export function canUseRecoveryDayToday(): boolean {
  const dayOfWeek = new Date().getDay()
  // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
  // Recovery day can be used Tue-Sun (days 0, 2, 3, 4, 5, 6)
  return dayOfWeek !== 1 // Not Monday
}
