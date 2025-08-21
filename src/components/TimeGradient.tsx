'use client'

import { useState, useEffect } from 'react'

interface TimeGradientProps {
  className?: string
  intensity?: number // Multiplier for opacity (default 1.0, use 1.2 for +20% opacity)
}

export default function TimeGradient({ className = '', intensity = 1.0 }: TimeGradientProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [gradientVariation, setGradientVariation] = useState({
    size1: { width: 120, height: 70 },
    size2: { width: 110, height: 65 },
    size3: { width: 100, height: 60 },
    pos1: 65,
    pos2: 60,
    pos3: 70,
    offsetX1: 25,
    offsetX2: 45,
    offsetX3: 35
  })

  useEffect(() => {
    // Randomize gradient shape on mount
    setGradientVariation({
      size1: { 
        width: 100 + Math.random() * 40, // 100-140%
        height: 60 + Math.random() * 20   // 60-80%
      },
      size2: { 
        width: 90 + Math.random() * 30,   // 90-120%
        height: 55 + Math.random() * 20   // 55-75%
      },
      size3: { 
        width: 80 + Math.random() * 40,   // 80-120%
        height: 50 + Math.random() * 25   // 50-75%
      },
      pos1: 55 + Math.random() * 20,      // 55-75%
      pos2: 50 + Math.random() * 20,      // 50-70%
      pos3: 60 + Math.random() * 20,      // 60-80%
      offsetX1: 15 + Math.random() * 20,  // 15-35%
      offsetX2: 35 + Math.random() * 20,  // 35-55%
      offsetX3: 25 + Math.random() * 20   // 25-45%
    })
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  const getTimeBasedColors = () => {
    const hour = currentTime.getHours()
    const minute = currentTime.getMinutes()
    
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
  
  // Time-based gradient colors selected
  
  // Calculate day progress (0 = start of day, 1 = end of day)
  const hour = currentTime.getHours()
  const minute = currentTime.getMinutes()
  const dayProgress = (hour * 60 + minute) / (24 * 60) // 0 to 1
  
  // Static sunrise positioning - more to the left for morning feel
  // Keep it focused on left side like sunrise, not moving throughout day
  const blobPositionX = 25 // Fixed position for sunrise from left
  
  // Position gradient higher up for more visibility
  const blobPositionY = 60

  return (
    <div className={`absolute inset-0 bg-black overflow-hidden ${className}`}>
      {/* Half-screen time-based gradient - similar to onboarding */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse ${gradientVariation.size1.width}% ${gradientVariation.size1.height}% at ${blobPositionX + gradientVariation.offsetX1 - 25}% ${gradientVariation.pos1}%, 
              ${colors.primary} 0%, 
              ${colors.primary}CC 20%, 
              ${colors.primary}80 40%, 
              transparent 60%),
            radial-gradient(ellipse ${gradientVariation.size2.width}% ${gradientVariation.size2.height}% at ${blobPositionX + gradientVariation.offsetX2 - 20}% ${gradientVariation.pos2}%, 
              ${colors.secondary}DD 0%, 
              ${colors.secondary}99 25%, 
              transparent 50%),
            radial-gradient(ellipse ${gradientVariation.size3.width}% ${gradientVariation.size3.height}% at ${blobPositionX + gradientVariation.offsetX3 - 15}% ${gradientVariation.pos3}%, 
              ${colors.accent}BB 0%, 
              ${colors.accent}77 30%, 
              transparent 50%)
          `,
          opacity: intensity
        }}
      />
    </div>
  )
}