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

  // Get time-of-day gradient - VIBRANT BOTTOM-ORIGINATING VERSION
  const getTimeOfDayGradient = () => {
    const now = new Date()
    const hour = now.getHours()
    
    if (hour >= 5 && hour < 8) {
      // Dawn - vibrant orange/pink from bottom
      return 'radial-gradient(ellipse 150% 120% at 30% 100%, rgba(255, 94, 77, 0.35) 0%, rgba(255, 159, 67, 0.25) 20%, rgba(0, 0, 0, 0.85) 40%, #000000 60%)'
    } else if (hour >= 8 && hour < 11) {
      // Morning - bright golden yellow vibes from bottom
      return 'radial-gradient(ellipse 180% 150% at 50% 100%, rgba(255, 235, 59, 0.55) 0%, rgba(255, 193, 7, 0.45) 20%, rgba(255, 152, 0, 0.25) 35%, rgba(0, 0, 0, 0.75) 50%, #000000 65%)'
    } else if (hour >= 11 && hour < 17) {
      // Day - vibrant blue/cyan from bottom
      return 'radial-gradient(ellipse 130% 100% at 50% 100%, rgba(59, 130, 246, 0.3) 0%, rgba(116, 185, 255, 0.22) 25%, rgba(0, 0, 0, 0.85) 45%, #000000 60%)'
    } else if (hour >= 17 && hour < 20) {
      // Evening - vibrant purple/magenta from bottom
      return 'radial-gradient(ellipse 140% 120% at 60% 100%, rgba(168, 85, 247, 0.35) 0%, rgba(199, 121, 208, 0.25) 25%, rgba(0, 0, 0, 0.85) 45%, #000000 60%)'
    } else {
      // Night - vibrant deep blue/purple from bottom
      return 'radial-gradient(ellipse 120% 110% at 25% 100%, rgba(79, 70, 229, 0.3) 0%, rgba(106, 90, 205, 0.22) 25%, rgba(0, 0, 0, 0.85) 45%, #000000 60%)'
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