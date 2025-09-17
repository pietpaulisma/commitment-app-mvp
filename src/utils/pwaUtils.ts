export const isPWAMode = (): boolean => {
  if (typeof window === 'undefined') return false
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any)?.standalone ||
    document.referrer.includes('android-app://')
  )
}

export const isPWAInstallable = (): boolean => {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export const addPWAInstallPrompt = (callback: (event: any) => void) => {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', callback)
  return () => window.removeEventListener('beforeinstallprompt', callback)
}

export const logPWADebugInfo = () => {
  if (typeof window === 'undefined') return

  console.log('PWA Debug Info:', {
    isPWA: isPWAMode(),
    displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    standalone: (window.navigator as any)?.standalone,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    serviceWorkerSupported: 'serviceWorker' in navigator,
    pushSupported: 'PushManager' in window,
    notificationSupported: 'Notification' in window
  })
}