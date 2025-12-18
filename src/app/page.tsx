'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
const NewDashboard = dynamic(() => import('@/components/dashboard/v2/NewDashboard'), { ssr: false })
import { isPWAMode, logPWADebugInfo } from '@/utils/pwaUtils'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
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

  // If loading or no user, show minimal state
  if (loading) {
    return null // Let the browser handle it instantly
  }

  if (!user) {
    return null // Redirect will happen via useEffect
  }

  // If we have a user, render the dashboard directly
  // NewDashboard handles its own BottomNavigation, WorkoutModal, and GroupChat
  return (
    <div className="relative pb-32">
      <div className="relative z-10">
        <NewDashboard />
      </div>
    </div>
  )
}