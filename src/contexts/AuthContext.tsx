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
        // Check for demo user before falling back to session
        if (!checkDemoUser()) {
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

  const signOut = async () => {
    // Clear demo user if exists
    localStorage.removeItem('demo-user')
    setUser(null)
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