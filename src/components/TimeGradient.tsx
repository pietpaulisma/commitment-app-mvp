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
    const minute = currentTime.getMinutes()
    
    if (hour >= 2 && hour < 5) {
      // Pre-Dawn (2:00–5:00): "Blue Hour Ghost" / "Steel Bloom"
      return {
        primary: '#4a5568',  // Desaturated indigo
        secondary: '#6b7280', // Ice grey
        accent: '#9ca3af'    // Cold mauve
      }
    } else if (hour >= 5 && hour < 6 || (hour === 6 && minute < 30)) {
      // Early Morning (5:00–6:30): "Mist Quartz" / "Frostlight"
      return {
        primary: '#6366f1',  // Slate blue
        secondary: '#c4b5fd', // Brighter smoky lavender
        accent: '#fecaca'    // Warmer silver-pink
      }
    } else if ((hour === 6 && minute >= 30) || hour === 7 || (hour === 8 && minute === 0)) {
      // Sunrise (6:30–8:00): "Peach Ember" / "Aurora Bloom" 
      return {
        primary: '#f87171',  // Warmer dusky rose
        secondary: '#f59e0b', // Richer golden apricot
        accent: '#22d3ee'    // Brighter sky cyan
      }
    } else if (hour >= 8 && hour < 11) {
      // Late Morning (8:00–11:00): "Lemon Sky" / "Daybreak Linen"
      return {
        primary: '#fde047',  // Brighter buttercream yellow
        secondary: '#93c5fd', // Clearer powder blue
        accent: '#86efac'    // Fresh pale mint
      }
    } else if (hour >= 11 && hour < 14) {
      // Noon (11:00–14:00): "Zenith Chrome" / "Solar Pulse"
      return {
        primary: '#0284c7',  // Vivid cerulean
        secondary: '#f8fafc', // Searing white
        accent: '#f59e0b'    // White-hot amber
      }
    } else if (hour >= 14 && hour < 17) {
      // Late Afternoon (14:00–17:00): "Bright Daylight" / "Azure Sun"
      return {
        primary: '#0ea5e9',  // Bright sky blue
        secondary: '#fbbf24', // Vibrant golden yellow
        accent: '#06b6d4'    // Electric cyan
      }
    } else if (hour >= 17 && hour < 19 || (hour === 19 && minute < 30)) {
      // Sunset (17:00–19:30): "Saffron Mirage" / "Crimson Dusk"
      return {
        primary: '#dc2626',  // Deep crimson
        secondary: '#ea580c', // Burnt orange
        accent: '#f97316'    // Saffron/hot pink
      }
    } else if ((hour === 19 && minute >= 30) || hour === 20 || (hour === 21 && minute === 0)) {
      // Nightfall (19:30–21:00): "Indigo Spill" / "Twilight Velvet"
      return {
        primary: '#1e3a8a',  // Deep cobalt
        secondary: '#581c87', // Deep purple (wine-black)
        accent: '#f59e0b'    // Rose gold
      }
    } else {
      // Night (21:00–2:00): "Obsidian Echo" / "Midnight Petrol"
      return {
        primary: '#1f2937',  // Graphite blue
        secondary: '#111827', // Ink violet
        accent: '#374151'    // Ultramarine fog
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
        className="absolute inset-0 opacity-100"
        style={{
          background: `
            radial-gradient(ellipse 700px 500px at ${blobPositionX}% ${blobPositionY}%, 
              ${colors.primary}95 0%, 
              ${colors.secondary}85 15%, 
              ${colors.accent}70 30%, 
              ${colors.primary}55 45%, 
              transparent 65%)
          `,
          filter: 'blur(0.5px)'
        }}
      />
      
      {/* Secondary organic blob layer */}
      <div
        className="absolute inset-0 opacity-85"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at ${blobPositionX + 20}% ${blobPositionY - 5}%, 
              ${colors.secondary}75 0%, 
              ${colors.accent}65 20%, 
              ${colors.primary}55 40%, 
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