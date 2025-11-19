// Utility functions for penalty system

import { PendingPenalty } from '@/types/penalties'

/**
 * Calculate hours remaining until penalty deadline
 */
export function calculateHoursRemaining(deadline: string): number {
  const deadlineDate = new Date(deadline)
  const now = new Date()
  const diffMs = deadlineDate.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return Math.max(0, diffHours)
}

/**
 * Check if penalty deadline has passed
 */
export function isPenaltyExpired(deadline: string): boolean {
  return new Date(deadline) < new Date()
}

/**
 * Add computed fields to penalty object
 */
export function enrichPenalty(penalty: PendingPenalty): PendingPenalty {
  return {
    ...penalty,
    hours_remaining: calculateHoursRemaining(penalty.deadline),
    is_expired: isPenaltyExpired(penalty.deadline)
  }
}

/**
 * Format date for display (e.g., "January 20, 2025")
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format date short (e.g., "Jan 20")
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format time remaining (e.g., "23h 45m" or "EXPIRED")
 */
export function formatTimeRemaining(hours: number): string {
  if (hours <= 0) return 'EXPIRED'
  if (hours < 1) return `${Math.floor(hours * 60)}m`
  if (hours < 24) {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${Math.floor(hours)}h`
}

/**
 * Get friendly reason label
 */
export function getReasonLabel(category: string): string {
  const labels: Record<string, string> = {
    sick: 'Sick',
    work: 'Work Emergency',
    family: 'Family Situation',
    training_rest: 'Training Rest',
    other: 'Other'
  }
  return labels[category] || category
}

/**
 * Get reason emoji
 */
export function getReasonEmoji(category: string): string {
  const emojis: Record<string, string> = {
    sick: '🤒',
    work: '💼',
    family: '👨‍👩‍👧‍👦',
    training_rest: '😴',
    other: '💬'
  }
  return emojis[category] || '💬'
}

/**
 * Calculate deadline (24 hours from now)
 */
export function calculateDeadline(fromDate: Date = new Date()): string {
  const deadline = new Date(fromDate)
  deadline.setHours(deadline.getHours() + 24)
  return deadline.toISOString()
}

/**
 * Get yesterday's date string (YYYY-MM-DD)
 */
export function getYesterdayDateString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  return yesterday.toISOString().split('T')[0]
}

/**
 * Check if a date is a rest day
 */
export function isRestDay(date: Date, restDay1: number | null, restDay2: number | null): boolean {
  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
  return dayOfWeek === restDay1 || dayOfWeek === restDay2
}

/**
 * Sort penalties by deadline (most urgent first)
 */
export function sortPenaltiesByUrgency(penalties: PendingPenalty[]): PendingPenalty[] {
  return [...penalties].sort((a, b) => {
    const aDeadline = new Date(a.deadline).getTime()
    const bDeadline = new Date(b.deadline).getTime()
    return aDeadline - bDeadline
  })
}
