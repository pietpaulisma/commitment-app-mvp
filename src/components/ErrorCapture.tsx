'use client'

import { useEffect } from 'react'
import { setupErrorCapture } from '@/utils/errorLogger'

/**
 * Component that sets up global error capturing on mount.
 * This helps capture console errors before crashes for better debugging.
 */
export function ErrorCapture() {
  useEffect(() => {
    setupErrorCapture()
  }, [])

  return null
}


