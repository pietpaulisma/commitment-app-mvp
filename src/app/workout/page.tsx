'use client'

import WorkoutLogger from '@/components/WorkoutLogger'
import RoleBasedNavigation from '@/components/RoleBasedNavigation'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function WorkoutPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleBasedNavigation />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workout Logger</h1>
            <p className="text-gray-600">Track your exercises and earn points</p>
          </div>
          <button
            onClick={signOut}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>

      <WorkoutLogger />
    </div>
  )
}