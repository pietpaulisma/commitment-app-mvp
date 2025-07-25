'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  exitDemoMode: () => void
  isDemoMode: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  exitDemoMode: () => {},
  isDemoMode: false,
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
  const [isDemoMode, setIsDemoMode] = useState(false)

  const checkDemoUser = () => {
    // Check for demo user first (only on client side)
    if (typeof window !== 'undefined') {
      const demoUser = localStorage.getItem('demo-user')
      console.log('AuthContext checking for demo user:', demoUser)
      if (demoUser) {
        try {
          const userData = JSON.parse(demoUser)
          console.log('Demo user data parsed:', userData)
          // Create a mock user object compatible with Supabase User type
          const mockUser = {
            id: userData.id,
            email: userData.email,
            user_metadata: { role: userData.role },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as User
          console.log('Setting demo user in AuthContext:', mockUser)
          setUser(mockUser)
          setIsDemoMode(true)
          setLoading(false)
          return true
        } catch (error) {
          console.error('Error parsing demo user:', error)
          localStorage.removeItem('demo-user')
        }
      }
    }
    return false
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      // Check for demo user first
      if (checkDemoUser()) {
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        
        // If user signs in with real credentials, clear demo mode
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('Real user signed in, clearing demo mode')
          localStorage.removeItem('demo-user')
          setIsDemoMode(false)
          setUser(session.user)
          setLoading(false)
        }
        // If user signs out, check for demo user fallback
        else if (event === 'SIGNED_OUT') {
          if (!checkDemoUser()) {
            setUser(null)
            setIsDemoMode(false)
            setLoading(false)
          }
        }
        // For other events, only update if not in demo mode
        else if (!isDemoMode) {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      }
    )

    // Listen for storage changes (when demo user is set)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'demo-user') {
        console.log('Demo user storage changed, re-checking...')
        checkDemoUser()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const exitDemoMode = () => {
    console.log('Exiting demo mode')
    localStorage.removeItem('demo-user')
    setIsDemoMode(false)
    setUser(null)
    setLoading(false)
  }

  const signOut = async () => {
    // Clear demo user if exists
    localStorage.removeItem('demo-user')
    setIsDemoMode(false)
    setUser(null)
    await supabase.auth.signOut()
  }

  const value = {
    user,
    loading,
    signOut,
    exitDemoMode,
    isDemoMode,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}