'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/AuthContext'

// Create Supabase client for database updates
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type WeekMode = 'sane' | 'insane'

interface WeekModeContextType {
  weekMode: WeekMode
  setWeekMode: (mode: WeekMode) => void
  setWeekModeWithSync: (mode: WeekMode, userId?: string) => Promise<void>
  isWeekModeAvailable: (daysSinceStart: number) => boolean
}

const WeekModeContext = createContext<WeekModeContextType | undefined>(undefined)

interface WeekModeProviderProps {
  children: ReactNode
}

export function WeekModeProvider({ children }: WeekModeProviderProps) {
  const { user } = useAuth()
  
  // Initialize with sessionStorage value immediately to avoid loading delay
  const [weekMode, setWeekModeState] = useState<WeekMode>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = sessionStorage.getItem('weekMode') as WeekMode
      if (savedMode === 'sane' || savedMode === 'insane') {
        return savedMode
      }
    }
    return 'insane' // Default fallback
  })

  // Load user's week mode from profile when user is available
  useEffect(() => {
    if (user) {
      loadUserWeekMode(user.id)
    }
  }, [user])

  const loadUserWeekMode = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('week_mode')
        .eq('id', userId)
        .single()

      if (!error && profile?.week_mode) {
        const dbMode = profile.week_mode as WeekMode
        setWeekModeState(dbMode)
        // Also update sessionStorage to match
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('weekMode', dbMode)
        }
        console.log('Loaded user week mode from profile:', dbMode)
      }
    } catch (error) {
      console.error('Error loading user week mode:', error)
    }
  }

  const setWeekMode = (mode: WeekMode) => {
    setWeekModeState(mode)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('weekMode', mode)
    }
    console.log('Week mode set to:', mode, '(session storage)')
  }

  const setWeekModeWithSync = async (mode: WeekMode, userId?: string) => {
    // Update local state first
    setWeekMode(mode)

    // Update database if userId is provided
    if (userId) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ week_mode: mode })
          .eq('id', userId)

        if (error) {
          console.error('Error updating week_mode in user profile:', error)
        } else {
          console.log('Week mode synced to user profile:', mode, 'for user:', userId)
        }
      } catch (error) {
        console.error('Error syncing week mode to user profile:', error)
      }
    }
  }

  const isWeekModeAvailable = (daysSinceStart: number) => {
    return daysSinceStart >= 448
  }

  return (
    <WeekModeContext.Provider value={{
      weekMode,
      setWeekMode,
      setWeekModeWithSync,
      isWeekModeAvailable
    }}>
      {children}
    </WeekModeContext.Provider>
  )
}

export function useWeekMode() {
  const context = useContext(WeekModeContext)
  if (context === undefined) {
    throw new Error('useWeekMode must be used within a WeekModeProvider')
  }
  return context
}