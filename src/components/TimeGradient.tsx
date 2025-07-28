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
  // More black area, smaller gradient blobs
  const gradientWidth = 30 // Even thinner gradient, more black
  
  // Position main organic blob based on day progress
  // Keep gradient much smaller and more to the edges
  const blobPositionX = dayProgress < 0.3 
    ? 10 + (dayProgress * 20) // Early morning: small blob on left
    : dayProgress < 0.7
    ? 80 + ((dayProgress - 0.3) * 15) // Midday: small blob on right  
    : 85 + ((dayProgress - 0.7) * 10) // Evening/night: small blob far right

  return (
    <div className={`absolute inset-0 bg-black overflow-hidden ${className}`}>
      {/* Main organic sunrise/sunset blob */}
      <div
        className="absolute inset-0 opacity-85"
        style={{
          background: `
            radial-gradient(circle 1200px at ${blobPositionX + Math.sin(animationOffset * 0.008) * 20}% ${80 + Math.cos(animationOffset * 0.006) * 25}%, 
              ${colors.primary}60 0%, 
              ${colors.secondary}45 20%, 
              ${colors.accent}35 35%, 
              ${colors.primary}25 50%, 
              transparent 70%)
          `,
          transform: `scale(${1.2 + Math.sin(animationOffset * 0.004) * 0.15}) rotate(${animationOffset * 0.01}deg)`,
          transition: 'background 4s ease-in-out',
          filter: 'blur(1px)'
        }}
      />
      
      {/* Secondary organic blob layer */}
      <div
        className="absolute inset-0 opacity-65"
        style={{
          background: `
            radial-gradient(circle 800px at ${blobPositionX + 50 + Math.cos(animationOffset * 0.009) * 25}% ${65 + Math.sin(animationOffset * 0.007) * 30}%, 
              ${colors.secondary}40 0%, 
              ${colors.accent}30 25%, 
              ${colors.primary}20 45%, 
              transparent 65%)
          `,
          transform: `scale(${1.1 + Math.cos(animationOffset * 0.006) * 0.12}) rotate(${-animationOffset * 0.008}deg)`,
          transition: 'background 4s ease-in-out',
          filter: 'blur(2px)'
        }}
      />

      {/* Flowing organic shapes for movement */}
      <div
        className="absolute inset-0 opacity-55"
        style={{
          background: `
            radial-gradient(circle 600px at ${blobPositionX - 30 + Math.sin(animationOffset * 0.012) * 30}% ${90 + Math.cos(animationOffset * 0.009) * 20}%, 
              ${colors.accent}35 0%, 
              ${colors.secondary}25 30%, 
              transparent 55%),
            radial-gradient(circle 450px at ${blobPositionX + 80 + Math.cos(animationOffset * 0.011) * 25}% ${45 + Math.sin(animationOffset * 0.008) * 30}%, 
              ${colors.primary}30 0%, 
              ${colors.accent}20 35%, 
              transparent 60%)
          `,
          transform: `scale(${0.9 + Math.sin(animationOffset * 0.005) * 0.1}) rotate(${animationOffset * 0.006}deg)`,
          transition: 'background 3s ease-in-out',
          filter: 'blur(4px)'
        }}
      />

      {/* Subtle texture overlay */}
      <div 
        className="absolute inset-0 opacity-45"
        style={{
          background: `
            radial-gradient(circle 500px at ${blobPositionX + 20 + Math.sin(animationOffset * 0.007) * 15}% ${70 + Math.cos(animationOffset * 0.005) * 25}%, 
              ${colors.secondary}25 0%, 
              ${colors.primary}18 40%, 
              transparent 65%)
          `,
          filter: 'blur(6px)',
          transform: `scale(${1.3 + Math.cos(animationOffset * 0.003) * 0.08}) rotate(${animationOffset * 0.003}deg)`
        }}
      />
    </div>
  )
}