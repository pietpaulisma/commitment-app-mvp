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
  const { profile, loading: profileLoading, refreshProfile } = useProfile()
  const router = useRouter()
  const pathname = usePathname()
  const [hasChecked, setHasChecked] = useState(false)
  const [isCreatingSupremeAdmin, setIsCreatingSupremeAdmin] = useState(false)
  const [shouldRefreshProfile, setShouldRefreshProfile] = useState(false)
  const mountedRef = useRef(false)
  const lastPathnameRef = useRef(pathname)

  // Re-enabled with better supreme admin handling

  const createSupremeAdminProfile = async () => {
    if (isCreatingSupremeAdmin) {
      console.log('⏳ Supreme admin profile creation already in progress...')
      return
    }
    
    setIsCreatingSupremeAdmin(true)
    
    try {
      console.log('🔥 Creating/updating supreme admin profile for:', user?.email, 'ID:', user?.id)
      
      const profileData = {
        id: user?.id,
        email: user?.email,
        username: 'Matthijs',
        custom_icon: '🔥',
        personal_color: '#ef4444',
        onboarding_completed: true,
        role: 'supreme_admin',
        preferred_weight: 75,
        is_weekly_mode: false,
        location: 'Amsterdam',
        use_ip_location: false,
        first_name: 'Matthijs',
        last_name: null,
        birth_date: null,
        last_donation_date: null,
        total_donated: 0,
        donation_rate: 0.10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Try upsert (insert or update)
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()

      if (error) {
        console.error('❌ Error upserting supreme admin profile:', error)
      } else {
        console.log('✅ Supreme admin profile created/updated successfully:', data)
        // Refresh profile data instead of reloading the page
        await refreshProfile()
      }
    } catch (error) {
      console.error('💥 Exception creating supreme admin profile:', error)
    } finally {
      setIsCreatingSupremeAdmin(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Reset hasChecked when pathname changes or when profile changes 
  // This allows the guard to re-evaluate when navigating or after profile updates
  useEffect(() => {
    setHasChecked(false)
  }, [pathname, profile?.onboarding_completed])

  // Detect when coming from onboarding page and trigger profile refresh
  useEffect(() => {
    const wasOnOnboardingPage = lastPathnameRef.current?.startsWith('/onboarding')
    const isNowOnDashboard = pathname === '/dashboard'
    
    if (wasOnOnboardingPage && isNowOnDashboard && user) {
      console.log('🔄 Detected navigation from onboarding to dashboard - refreshing profile')
      setShouldRefreshProfile(true)
    }
    
    lastPathnameRef.current = pathname
  }, [pathname, user])

  // Execute profile refresh when needed
  useEffect(() => {
    if (shouldRefreshProfile && !profileLoading && !authLoading) {
      console.log('🔄 Executing profile refresh...')
      refreshProfile().then(() => {
        console.log('✅ Profile refreshed successfully')
        setShouldRefreshProfile(false)
      })
    }
  }, [shouldRefreshProfile, profileLoading, authLoading, refreshProfile])

  useEffect(() => {
    console.log('🚀 OnboardingGuard useEffect triggered:', {
      authLoading,
      profileLoading,
      userEmail: user?.email,
      userId: user?.id,
      hasProfile: !!profile,
      onboardingCompleted: profile?.onboarding_completed,
      onboardingCompletedType: typeof profile?.onboarding_completed,
      pathname,
      isCreatingSupremeAdmin,
      hasChecked,
      timestamp: new Date().toISOString()
    })

    // Wait for both auth and profile to fully load, and don't process during supreme admin creation or profile refresh
    if (authLoading || profileLoading || isCreatingSupremeAdmin || shouldRefreshProfile) {
      console.log('⏳ Still loading or processing, will check again when ready')
      return
    }

    // Don't check on auth/onboarding pages
    const isAuthPage = ['/login', '/signup', '/'].includes(pathname)
    const isOnboardingPage = pathname?.startsWith('/onboarding')
    
    if (isAuthPage || isOnboardingPage) {
      console.log('📄 On auth/onboarding page, skipping redirect check')
      setHasChecked(true)
      return
    }

    // No user = redirect handled by other guards
    if (!user) {
      console.log('👤 No authenticated user, letting other guards handle')
      setHasChecked(true)
      return
    }

    // Special case for supreme admin - handle missing profile or incomplete onboarding
    if (user.email === 'klipperdeklip@gmail.com') {
      if (!profile || !profile.onboarding_completed) {
        console.log('🔥 Supreme admin detected - creating/updating profile automatically')
        if (!isCreatingSupremeAdmin) {
          createSupremeAdminProfile()
        }
        return
      } else {
        console.log('✅ Supreme admin profile is complete')
        setHasChecked(true)
        return
      }
    }

    // DEBUG: Let's see exactly what the profile looks like
    console.log('🔬 Profile analysis:', {
      profile: profile,
      hasProfile: !!profile,
      onboardingCompleted: profile?.onboarding_completed,
      onboardingCompletedExact: profile?.onboarding_completed === true,
      onboardingCompletedTruthy: !!profile?.onboarding_completed
    })

    // Has profile and completed onboarding = allow access
    if (profile && profile.onboarding_completed) {
      console.log('✅ Profile exists with completed onboarding - ALLOWING ACCESS')
      setHasChecked(true)
      return
    }

    // Only redirect if we haven't checked yet (prevent infinite loops)
    if (!hasChecked) {
      console.log('❌ REDIRECTING TO ONBOARDING - Reason analysis:', {
        hasUser: !!user,
        hasProfile: !!profile,
        onboardingStatus: profile?.onboarding_completed,
        willRedirect: true
      })
      
      setHasChecked(true)
      router.replace('/onboarding')
    } else {
      console.log('⚠️ Already checked once, not redirecting again to avoid loops')
    }
  }, [user, profile, authLoading, profileLoading, pathname, router, isCreatingSupremeAdmin, hasChecked, shouldRefreshProfile])


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