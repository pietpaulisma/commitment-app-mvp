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
    // Only check once we're mounted and have stable auth state
    if (!mountedRef.current || authLoading || profileLoading) {
      return
    }

    console.log('🔍 OnboardingGuard check:', {
      userEmail: user?.email,
      hasProfile: !!profile,
      profileCompleted: profile?.onboarding_completed,
      pathname,
      hasChecked
    })

    // Don't interfere with auth pages or root page
    const isAuthPage = ['/login', '/signup', '/'].includes(pathname)
    const isOnboardingPage = pathname?.startsWith('/onboarding')
    
    if (isAuthPage || isOnboardingPage) {
      console.log('📄 On auth/onboarding page, allowing access')
      return
    }

    // If no user, let other auth guards handle it
    if (!user) {
      console.log('👤 No user, skipping guard')
      return
    }

    // Special handling for supreme admin
    if (user.email === 'klipperdeklip@gmail.com' && profile && !profile.onboarding_completed) {
      console.log('🔥 Supreme admin needs onboarding completion')
      if (!hasChecked) {
        createSupremeAdminProfile()
        setHasChecked(true)
      }
      return
    }

    // CRITICAL: If user has completed onboarding, always allow access
    if (profile && profile.onboarding_completed === true) {
      console.log('✅ Onboarding completed, allowing access')
      return
    }

    // Only redirect if we're certain onboarding is not completed AND we haven't checked yet
    if (profile && profile.onboarding_completed === false && !hasChecked) {
      console.log('⚠️  Profile exists but onboarding not completed, redirecting')
      setHasChecked(true)
      router.push('/onboarding')
      return
    }

    // Only redirect for missing profile if we haven't checked yet and we're sure
    if (user && !profile && !profileLoading && !hasChecked) {
      console.log('🆕 No profile found after loading, redirecting to onboarding')
      setHasChecked(true)
      router.push('/onboarding')
      return
    }

    console.log('🤷 No redirect needed, allowing access')
  }, [user, profile, authLoading, profileLoading, pathname, router, hasChecked])

  // Reset check flag when user ID actually changes (not just during loading)
  useEffect(() => {
    if (user?.id) {
      setHasChecked(false)
    }
  }, [user?.id])


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