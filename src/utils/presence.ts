/**
 * Utility functions for user presence and online status
 */

export const ONLINE_THRESHOLD_MINUTES = 5

/**
 * Determines if a user is considered online based on their last_seen timestamp
 * @param lastSeen - ISO timestamp string or null
 * @returns boolean indicating if user is online
 */
export function isUserOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false
  
  const lastSeenTime = new Date(lastSeen).getTime()
  const now = Date.now()
  const thresholdMs = ONLINE_THRESHOLD_MINUTES * 60 * 1000
  
  return (now - lastSeenTime) < thresholdMs
}

/**
 * Gets a human-readable last seen status
 * @param lastSeen - ISO timestamp string or null
 * @returns string like "Online", "5 minutes ago", etc.
 */
export function getLastSeenStatus(lastSeen: string | null): string {
  if (!lastSeen) return 'Never'
  
  if (isUserOnline(lastSeen)) {
    return 'Online'
  }
  
  const lastSeenTime = new Date(lastSeen).getTime()
  const now = Date.now()
  const diffMs = now - lastSeenTime
  
  const minutes = Math.floor(diffMs / (60 * 1000))
  const hours = Math.floor(diffMs / (60 * 60 * 1000))
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  } else {
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }
}

/**
 * Sorts users by online status (online first) then by last_seen (most recent first)
 * @param users - Array of user objects with last_seen property
 * @returns Sorted array of users
 */
export function sortUsersByPresence<T extends { last_seen: string | null }>(users: T[]): T[] {
  return [...users].sort((a, b) => {
    const aOnline = isUserOnline(a.last_seen)
    const bOnline = isUserOnline(b.last_seen)
    
    // Online users first
    if (aOnline && !bOnline) return -1
    if (!aOnline && bOnline) return 1
    
    // Within same online status, sort by most recent last_seen
    const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0
    const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0
    
    return bTime - aTime
  })
}