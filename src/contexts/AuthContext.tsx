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
    // Check cached session first
    const cachedUser = typeof window !== 'undefined' ? sessionStorage.getItem('auth_user') : null
    const cachedTimestamp = typeof window !== 'undefined' ? sessionStorage.getItem('auth_timestamp') : null
    
    if (cachedUser && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp)
      const isValidCache = Date.now() - timestamp < 5 * 60 * 1000 // 5 minutes
      
      if (isValidCache) {
        console.log('📦 Using cached auth session')
        setUser(JSON.parse(cachedUser))
        setLoading(false)
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
        
        // Cache the user session
        if (typeof window !== 'undefined') {
          if (userData) {
            sessionStorage.setItem('auth_user', JSON.stringify(userData))
            sessionStorage.setItem('auth_timestamp', Date.now().toString())
          } else {
            sessionStorage.removeItem('auth_user')
            sessionStorage.removeItem('auth_timestamp')
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
        console.log('Auth state change:', event, session?.user?.email)
        const userData = session?.user ?? null
        setUser(userData)
        setLoading(false)
        
        // Update cache on auth change
        if (typeof window !== 'undefined') {
          if (userData) {
            sessionStorage.setItem('auth_user', JSON.stringify(userData))
            sessionStorage.setItem('auth_timestamp', Date.now().toString())
          } else {
            sessionStorage.removeItem('auth_user')
            sessionStorage.removeItem('auth_timestamp')
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
          console.log('Presence columns not available yet')
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
    // Clear auth cache
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_user')
      sessionStorage.removeItem('auth_timestamp')
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