'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check cached session first - with defensive error handling
    const cachedUser = typeof window !== 'undefined' ? sessionStorage.getItem('auth_user') : null
    const cachedTimestamp = typeof window !== 'undefined' ? sessionStorage.getItem('auth_timestamp') : null
    
    if (cachedUser && cachedTimestamp) {
      try {
        const timestamp = parseInt(cachedTimestamp)
        const isValidCache = Date.now() - timestamp < 5 * 60 * 1000 // 5 minutes
        
        if (isValidCache) {
          const parsedUser = JSON.parse(cachedUser)
          setUser(parsedUser)
          setLoading(false)
        }
      } catch (error) {
        // Corrupted session cache - clear it and continue with fresh auth
        console.warn('Corrupted auth cache detected, clearing:', error)
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth_user')
          sessionStorage.removeItem('auth_timestamp')
        }
      }
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }
        
        const userData = session?.user ?? null
        setUser(userData)
        setLoading(false)
        
        // Cache the user session - using both sessionStorage and localStorage for PWA
        if (typeof window !== 'undefined') {
          if (userData) {
            const authData = JSON.stringify(userData)
            const timestamp = Date.now().toString()
            
            // Primary cache (sessionStorage)
            sessionStorage.setItem('auth_user', authData)
            sessionStorage.setItem('auth_timestamp', timestamp)
            
            // PWA backup cache (localStorage) - for standalone mode recovery
            localStorage.setItem('commitment_auth_backup', JSON.stringify({
              user: userData,
              timestamp: Date.now()
            }))
          } else {
            sessionStorage.removeItem('auth_user')
            sessionStorage.removeItem('auth_timestamp')
            localStorage.removeItem('commitment_auth_backup')
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        setLoading(false)
      }
    }

    // Only fetch if we don't have valid cached data
    if (!cachedUser || !cachedTimestamp || Date.now() - parseInt(cachedTimestamp) >= 5 * 60 * 1000) {
      getInitialSession()
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const userData = session?.user ?? null
        setUser(userData)
        setLoading(false)
        
        // Update cache on auth change - with error handling and PWA backup
        if (typeof window !== 'undefined') {
          try {
            if (userData) {
              const authData = JSON.stringify(userData)
              const timestamp = Date.now().toString()
              
              // Primary cache
              sessionStorage.setItem('auth_user', authData)
              sessionStorage.setItem('auth_timestamp', timestamp)
              
              // PWA backup cache
              localStorage.setItem('commitment_auth_backup', JSON.stringify({
                user: userData,
                timestamp: Date.now()
              }))
            } else {
              sessionStorage.removeItem('auth_user')
              sessionStorage.removeItem('auth_timestamp')
              localStorage.removeItem('commitment_auth_backup')
            }
          } catch (error) {
            // Handle sessionStorage quota exceeded or other storage errors
            console.warn('Failed to update auth cache:', error)
            // Clear corrupted cache as fallback
            try {
              sessionStorage.removeItem('auth_user')
              sessionStorage.removeItem('auth_timestamp')
              localStorage.removeItem('commitment_auth_backup')
            } catch (clearError) {
              console.warn('Failed to clear auth cache:', clearError)
            }
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Site-wide presence tracking
  useEffect(() => {
    if (!user) return

    // Update presence with last_seen timestamp only
    const updatePresence = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ 
            last_seen: new Date().toISOString()
          })
          .eq('id', user.id)
      } catch (error) {
        // Silently handle missing columns - they may not exist yet
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          // Presence columns not available yet - silently ignore
        } else {
          console.error('Error updating presence:', error)
        }
      }
    }

    // Set initial presence
    updatePresence()

    // Handle visibility changes (more reliable than focus/blur)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updatePresence()
      }
    }

    // Handle page unload (best effort)
    const handleBeforeUnload = () => {
      // Use sync request as last resort - not ideal but more reliable than async
      navigator.sendBeacon && updatePresence()
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)

    // Heartbeat only when page is visible
    const heartbeat = setInterval(() => {
      if (!document.hidden) {
        updatePresence()
      }
    }, 60000) // Every 60 seconds (reduced frequency)

    return () => {
      // Clean up event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
      clearInterval(heartbeat)
    }
  }, [user])


  const signOut = async () => {
    setUser(null)
    // Clear auth cache - with error handling and PWA backup
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('auth_user')
        sessionStorage.removeItem('auth_timestamp')
        localStorage.removeItem('commitment_auth_backup')
      } catch (error) {
        console.warn('Failed to clear auth cache during signOut:', error)
      }
    }
    await supabase.auth.signOut()
  }

  const value = {
    user,
    loading,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}