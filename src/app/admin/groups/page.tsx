'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  const { user, loading: authLoading } = useAuth()
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

  const getAvailableAdmins = () => {
    return profiles.filter(p => p.role === 'group_admin' || p.role === 'supreme_admin')
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-black">
        <div>
          <h1 className="text-lg font-bold text-white">GROUP MANAGEMENT</h1>
          <p className="text-sm text-gray-400">Manage groups & admins</p>
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
        <div className="mb-4">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-green-600 text-white py-3 hover:bg-green-500 font-semibold transition-colors border border-green-500"
          >
            + Create Group
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading groups...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">ALL GROUPS ({groups.length})</h3>
            
            {groups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No groups found</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 bg-green-600 text-white px-4 py-2 hover:bg-green-500 font-semibold transition-colors border border-green-500"
                >
                  Create your first group
                </button>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="bg-gray-900 border border-gray-700 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold">{group.name}</h4>
                      <p className="text-xs text-gray-400">ID: {group.id.slice(0, 8)}...</p>
                    </div>
                    <span className="px-3 py-1 text-xs font-bold bg-blue-600 text-white border border-blue-500">
                      {group.member_count} members
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-400">Start Date:</span>
                      <div className="text-gray-300">{new Date(group.start_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Created:</span>
                      <div className="text-gray-300">{new Date(group.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="text-gray-400 text-sm">Group Admin:</span>
                    <div className="text-gray-300">{group.admin_email}</div>
                    <div className="text-xs text-gray-400">ID: {group.admin_id.slice(0, 8)}...</div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setEditingGroup(group)}
                      className="bg-blue-600 text-white py-2 hover:bg-blue-500 transition-colors border border-blue-500 font-semibold text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => router.push(`/admin/groups/${group.id}/members`)}
                      className="bg-green-600 text-white py-2 hover:bg-green-500 transition-colors border border-green-500 font-semibold text-sm"
                    >
                      Members
                    </button>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="bg-red-600 text-white py-2 hover:bg-red-500 transition-colors border border-red-500 font-semibold text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
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