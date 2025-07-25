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
      console.log('Creating supreme admin profile...')
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user?.id,
          username: 'Matthijs',
          email: user?.email,
          role: 'supreme_admin',
          custom_icon: '🔥',
          personal_color: '#ef4444',
          onboarding_completed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error creating supreme admin profile:', error)
        // If creation fails, redirect to onboarding as fallback
        router.push('/onboarding/welcome')
      } else {
        console.log('Supreme admin profile created successfully')
        // Refresh the page to trigger profile reload
        window.location.reload()
      }
    } catch (error) {
      console.error('Error creating supreme admin profile:', error)
      router.push('/onboarding/welcome')
    }
  }

  useEffect(() => {
    // Don't redirect while loading
    if (authLoading || profileLoading) {
      return
    }

    // Don't redirect if no user (let other auth guards handle this)
    if (!user) {
      return
    }

    // Don't redirect if we're already in onboarding or auth pages
    const isOnboardingPage = pathname?.startsWith('/onboarding')
    const isAuthPage = pathname === '/login' || pathname === '/signup'
    if (isOnboardingPage || isAuthPage) {
      return
    }

    // Special handling for supreme admin account (pre-existing account)
    if (user?.email === 'klipperdeklip@gmail.com' && !profile) {
      console.log('Creating supreme admin profile for klipperdeklip@gmail.com')
      createSupremeAdminProfile()
      return
    }

    // If user has profile but hasn't completed onboarding, redirect to welcome
    if (profile && !profile.onboarding_completed) {
      console.log('User has not completed onboarding, redirecting to welcome page')
      router.push('/onboarding/welcome')
      return
    }

    // If user exists but no profile is found, redirect to onboarding
    // This can happen with new signups that haven't triggered profile creation yet
    if (user && !profile) {
      console.log('User exists but no profile found, redirecting to welcome page')
      router.push('/onboarding/welcome')
      return
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