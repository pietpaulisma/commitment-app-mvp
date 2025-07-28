'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import RectangularNavigation from '@/components/RectangularNavigation'
import RectangularDashboard from '@/components/RectangularDashboard'
import TimeGradient from '@/components/TimeGradient'

export default function Dashboard() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const pathname = usePathname()

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
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Unified gradient background covering 50% landing area with parallax */}
      <div 
        className="absolute inset-0 h-[50vh] z-0"
        style={{
          transform: `translateY(${scrollY * -0.3}px)`
        }}
      >
        <TimeGradient />
      </div>
      
      {/* Landing Logo - Positioned relative to DAY text when not scrolled */}
      {!isScrolled ? (
        <>
          {/* Mobile Landing Logo - Above DAY text */}
          <div className="lg:hidden absolute left-4 z-10 transition-all duration-500" 
               style={{ top: `calc(50vh - 120px)` }}>
            <img 
              src="/logo.png" 
              alt="The Commitment" 
              className="h-6 w-auto drop-shadow-lg"
            />
          </div>
          {/* Desktop Landing Logo - Above DAY text */}
          <div className="hidden lg:block absolute left-8 z-10 transition-all duration-500"
               style={{ top: `calc(50vh - 140px)` }}>
            <img 
              src="/logo.png" 
              alt="The Commitment" 
              className="h-7 w-auto drop-shadow-lg"
            />
          </div>
        </>
      ) : (
        <>
          {/* Mobile Scrolled Logo - Move to top */}
          <div className="lg:hidden fixed top-2 left-4 z-50 transition-all duration-500">
            <img 
              src="/logo.png" 
              alt="The Commitment" 
              className="h-6 w-auto drop-shadow-lg"
            />
          </div>
          {/* Desktop Scrolled Logo - Move to top */}
          <div className="hidden lg:block fixed top-4 left-8 z-50 transition-all duration-500">
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