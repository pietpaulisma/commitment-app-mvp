'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import RectangularNavigation from '@/components/RectangularNavigation'
import RectangularDashboard from '@/components/RectangularDashboard'
import TimeGradient from '@/components/TimeGradient'
import { useState } from 'react'
import { isPWAMode, logPWADebugInfo } from '@/utils/pwaUtils'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false)
  const [isChatModalOpen, setIsChatModalOpen] = useState(false)
  const [isPWA, setIsPWA] = useState(false)

  // Detect PWA mode and setup debug logging
  useEffect(() => {
    const pwaMode = isPWAMode()
    setIsPWA(pwaMode)
    
    // Debug logging for PWA mode
    if (pwaMode) {
      console.log('PWA mode detected - standalone launch from home screen')
      logPWADebugInfo()
    }
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      // Add PWA-specific auth recovery attempt
      if (isPWA && typeof window !== 'undefined') {
        console.log('PWA auth recovery attempt - checking localStorage')
        try {
          const savedAuth = localStorage.getItem('commitment_auth_backup')
          if (savedAuth) {
            const authData = JSON.parse(savedAuth)
            const isValidBackup = Date.now() - authData.timestamp < 24 * 60 * 60 * 1000 // 24 hours
            if (isValidBackup) {
              console.log('Found valid auth backup, attempting restore...')
              // Don't redirect immediately, let auth context try to restore
              setTimeout(() => {
                if (!user && !loading) {
                  router.push('/login')
                }
              }, 2000)
              return
            }
          }
        } catch (error) {
          console.warn('PWA auth recovery failed:', error)
        }
      }
      
      router.push('/login')
    }
  }, [user, loading, router, isPWA])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const threshold = window.innerHeight * 0.3
      setIsScrolled(currentScrollY > threshold)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // If loading or no user, show minimal state
  if (loading) {
    return null // Let the browser handle it instantly
  }

  if (!user) {
    return null // Redirect will happen via useEffect
  }

  // If we have a user, render the dashboard directly
  return (
    <>
      <TimeGradient className="fixed inset-0 z-[-1] pointer-events-none" />
      
      <div className="relative">
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