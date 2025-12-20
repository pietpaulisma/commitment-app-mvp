'use client'

import { ReactNode, useEffect, useState } from 'react'
import { DemoModeProvider, useDemoMode } from '@/contexts/DemoModeContext'
import { DemoModeFloatingButton } from './DemoModeFloatingButton'

// Inner component that uses the context
function DemoModeUI() {
  const { isInDemoMode } = useDemoMode()
  const [isActuallySupremeAdmin, setIsActuallySupremeAdmin] = useState(false)

  useEffect(() => {
    // Check if the actual role (before any demo override) is supreme_admin
    // We check the profile cache in sessionStorage
    const checkActualRole = () => {
      // First check if there's a stored original role
      const storedOriginalRole = localStorage.getItem('demo-mode-original-role')
      if (storedOriginalRole === 'supreme_admin') {
        setIsActuallySupremeAdmin(true)
        return
      }

      // Otherwise, try to get from the profile cache
      // Profile cache keys follow the pattern: profile_cache_{userId}
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key?.startsWith('profile_cache_')) {
          try {
            const cached = sessionStorage.getItem(key)
            if (cached) {
              const profile = JSON.parse(cached)
              if (profile.role === 'supreme_admin') {
                setIsActuallySupremeAdmin(true)
                // Store this for future reference during demo mode
                localStorage.setItem('demo-mode-original-role', 'supreme_admin')
                return
              }
            }
          } catch {
            // Ignore parsing errors
          }
        }
      }
    }

    checkActualRole()
  }, [])

  // Only show the floating button if user is actually a supreme admin and is in demo mode
  if (!isActuallySupremeAdmin || !isInDemoMode) {
    return null
  }

  return <DemoModeFloatingButton />
}

export function DemoModeWrapper({ children }: { children: ReactNode }) {
  return (
    <DemoModeProvider>
      {children}
      <DemoModeUI />
    </DemoModeProvider>
  )
}
