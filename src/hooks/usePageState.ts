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

  // DISABLED: Visibility change handler that was causing unwanted navigation
  // The original problem was loading screens, not navigation - this was overengineered
  // Now that we have proper caching, we don't need this aggressive restoration
  
  // useEffect(() => {
  //   // Visibility change logic removed to prevent unwanted navigation
  // }, [router, pathname])

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