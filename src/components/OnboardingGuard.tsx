'use client'

import { useEffect } from 'react'
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
    console.log('📊 Auth state:', { authLoading, profileLoading, userEmail: user?.email, hasProfile: !!profile, pathname })
    
    // Don't redirect while loading - be more patient on refresh
    if (authLoading || profileLoading) {
      console.log('⏳ Still loading, waiting...')
      return
    }

    // Don't redirect if no user (let other auth guards handle this)
    if (!user) {
      console.log('👤 No user found, skipping...')
      return
    }

    // Don't redirect if we're already in onboarding or auth pages
    const isOnboardingPage = pathname?.startsWith('/onboarding')
    const isAuthPage = pathname === '/login' || pathname === '/signup'
    if (isOnboardingPage || isAuthPage) {
      console.log('📄 Already on onboarding/auth page, skipping redirect')
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
      return
    }

    // NEW: Give more time for profile to load, especially on refresh
    // Only redirect if we've been waiting for a reasonable time AND definitely have no onboarding
    if (profile && profile.onboarding_completed === false) {
      console.log('⚠️  User has not completed onboarding, redirecting to welcome page')
      router.push('/onboarding/welcome')
      return
    }

    // CRITICAL FIX: Don't immediately redirect if no profile - give time for it to load
    // This prevents redirect loops on page refresh when profile is temporarily null
    // Only redirect to onboarding if we're certain there's no profile after sufficient loading time
    if (user && !profile && !profileLoading) {
      // Add a delay to prevent immediate redirects on refresh
      const hasWaitedEnough = !authLoading && !profileLoading
      if (hasWaitedEnough) {
        console.log('🆕 User exists but no profile found after waiting, redirecting to welcome page')
        // Add a small delay to prevent race conditions
        setTimeout(() => {
          router.push('/onboarding/welcome')
        }, 500)
        return
      }
    }

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