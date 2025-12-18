/**
 * Helper functions for seasonal tracking
 */

export type Season = 'Winter' | 'Spring' | 'Summer' | 'Fall'

/**
 * Get the season for a given date
 * Winter: Dec-Feb, Spring: Mar-May, Summer: Jun-Aug, Fall: Sep-Nov
 */
export function getSeason(date: Date): Season {
  const month = date.getMonth() // 0-11

  if (month === 11 || month === 0 || month === 1) {
    return 'Winter'
  } else if (month >= 2 && month <= 4) {
    return 'Spring'
  } else if (month >= 5 && month <= 7) {
    return 'Summer'
  } else {
    return 'Fall'
  }
}

/**
 * Get the year for a season (handles Winter spanning two calendar years)
 * For Winter, we use the year of January (not December)
 */
export function getSeasonYear(date: Date): number {
  const month = date.getMonth()
  const year = date.getFullYear()

  // If it's December, count it as next year's Winter
  if (month === 11) {
    return year + 1
  }

  return year
}

/**
 * Get current season and year
 */
export function getCurrentSeason(): { season: Season; year: number } {
  const now = new Date()
  return {
    season: getSeason(now),
    year: getSeasonYear(now)
  }
}

/**
 * Get season emoji
 */
export function getSeasonEmoji(season: Season): string {
  const emojiMap: Record<Season, string> = {
    Winter: '❄️',
    Spring: '🌸',
    Summer: '☀️',
    Fall: '🍂'
  }
  return emojiMap[season]
}

/**
 * Get week start and end dates (week starts on Monday)
 */
export function getWeekDates(date: Date = new Date()): { start: Date; end: Date } {
  const current = new Date(date)
  const day = current.getDay()

  // Calculate days to subtract to get to Monday (day 1)
  // If Sunday (0), go back 6 days; otherwise go back (day - 1) days
  const daysToMonday = day === 0 ? 6 : day - 1

  const weekStart = new Date(current)
  weekStart.setDate(current.getDate() - daysToMonday)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return { start: weekStart, end: weekEnd }
}

/**
 * Get previous week's dates
 */
export function getPreviousWeekDates(): { start: Date; end: Date } {
  const today = new Date()
  const lastWeek = new Date(today)
  lastWeek.setDate(today.getDate() - 7)

  return getWeekDates(lastWeek)
}

/**
 * Check if today is Monday (week reset day)
 */
export function isMonday(date: Date = new Date()): boolean {
  return date.getDay() === 1
}

/**
 * Get ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
  const tempDate = new Date(date.valueOf())
  const dayNum = (date.getDay() + 6) % 7
  tempDate.setDate(tempDate.getDate() - dayNum + 3)
  const firstThursday = tempDate.valueOf()
  tempDate.setMonth(0, 1)
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7)
  }
  return 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000)
}

/**
 * Format week display (e.g., "Week 12" or "Mar 20-26")
 */
export function formatWeekDisplay(weekStart: Date, weekEnd: Date): string {
  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' })
  const startDay = weekStart.getDate()
  const endDay = weekEnd.getDate()
  return `${startMonth} ${startDay}-${endDay}`
}

/**
 * Format season display
 */
export function formatSeasonDisplay(season: Season, year: number): string {
  return `${getSeasonEmoji(season)} ${season} ${year}`
}
