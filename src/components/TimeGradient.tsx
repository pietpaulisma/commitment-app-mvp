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
  
  return (
    <div className={`absolute inset-0 bg-black overflow-hidden ${className}`}>
      {/* Organic flowing gradient blobs */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: `
            radial-gradient(ellipse 800px 600px at ${50 + Math.sin(animationOffset * 0.01) * 20}% ${30 + Math.cos(animationOffset * 0.008) * 15}%, 
              ${colors.primary}20 0%, 
              ${colors.secondary}15 25%, 
              transparent 50%),
            radial-gradient(ellipse 600px 800px at ${30 + Math.cos(animationOffset * 0.012) * 25}% ${70 + Math.sin(animationOffset * 0.009) * 20}%, 
              ${colors.secondary}25 0%, 
              ${colors.accent}20 30%, 
              transparent 55%),
            radial-gradient(ellipse 700px 500px at ${80 + Math.sin(animationOffset * 0.007) * 15}% ${40 + Math.cos(animationOffset * 0.011) * 25}%, 
              ${colors.accent}18 0%, 
              ${colors.primary}12 35%, 
              transparent 60%)
          `,
          transform: `rotate(${animationOffset * 0.02}deg)`,
          transition: 'background 2s ease-in-out'
        }}
      />
      
      {/* Secondary flowing layer for more complexity */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(ellipse 900px 400px at ${40 + Math.cos(animationOffset * 0.006) * 30}% ${60 + Math.sin(animationOffset * 0.013) * 20}%, 
              ${colors.primary}15 0%, 
              transparent 45%),
            radial-gradient(ellipse 500px 700px at ${70 + Math.sin(animationOffset * 0.009) * 18}% ${20 + Math.cos(animationOffset * 0.007) * 22}%, 
              ${colors.accent}20 0%, 
              transparent 50%)
          `,
          transform: `rotate(${-animationOffset * 0.015}deg) scale(1.1)`,
          transition: 'background 2s ease-in-out'
        }}
      />

      {/* Subtle texture overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(circle at ${60 + Math.sin(animationOffset * 0.005) * 10}% ${45 + Math.cos(animationOffset * 0.008) * 12}%, 
              ${colors.secondary}08 0%, 
              transparent 40%)
          `,
          filter: 'blur(1px)',
          transform: `scale(${1 + Math.sin(animationOffset * 0.003) * 0.05})`
        }}
      />
    </div>
  )
}