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

  // Calculate time remaining until end of day (for countdown fill)
  const hour = currentTime.getHours()
  const minute = currentTime.getMinutes()
  const second = currentTime.getSeconds()
  const totalSecondsElapsed = hour * 3600 + minute * 60 + second
  const totalSecondsInDay = 24 * 3600
  const timeRemainingPercentage = ((totalSecondsInDay - totalSecondsElapsed) / totalSecondsInDay) * 100

  return (
    <div 
      className={`relative bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl ${className}`}
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
      }}
    >
      {/* Gradient background fill - countdown bar (time remaining) */}
      <div 
        className="absolute right-0 top-0 bottom-0 transition-all duration-1000"
        style={{
          width: `${Math.max(8, timeRemainingPercentage)}%`,
          background: `linear-gradient(135deg, 
            ${colors.primary}60 0%, 
            ${colors.secondary}60 50%, 
            ${colors.accent}60 100%)`,
          borderTopLeftRadius: '0px',
          borderBottomLeftRadius: '0px',
          borderTopRightRadius: '16px',
          borderBottomRightRadius: '16px'
        }}
      />
      
      <div className="relative z-10 py-6 px-4 h-full">
        {/* TIME label */}
        <h3 className="text-xs font-light text-white/80 mb-4 uppercase tracking-widest drop-shadow" style={{ fontFamily: 'Helvetica, system-ui, -apple-system, sans-serif' }}>
          TIME
        </h3>
        
        {/* Time display with white text */}
        <div className="flex flex-col justify-center items-center text-center h-full -mt-10">
          <div className="text-3xl font-black tracking-wider text-white drop-shadow-lg">
            {timeString}
          </div>
        </div>
      </div>
    </div>
  )
}