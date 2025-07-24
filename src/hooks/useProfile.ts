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