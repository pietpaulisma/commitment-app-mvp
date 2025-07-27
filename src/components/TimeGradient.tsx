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
  
  // Position main organic blob based on day progress
  const blobPositionX = dayProgress < 0.5 
    ? 20 + (dayProgress * 40) // Morning: blob starts left, moves toward center
    : 60 + ((dayProgress - 0.5) * 40) // Evening: blob in center-right area

  return (
    <div className={`absolute inset-0 bg-black overflow-hidden ${className}`}>
      {/* Main organic sunrise/sunset blob */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: `
            radial-gradient(circle 1000px at ${blobPositionX + Math.sin(animationOffset * 0.008) * 20}% ${80 + Math.cos(animationOffset * 0.006) * 30}%, 
              ${colors.primary}40 0%, 
              ${colors.secondary}30 20%, 
              ${colors.accent}20 35%, 
              ${colors.primary}15 50%, 
              transparent 70%)
          `,
          transform: `scale(${1.2 + Math.sin(animationOffset * 0.004) * 0.15}) rotate(${animationOffset * 0.01}deg)`,
          transition: 'background 4s ease-in-out',
          filter: 'blur(1px)'
        }}
      />
      
      {/* Secondary organic blob layer */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: `
            radial-gradient(circle 800px at ${blobPositionX + 50 + Math.cos(animationOffset * 0.009) * 25}% ${60 + Math.sin(animationOffset * 0.007) * 35}%, 
              ${colors.secondary}35 0%, 
              ${colors.accent}25 25%, 
              ${colors.primary}18 45%, 
              transparent 65%)
          `,
          transform: `scale(${1.1 + Math.cos(animationOffset * 0.006) * 0.12}) rotate(${-animationOffset * 0.008}deg)`,
          transition: 'background 4s ease-in-out',
          filter: 'blur(2px)'
        }}
      />

      {/* Flowing organic shapes for movement */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(circle 600px at ${blobPositionX - 30 + Math.sin(animationOffset * 0.012) * 30}% ${90 + Math.cos(animationOffset * 0.009) * 20}%, 
              ${colors.accent}30 0%, 
              ${colors.secondary}20 30%, 
              transparent 55%),
            radial-gradient(circle 400px at ${blobPositionX + 80 + Math.cos(animationOffset * 0.011) * 25}% ${40 + Math.sin(animationOffset * 0.008) * 30}%, 
              ${colors.primary}25 0%, 
              ${colors.accent}15 35%, 
              transparent 60%)
          `,
          transform: `scale(${0.9 + Math.sin(animationOffset * 0.005) * 0.1}) rotate(${animationOffset * 0.006}deg)`,
          transition: 'background 3s ease-in-out',
          filter: 'blur(4px)'
        }}
      />

      {/* Subtle texture overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(circle 500px at ${blobPositionX + 20 + Math.sin(animationOffset * 0.007) * 15}% ${70 + Math.cos(animationOffset * 0.005) * 25}%, 
              ${colors.secondary}20 0%, 
              ${colors.primary}12 40%, 
              transparent 65%)
          `,
          filter: 'blur(6px)',
          transform: `scale(${1.3 + Math.cos(animationOffset * 0.003) * 0.08}) rotate(${animationOffset * 0.003}deg)`
        }}
      />
    </div>
  )
}