'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RoleBasedNavigation from '@/components/RoleBasedNavigation'
import { supabase } from '@/lib/supabase'

type User = {
  id: string
  email: string
  role: string
  group_id: string | null
  preferred_weight: number
  is_weekly_mode: boolean
  location: string
  use_ip_location: boolean
  created_at: string
  updated_at: string
  group_name?: string
  total_points?: number
  total_workouts?: number
  last_workout?: string
}

type Group = {
  id: string
  name: string
}

export default function UserManagementPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading, isSupremeAdmin } = useProfile()
  const router = useRouter()
  
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState('')
  const [bulkGroupId, setBulkGroupId] = useState('')
  const [bulkRole, setBulkRole] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!profileLoading && profile && !isSupremeAdmin) {
      router.push('/dashboard')
    }
  }, [profile, profileLoading, isSupremeAdmin, router])

  useEffect(() => {
    if (isSupremeAdmin) {
      loadData()
    }
  }, [isSupremeAdmin])

  const loadData = async () => {
    try {
      // Load all users with group information
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          *,
          groups(name)
        `)
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Load all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, name')
        .order('name')

      if (groupsError) throw groupsError

      // Calculate user statistics
      const usersWithStats = await Promise.all(
        (usersData || []).map(async (userData) => {
          // Get workout stats
          const { data: workouts } = await supabase
            .from('workout_logs')
            .select('points, created_at')
            .eq('user_id', userData.id)

          const totalPoints = workouts?.reduce((sum, w) => sum + (w.points || 0), 0) || 0
          const totalWorkouts = workouts?.length || 0
          const lastWorkout = workouts && workouts.length > 0 
            ? workouts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
            : null

          return {
            ...userData,
            group_name: userData.groups?.name || null,
            total_points: totalPoints,
            total_workouts: totalWorkouts,
            last_workout: lastWorkout
          }
        })
      )

      setUsers(usersWithStats)
      setGroups(groupsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      await loadData()
      alert('User role updated successfully!')
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('Failed to update user role: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const updateUserGroup = async (userId: string, groupId: string | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ group_id: groupId })
        .eq('id', userId)

      if (error) throw error

      await loadData()
      alert('User group updated successfully!')
    } catch (error) {
      console.error('Error updating user group:', error)
      alert('Failed to update user group: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone and will remove all their workout data.')) {
      return
    }

    try {
      // Delete workout logs first
      const { error: workoutError } = await supabase
        .from('workout_logs')
        .delete()
        .eq('user_id', userId)

      if (workoutError) throw workoutError

      // Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError) throw profileError

      await loadData()
      alert('User deleted successfully!')
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleBulkAction = async () => {
    if (selectedUsers.size === 0) {
      alert('Please select users first')
      return
    }

    if (!bulkAction) {
      alert('Please select an action')
      return
    }

    if (!confirm(`Are you sure you want to apply this action to ${selectedUsers.size} users?`)) {
      return
    }

    try {
      const userIds = Array.from(selectedUsers)
      
      if (bulkAction === 'change_role' && bulkRole) {
        const { error } = await supabase
          .from('profiles')
          .update({ role: bulkRole })
          .in('id', userIds)

        if (error) throw error
      } else if (bulkAction === 'assign_group' && bulkGroupId) {
        const { error } = await supabase
          .from('profiles')
          .update({ group_id: bulkGroupId })
          .in('id', userIds)

        if (error) throw error
      } else if (bulkAction === 'remove_from_group') {
        const { error } = await supabase
          .from('profiles')
          .update({ group_id: null })
          .in('id', userIds)

        if (error) throw error
      }

      await loadData()
      setSelectedUsers(new Set())
      setBulkAction('')
      setBulkGroupId('')
      setBulkRole('')
      alert('Bulk action completed successfully!')
    } catch (error) {
      console.error('Error performing bulk action:', error)
      alert('Failed to perform bulk action: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  const selectAllUsers = () => {
    const allUserIds = filteredUsers.map(u => u.id)
    setSelectedUsers(new Set(allUserIds))
  }

  const clearSelection = () => {
    setSelectedUsers(new Set())
  }

  // Filter users based on search and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.group_name && user.group_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesRole = !roleFilter || user.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || !isSupremeAdmin) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-black">
        <div>
          <h1 className="text-lg font-bold text-white">USER MANAGEMENT</h1>
          <p className="text-sm text-gray-400">Manage users & roles</p>
        </div>
        <button
          onClick={() => router.push('/profile')}
          className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700"
        >
          <span className="text-2xl">×</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">

        {/* Filters and Search */}
        <div className="bg-gray-900 border border-gray-700 p-4 mb-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">SEARCH USERS</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by email, location, or group..."
                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">FILTER BY ROLE</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="group_admin">Group Admin</option>
                <option value="supreme_admin">Supreme Admin</option>
              </select>
            </div>
            <div className="text-sm text-gray-400">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.size > 0 && (
            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-300">
                  {selectedUsers.size} users selected
                </span>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="px-3 py-2 border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Action</option>
                  <option value="change_role">Change Role</option>
                  <option value="assign_group">Assign to Group</option>
                  <option value="remove_from_group">Remove from Group</option>
                </select>

                {bulkAction === 'change_role' && (
                  <select
                    value={bulkRole}
                    onChange={(e) => setBulkRole(e.target.value)}
                    className="px-3 py-2 border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Role</option>
                    <option value="user">User</option>
                    <option value="group_admin">Group Admin</option>
                    <option value="supreme_admin">Supreme Admin</option>
                  </select>
                )}

                {bulkAction === 'assign_group' && (
                  <select
                    value={bulkGroupId}
                    onChange={(e) => setBulkGroupId(e.target.value)}
                    className="px-3 py-2 border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Group</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                )}

                <button
                  onClick={handleBulkAction}
                  className="bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 font-semibold transition-colors border border-blue-500"
                >
                  Apply
                </button>
                <button
                  onClick={clearSelection}
                  className="bg-gray-600 text-white px-4 py-2 hover:bg-gray-700 font-semibold transition-colors border border-gray-500"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading users...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">ALL USERS ({filteredUsers.length})</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAllUsers}
                  className="bg-blue-600 text-white px-3 py-1 hover:bg-blue-500 text-sm font-semibold transition-colors border border-blue-500"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="bg-gray-600 text-white px-3 py-1 hover:bg-gray-500 text-sm font-semibold transition-colors border border-gray-500"
                >
                  Clear
                </button>
              </div>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No users found matching your criteria</p>
              </div>
            ) : (
              filteredUsers.map((userData) => (
                <div key={userData.id} className={`bg-gray-900 border border-gray-700 p-4 ${selectedUsers.has(userData.id) ? 'border-blue-500 bg-blue-900/30' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(userData.id)}
                        onChange={() => toggleUserSelection(userData.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700 mt-1"
                      />
                      <div>
                        <h4 className="text-white font-semibold">{userData.email}</h4>
                        <p className="text-sm text-gray-400">
                          Joined {new Date(userData.created_at).toLocaleDateString()} • Weight: {userData.preferred_weight}kg
                        </p>
                      </div>
                    </div>
                    <select
                      value={userData.role}
                      onChange={(e) => updateUserRole(userData.id, e.target.value)}
                      className={`text-xs font-bold px-2 py-1 border ${
                        userData.role === 'supreme_admin' ? 'bg-purple-600 text-white border-purple-500' :
                        userData.role === 'group_admin' ? 'bg-blue-600 text-white border-blue-500' :
                        'bg-gray-600 text-white border-gray-500'
                      }`}
                    >
                      <option value="user">User</option>
                      <option value="group_admin">Group Admin</option>
                      <option value="supreme_admin">Supreme Admin</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-400">Group:</span>
                      <select
                        value={userData.group_id || ''}
                        onChange={(e) => updateUserGroup(userData.id, e.target.value || null)}
                        className="w-full mt-1 text-sm border border-gray-600 bg-gray-700 text-white px-2 py-1"
                      >
                        <option value="">No Group</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="text-gray-400">Location:</span>
                      <div className="text-gray-300 mt-1">{userData.location}</div>
                      {userData.is_weekly_mode && (
                        <div className="text-xs text-blue-400">Weekly Mode</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-400">Stats:</span>
                      <div className="text-green-400 font-bold">{userData.total_points} pts</div>
                      <div className="text-xs text-gray-400">{userData.total_workouts} workouts</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Last Active:</span>
                      <div className="text-gray-300">
                        {userData.last_workout 
                          ? new Date(userData.last_workout).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteUser(userData.id)}
                    className="w-full bg-red-600 text-white py-2 hover:bg-red-700 font-semibold transition-colors border border-red-500"
                  >
                    Delete User
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}