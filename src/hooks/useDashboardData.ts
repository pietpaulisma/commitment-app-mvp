'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useLoadingStages } from './useLoadingStages'
import { DASHBOARD_STAGES } from '@/components/shared/BrandedLoader'

interface DashboardData {
  groupName: string
  groupStartDate: string | null
  groupMembers: any[]
  groupStats: any
  personalStats: any
  restDays: number[]
  recoveryDays: number[]
  accentColor: string
}

interface CachedData {
  data: Partial<DashboardData>
  timestamp: number
}

const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes
const CACHE_KEY = 'dashboard_cache'

export function useDashboardData() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [data, setData] = useState<Partial<DashboardData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { currentStage, setStage, complete } = useLoadingStages(DASHBOARD_STAGES)

  // Check cache first
  const getCachedData = useCallback((): Partial<DashboardData> | null => {
    if (typeof window === 'undefined') return null
    
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (!cached) return null
      
      const { data: cachedData, timestamp }: CachedData = JSON.parse(cached)
      const isValid = Date.now() - timestamp < CACHE_DURATION
      
      if (isValid) {
        return cachedData
      }
    } catch (error) {
      console.error('Error reading dashboard cache:', error)
    }
    
    return null
  }, [])

  // Cache data
  const setCachedData = useCallback((dashboardData: Partial<DashboardData>) => {
    if (typeof window === 'undefined') return
    
    try {
      const cacheData: CachedData = {
        data: dashboardData,
        timestamp: Date.now()
      }
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Error caching dashboard data:', error)
    }
  }, [])

  // Load all dashboard data in parallel
  const loadDashboardData = useCallback(async () => {
    if (!user || !profile?.group_id) {
      setLoading(false)
      return
    }

    // Check cache first
    const cachedData = getCachedData()
    if (cachedData) {
      setData(cachedData)
      setLoading(false)
      complete()
      return
    }

    try {
      setLoading(true)
      setError(null)
      setStage('group')

      // Load all data in parallel for better performance
      const [
        groupResponse,
        groupMembersResponse,
        groupStatsResponse,
        personalStatsResponse,
        groupSettingsResponse
      ] = await Promise.all([
        // Group basic info
        supabase
          .from('groups')
          .select('name, start_date')
          .eq('id', profile.group_id)
          .single(),
          
        // Group members
        supabase
          .from('profiles')
          .select('id, username, custom_icon, personal_color, is_weekly_mode')
          .eq('group_id', profile.group_id)
          .order('username'),
          
        // Group workout stats
        supabase
          .from('workout_logs')
          .select(`
            id,
            profiles!inner(group_id, username, custom_icon, personal_color)
          `)
          .eq('profiles.group_id', profile.group_id)
          .gte('logged_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
          
        // Personal stats
        supabase
          .from('workout_logs')
          .select('id, exercise_name, sets, logged_at')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(50),
          
        // Group settings
        supabase
          .from('group_settings')
          .select('rest_days, recovery_days, accent_color')
          .eq('group_id', profile.group_id)
          .maybeSingle()
      ])

      setStage('stats')

      // Process the data
      const dashboardData: Partial<DashboardData> = {}

      // Group info
      if (!groupResponse.error && groupResponse.data) {
        dashboardData.groupName = groupResponse.data.name || 'Your Group'
        dashboardData.groupStartDate = groupResponse.data.start_date
      }

      // Group members
      if (!groupMembersResponse.error && groupMembersResponse.data) {
        dashboardData.groupMembers = groupMembersResponse.data
      }

      // Group settings
      if (!groupSettingsResponse.error && groupSettingsResponse.data) {
        dashboardData.restDays = groupSettingsResponse.data.rest_days || [1]
        dashboardData.recoveryDays = groupSettingsResponse.data.recovery_days || []
        dashboardData.accentColor = groupSettingsResponse.data.accent_color || '#ef4444'
      } else {
        // Defaults
        dashboardData.restDays = [1] // Monday
        dashboardData.recoveryDays = []
        dashboardData.accentColor = '#ef4444'
      }

      // Process stats (simplified for now)
      dashboardData.groupStats = groupStatsResponse.data || []
      dashboardData.personalStats = personalStatsResponse.data || []

      setData(dashboardData)
      setCachedData(dashboardData)
      complete()
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [user, user?.id, profile?.group_id, getCachedData, setCachedData, setStage, complete])

  // Refresh data (clears cache)
  const refreshData = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CACHE_KEY)
    }
    return loadDashboardData()
  }, [loadDashboardData])

  // Load data when dependencies change
  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  return {
    data,
    loading,
    error,
    currentStage,
    refreshData
  }
}