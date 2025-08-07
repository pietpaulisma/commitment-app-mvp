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

  // Re-enabled with better supreme admin handling

  const createSupremeAdminProfile = async () => {
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
        // Force page reload to refresh profile data
        window.location.reload()
      }
    } catch (error) {
      console.error('💥 Exception creating supreme admin profile:', error)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

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
      timestamp: new Date().toISOString()
    })

    // Wait for both auth and profile to fully load
    if (authLoading || profileLoading) {
      console.log('⏳ Still loading, will check again when loaded')
      return
    }

    // Don't check on auth/onboarding pages
    const isAuthPage = ['/login', '/signup', '/'].includes(pathname)
    const isOnboardingPage = pathname?.startsWith('/onboarding')
    
    if (isAuthPage || isOnboardingPage) {
      console.log('📄 On auth/onboarding page, skipping redirect check')
      return
    }

    // No user = redirect handled by other guards
    if (!user) {
      console.log('👤 No authenticated user, letting other guards handle')
      return
    }

    // Special case for supreme admin - handle missing profile or incomplete onboarding
    if (user.email === 'klipperdeklip@gmail.com') {
      if (!profile || !profile.onboarding_completed) {
        console.log('🔥 Supreme admin detected - creating/updating profile automatically')
        createSupremeAdminProfile()
        return
      } else {
        console.log('✅ Supreme admin profile is complete')
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
      return
    }

    // If we get here, something is wrong
    console.log('❌ REDIRECTING TO ONBOARDING - Reason analysis:', {
      hasUser: !!user,
      hasProfile: !!profile,
      onboardingStatus: profile?.onboarding_completed,
      willRedirect: true
    })
    
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