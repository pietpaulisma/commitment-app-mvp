'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export type DemoMode = 'user' | 'group_admin' | 'onboarding' | null

interface DemoModeContextType {
  demoMode: DemoMode
  isInDemoMode: boolean
  enterDemoMode: (mode: DemoMode) => void
  exitDemoMode: () => void
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined)

const DEMO_MODE_KEY = 'demo-mode'
const ROLE_OVERRIDE_KEY = 'role-preview-override'

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoMode] = useState<DemoMode>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Load demo mode from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(DEMO_MODE_KEY) as DemoMode
    if (stored && ['user', 'group_admin', 'onboarding'].includes(stored)) {
      setDemoMode(stored)
    }
  }, [])

  const enterDemoMode = useCallback((mode: DemoMode) => {
    if (!mode) return
    
    // Set demo mode
    localStorage.setItem(DEMO_MODE_KEY, mode)
    setDemoMode(mode)
    
    // Set role override for user/group_admin modes
    if (mode === 'user' || mode === 'group_admin') {
      localStorage.setItem(ROLE_OVERRIDE_KEY, mode)
      // Reload to apply role change
      window.location.href = '/dashboard'
    }
    
    // For onboarding demo, redirect to onboarding
    if (mode === 'onboarding') {
      localStorage.setItem('onboarding-demo-mode', 'true')
      router.push('/onboarding')
    }
  }, [router])

  const exitDemoMode = useCallback(() => {
    // Clear all demo mode related storage
    localStorage.removeItem(DEMO_MODE_KEY)
    localStorage.removeItem(ROLE_OVERRIDE_KEY)
    localStorage.removeItem('onboarding-demo-mode')
    
    setDemoMode(null)
    
    // Force reload to reset all states
    window.location.href = '/dashboard'
  }, [])

  const value = {
    demoMode: mounted ? demoMode : null,
    isInDemoMode: mounted ? !!demoMode : false,
    enterDemoMode,
    exitDemoMode,
  }

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  )
}

export function useDemoMode() {
  const context = useContext(DemoModeContext)
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider')
  }
  return context
}
