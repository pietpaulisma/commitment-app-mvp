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
  
  // Calculate time remaining until end of day
  const hour = currentTime.getHours()
  const minute = currentTime.getMinutes()
  const second = currentTime.getSeconds()
  const totalSecondsElapsed = hour * 3600 + minute * 60 + second
  const totalSecondsInDay = 24 * 3600
  const timeRemainingPercentage = ((totalSecondsInDay - totalSecondsElapsed) / totalSecondsInDay) * 100
  
  // Format time remaining as "00:00:00"
  const secondsRemaining = totalSecondsInDay - totalSecondsElapsed
  const hoursRemaining = Math.floor(secondsRemaining / 3600)
  const minutesRemaining = Math.floor((secondsRemaining % 3600) / 60)
  const secsRemaining = secondsRemaining % 60
  const timeRemainingString = `${hoursRemaining.toString().padStart(2, '0')}:${minutesRemaining.toString().padStart(2, '0')}:${secsRemaining.toString().padStart(2, '0')}`

  return (
    <div className={`relative ${className}`}>
      {/* Time remaining display */}
      <div className="flex justify-end items-center mb-4">
        <div className="text-5xl font-thin text-white drop-shadow-lg">
          {timeRemainingString}
        </div>
      </div>
      
      {/* Thick glowing line - countdown bar (time remaining) */}
      <div 
        className="h-2 transition-all duration-1000 relative"
        style={{
          width: '100%',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px'
        }}
      >
        <div 
          className="absolute left-0 top-0 h-full transition-all duration-1000"
          style={{
            width: `${Math.max(2, timeRemainingPercentage)}%`,
            background: `linear-gradient(90deg, 
              ${colors.primary} 0%, 
              ${colors.secondary} 50%, 
              ${colors.accent} 100%)`,
            boxShadow: `
              0 0 4px ${colors.secondary}, 
              0 0 8px ${colors.secondary}80, 
              0 0 16px ${colors.primary}60,
              0 0 32px ${colors.primary}40
            `,
            borderRadius: '4px',
            filter: 'brightness(1.2)'
          }}
        />
        
        {/* White dot indicator at current position */}
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
  )
}