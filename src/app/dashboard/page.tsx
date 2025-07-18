'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<unknown>(null)
  const [profile, setProfile] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)
      setLoading(false)
    }

    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Commitment App</h1>
              <p className="text-gray-600">Welcome back, {user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Profile</h3>
            <p className="text-gray-600">Role: {profile?.role || 'Loading...'}</p>
            <p className="text-gray-600">Email: {profile?.email || 'Loading...'}</p>
            {profile?.group_id && (
              <p className="text-gray-600">Group ID: {profile.group_id}</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Stats</h3>
            <p className="text-gray-600">Total Points: Coming soon</p>
            <p className="text-gray-600">Current Streak: Coming soon</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Actions</h3>
            <div className="space-y-2">
              <button className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                Log Workout
              </button>
              <button className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">
                View Group
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}