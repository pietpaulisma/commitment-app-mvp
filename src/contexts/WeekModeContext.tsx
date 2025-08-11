'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client for database updates
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type WeekMode = 'sane' | 'insane'

interface WeekModeContextType {
  weekMode: WeekMode
  setWeekMode: (mode: WeekMode) => void
  setWeekModeWithSync: (mode: WeekMode, groupId?: string) => Promise<void>
  isWeekModeAvailable: (daysSinceStart: number) => boolean
}

const WeekModeContext = createContext<WeekModeContextType | undefined>(undefined)

interface WeekModeProviderProps {
  children: ReactNode
}

export function WeekModeProvider({ children }: WeekModeProviderProps) {
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

  const setWeekMode = (mode: WeekMode) => {
    setWeekModeState(mode)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('weekMode', mode)
    }
    console.log('Week mode set to:', mode, '(session storage)')
  }

  const setWeekModeWithSync = async (mode: WeekMode, groupId?: string) => {
    // Update local state first
    setWeekMode(mode)

    // Update database if groupId is provided
    if (groupId) {
      try {
        const { error } = await supabase
          .from('group_settings')
          .update({ week_mode: mode })
          .eq('group_id', groupId)

        if (error) {
          console.error('Error updating week_mode in database:', error)
        } else {
          console.log('Week mode synced to database:', mode, 'for group:', groupId)
        }
      } catch (error) {
        console.error('Error syncing week mode to database:', error)
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