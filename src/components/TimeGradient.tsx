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
  
  // Static sunrise positioning - more to the left for morning feel
  // Keep it focused on left side like sunrise, not moving throughout day
  const blobPositionX = 25 // Fixed position for sunrise from left
  
  // Position gradient center closer to bottom
  const blobPositionY = 75

  return (
    <div className={`absolute inset-0 bg-black overflow-hidden ${className}`}>
      {/* Main organic sunrise/sunset blob */}
      <div
        className="absolute inset-0 opacity-95"
        style={{
          background: `
            radial-gradient(ellipse 700px 500px at ${blobPositionX}% ${blobPositionY}%, 
              ${colors.primary}90 0%, 
              ${colors.secondary}75 15%, 
              ${colors.accent}60 30%, 
              ${colors.primary}45 45%, 
              transparent 65%)
          `,
          filter: 'blur(0.5px)'
        }}
      />
      
      {/* Secondary organic blob layer */}
      <div
        className="absolute inset-0 opacity-75"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at ${blobPositionX + 20}% ${blobPositionY - 5}%, 
              ${colors.secondary}65 0%, 
              ${colors.accent}55 20%, 
              ${colors.primary}45 40%, 
              transparent 60%)
          `,
          filter: 'blur(1px)'
        }}
      />

      {/* Flowing organic shapes for movement */}
      <div
        className="absolute inset-0 opacity-65"
        style={{
          background: `
            radial-gradient(ellipse 450px 300px at ${blobPositionX - 15}% ${blobPositionY + 10}%, 
              ${colors.accent}60 0%, 
              ${colors.secondary}50 25%, 
              transparent 50%),
            radial-gradient(ellipse 400px 250px at ${blobPositionX + 30}% ${blobPositionY - 20}%, 
              ${colors.primary}55 0%, 
              ${colors.accent}45 30%, 
              transparent 55%)
          `,
          filter: 'blur(2px)'
        }}
      />

      {/* Subtle texture overlay */}
      <div 
        className="absolute inset-0 opacity-55"
        style={{
          background: `
            radial-gradient(ellipse 350px 200px at ${blobPositionX + 5}% ${blobPositionY}%, 
              ${colors.secondary}50 0%, 
              ${colors.primary}40 35%, 
              transparent 60%)
          `,
          filter: 'blur(3px)'
        }}
      />
    </div>
  )
}