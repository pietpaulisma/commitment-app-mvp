'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import RoleBasedNavigation from '@/components/RoleBasedNavigation'
import { supabase } from '@/lib/supabase'

type Member = {
  id: string
  email: string
  role: string
  group_id: string | null
  preferred_weight: number
  is_weekly_mode: boolean
  location: string
  created_at: string
  total_points?: number
}

type Group = {
  id: string
  name: string
  start_date: string
  admin_id: string
  admin_email?: string
}

export default function GroupMembersPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading, isSupremeAdmin } = useProfile()
  const router = useRouter()
  const params = useParams()
  const groupId = params.groupId as string
  
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [allUsers, setAllUsers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)

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
    if (isSupremeAdmin && groupId) {
      loadData()
    }
  }, [isSupremeAdmin, groupId])

  const loadData = async () => {
    try {
      // Load group details
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select(`
          *,
          profiles!groups_admin_id_fkey(email)
        `)
        .eq('id', groupId)
        .single()

      if (groupError) throw groupError

      // Load group members
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('group_id', groupId)
        .order('email')

      if (membersError) throw membersError

      // Load all users not in any group (for adding new members)
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .is('group_id', null)
        .neq('role', 'supreme_admin')
        .order('email')

      if (usersError) throw usersError

      // Calculate total points for each member
      const membersWithPoints = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: pointsData } = await supabase
            .from('workout_logs')
            .select('points')
            .eq('user_id', member.id)

          const totalPoints = pointsData?.reduce((sum, log) => sum + (log.points || 0), 0) || 0
          
          return {
            ...member,
            total_points: totalPoints
          }
        })
      )

      setGroup({
        ...groupData,
        admin_email: groupData.profiles?.email || 'Unknown'
      })
      setMembers(membersWithPoints)
      setAllUsers(usersData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addMemberToGroup = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ group_id: groupId })
        .eq('id', userId)

      if (error) throw error

      await loadData()
      alert('Member added to group successfully!')
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Failed to add member: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const removeMemberFromGroup = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ group_id: null })
        .eq('id', userId)

      if (error) throw error

      await loadData()
      alert('Member removed from group successfully!')
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const promoteToGroupAdmin = async (userId: string) => {
    if (!confirm('Are you sure you want to promote this user to Group Admin? This will change their role and make them admin of this group.')) {
      return
    }

    try {
      // Update user role to group_admin
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'group_admin' })
        .eq('id', userId)

      if (roleError) throw roleError

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

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleBasedNavigation />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.push('/admin/groups')}
              className="text-blue-600 hover:text-blue-800 mb-2"
            >
              ← Back to Groups
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {group ? `${group.name} - Members` : 'Group Members'}
            </h1>
            {group && (
              <div className="text-gray-600">
                <p>Group Admin: {group.admin_email}</p>
                <p>Start Date: {new Date(group.start_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              + Add Member
            </button>
            <button
              onClick={signOut}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Add Member Section */}
        {showAddMember && allUsers.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Member</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allUsers.map((user) => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{user.email}</p>
                      <p className="text-sm text-gray-600">Role: {user.role}</p>
                      <p className="text-sm text-gray-600">Location: {user.location}</p>
                    </div>
                    <button
                      onClick={() => addMemberToGroup(user.id)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading members...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Group Members ({members.length})</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Points</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{member.email}</div>
                        <div className="text-sm text-gray-500">ID: {member.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.role === 'group_admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {member.total_points || 0} pts
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.preferred_weight} kg</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.is_weekly_mode ? 'Weekly' : 'Daily'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {member.role !== 'group_admin' && (
                            <button
                              onClick={() => promoteToGroupAdmin(member.id)}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              Promote
                            </button>
                          )}
                          <button
                            onClick={() => removeMemberFromGroup(member.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {members.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No members in this group</p>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Add the first member
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}