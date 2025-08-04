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
  
  // Debug log current colors
  console.log('Current time:', currentTime.getHours() + ':' + currentTime.getMinutes())
  console.log('Selected colors:', colors)
  
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
      {/* Main organic sunrise/sunset blob */}
      <div
        className="absolute inset-0 opacity-75"
        style={{
          background: `
            radial-gradient(ellipse 800px 600px at ${blobPositionX + Math.sin(animationOffset * 0.02) * 3}% ${blobPositionY + Math.cos(animationOffset * 0.015) * 2}%, 
              ${colors.primary} 0%, 
              ${colors.secondary}90 20%, 
              ${colors.accent}75 40%, 
              ${colors.primary}60 60%, 
              transparent 75%)
          `,
          filter: 'blur(0.5px)',
          transform: `scale(${1 + Math.sin(animationOffset * 0.01) * 0.05})`,
          transition: 'transform 0.3s ease-out'
        }}
      />
      
      {/* Secondary organic blob layer with different colors */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(ellipse 650px 450px at ${blobPositionX + 25 + Math.cos(animationOffset * 0.018) * 4}% ${blobPositionY - 8 + Math.sin(animationOffset * 0.012) * 3}%, 
              ${colors.accent} 0%, 
              ${colors.primary}80 25%, 
              ${colors.secondary}65 50%, 
              transparent 70%)
          `,
          filter: 'blur(1px)',
          transform: `scale(${1 + Math.cos(animationOffset * 0.008) * 0.04})`,
          transition: 'transform 0.3s ease-out'
        }}
      />

      {/* Third layer for more color variation */}
      <div
        className="absolute inset-0 opacity-45"
        style={{
          background: `
            radial-gradient(ellipse 500px 350px at ${blobPositionX - 10 + Math.sin(animationOffset * 0.025) * 5}% ${blobPositionY + 15 + Math.cos(animationOffset * 0.02) * 4}%, 
              ${colors.secondary} 0%, 
              ${colors.accent}70 30%, 
              ${colors.primary}55 60%, 
              transparent 75%)
          `,
          filter: 'blur(2px)',
          transform: `scale(${1 + Math.sin(animationOffset * 0.012) * 0.03})`,
          transition: 'transform 0.3s ease-out'
        }}
      />

      {/* Fourth layer for depth and movement */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 400px 280px at ${blobPositionX + 35 + Math.cos(animationOffset * 0.022) * 6}% ${blobPositionY - 25 + Math.sin(animationOffset * 0.016) * 5}%, 
              ${colors.primary} 0%, 
              ${colors.secondary}60 40%, 
              transparent 65%),
            radial-gradient(ellipse 350px 200px at ${blobPositionX + 8 + Math.sin(animationOffset * 0.028) * 4}% ${blobPositionY + 5 + Math.cos(animationOffset * 0.014) * 3}%, 
              ${colors.accent}70 0%, 
              ${colors.primary}50 50%, 
              transparent 70%)
          `,
          filter: 'blur(3px)',
          transform: `scale(${1 + Math.cos(animationOffset * 0.009) * 0.02})`,
          transition: 'transform 0.3s ease-out'
        }}
      />
    </div>
  )
}