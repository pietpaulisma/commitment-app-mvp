'use client'

import { useState, useEffect } from 'react'

interface TimeDisplayProps {
  className?: string
}

export default function TimeDisplay({ className = '' }: TimeDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second

    return () => clearInterval(timer)
  }, [])

  const getTimeBasedColors = () => {
    const hour = currentTime.getHours()
    
    if (hour >= 0 && hour < 5) {
      // 🌃 Late Night (00:00 – 05:00): Quiet, introspective, low energy
      return {
        primary: '#1A2980',  // Midnight blue
        secondary: '#26D0CE', // Soft teal
        accent: '#1A2980'    // Midnight blue accent
      }
    } else if (hour >= 5 && hour < 7) {
      // 🌅 Dawn (05:00 – 07:00): Fresh, awakening, gentle light
      return {
        primary: '#2C3E50',  // Deep blue
        secondary: '#FD746C', // Soft coral sunrise
        accent: '#FF9068'    // Warm coral
      }
    } else if (hour >= 7 && hour < 11) {
      // 🌞 Morning (07:00 – 11:00): Energetic, bright, productive
      return {
        primary: '#FFFACD',  // Bright creamy yellow
        secondary: '#FFFF99', // Bright light yellow
        accent: '#FFFFFF'    // Pure white accent
      }
    } else if (hour >= 11 && hour < 14) {
      // ☀️ Midday (11:00 – 14:00): Peak alertness, high brightness
      return {
        primary: '#FFFF66',  // Bright vibrant yellow
        secondary: '#FFFF99', // Light bright yellow
        accent: '#FFFFFF'    // Pure white accent
      }
    } else if (hour >= 14 && hour < 17) {
      // 🌤 Afternoon (14:00 – 17:00): Warm, mellow, starting to wind down
      return {
        primary: '#FFFACD',  // Light yellow cream
        secondary: '#FFFFE0', // Light yellow
        accent: '#FFFFFF'    // Pure white accent
      }
    } else if (hour >= 17 && hour < 20) {
      // 🌇 Evening (17:00 – 20:00): Reflective, slowing down, golden hour
      return {
        primary: '#FF9A8B',  // Soft red-orange
        secondary: '#FF6A88', // Dusty pink
        accent: '#FF99AC'    // Calm cherry
      }
    } else {
      // 🌌 Night (20:00 – 00:00): Calm, restful, focused
      return {
        primary: '#434343',  // Smoky gray
        secondary: '#000000', // Deep black
        accent: '#434343'    // Smoky gray accent
      }
    }
  }

  const colors = getTimeBasedColors()
  
  // Calculate time elapsed and remaining
  const hour = currentTime.getHours()
  const minute = currentTime.getMinutes()
  const second = currentTime.getSeconds()
  const totalSecondsElapsed = hour * 3600 + minute * 60 + second
  const totalSecondsInDay = 24 * 3600
  const timeElapsedPercentage = (totalSecondsElapsed / totalSecondsInDay) * 100
  const timeRemainingPercentage = ((totalSecondsInDay - totalSecondsElapsed) / totalSecondsInDay) * 100
  
  // Dynamic color based on time remaining
  const getProgressBarColors = () => {
    const hoursRemaining = (totalSecondsInDay - totalSecondsElapsed) / 3600
    
    if (hoursRemaining > 18) {
      // Start of day (18+ hours left) - Bright white/very light
      return {
        gradient: 'linear-gradient(90deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%)',
        shadow: '#ffffff'
      }
    } else if (hoursRemaining > 12) {
      // Morning to midday (12-18 hours left) - Light blue
      return {
        gradient: 'linear-gradient(90deg, #e3f2fd 0%, #90caf9 50%, #42a5f5 100%)',
        shadow: '#42a5f5'
      }
    } else if (hoursRemaining > 8) {
      // Midday to afternoon (8-12 hours left) - Blue
      return {
        gradient: 'linear-gradient(90deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
        shadow: '#1976d2'
      }
    } else if (hoursRemaining > 6) {
      // Late afternoon (6-8 hours left) - Light orange
      return {
        gradient: 'linear-gradient(90deg, #ffb74d 0%, #ff9800 50%, #f57c00 100%)',
        shadow: '#ff9800'
      }
    } else if (hoursRemaining > 4) {
      // Evening (4-6 hours left) - Orange
      return {
        gradient: 'linear-gradient(90deg, #f57c00 0%, #ef6c00 50%, #e65100 100%)',
        shadow: '#f57c00'
      }
    } else if (hoursRemaining > 2) {
      // Late evening (2-4 hours left) - Dark orange to red
      return {
        gradient: 'linear-gradient(90deg, #e65100 0%, #d84315 50%, #bf360c 100%)',
        shadow: '#d84315'
      }
    } else {
      // Last 2 hours - Bright red
      return {
        gradient: 'linear-gradient(90deg, #f44336 0%, #d32f2f 50%, #b71c1c 100%)',
        shadow: '#f44336'
      }
    }
  }
  
  const progressColors = getProgressBarColors()
  const isLastTwoHours = (totalSecondsInDay - totalSecondsElapsed) / 3600 <= 2
  
  // Format time remaining as "00:00:00"
  const secondsRemaining = totalSecondsInDay - totalSecondsElapsed
  const hoursRemaining = Math.floor(secondsRemaining / 3600)
  const minutesRemaining = Math.floor((secondsRemaining % 3600) / 60)
  const secsRemaining = secondsRemaining % 60
  const timeRemainingString = `${hoursRemaining.toString().padStart(2, '0')}:${minutesRemaining.toString().padStart(2, '0')}:${secsRemaining.toString().padStart(2, '0')}`

  return (
    <div className={`relative ${className}`}>
      {/* Time remaining display */}
      <div className="flex justify-end items-center mb-4 px-4">
        <div className="text-5xl font-thin text-white drop-shadow-lg">
          {timeRemainingString}
        </div>
      </div>
      
      {/* Thick glowing line - countdown bar (time remaining) */}
      <div className="px-4">
        <div 
          className="h-2 transition-all duration-1000 relative"
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px'
          }}
        >
          <div 
            className={`absolute left-0 top-0 h-full transition-all duration-1000 ${isLastTwoHours ? 'animate-pulse' : ''}`}
            style={{
              width: `${Math.max(2, timeRemainingPercentage)}%`,
              background: progressColors.gradient,
              boxShadow: `
                0 0 4px ${progressColors.shadow}80, 
                0 0 8px ${progressColors.shadow}60, 
                0 0 16px ${progressColors.shadow}40,
                0 0 32px ${progressColors.shadow}20
              `,
              borderRadius: '4px',
              filter: 'brightness(1.2)'
            }}
          />
          
          {/* White dot indicator at current position (end of remaining time) */}
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-1000"
            style={{
              left: `${Math.max(0, timeRemainingPercentage)}%`,
              width: '8px',
              height: '8px',
              background: 'white',
              borderRadius: '50%',
              boxShadow: '0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.4)',
              zIndex: 10
            }}
          />
        </div>
      </div>
    </div>
  )
}