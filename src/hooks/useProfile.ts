'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export type UserRole = 'supreme_admin' | 'group_admin' | 'user'

export type UserProfile = {
  id: string
  email: string
  role: UserRole
  group_id: string | null
  preferred_weight: number
  is_weekly_mode: boolean
  location: string
  use_ip_location: boolean
  personal_color: string
  custom_icon: string
  first_name: string | null
  last_name: string | null
  onboarding_completed: boolean
  commitment_statement: string | null
  created_at: string
  updated_at: string
}

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      // Handle demo users (only on client side)
      if (typeof window !== 'undefined') {
        const demoUser = localStorage.getItem('demo-user')
        if (demoUser) {
          try {
            const userData = JSON.parse(demoUser)
            
            // Check if this is the onboarding demo user for onboarding testing
            const isOnboardingDemo = userData.email === 'onboarding@test.com'
            
            setProfile({
              id: userData.id,
              email: userData.email,
              role: userData.role,
              group_id: null,
              preferred_weight: 70,
              is_weekly_mode: false,
              location: '',
              use_ip_location: false,
              personal_color: '#3b82f6',
              custom_icon: '💪',
              first_name: isOnboardingDemo ? null : 'Demo',
              last_name: isOnboardingDemo ? null : 'User',
              onboarding_completed: !isOnboardingDemo, // Onboarding demo goes through onboarding
              commitment_statement: isOnboardingDemo ? null : 'Demo commitment statement',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            setLoading(false)
            return
          } catch (error) {
            console.error('Error parsing demo user profile:', error)
            localStorage.removeItem('demo-user')
          }
        }
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          throw error
        }

        setProfile(data)
      } catch (error) {
        console.error('Error loading profile:', error)
        setError(error instanceof Error ? error.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user])

  // Check for role preview override (for testing purposes) - only client-side
  const [roleOverride, setRoleOverride] = useState<UserRole | null>(null)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    const override = localStorage.getItem('role-preview-override') as UserRole
    if (override && (override === 'user' || override === 'group_admin' || override === 'supreme_admin')) {
      setRoleOverride(override)
    }
  }, [])
  
  // Use original role until mounted to avoid SSR issues
  const effectiveRole = mounted ? (roleOverride || profile?.role) : profile?.role

  const isSupremeAdmin = effectiveRole === 'supreme_admin'
  const isGroupAdmin = effectiveRole === 'group_admin' 
  const isUser = effectiveRole === 'user'
  const hasAdminPrivileges = isSupremeAdmin || isGroupAdmin

  // Create an effective profile with the override role if applicable
  const effectiveProfile = profile && mounted && roleOverride ? { ...profile, role: roleOverride } : profile

  return {
    profile: effectiveProfile,
    loading,
    error,
    isSupremeAdmin,
    isGroupAdmin,
    isUser,
    hasAdminPrivileges,
  }
}