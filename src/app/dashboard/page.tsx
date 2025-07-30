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

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Static gradient background - no parallax */}
      <div className="absolute inset-0 h-[50vh] z-0">
        <TimeGradient />
      </div>
      
      {/* Landing Logo - ONLY show on exact dashboard route, positioned near DAY text, hide when modal is open */}
      {pathname === '/dashboard' && !pathname.includes('/workout') && !pathname.includes('/chat') && !isWorkoutModalOpen && !isChatModalOpen && (
        <>
          {!isScrolled ? (
            <>
              {/* Mobile Landing Logo - Positioned above DAY text */}
              <div 
                className="lg:hidden absolute left-4 z-[70] transition-all duration-500" 
                style={{ top: 'calc(env(safe-area-inset-top) + 80px)' }}
              >
                <img 
                  src="/logo.png" 
                  alt="The Commitment" 
                  className="h-6 w-auto drop-shadow-lg"
                />
              </div>
              {/* Desktop Landing Logo - Positioned above DAY text */}
              <div className="hidden lg:block absolute left-8 z-[70] transition-all duration-500"
                   style={{ top: '120px' }}>
                <img 
                  src="/logo.png" 
                  alt="The Commitment" 
                  className="h-7 w-auto drop-shadow-lg"
                />
              </div>
            </>
          ) : (
            <>
              {/* Mobile Scrolled Logo - Move to top when scrolled with safe area */}
              <div 
                className="lg:hidden fixed left-4 z-[70] transition-all duration-500"
                style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
              >
                <img 
                  src="/logo.png" 
                  alt="The Commitment" 
                  className="h-5 w-auto drop-shadow-lg"
                />
              </div>
              {/* Desktop Scrolled Logo - Move to top when scrolled */}
              <div className="hidden lg:block fixed top-5 left-8 z-[70] transition-all duration-500">
                <img 
                  src="/logo.png" 
                  alt="The Commitment" 
                  className="h-6 w-auto drop-shadow-lg"
                />
              </div>
            </>
          )}
        </>
      )}
      
      {/* Components with transparent/relative positioning */}
      <div className="relative z-10">
        <RectangularNavigation 
          isScrolled={isScrolled} 
          onWorkoutModalStateChange={setIsWorkoutModalOpen}
          onChatModalStateChange={setIsChatModalOpen}
        />
        <RectangularDashboard />
      </div>
    </div>
  )
}