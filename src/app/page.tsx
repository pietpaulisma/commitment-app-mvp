
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useProfile } from '@/hooks/useProfile'
import dynamic from 'next/dynamic'
const NewDashboard = dynamic(() => import('@/components/dashboard/v2/NewDashboard'), { ssr: false })
import { BottomNavigation } from '@/components/dashboard/v2/BottomNavigation'
import { useState } from 'react'
import { isPWAMode, logPWADebugInfo } from '@/utils/pwaUtils'
import GroupChat from '@/components/GroupChat'
import WorkoutModal from '@/components/modals/WorkoutModal'

export default function Home() {
  const { user, loading } = useAuth()
  const { profile } = useProfile()
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

  const handleWorkoutOpen = () => {
    setIsWorkoutModalOpen(true)
  }

  const handleWorkoutClose = () => {
    setIsWorkoutModalOpen(false)
  }

  const handleChatOpen = () => {
    setIsChatModalOpen(true)
  }

  const handleChatClose = () => {
    setIsChatModalOpen(false)
  }

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
      <div className="relative pb-32">
        <div className="relative z-10">
          <NewDashboard />
        </div>
      </div>

      {/* New Bottom Navigation */}
      <BottomNavigation
        onWorkoutClick={handleWorkoutOpen}
        onChatClick={handleChatOpen}
        groupId={profile?.group_id}
      />

      {/* Group Chat Modal */}
      <GroupChat
        isOpen={isChatModalOpen}
        onClose={handleChatClose}
        onCloseStart={handleChatClose}
      />

      {/* Workout Modal */}
      <WorkoutModal
        isOpen={isWorkoutModalOpen}
        onClose={handleWorkoutClose}
        onCloseStart={handleWorkoutClose}
        onWorkoutAdded={() => { }}
        isAnimating={false}
      />
    </>
  )
}