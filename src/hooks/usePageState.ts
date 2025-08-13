// Hook to preserve page state when app goes to background
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const PAGE_STATE_KEY = 'lastActivePage'
const WORKOUT_STATE_KEY = 'workoutInProgress'
const FORM_STATE_KEY = 'formState'
const SCROLL_STATE_KEY = 'scrollState'
const LAST_ACTIVITY_KEY = 'lastActivity'

export function usePageState() {
  const router = useRouter()
  const pathname = usePathname()
  const [isRestoring, setIsRestoring] = useState(false)

  // Save current page and activity timestamp when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && !isRestoring) {
      sessionStorage.setItem(PAGE_STATE_KEY, pathname)
      sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
      
      // Save scroll position for current page
      const scrollY = window.scrollY
      if (scrollY > 0) {
        const scrollState = JSON.parse(sessionStorage.getItem(SCROLL_STATE_KEY) || '{}')
        scrollState[pathname] = scrollY
        sessionStorage.setItem(SCROLL_STATE_KEY, JSON.stringify(scrollState))
      }
    }
  }, [pathname, isRestoring])

  // Restore scroll position when page loads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        const scrollState = JSON.parse(sessionStorage.getItem(SCROLL_STATE_KEY) || '{}')
        if (scrollState[pathname]) {
          window.scrollTo(0, scrollState[pathname])
        }
      }, 100) // Small delay to ensure page is loaded
      
      return () => clearTimeout(timer)
    }
  }, [pathname])

  // Enhanced visibility change handler for better state restoration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let wasHidden = false
      
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          wasHidden = true
          // Save critical state when app goes to background
          sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
        } else if (document.visibilityState === 'visible' && wasHidden) {
          wasHidden = false
          
          // Check if we need to restore state
          const lastActivity = parseInt(sessionStorage.getItem(LAST_ACTIVITY_KEY) || '0')
          const timeDiff = Date.now() - lastActivity
          
          // If app was hidden for less than 5 minutes, restore the exact state
          if (timeDiff < 5 * 60 * 1000) {
            const savedPage = sessionStorage.getItem(PAGE_STATE_KEY)
            const workoutInProgress = sessionStorage.getItem(WORKOUT_STATE_KEY)
            
            // Always restore to the last active page if different from current
            if (savedPage && savedPage !== pathname) {
              console.log('Restoring last page state:', savedPage, 'from current:', pathname)
              setIsRestoring(true)
              router.replace(savedPage)
              
              // Reset the restoring flag after navigation
              setTimeout(() => setIsRestoring(false), 100)
            }
          }
        }
      }

      // Also handle app focus/blur for better mobile support
      const handleFocus = () => {
        if (wasHidden) {
          handleVisibilityChange()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('focus', handleFocus)
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [router, pathname])

  // Helper functions to mark workout state
  const markWorkoutInProgress = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(WORKOUT_STATE_KEY, 'true')
      sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
    }
  }

  const clearWorkoutInProgress = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(WORKOUT_STATE_KEY)
    }
  }

  // Save form state for restoration
  const saveFormState = (formData: any) => {
    if (typeof window !== 'undefined') {
      const formState = JSON.parse(sessionStorage.getItem(FORM_STATE_KEY) || '{}')
      formState[pathname] = formData
      sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify(formState))
    }
  }

  const getFormState = () => {
    if (typeof window !== 'undefined') {
      const formState = JSON.parse(sessionStorage.getItem(FORM_STATE_KEY) || '{}')
      return formState[pathname] || null
    }
    return null
  }

  const clearFormState = () => {
    if (typeof window !== 'undefined') {
      const formState = JSON.parse(sessionStorage.getItem(FORM_STATE_KEY) || '{}')
      delete formState[pathname]
      sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify(formState))
    }
  }

  return {
    markWorkoutInProgress,
    clearWorkoutInProgress,
    saveFormState,
    getFormState,
    clearFormState,
    isRestoring
  }
}