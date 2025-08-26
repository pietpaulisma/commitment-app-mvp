'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import LoadingSpinner from './LoadingSpinner'

interface AuthWrapperProps {
  children: ReactNode
  requireAuth?: boolean
  redirectTo?: string
  requiredRole?: 'user' | 'group_admin' | 'supreme_admin'
  loadingMessage?: string
}

export default function AuthWrapper({ 
  children, 
  requireAuth = true,
  redirectTo = '/login',
  requiredRole,
  loadingMessage = 'Loading...'
}: AuthWrapperProps) {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && requireAuth && !user) {
      router.push(redirectTo)
    }
  }, [user, authLoading, requireAuth, redirectTo, router])

  // Show loading while auth or profile is loading
  if (authLoading || (requireAuth && profileLoading)) {
    return <LoadingSpinner branded={true} fullScreen message={loadingMessage} />
  }

  // If auth is required but user doesn't exist, don't render
  if (requireAuth && !user) {
    return null
  }

  // If profile is required but doesn't exist, don't render
  if (requireAuth && !profile) {
    return null
  }

  // Check role requirements
  if (requiredRole && profile) {
    const roleHierarchy = {
      user: 0,
      group_admin: 1,
      supreme_admin: 2
    }
    
    const userLevel = roleHierarchy[profile.role as keyof typeof roleHierarchy] ?? 0
    const requiredLevel = roleHierarchy[requiredRole]
    
    if (userLevel < requiredLevel) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <p className="text-white text-xl mb-4">Access Denied</p>
            <p className="text-gray-400">You don&apos;t have permission to view this page.</p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}