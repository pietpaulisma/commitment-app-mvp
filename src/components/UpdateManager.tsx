'use client'

import { useState, useEffect } from 'react'
import UpdateToast from './UpdateToast'

export default function UpdateManager() {
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    const handleUpdateAvailable = () => {
      console.log('📱 Update available event received')
      setShowUpdate(true)
    }

    window.addEventListener('swUpdateAvailable', handleUpdateAvailable)

    return () => {
      window.removeEventListener('swUpdateAvailable', handleUpdateAvailable)
    }
  }, [])

  const handleUpdate = () => {
    console.log('🔄 User requested update')
    // Call the global force update function
    if (typeof window !== 'undefined' && (window as any).forceUpdateApp) {
      (window as any).forceUpdateApp()
    } else {
      window.location.reload()
    }
  }

  const handleDismiss = () => {
    console.log('👋 User dismissed update')
    setShowUpdate(false)
    // Store dismissal in localStorage to not show again this session
    if (typeof window !== 'undefined') {
      localStorage.setItem('updateDismissed', Date.now().toString())
    }
  }

  if (!showUpdate) return null

  return <UpdateToast onUpdate={handleUpdate} onDismiss={handleDismiss} />
}
