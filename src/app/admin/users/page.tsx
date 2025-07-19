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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || !isSupremeAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleBasedNavigation />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage all users, roles, and group assignments</p>
          </div>
          <button
            onClick={signOut}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by email, location, or group..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="group_admin">Group Admin</option>
                <option value="supreme_admin">Supreme Admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.size > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  {selectedUsers.size} users selected
                </span>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Group</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                )}

                <button
                  onClick={handleBulkAction}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Apply
                </button>
                <button
                  onClick={clearSelection}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">All Users ({filteredUsers.length})</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAllUsers}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onChange={selectedUsers.size === filteredUsers.length ? clearSelection : selectAllUsers}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((userData) => (
                    <tr key={userData.id} className={`hover:bg-gray-50 ${selectedUsers.has(userData.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(userData.id)}
                          onChange={() => toggleUserSelection(userData.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{userData.email}</div>
                        <div className="text-sm text-gray-500">
                          Joined {new Date(userData.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">Weight: {userData.preferred_weight}kg</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={userData.role}
                          onChange={(e) => updateUserRole(userData.id, e.target.value)}
                          className={`text-xs font-medium px-2.5 py-0.5 rounded-full border-0 ${
                            userData.role === 'supreme_admin' ? 'bg-purple-100 text-purple-800' :
                            userData.role === 'group_admin' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <option value="user">User</option>
                          <option value="group_admin">Group Admin</option>
                          <option value="supreme_admin">Supreme Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={userData.group_id || ''}
                          onChange={(e) => updateUserGroup(userData.id, e.target.value || null)}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">No Group</option>
                          {groups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {userData.location}
                        {userData.is_weekly_mode && (
                          <div className="text-xs text-blue-600">Weekly Mode</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{userData.total_points} pts</div>
                        <div className="text-xs text-gray-500">{userData.total_workouts} workouts</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userData.last_workout 
                          ? new Date(userData.last_workout).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteUser(userData.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No users found matching your criteria</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}