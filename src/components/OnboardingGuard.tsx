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
  const [forceComplete, setForceComplete] = useState(false)
  const [isOnboardingDemoMode, setIsOnboardingDemoMode] = useState(false)
  const mountedRef = useRef(false)
  const lastPathnameRef = useRef(pathname)

  // Check for onboarding demo mode on mount
  useEffect(() => {
    const isDemoMode = localStorage.getItem('onboarding-demo-mode') === 'true'
    setIsOnboardingDemoMode(isDemoMode)
  }, [])

  // Loading stages management
  const { currentStage, setStage, complete, isComplete } = useLoadingStages(AUTH_STAGES)

  // Memoize derived values to prevent unnecessary re-renders
  const isAuthPage = useMemo(() => ['/login', '/signup', '/'].includes(pathname), [pathname])
  const isOnboardingPage = useMemo(() => pathname?.startsWith('/onboarding'), [pathname])
  const isSupremeAdmin = useMemo(() => user?.email === 'klipperdeklip@gmail.com', [user?.email])
  const isLoading = useMemo(() => authLoading || profileLoading || isCreatingSupremeAdmin || shouldRefreshProfile, [authLoading, profileLoading, isCreatingSupremeAdmin, shouldRefreshProfile])

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if ((authLoading || profileLoading) && !forceComplete) {
        console.warn('⚠️ Auth/Profile loading timeout - forcing completion')
        setForceComplete(true)
        complete()
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [authLoading, profileLoading, forceComplete, complete])

  // Re-enabled with better supreme admin handling
  const createSupremeAdminProfile = useCallback(async () => {
    if (isCreatingSupremeAdmin) {
      return
    }

    setIsCreatingSupremeAdmin(true)

    try {
      // First check if profile already exists to preserve existing data like birth_date
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('birth_date')
        .eq('id', user?.id)
        .single()

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
        // Preserve existing birth_date if it exists, otherwise set to null
        birth_date: existingProfile?.birth_date || null,
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
    if (isLoading && !forceComplete) {
      return
    }

    // Don't check on auth/onboarding pages
    // Also allow access if in onboarding demo mode
    if (isAuthPage || isOnboardingPage) {
      if (!hasChecked) {
        setHasChecked(true)
      }
      return
    }

    // If in onboarding demo mode, allow access to any page
    if (isOnboardingDemoMode) {
      if (!hasChecked) {
        setHasChecked(true)
      }
      return
    }

    // No user = redirect handled by other guards
    if (!user) {
      if (!hasChecked) {
        setHasChecked(true)
      }
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
        if (!hasChecked) {
          setHasChecked(true)
        }
        return
      }
    }

    // Has profile and completed onboarding = allow access
    if (profile && profile.onboarding_completed) {
      if (!hasChecked) {
        setHasChecked(true)
      }
      return
    }

    // Only redirect if we haven't checked yet (prevent infinite loops)
    if (!hasChecked) {
      setHasChecked(true)
      router.replace('/onboarding')
    }
  }, [user, profile, isLoading, isAuthPage, isOnboardingPage, isSupremeAdmin, router, isCreatingSupremeAdmin, hasChecked, createSupremeAdminProfile, forceComplete, isOnboardingDemoMode])


  // Update loading stages based on current state
  useEffect(() => {
    if (authLoading && !forceComplete) {
      setStage('auth')
    } else if ((profileLoading || shouldRefreshProfile) && !forceComplete) {
      setStage('profile')
    } else if ((!authLoading && !profileLoading) || forceComplete) {
      complete()
    }
  }, [authLoading, profileLoading, shouldRefreshProfile, setStage, complete, forceComplete])

  // Show loading state while checking onboarding status
  if ((authLoading || profileLoading) && !isComplete && !forceComplete) {
    return <BrandedLoader currentStage={currentStage} />
  }

  return <>{children}</>
}