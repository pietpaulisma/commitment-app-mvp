'use client'

import WorkoutLogger from '@/components/WorkoutLogger'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function WorkoutPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Workout Logger</h1>
              <p className="text-gray-600">Track your exercises and earn points</p>
            </div>
            <div className="flex gap-2">
              <a href="/dashboard" className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
                Back to Dashboard
              </a>
              <button
                onClick={signOut}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <WorkoutLogger />
    </div>
  )
}