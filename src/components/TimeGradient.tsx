'use client'

import { useState, useEffect } from 'react'

interface TimeGradientProps {
  className?: string
}

export default function TimeGradient({ className = '' }: TimeGradientProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [animationOffset, setAnimationOffset] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Create slow, continuous animation
    const animationTimer = setInterval(() => {
      setAnimationOffset(prev => (prev + 0.5) % 360)
    }, 100) // Update every 100ms for smooth movement

    return () => clearInterval(animationTimer)
  }, [])

  const getTimeBasedColors = () => {
    const hour = currentTime.getHours()
    
    if (hour >= 5 && hour < 8) {
      // Dawn/Sunrise: Orange and yellow tones
      return {
        primary: '#ff7b00',
        secondary: '#ffb800', 
        accent: '#ffd700'
      }
    } else if (hour >= 8 && hour < 12) {
      // Morning: Yellow to light blue
      return {
        primary: '#ffd700',
        secondary: '#87ceeb',
        accent: '#b6e5ff'
      }
    } else if (hour >= 12 && hour < 18) {
      // Afternoon: Blues
      return {
        primary: '#4682b4',
        secondary: '#2e86de',
        accent: '#54a0ff'
      }
    } else if (hour >= 18 && hour < 21) {
      // Evening/Sunset: Warm sunset colors
      return {
        primary: '#ff6b6b',
        secondary: '#ff8e53',
        accent: '#ff6b9d'
      }
    } else {
      // Night: Deep blues and purples
      return {
        primary: '#3742fa',
        secondary: '#5f27cd',
        accent: '#341f97'
      }
    }
  }

  const colors = getTimeBasedColors()
  
  // Calculate day progress (0 = start of day, 1 = end of day)
  const hour = currentTime.getHours()
  const minute = currentTime.getMinutes()
  const dayProgress = (hour * 60 + minute) / (24 * 60) // 0 to 1
  
  // Calculate gradient position based on day progress
  // Morning (0-0.5): gradient on left, black on right
  // Evening (0.5-1): gradient on right, black on left
  const gradientPosition = dayProgress * 100 // 0% to 100%
  const gradientWidth = 40 // Thinner gradient, more black
  
  return (
    <div className={`absolute inset-0 bg-black overflow-hidden ${className}`}>
      {/* Time-based directional gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(90deg, 
              ${dayProgress < 0.5 
                ? `${colors.primary}25 0%, ${colors.secondary}20 ${gradientWidth * 0.3}%, ${colors.accent}15 ${gradientWidth}%, transparent ${gradientWidth + 10}%`
                : `transparent 0%, transparent ${100 - gradientWidth - 10}%, ${colors.accent}15 ${100 - gradientWidth}%, ${colors.secondary}20 ${100 - gradientWidth * 0.3}%, ${colors.primary}25 100%`
              }
            )
          `,
          transform: `translateX(${dayProgress < 0.5 ? 0 : gradientPosition - 100}%)`,
          transition: 'all 2s ease-in-out'
        }}
      />
      
      {/* Organic flowing accent blobs - more subtle */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at ${dayProgress * 100 + Math.sin(animationOffset * 0.01) * 10}% ${30 + Math.cos(animationOffset * 0.008) * 10}%, 
              ${colors.primary}15 0%, 
              ${colors.secondary}10 30%, 
              transparent 50%),
            radial-gradient(ellipse 400px 600px at ${(dayProgress * 100) + Math.cos(animationOffset * 0.012) * 15}% ${70 + Math.sin(animationOffset * 0.009) * 10}%, 
              ${colors.secondary}12 0%, 
              ${colors.accent}08 35%, 
              transparent 55%)
          `,
          transform: `rotate(${animationOffset * 0.01}deg)`,
          transition: 'background 2s ease-in-out'
        }}
      />

      {/* Subtle texture overlay positioned with time */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            radial-gradient(circle at ${dayProgress * 100 + Math.sin(animationOffset * 0.005) * 5}% ${45 + Math.cos(animationOffset * 0.008) * 8}%, 
              ${colors.secondary}06 0%, 
              transparent 30%)
          `,
          filter: 'blur(2px)',
          transform: `scale(${1 + Math.sin(animationOffset * 0.003) * 0.03})`
        }}
      />
    </div>
  )
}