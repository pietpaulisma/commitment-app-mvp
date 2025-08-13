'use client'

import MobileWorkoutLogger from '@/components/MobileWorkoutLogger'
import MobileNavigation from '@/components/MobileNavigation'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import BrandedLoader, { WORKOUT_STAGES } from '@/components/shared/BrandedLoader'
import { useLoadingStages } from '@/hooks/useLoadingStages'

export default function WorkoutPage() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const { currentStage, setStage, complete } = useLoadingStages(WORKOUT_STAGES)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Update loading stages
  useEffect(() => {
    if (authLoading) {
      setStage('auth')
    } else if (profileLoading) {
      setStage('profile')
    } else if (!authLoading && !profileLoading) {
      setStage('exercises')
      setTimeout(() => complete(), 500) // Simulate exercises loading
    }
  }, [authLoading, profileLoading, setStage, complete])

  if (authLoading || profileLoading) {
    return <BrandedLoader currentStage={currentStage} message="Getting your workout ready..." />
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="relative min-h-screen bg-black">
      <MobileNavigation />
      <MobileWorkoutLogger />
    </div>
  )
}