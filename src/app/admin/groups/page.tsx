'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RoleBasedNavigation from '@/components/RoleBasedNavigation'
import GroupForm from '@/components/GroupForm'
import { supabase } from '@/lib/supabase'

type Group = {
  id: string
  name: string
  start_date: string
  admin_id: string
  created_at: string
  updated_at: string
  admin_email?: string
  member_count?: number
}

type Profile = {
  id: string
  email: string
  role: string
}

export default function GroupManagementPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading, isSupremeAdmin } = useProfile()
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

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
      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })

      if (groupsError) throw groupsError

      // Load profiles to get admin emails and member counts
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, role, group_id')

      if (profilesError) throw profilesError

      // Combine data
      const groupsWithDetails = (groupsData || []).map(group => {
        const admin = profilesData?.find(p => p.id === group.admin_id)
        const memberCount = profilesData?.filter(p => p.group_id === group.id).length || 0
        
        return {
          ...group,
          admin_email: admin?.email || 'Unknown',
          member_count: memberCount
        }
      })

      setGroups(groupsWithDetails)
      setProfiles(profilesData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? All members will be removed from the group.')) {
      return
    }

    try {
      // First, remove all members from the group
      const { error: profilesError } = await supabase
        .from('profiles')
        .update({ group_id: null })
        .eq('group_id', groupId)

      if (profilesError) throw profilesError

      // Then delete the group
      const { error: groupError } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)

      if (groupError) throw groupError
      
      await loadData()
      alert('Group deleted successfully!')
    } catch (error) {
      console.error('Error deleting group:', error)
      alert('Failed to delete group: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const promoteToGroupAdmin = async (groupId: string, userId: string) => {
    if (!confirm('Are you sure you want to make this user a Group Admin for this group?')) {
      return
    }

    try {
      // Update user role to group_admin and set as admin of this group
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'group_admin' })
        .eq('id', userId)

      if (profileError) throw profileError

      // Update group admin
      const { error: groupError } = await supabase
        .from('groups')
        .update({ admin_id: userId })
        .eq('id', groupId)

      if (groupError) throw groupError

      await loadData()
      alert('User promoted to Group Admin successfully!')
    } catch (error) {
      console.error('Error promoting user:', error)
      alert('Failed to promote user: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

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

  const getAvailableAdmins = () => {
    return profiles.filter(p => p.role === 'group_admin' || p.role === 'supreme_admin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleBasedNavigation />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Group Management</h1>
            <p className="text-gray-600">Create and manage groups, assign group admins</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              + Create Group
            </button>
            <button
              onClick={signOut}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading groups...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">All Groups ({groups.length})</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groups.map((group) => (
                    <tr key={group.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{group.name}</div>
                        <div className="text-sm text-gray-500">ID: {group.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(group.start_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{group.admin_email}</div>
                        <div className="text-sm text-gray-500">ID: {group.admin_id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {group.member_count} members
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(group.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingGroup(group)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => router.push(`/admin/groups/${group.id}/members`)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Members
                          </button>
                          <button
                            onClick={() => deleteGroup(group.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {groups.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No groups found</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Create your first group
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Group Modal */}
      <GroupForm
        group={editingGroup}
        isOpen={showAddForm || !!editingGroup}
        availableAdmins={getAvailableAdmins()}
        onClose={() => {
          setShowAddForm(false)
          setEditingGroup(null)
        }}
        onSuccess={() => {
          loadData()
          setShowAddForm(false)
          setEditingGroup(null)
        }}
      />
    </div>
  )
}