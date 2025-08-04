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
        primary: '#FFEEAD',  // Light buttery yellow
        secondary: '#FF6F61', // Optimistic coral
        accent: '#FFEEAD'    // Light buttery yellow accent
      }
    } else if (hour >= 11 && hour < 14) {
      // ☀️ Midday (11:00 – 14:00): Peak alertness, high brightness
      return {
        primary: '#FDEB71',  // Radiant yellow
        secondary: '#F8D800', // Golden sunbeam
        accent: '#FDEB71'    // Radiant yellow accent
      }
    } else if (hour >= 14 && hour < 17) {
      // 🌤 Afternoon (14:00 – 17:00): Warm, mellow, starting to wind down
      return {
        primary: '#FAD0C4',  // Peach-pink
        secondary: '#FFD1FF', // Soft violet haze
        accent: '#FAD0C4'    // Peach-pink accent
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
            radial-gradient(ellipse 900px 600px at ${blobPositionX}% ${blobPositionY}%, 
              ${colors.primary} 0%, 
              ${colors.secondary} 25%, 
              ${colors.accent} 50%, 
              ${colors.primary}80 70%, 
              transparent 85%)
          `,
          filter: 'blur(1px)'
        }}
      />
      
      {/* Secondary organic blob layer */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: `
            radial-gradient(ellipse 800px 500px at ${blobPositionX + 20}% ${blobPositionY - 10}%, 
              ${colors.secondary} 0%, 
              ${colors.accent} 30%, 
              ${colors.primary}90 60%, 
              transparent 75%)
          `,
          filter: 'blur(2px)'
        }}
      />

      {/* Flowing organic shapes for movement */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at ${blobPositionX - 20}% ${blobPositionY + 15}%, 
              ${colors.accent} 0%, 
              ${colors.secondary}85 40%, 
              transparent 65%),
            radial-gradient(ellipse 500px 350px at ${blobPositionX + 40}% ${blobPositionY - 25}%, 
              ${colors.primary} 0%, 
              ${colors.accent}85 50%, 
              transparent 70%)
          `,
          filter: 'blur(3px)'
        }}
      />

      {/* Additional color layer for intensity */}
      <div 
        className="absolute inset-0 opacity-70"
        style={{
          background: `
            radial-gradient(ellipse 700px 450px at ${blobPositionX + 10}% ${blobPositionY + 5}%, 
              ${colors.secondary}90 0%, 
              ${colors.primary}75 50%, 
              transparent 75%)
          `,
          filter: 'blur(4px)'
        }}
      />
    </div>
  )
}