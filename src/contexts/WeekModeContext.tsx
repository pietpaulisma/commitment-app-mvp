'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type WeekMode = 'sane' | 'insane'

interface WeekModeContextType {
  weekMode: WeekMode
  setWeekMode: (mode: WeekMode) => void
  isWeekModeAvailable: (daysSinceStart: number) => boolean
}

const WeekModeContext = createContext<WeekModeContextType | undefined>(undefined)

interface WeekModeProviderProps {
  children: ReactNode
}

export function WeekModeProvider({ children }: WeekModeProviderProps) {
  const [weekMode, setWeekModeState] = useState<WeekMode>('insane')

  // Load from sessionStorage on mount
  useEffect(() => {
    const savedMode = sessionStorage.getItem('weekMode') as WeekMode
    if (savedMode === 'sane' || savedMode === 'insane') {
      setWeekModeState(savedMode)
    }
  }, [])

  const setWeekMode = (mode: WeekMode) => {
    setWeekModeState(mode)
    sessionStorage.setItem('weekMode', mode)
    console.log('Week mode set to:', mode, '(session storage)')
  }

  const isWeekModeAvailable = (daysSinceStart: number) => {
    return daysSinceStart >= 448
  }

  return (
    <WeekModeContext.Provider value={{
      weekMode,
      setWeekMode,
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