'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import RectangularNavigation from '@/components/RectangularNavigation'
import RectangularDashboard from '@/components/RectangularDashboard'
import TimeGradient from '@/components/TimeGradient'

// DEV TEST: Environment variables added - should build successfully now
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

  return (
    <>
      {/* Time-based gradient background */}
      <TimeGradient className="fixed inset-0 z-[-1] pointer-events-none" />
      
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