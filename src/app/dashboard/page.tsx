'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import RectangularNavigation from '@/components/RectangularNavigation'
import RectangularDashboard from '@/components/RectangularDashboard'
import TimeGradient from '@/components/TimeGradient'

export default function Dashboard() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false)
  const [isChatModalOpen, setIsChatModalOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const threshold = window.innerHeight * 0.3 // 30% of viewport height
      setIsScrolled(currentScrollY > threshold)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Get time-of-day gradient - SUBTLE VERSION
  const getTimeOfDayGradient = () => {
    const now = new Date()
    const hour = now.getHours()
    
    if (hour >= 5 && hour < 8) {
      // Dawn - very subtle orange hint
      return 'radial-gradient(ellipse 200% 150% at 30% 20%, rgba(255, 159, 67, 0.08) 0%, rgba(255, 107, 107, 0.06) 40%, rgba(0, 0, 0, 0.95) 70%)'
    } else if (hour >= 8 && hour < 11) {
      // Morning - very subtle yellow hint
      return 'radial-gradient(ellipse 180% 120% at 40% 30%, rgba(255, 206, 84, 0.06) 0%, rgba(255, 177, 66, 0.04) 50%, rgba(0, 0, 0, 0.96) 70%)'
    } else if (hour >= 11 && hour < 17) {
      // Day - very subtle blue hint
      return 'radial-gradient(ellipse 160% 110% at 50% 25%, rgba(116, 185, 255, 0.06) 0%, rgba(162, 155, 254, 0.04) 45%, rgba(0, 0, 0, 0.96) 70%)'
    } else if (hour >= 17 && hour < 20) {
      // Evening - very subtle orange to purple hint
      return 'radial-gradient(ellipse 180% 130% at 60% 40%, rgba(255, 94, 77, 0.08) 0%, rgba(199, 121, 208, 0.06) 45%, rgba(0, 0, 0, 0.95) 70%)'
    } else {
      // Night - very subtle purple/blue hint (like your reference)
      return 'radial-gradient(ellipse 150% 120% at 25% 30%, rgba(106, 90, 205, 0.06) 0%, rgba(59, 130, 246, 0.04) 50%, rgba(0, 0, 0, 0.96) 70%)'
    }
  }

  return (
    <>
      {/* Global gradient background - outside main container */}
      <div 
        className="fixed inset-0"
        style={{
          background: getTimeOfDayGradient(),
          zIndex: -1,
          pointerEvents: 'none'
        }}
      />
      
      <div className="relative min-h-screen">
      
      
      {/* Components with transparent/relative positioning */}
      <div className="relative z-10">
        <RectangularNavigation 
          isScrolled={isScrolled} 
          onWorkoutModalStateChange={setIsWorkoutModalOpen}
          onChatModalStateChange={setIsChatModalOpen}
          hideSettingsIcons={true}
        />
        <RectangularDashboard />
      </div>
    </div>
    </>
  )
}