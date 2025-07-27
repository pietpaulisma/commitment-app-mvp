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
  const [hasRedirected, setHasRedirected] = useState(false)
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      
      console.log('📝 Profile data to update:', profileData)
      
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user?.id)
        .select()

      if (error) {
        console.error('❌ Error updating supreme admin profile:', error)
        console.error('❌ Error details:', error.message, error.code)
        // If update fails, redirect to onboarding as fallback
        router.push('/onboarding/welcome')
      } else {
        console.log('✅ Supreme admin profile updated successfully:', data)
        // Add a small delay to ensure database consistency
        setTimeout(() => {
          console.log('🚀 Redirecting to dashboard...')
          router.push('/dashboard')
        }, 1000)
      }
    } catch (error) {
      console.error('💥 Exception updating supreme admin profile:', error)
      router.push('/onboarding/welcome')
    }
  }

  useEffect(() => {
    console.log('🔍 OnboardingGuard useEffect triggered')
    console.log('📊 Auth state:', { authLoading, profileLoading, userEmail: user?.email, hasProfile: !!profile, pathname, hasRedirected })
    
    // Clear any existing timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current)
      redirectTimeoutRef.current = null
    }

    // Don't redirect while loading - be more patient on refresh
    if (authLoading || profileLoading) {
      console.log('⏳ Still loading, waiting...')
      return
    }

    // Don't redirect if no user (let other auth guards handle this)
    if (!user) {
      console.log('👤 No user found, skipping...')
      setHasRedirected(false) // Reset redirect flag if no user
      return
    }

    // Don't redirect if we're already in onboarding or auth pages
    const isOnboardingPage = pathname?.startsWith('/onboarding')
    const isAuthPage = pathname === '/login' || pathname === '/signup'
    if (isOnboardingPage || isAuthPage) {
      console.log('📄 Already on onboarding/auth page, skipping redirect')
      return
    }

    // Don't redirect if we've already redirected recently
    if (hasRedirected) {
      console.log('🚫 Already redirected recently, skipping...')
      return
    }

    // Special handling for supreme admin account (pre-existing account)
    // This needs to happen BEFORE checking regular onboarding logic
    if (user?.email === 'klipperdeklip@gmail.com' && profile && !profile.onboarding_completed) {
      console.log('🔥 SUPREME ADMIN DETECTED! Updating profile for klipperdeklip@gmail.com')
      createSupremeAdminProfile()
      return
    }

    // CRITICAL FIX: More robust profile checking to prevent redirect loops
    // If user has profile and completed onboarding, allow access (no redirect needed)
    if (profile && profile.onboarding_completed) {
      console.log('✅ User has completed onboarding, allowing access')
      setHasRedirected(false) // Reset redirect flag for successful access
      return
    }

    // NEW: Give more time for profile to load, especially on refresh
    // Only redirect if we've been waiting for a reasonable time AND definitely have no onboarding
    if (profile && profile.onboarding_completed === false) {
      console.log('⚠️  User has not completed onboarding, redirecting to welcome page')
      setHasRedirected(true)
      router.push('/onboarding/welcome')
      return
    }

    // CRITICAL FIX: Only redirect if no profile after a significant delay
    // This prevents redirect loops on page refresh when profile is temporarily null
    if (user && !profile && !profileLoading && !authLoading) {
      console.log('⚠️  Scheduling potential redirect for missing profile...')
      // Set a longer timeout to wait for profile to load
      redirectTimeoutRef.current = setTimeout(() => {
        // Double-check conditions before redirecting
        if (!profile && user && !profileLoading && !authLoading && !hasRedirected) {
          console.log('🆕 User exists but no profile found after extended wait, redirecting to welcome page')
          setHasRedirected(true)
          router.push('/onboarding/welcome')
        }
      }, 2000) // Increased delay to 2 seconds
      return
    }

  }, [user, profile, authLoading, profileLoading, pathname, router, hasRedirected])

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

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