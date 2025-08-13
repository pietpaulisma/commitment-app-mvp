// Shared color utility functions

export const getCategoryColor = (type: string, exerciseId: string, forProgressBar = false) => {
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

export const getUserColor = (email?: string) => {
  if (!email) return '#3b82f6' // Default blue
  
  // Generate consistent color based on email hash
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
  ]
  
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

export const getUserColorHover = (baseColor: string) => {
  // Convert hex to RGB and darken it
  const hex = baseColor.replace('#', '')
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 20)
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 20)
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 20)
  return `rgb(${r}, ${g}, ${b})`
}

export const getUserChatColor = (email: string, role: string) => {
  // Use role color for admins, hash-based color for regular users
  if (role === 'supreme_admin') return 'text-purple-400'
  if (role === 'group_admin') return 'text-blue-400'
  
  // Generate consistent color based on email hash for regular users
  const colors = [
    'text-red-400',
    'text-orange-400', 
    'text-yellow-400',
    'text-green-400',
    'text-cyan-400',
    'text-blue-400',
    'text-violet-400',
    'text-pink-400'
  ]
  
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}