'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export type UserRole = 'supreme_admin' | 'group_admin' | 'user'

export type UserProfile = {
  id: string
  email: string
  username: string
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
  birth_date: string | null
  last_donation_date: string | null
  total_donated: number
  donation_rate: number
  onboarding_completed: boolean
  has_flexible_rest_day?: boolean
  created_at: string
  updated_at: string
  avatar_url?: string
}

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)
  const currentUserRef = useRef<string | null>(null)

  // Cache key for sessionStorage
  const getCacheKey = (userId: string) => `profile_cache_${userId}`
  const getCacheTimestampKey = (userId: string) => `profile_cache_timestamp_${userId}`

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000

  const loadProfile = useCallback(async (showLoading = true) => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      loadingRef.current = false
      return null
    }

    // Prevent duplicate loading calls for the same user
    if (loadingRef.current && currentUserRef.current === user.id) {
      return null // Return null instead of stale profile to avoid closure issues
    }

    // Check cache first
    const cacheKey = getCacheKey(user.id)
    const timestampKey = getCacheTimestampKey(user.id)

    if (typeof window !== 'undefined') {
      const cachedProfile = sessionStorage.getItem(cacheKey)
      const cachedTimestamp = sessionStorage.getItem(timestampKey)

      if (cachedProfile && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp)
        const isValidCache = Date.now() - timestamp < CACHE_DURATION

        if (isValidCache) {
          const parsed = JSON.parse(cachedProfile)
          setProfile(parsed)
          setLoading(false)
          loadingRef.current = false
          return parsed
        }
      }
    }

    loadingRef.current = true
    currentUserRef.current = user.id

    if (showLoading) {
      setLoading(true)
    }
    setError(null)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        throw error
      }


      // Cache the profile data
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(cacheKey, JSON.stringify(data))
        sessionStorage.setItem(timestampKey, Date.now().toString())
      }

      setProfile(data)
      return data
    } catch (error) {
      console.error('❌ Error loading profile:', error)
      setError(error instanceof Error ? error.message : 'Failed to load profile')
      return null
    } finally {
      loadingRef.current = false
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [user, CACHE_DURATION])

  const refreshProfile = useCallback(() => {
    // Clear cache on manual refresh
    if (typeof window !== 'undefined' && user) {
      sessionStorage.removeItem(getCacheKey(user.id))
      sessionStorage.removeItem(getCacheTimestampKey(user.id))
    }
    loadingRef.current = false // Reset loading state to allow refresh
    return loadProfile(false)
  }, [user, loadProfile])

  useEffect(() => {
    // Only load profile if user changed
    if (user?.id !== currentUserRef.current) {
      loadProfile()
    }
  }, [user?.id, loadProfile])

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

  // Create an effective profile with the override role if applicable - memoized to prevent recreation
  const effectiveProfile = useMemo(() => {
    return profile && mounted && roleOverride ? { ...profile, role: roleOverride } : profile
  }, [profile, mounted, roleOverride])

  return {
    profile: effectiveProfile,
    loading,
    error,
    isSupremeAdmin,
    isGroupAdmin,
    isUser,
    hasAdminPrivileges,
    refreshProfile,
  }
}