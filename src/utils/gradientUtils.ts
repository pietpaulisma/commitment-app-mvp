// Shared gradient utility for progress bars
// Ensures consistent multi-colored gradients across all components

export interface LogEntry {
  points: number
  exercise_id: string
  exercises?: {
    type: string
  }
}

export const createCumulativeGradient = (todayLogs: LogEntry[], dailyTarget: number): string => {
  const total = todayLogs?.reduce((sum, log) => sum + log.points, 0) || 0
  
  // Debug logging
  console.log('=== Shared Gradient Debug ===')
  console.log('todayLogs:', todayLogs)
  console.log('total points:', total)
  console.log('dailyTarget:', dailyTarget)
  
  // Debug individual log entries to see exercise structure
  todayLogs?.forEach((log, index) => {
    console.log(`Log ${index}:`, {
      points: log.points,
      exercise_id: log.exercise_id,
      exercises: log.exercises,
      exerciseType: log.exercises?.type
    })
  })
  
  if (total === 0 || !todayLogs || todayLogs.length === 0) {
    console.log('No progress - returning black gradient')
    return `linear-gradient(to right, #000000 0%, #000000 100%)`
  }

  // Calculate the total progress percentage
  const totalProgress = Math.min(100, (total / dailyTarget) * 100)
  
  // Calculate actual exercise type percentages within the completed portion
  // Regular = everything that's NOT recovery or sports
  const recoveryPoints = todayLogs?.filter(log => log.exercises?.type === 'recovery')?.reduce((sum, log) => sum + log.points, 0) || 0
  const sportsPoints = todayLogs?.filter(log => log.exercises?.type === 'sports')?.reduce((sum, log) => sum + log.points, 0) || 0
  const regularPoints = total - recoveryPoints - sportsPoints
  
  // Debug exercise type breakdown
  console.log('Exercise breakdown:')
  console.log('- Regular points:', regularPoints)
  console.log('- Recovery points:', recoveryPoints) 
  console.log('- Sports points:', sportsPoints)
  console.log('- Total progress:', totalProgress + '%')
  
  const gradientStops = []
  let currentPercent = 0
  
  // Blue section (regular exercises) - Extended fade from 0.8 to 0.5
  if (regularPoints > 0) {
    const blueWidth = (regularPoints / total) * totalProgress
    gradientStops.push(`#3b82f6 ${currentPercent}%`)
    gradientStops.push(`#3b82f6dd ${currentPercent + blueWidth * 0.5}%`)
    gradientStops.push(`#3b82f666 ${currentPercent + blueWidth}%`)
    currentPercent += blueWidth
    console.log('- Blue section width:', blueWidth + '%')
  }
  
  // Green section (recovery) - Extended fade from 0.8 to 0.5
  if (recoveryPoints > 0) {
    const greenWidth = (recoveryPoints / total) * totalProgress
    gradientStops.push(`#22c55e ${currentPercent}%`)
    gradientStops.push(`#22c55edd ${currentPercent + greenWidth * 0.5}%`)
    gradientStops.push(`#22c55e66 ${currentPercent + greenWidth}%`)
    currentPercent += greenWidth
    console.log('- Green section width:', greenWidth + '%')
  }
  
  // Purple section (sports) - Extended fade from 0.8 to 0.5
  if (sportsPoints > 0) {
    const purpleWidth = (sportsPoints / total) * totalProgress
    gradientStops.push(`#a855f7 ${currentPercent}%`)
    gradientStops.push(`#a855f7dd ${currentPercent + purpleWidth * 0.5}%`)
    gradientStops.push(`#a855f766 ${currentPercent + purpleWidth}%`)
    currentPercent += purpleWidth
    console.log('- Purple section width:', purpleWidth + '%')
  }
  
  // Extended fade to black - increased from 5% to 10%
  const fadeStart = totalProgress - 10  // Start fade 10% before end (was 5%)
  if (fadeStart > 0) {
    gradientStops.push(`#00000066 ${fadeStart}%`)
  }
  gradientStops.push(`#000000 ${totalProgress}%`)
  gradientStops.push(`#000000 100%`)
  
  const gradient = `linear-gradient(to right, ${gradientStops.join(', ')})`
  console.log('Final gradient:', gradient)
  console.log('=== End Shared Gradient Debug ===')
  return gradient
}