'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import BrandedLoader, { AUTH_STAGES } from '@/components/shared/BrandedLoader'
import { useLoadingStages } from '@/hooks/useLoadingStages'

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
  
  // Loading stages management
  const { currentStage, setStage, complete, isComplete } = useLoadingStages(AUTH_STAGES)

  // Memoize derived values to prevent unnecessary re-renders
  const isAuthPage = useMemo(() => ['/login', '/signup', '/'].includes(pathname), [pathname])
  const isOnboardingPage = useMemo(() => pathname?.startsWith('/onboarding'), [pathname])
  const isSupremeAdmin = useMemo(() => user?.email === 'klipperdeklip@gmail.com', [user?.email])
  const isLoading = useMemo(() => authLoading || profileLoading || isCreatingSupremeAdmin || shouldRefreshProfile, [authLoading, profileLoading, isCreatingSupremeAdmin, shouldRefreshProfile])
  
  // Re-enabled with better supreme admin handling
  const createSupremeAdminProfile = useCallback(async () => {
    if (isCreatingSupremeAdmin) {
      return
    }
    
    setIsCreatingSupremeAdmin(true)
    
    try {
      
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
        // Refresh profile data instead of reloading the page
        await refreshProfile()
      }
    } catch (error) {
      console.error('💥 Exception creating supreme admin profile:', error)
    } finally {
      setIsCreatingSupremeAdmin(false)
    }
  }, [isCreatingSupremeAdmin, user?.email, user?.id, refreshProfile])

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
      setShouldRefreshProfile(true)
    }
    
    lastPathnameRef.current = pathname
  }, [pathname, user])

  // Execute profile refresh when needed
  useEffect(() => {
    if (shouldRefreshProfile && !profileLoading && !authLoading) {
      refreshProfile().then(() => {
        setShouldRefreshProfile(false)
      })
    }
  }, [shouldRefreshProfile, profileLoading, authLoading, refreshProfile])

  useEffect(() => {
    // Wait for both auth and profile to fully load, and don't process during supreme admin creation or profile refresh
    if (isLoading) {
      return
    }

    // Don't check on auth/onboarding pages
    if (isAuthPage || isOnboardingPage) {
      setHasChecked(true)
      return
    }

    // No user = redirect handled by other guards
    if (!user) {
      setHasChecked(true)
      return
    }

    // Special case for supreme admin - handle missing profile or incomplete onboarding
    if (isSupremeAdmin) {
      if (!profile || !profile.onboarding_completed) {
        if (!isCreatingSupremeAdmin) {
          createSupremeAdminProfile()
        }
        return
      } else {
        setHasChecked(true)
        return
      }
    }

    // Has profile and completed onboarding = allow access
    if (profile && profile.onboarding_completed) {
      setHasChecked(true)
      return
    }

    // Only redirect if we haven't checked yet (prevent infinite loops)
    if (!hasChecked) {
      setHasChecked(true)
      router.replace('/onboarding')
    }
  }, [user, profile, isLoading, isAuthPage, isOnboardingPage, isSupremeAdmin, router, isCreatingSupremeAdmin, hasChecked, createSupremeAdminProfile])


  // Update loading stages based on current state
  useEffect(() => {
    if (authLoading) {
      setStage('auth')
    } else if (profileLoading || shouldRefreshProfile) {
      setStage('profile')
    } else if (!authLoading && !profileLoading) {
      complete()
    }
  }, [authLoading, profileLoading, shouldRefreshProfile, setStage, complete])

  // Show loading state while checking onboarding status
  if ((authLoading || profileLoading) && !isComplete) {
    return <BrandedLoader currentStage={currentStage} />
  }

  return <>{children}</>
}