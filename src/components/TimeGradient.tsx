'use client'

import { useState, useEffect } from 'react'

interface TimeGradientProps {
  className?: string
}

export default function TimeGradient({ className = '' }: TimeGradientProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  const getTimeGradient = () => {
    const hour = currentTime.getHours()
    const minute = currentTime.getMinutes()
    const timeProgress = (hour * 60 + minute) / (24 * 60) // 0 to 1 progress through the day

    // Calculate horizontal position (0% to 100%) based on time progression
    const horizontalPosition = timeProgress * 100

    let gradient = ''
    let backgroundPosition = `${horizontalPosition}% 0%`

    if (hour >= 5 && hour < 8) {
      // Dawn/Sunrise: Orange to yellow
      gradient = 'linear-gradient(135deg, #ff7b00, #ffb800, #ffd700, #fff2a6)'
    } else if (hour >= 8 && hour < 12) {
      // Morning: Yellow to light blue
      gradient = 'linear-gradient(135deg, #ffd700, #87ceeb, #b6e5ff, #e0f6ff)'
    } else if (hour >= 12 && hour < 18) {
      // Afternoon: Light blue to deeper blue
      gradient = 'linear-gradient(135deg, #87ceeb, #4682b4, #2e86de, #54a0ff)'
    } else if (hour >= 18 && hour < 21) {
      // Evening/Sunset: Blue to orange/pink
      gradient = 'linear-gradient(135deg, #4682b4, #ff6b6b, #ff8e53, #ff6b9d)'
    } else {
      // Night: Dark blue to purple
      gradient = 'linear-gradient(135deg, #2c3e50, #3742fa, #5f27cd, #341f97)'
    }

    return {
      background: gradient,
      backgroundSize: '200% 200%',
      backgroundPosition: backgroundPosition,
    }
  }

  return (
    <div 
      className={`absolute inset-0 transition-all duration-1000 ease-in-out ${className}`}
      style={getTimeGradient()}
    >
      {/* Subtle overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20" />
    </div>
  )
}