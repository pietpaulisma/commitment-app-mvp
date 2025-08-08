type WeekMode = 'sane' | 'insane'

interface TargetCalculationParams {
  daysSinceStart: number
  weekMode: WeekMode
  restDays?: number[]
  recoveryDays?: number[]
  currentDayOfWeek?: number
}

export function calculateDailyTarget({
  daysSinceStart,
  weekMode,
  restDays = [1], // Default Monday
  recoveryDays = [5], // Default Friday
  currentDayOfWeek = new Date().getDay()
}: TargetCalculationParams): number {
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
  } else if (recoveryDays.includes(currentDayOfWeek)) {
    target = Math.round(target * 0.25) // Recovery day - 25% of normal target, must be recovery exercises
  }
  
  return target
}

export function getDaysSinceStart(startDate: string): number {
  return Math.floor((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
}