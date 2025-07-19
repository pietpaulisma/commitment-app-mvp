'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SupremeAdminDashboard() {
  const [exercises, setExercises] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch exercises
        const { data: exerciseData } = await supabase
          .from('exercises')
          .select('*')
          .order('name')

        // Fetch groups
        const { data: groupData } = await supabase
          .from('groups')
          .select('*')
          .order('created_at', { ascending: false })

        // Fetch users
        const { data: userData } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        setExercises(exerciseData || [])
        setGroups(groupData || [])
        setUsers(userData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <div className="p-4">Loading Supreme Admin dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h2 className="text-xl font-bold text-red-800 mb-2">Supreme Admin Dashboard</h2>
        <p className="text-red-700">You have full system access</p>
      </div>

      {/* Exercise Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exercise Management</h3>
        <div className="space-y-2">
          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-left">
            + Add New Exercise
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {exercises.slice(0, 6).map((exercise: unknown) => (
              <div key={(exercise as any).id} className="border rounded-lg p-3">
                <h4 className="font-medium">{(exercise as any).name}</h4>
                <p className="text-sm text-gray-600">Type: {(exercise as any).type}</p>
                <p className="text-sm text-gray-600">Unit: {(exercise as any).unit}</p>
                <p className="text-sm text-gray-600">Points: {(exercise as any).points_per_unit}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Showing {Math.min(6, exercises.length)} of {exercises.length} exercises
          </p>
        </div>
      </div>

      {/* Group Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Management</h3>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Total Groups: {groups.length}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.slice(0, 4).map((group: unknown) => (
              <div key={(group as any).id} className="border rounded-lg p-3">
                <h4 className="font-medium">{(group as any).name}</h4>
                <p className="text-sm text-gray-600">Admin: {(group as any).admin_id}</p>
                <p className="text-sm text-gray-600">Start: {(group as any).start_date}</p>
                <button className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded mt-2">
                  Manage
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Management</h3>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Total Users: {users.length}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.slice(0, 4).map((user: unknown) => (
              <div key={(user as any).id} className="border rounded-lg p-3">
                <h4 className="font-medium">{(user as any).email}</h4>
                <p className="text-sm text-gray-600">Role: {(user as any).role}</p>
                <p className="text-sm text-gray-600">Location: {(user as any).location || 'Not set'}</p>
                <button className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded mt-2">
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}