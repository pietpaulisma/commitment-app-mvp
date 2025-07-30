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
  
  // Blue section (regular exercises) - With 10% blend transition
  if (regularPoints > 0) {
    const blueWidth = (regularPoints / total) * totalProgress
    const blendZone = Math.min(blueWidth * 0.1, 5) // 10% of section or max 5%
    
    gradientStops.push(`#3b82f6 ${currentPercent}%`)
    gradientStops.push(`#3b82f6dd ${currentPercent + blueWidth * 0.5}%`)
    
    // If there's a next color, create blend zone
    if (recoveryPoints > 0) {
      gradientStops.push(`#3b82f666 ${currentPercent + blueWidth - blendZone}%`)
      gradientStops.push(`#2ea370 ${currentPercent + blueWidth}%`) // Blue-green blend color
    } else {
      gradientStops.push(`#3b82f666 ${currentPercent + blueWidth}%`)
    }
    
    currentPercent += blueWidth
    console.log('- Blue section width:', blueWidth + '%')
  }
  
  // Green section (recovery) - With 10% blend transition
  if (recoveryPoints > 0) {
    const greenWidth = (recoveryPoints / total) * totalProgress
    const blendZone = Math.min(greenWidth * 0.1, 5) // 10% of section or max 5%
    
    // Start with blend color if following blue
    if (regularPoints > 0) {
      gradientStops.push(`#2ea370 ${currentPercent}%`) // Blue-green blend
    }
    
    gradientStops.push(`#22c55e ${currentPercent + (regularPoints > 0 ? blendZone : 0)}%`)
    gradientStops.push(`#22c55edd ${currentPercent + greenWidth * 0.5}%`)
    
    // If there's a next color, create blend zone
    if (sportsPoints > 0) {
      gradientStops.push(`#22c55e66 ${currentPercent + greenWidth - blendZone}%`)
      gradientStops.push(`#6f4fb0 ${currentPercent + greenWidth}%`) // Green-purple blend color
    } else {
      gradientStops.push(`#22c55e66 ${currentPercent + greenWidth}%`)
    }
    
    currentPercent += greenWidth
    console.log('- Green section width:', greenWidth + '%')
  }
  
  // Purple section (sports) - With 10% blend transition
  if (sportsPoints > 0) {
    const purpleWidth = (sportsPoints / total) * totalProgress
    
    // Start with blend color if following green
    if (recoveryPoints > 0) {
      gradientStops.push(`#6f4fb0 ${currentPercent}%`) // Green-purple blend
    }
    
    const blendZone = Math.min(purpleWidth * 0.1, 5) // 10% of section or max 5%
    gradientStops.push(`#a855f7 ${currentPercent + (recoveryPoints > 0 ? blendZone : 0)}%`)
    gradientStops.push(`#a855f7dd ${currentPercent + purpleWidth * 0.5}%`)
    gradientStops.push(`#a855f766 ${currentPercent + purpleWidth}%`)
    currentPercent += purpleWidth
    console.log('- Purple section width:', purpleWidth + '%')
  }
  
  // Add smooth fade out extending 20% beyond progress end
  const fadeOutStart = totalProgress
  const fadeOutEnd = Math.min(100, totalProgress + 20)
  
  // Create seamless transition from last color to black
  if (fadeOutEnd > fadeOutStart) {
    gradientStops.push(`#00000033 ${fadeOutStart + 5}%`) // Very light fade start
    gradientStops.push(`#00000066 ${fadeOutStart + 10}%`) // Medium fade
    gradientStops.push(`#000000 ${fadeOutEnd}%`) // Full black
  } else {
    gradientStops.push(`#000000 ${fadeOutStart}%`)
  }
  gradientStops.push(`#000000 100%`)
  
  const gradient = `linear-gradient(to right, ${gradientStops.join(', ')})`
  console.log('Final gradient:', gradient)
  console.log('=== End Shared Gradient Debug ===')
  return gradient
}