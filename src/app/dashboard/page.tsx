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

  // Get time-of-day gradient
  const getTimeOfDayGradient = () => {
    const now = new Date()
    const hour = now.getHours()
    
    if (hour >= 5 && hour < 8) {
      // Dawn - soft orange to pink
      return 'radial-gradient(ellipse 150% 120% at 30% 20%, rgba(255, 159, 67, 0.4) 0%, rgba(255, 107, 107, 0.3) 40%, rgba(0, 0, 0, 0.8) 80%)'
    } else if (hour >= 8 && hour < 11) {
      // Morning - warm yellow
      return 'radial-gradient(ellipse 140% 100% at 40% 30%, rgba(255, 206, 84, 0.35) 0%, rgba(255, 177, 66, 0.25) 50%, rgba(0, 0, 0, 0.85) 80%)'
    } else if (hour >= 11 && hour < 17) {
      // Day - bright cool blue
      return 'radial-gradient(ellipse 130% 90% at 50% 25%, rgba(116, 185, 255, 0.3) 0%, rgba(162, 155, 254, 0.2) 45%, rgba(0, 0, 0, 0.85) 80%)'
    } else if (hour >= 17 && hour < 20) {
      // Evening - warm orange to purple
      return 'radial-gradient(ellipse 150% 110% at 60% 40%, rgba(255, 94, 77, 0.4) 0%, rgba(199, 121, 208, 0.3) 45%, rgba(0, 0, 0, 0.8) 80%)'
    } else {
      // Night - deep purple/blue
      return 'radial-gradient(ellipse 120% 100% at 25% 30%, rgba(106, 90, 205, 0.25) 0%, rgba(59, 130, 246, 0.2) 50%, rgba(0, 0, 0, 0.85) 80%)'
    }
  }

  return (
    <div 
      className="relative min-h-screen"
      style={{
        background: getTimeOfDayGradient()
      }}
    >
      
      
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
  )
}