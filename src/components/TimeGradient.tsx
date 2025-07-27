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
      {/* Main organic blob positioned by time */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(ellipse 800px 1200px at ${blobPositionX + Math.sin(animationOffset * 0.008) * 15}% ${50 + Math.cos(animationOffset * 0.006) * 20}%, 
              ${colors.primary}20 0%, 
              ${colors.secondary}15 25%, 
              ${colors.accent}10 40%, 
              transparent 65%),
            radial-gradient(ellipse 600px 900px at ${blobPositionX + 30 + Math.cos(animationOffset * 0.01) * 20}% ${30 + Math.sin(animationOffset * 0.007) * 25}%, 
              ${colors.secondary}18 0%, 
              ${colors.accent}12 30%, 
              transparent 55%)
          `,
          transform: `rotate(${animationOffset * 0.015}deg) scale(${1 + Math.sin(animationOffset * 0.004) * 0.1})`,
          transition: 'background 3s ease-in-out'
        }}
      />
      
      {/* Secondary flowing organic shapes */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(ellipse 500px 800px at ${blobPositionX - 20 + Math.sin(animationOffset * 0.012) * 25}% ${70 + Math.cos(animationOffset * 0.009) * 15}%, 
              ${colors.accent}15 0%, 
              ${colors.primary}10 35%, 
              transparent 60%),
            radial-gradient(ellipse 700px 400px at ${blobPositionX + 40 + Math.cos(animationOffset * 0.007) * 18}% ${20 + Math.sin(animationOffset * 0.011) * 22}%, 
              ${colors.secondary}12 0%, 
              transparent 45%)
          `,
          transform: `rotate(${-animationOffset * 0.01}deg) scale(${1 + Math.cos(animationOffset * 0.005) * 0.08})`,
          transition: 'background 3s ease-in-out'
        }}
      />

      {/* Subtle organic texture layer */}
      <div 
        className="absolute inset-0 opacity-25"
        style={{
          background: `
            radial-gradient(ellipse 400px 600px at ${blobPositionX + 10 + Math.sin(animationOffset * 0.006) * 12}% ${40 + Math.cos(animationOffset * 0.008) * 18}%, 
              ${colors.primary}08 0%, 
              ${colors.secondary}06 25%, 
              transparent 50%),
            radial-gradient(circle 300px at ${blobPositionX + 50 + Math.cos(animationOffset * 0.009) * 15}% ${60 + Math.sin(animationOffset * 0.005) * 20}%, 
              ${colors.accent}06 0%, 
              transparent 35%)
          `,
          filter: 'blur(3px)',
          transform: `scale(${1 + Math.sin(animationOffset * 0.003) * 0.05}) rotate(${animationOffset * 0.005}deg)`
        }}
      />
    </div>
  )
}