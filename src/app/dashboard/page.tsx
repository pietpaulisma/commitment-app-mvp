'use client'

import { useState, useEffect } from 'react'
import RectangularNavigation from '@/components/RectangularNavigation'
import RectangularDashboard from '@/components/RectangularDashboard'
import TimeGradient from '@/components/TimeGradient'

export default function Dashboard() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const threshold = window.innerHeight * 0.3 // 30% of viewport height
      setIsScrolled(currentScrollY > threshold)
      setScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="relative min-h-screen bg-black">
      {/* Unified gradient background covering 50% landing area with parallax */}
      <div 
        className="absolute inset-0 h-[50vh] z-0"
        style={{
          transform: `translateY(${scrollY * -0.3}px)`
        }}
      >
        <TimeGradient />
      </div>
      
      {/* Landing Logo - Positioned above all content */}
      {!isScrolled && (
        <>
          {/* Mobile Landing Logo */}
          <div className="lg:hidden absolute top-2 left-4 z-50 transition-opacity duration-500">
            <img 
              src="/logo.png" 
              alt="The Commitment" 
              className="h-6 w-auto drop-shadow-lg"
            />
          </div>
          {/* Desktop Landing Logo */}
          <div className="hidden lg:block absolute top-4 left-8 z-50 transition-opacity duration-500">
            <img 
              src="/logo.png" 
              alt="The Commitment" 
              className="h-7 w-auto drop-shadow-lg"
            />
          </div>
        </>
      )}
      
      {/* Components with transparent/relative positioning */}
      <div className="relative z-10">
        <RectangularNavigation isScrolled={isScrolled} />
        <RectangularDashboard />
      </div>
    </div>
  )
}