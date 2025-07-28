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
  
  // Calculate gradient center position based on time of day
  // 3am (0.125) = left (15%), 11am (0.458) = center (50%), 11pm (0.958) = right (85%)
  // Map time of day to horizontal position
  const blobPositionX = 15 + (dayProgress * 70) // Linear progression from 15% to 85%
  
  // Position gradient center closer to bottom (around 70-80% down)
  const blobPositionY = 75

  return (
    <div className={`absolute inset-0 bg-black overflow-hidden ${className}`}>
      {/* Main organic sunrise/sunset blob */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: `
            radial-gradient(ellipse 1000px 700px at ${blobPositionX + Math.sin(animationOffset * 0.008) * 15}% ${blobPositionY + Math.cos(animationOffset * 0.006) * 10}%, 
              ${colors.primary}80 0%, 
              ${colors.secondary}65 20%, 
              ${colors.accent}50 35%, 
              ${colors.primary}35 50%, 
              transparent 70%)
          `,
          transform: `scale(${1.2 + Math.sin(animationOffset * 0.004) * 0.1}) rotate(${animationOffset * 0.008}deg)`,
          transition: 'background 4s ease-in-out',
          filter: 'blur(1px)'
        }}
      />
      
      {/* Secondary organic blob layer */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: `
            radial-gradient(ellipse 800px 550px at ${blobPositionX + 30 + Math.cos(animationOffset * 0.009) * 20}% ${blobPositionY - 5 + Math.sin(animationOffset * 0.007) * 15}%, 
              ${colors.secondary}55 0%, 
              ${colors.accent}45 25%, 
              ${colors.primary}35 45%, 
              transparent 65%)
          `,
          transform: `scale(${1.1 + Math.cos(animationOffset * 0.006) * 0.08}) rotate(${-animationOffset * 0.006}deg)`,
          transition: 'background 4s ease-in-out',
          filter: 'blur(2px)'
        }}
      />

      {/* Flowing organic shapes for movement */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at ${blobPositionX - 20 + Math.sin(animationOffset * 0.012) * 25}% ${blobPositionY + 15 + Math.cos(animationOffset * 0.009) * 15}%, 
              ${colors.accent}50 0%, 
              ${colors.secondary}40 30%, 
              transparent 55%),
            radial-gradient(ellipse 500px 350px at ${blobPositionX + 40 + Math.cos(animationOffset * 0.011) * 20}% ${blobPositionY - 25 + Math.sin(animationOffset * 0.008) * 18}%, 
              ${colors.primary}45 0%, 
              ${colors.accent}35 35%, 
              transparent 60%)
          `,
          transform: `scale(${0.9 + Math.sin(animationOffset * 0.005) * 0.1}) rotate(${animationOffset * 0.005}deg)`,
          transition: 'background 3s ease-in-out',
          filter: 'blur(4px)'
        }}
      />

      {/* Subtle texture overlay */}
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          background: `
            radial-gradient(ellipse 500px 300px at ${blobPositionX + 10 + Math.sin(animationOffset * 0.007) * 15}% ${blobPositionY + Math.cos(animationOffset * 0.005) * 18}%, 
              ${colors.secondary}40 0%, 
              ${colors.primary}30 40%, 
              transparent 65%)
          `,
          filter: 'blur(6px)',
          transform: `scale(${1.3 + Math.cos(animationOffset * 0.003) * 0.08}) rotate(${animationOffset * 0.003}deg)`
        }}
      />
    </div>
  )
}