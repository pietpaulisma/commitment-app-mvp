'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import RectangularNavigation from '@/components/RectangularNavigation'
import RectangularDashboard from '@/components/RectangularDashboard'
import TimeGradient from '@/components/TimeGradient'
import { useState } from 'react'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false)
  const [isChatModalOpen, setIsChatModalOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

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