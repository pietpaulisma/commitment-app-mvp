'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'

interface OnboardingGuardProps {
  children: React.ReactNode
}

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const pathname = usePathname()
  const [hasChecked, setHasChecked] = useState(false)
  const mountedRef = useRef(false)

  const createSupremeAdminProfile = async () => {
    try {
      console.log('🔥 Updating supreme admin profile for:', user?.email, 'ID:', user?.id)
      
      const profileData = {
        username: 'Matthijs',
        custom_icon: '🔥',
        personal_color: '#ef4444',
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user?.id)
        .select()

      if (error) {
        console.error('❌ Error updating supreme admin profile:', error)
      } else {
        console.log('✅ Supreme admin profile updated successfully:', data)
      }
    } catch (error) {
      console.error('💥 Exception updating supreme admin profile:', error)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    // Wait for both auth and profile to fully load
    if (authLoading || profileLoading) {
      console.log('⏳ Still loading auth or profile, waiting...')
      return
    }

    // Don't check on auth/onboarding pages
    const isAuthPage = ['/login', '/signup', '/'].includes(pathname)
    const isOnboardingPage = pathname?.startsWith('/onboarding')
    
    if (isAuthPage || isOnboardingPage) {
      console.log('📄 On auth/onboarding page, skipping check')
      return
    }

    console.log('🔍 OnboardingGuard final check:', {
      userEmail: user?.email,
      hasProfile: !!profile,
      onboardingCompleted: profile?.onboarding_completed,
      pathname
    })

    // No user = redirect handled by other guards
    if (!user) {
      console.log('👤 No authenticated user')
      return
    }

    // Special case for supreme admin
    if (user.email === 'klipperdeklip@gmail.com' && profile && !profile.onboarding_completed) {
      console.log('🔥 Supreme admin - completing onboarding')
      createSupremeAdminProfile()
      return
    }

    // Has profile and completed onboarding = allow access
    if (profile && profile.onboarding_completed) {
      console.log('✅ Has completed profile, allowing access')
      return
    }

    // Has user but incomplete/missing profile = needs onboarding  
    console.log('⚠️  User needs onboarding, redirecting')
    router.replace('/onboarding')
  }, [user, profile, authLoading, profileLoading, pathname, router])


  // Show loading state while checking onboarding status
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}