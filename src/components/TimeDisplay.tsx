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
  const timeString = currentTime.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit', 
    second: '2-digit'
  })

  return (
    <div className={`bg-gray-800 rounded-2xl p-4 ${className}`}>
      {/* TIME label */}
      <div className="text-xs font-bold text-gray-400 mb-2 tracking-wider">TIME</div>
      
      {/* Time display with gradient fill */}
      <div 
        className="text-4xl font-black tracking-wider"
        style={{
          background: `linear-gradient(135deg, 
            ${colors.primary} 0%, 
            ${colors.secondary} 50%, 
            ${colors.accent} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        {timeString}
      </div>
    </div>
  )
}