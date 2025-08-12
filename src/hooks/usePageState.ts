// Hook to preserve page state when app goes to background
'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const PAGE_STATE_KEY = 'lastActivePage'
const WORKOUT_STATE_KEY = 'workoutInProgress'

export function usePageState() {
  const router = useRouter()
  const pathname = usePathname()

  // Save current page when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(PAGE_STATE_KEY, pathname)
    }
  }, [pathname])

  // Restore page state on app resume (if needed)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          // App is becoming visible again
          const savedPage = sessionStorage.getItem(PAGE_STATE_KEY)
          const workoutInProgress = sessionStorage.getItem(WORKOUT_STATE_KEY)
          
          // Only redirect if user was in workout and we're now on dashboard
          if (workoutInProgress && savedPage && savedPage !== pathname && savedPage.includes('workout')) {
            console.log('Restoring workout session:', savedPage)
            router.push(savedPage)
          }
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router, pathname])

  // Helper functions to mark workout state
  const markWorkoutInProgress = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(WORKOUT_STATE_KEY, 'true')
    }
  }

  const clearWorkoutInProgress = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(WORKOUT_STATE_KEY)
    }
  }

  return {
    markWorkoutInProgress,
    clearWorkoutInProgress
  }
}