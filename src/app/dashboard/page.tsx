'use client'

import { useState, useEffect } from 'react'
import RectangularNavigation from '@/components/RectangularNavigation'
import RectangularDashboard from '@/components/RectangularDashboard'
import TimeGradient from '@/components/TimeGradient'

export default function Dashboard() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const threshold = window.innerHeight * 0.25 // 25% of viewport height
      setIsScrolled(scrollY > threshold)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="relative min-h-screen bg-black">
      {/* Unified gradient background covering 50% landing area */}
      <div className="absolute inset-0 h-[50vh] z-0">
        <TimeGradient />
      </div>
      
      {/* Components with transparent/relative positioning */}
      <div className="relative z-10">
        <RectangularNavigation isScrolled={isScrolled} />
        <RectangularDashboard />
      </div>
    </div>
  )
}