'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import OnboardingLayout from '@/components/OnboardingLayout'

type Group = {
  id: string
  name: string
  start_date: string
  admin_id: string
  created_at: string
  member_count?: number
  admin_name?: string
}

export default function GroupSelectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [inviteCode, setInviteCode] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const [showInviteCode, setShowInviteCode] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    // Handle invite parameter from URL
    const inviteParam = searchParams.get('invite')
    if (inviteParam) {
      setInviteCode(inviteParam.toUpperCase())
      setShowInviteCode(true)
      // Try to auto-join with invite code
      handleInviteCodeJoin(inviteParam)
    } else {
      loadAvailableGroups()
    }
  }, [user, router, searchParams])

  const loadAvailableGroups = async () => {
    try {
      // Get all groups with member counts
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10) // Show recent groups

      if (groupsError) throw groupsError

      // Get member counts and admin names for each group
      const groupsWithDetails = await Promise.all(
        (groupsData || []).map(async (group) => {
          // Get member count
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)

          // Get admin name
          const { data: adminData } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', group.admin_id)
            .single()

          return {
            ...group,
            member_count: count || 0,
            admin_name: adminData 
              ? `${adminData.first_name} ${adminData.last_name}` 
              : 'Unknown Admin'
          }
        })
      )

      setGroups(groupsWithDetails)
    } catch (error) {
      console.error('Error loading groups:', error)
      setError('Failed to load available groups.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteCodeJoin = async (code: string) => {
    if (!user || !code.trim()) {
      setError('Invalid invite code.')
      return
    }

    setIsJoining(true)
    setError('')

    try {
      // Use the database function to join via invite code
      const { data, error } = await supabase.rpc('join_group_via_invite', {
        p_invite_code: code.trim().toUpperCase()
      })

      if (error) throw error

      if (data.success) {
        // Success! Show success message and redirect
        console.log('Successfully joined group:', data.group_name)
        router.push('/onboarding/profile')
      } else {
        throw new Error(data.error || 'Failed to join group with invite code.')
      }
    } catch (error: any) {
      console.error('Error joining via invite code:', error)
      setError(error.message || 'Invalid or expired invite code.')
      setIsJoining(false)
    }
  }

  const handleJoinGroup = async () => {
    if (!user || (!selectedGroup && !inviteCode.trim())) {
      setError('You must select a group or enter an invite code.')
      return
    }

    setIsJoining(true)
    setError('')

    try {
      // If using invite code, use the invite function
      if (inviteCode.trim()) {
        await handleInviteCodeJoin(inviteCode)
        return
      }

      // Otherwise join selected group directly
      const { error: joinError } = await supabase
        .from('profiles')
        .update({ 
          group_id: selectedGroup
        })
        .eq('id', user.id)

      if (joinError) throw joinError

      // Success! Now go to profile setup with group context
      router.push('/onboarding/profile')
    } catch (error: any) {
      console.error('Error joining group:', error)
      setError(error.message || 'Failed to join group. The system rejected your request.')
      setIsJoining(false)
    }
  }

  const handleCreateGroup = () => {
    router.push('/onboarding/create-group')
  }

  const handleBack = () => {
    router.push('/onboarding/commit')
  }

  if (!user) {
    return null
  }

  return (
    <OnboardingLayout showBackButton onBack={handleBack}>
      <div className="px-6 py-8 min-h-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-red-400 mb-2 tracking-tight">
            ACCOUNTABILITY ASSIGNMENT
          </h1>
          <p className="text-gray-400 text-sm">
            Choose your peers. They will witness your journey.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-6 mb-8">
          {/* Join existing group */}
          <div className="bg-gray-900/50 border border-gray-700 p-6">
            <h3 className="text-white font-bold mb-4 uppercase tracking-wide">
              Join Existing Group
            </h3>
            
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin h-6 w-6 border-2 border-red-400 border-t-transparent mx-auto mb-2"></div>
                <div className="text-gray-400 text-sm">Loading groups...</div>
              </div>
            ) : groups.length > 0 ? (
              <div className="space-y-3">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group.id)}
                    disabled={isJoining}
                    className={`w-full text-left p-4 border transition-all ${
                      selectedGroup === group.id
                        ? 'border-red-400 bg-red-900/20'
                        : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-white font-medium">{group.name}</div>
                        <div className="text-xs text-gray-400">
                          Led by {group.admin_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Started {new Date(group.start_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {group.member_count} members
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                No public groups available
              </div>
            )}
          </div>

          {/* Invite code section */}
          <div className="bg-gray-900/50 border border-gray-700 p-6">
            <button
              onClick={() => setShowInviteCode(!showInviteCode)}
              className="w-full text-left"
            >
              <h3 className="text-white font-bold mb-2 uppercase tracking-wide flex items-center justify-between">
                Have an Invite Code?
                <span className="text-gray-400 text-lg">
                  {showInviteCode ? '−' : '+'}
                </span>
              </h3>
            </button>
            
            {showInviteCode && (
              <div className="mt-4">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white focus:outline-none focus:border-red-400 transition-colors uppercase tracking-widest font-mono text-center"
                  placeholder="ENTER CODE"
                  disabled={isJoining}
                  maxLength={8}
                />
                <div className="text-xs text-gray-500 mt-2 text-center">
                  8-character invite code from a group admin
                </div>
              </div>
            )}
          </div>

          {/* Create new group */}
          <div className="bg-gray-900/50 border border-gray-700 p-6">
            <h3 className="text-white font-bold mb-4 uppercase tracking-wide">
              Lead Your Own Group
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Take responsibility for others' commitment. Be the administrator.
            </p>
            <button
              onClick={handleCreateGroup}
              disabled={isJoining}
              className="w-full bg-orange-600 text-black py-3 px-4 border border-orange-400 hover:bg-orange-500 transition-colors disabled:opacity-50 font-bold"
            >
              CREATE NEW GROUP
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-900/50 border border-red-600 p-4 mb-6">
            <div className="text-red-200 text-sm font-mono">
              {error}
            </div>
          </div>
        )}

        {/* Join button */}
        <button
          onClick={handleJoinGroup}
          disabled={isJoining || (!selectedGroup && !inviteCode.trim())}
          className="w-full bg-red-600 text-white py-4 px-6 border border-red-400 hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-black text-lg"
        >
          {isJoining ? 'JOINING GROUP...' : 'COMMIT TO GROUP'}
        </button>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-600 font-mono leading-relaxed">
            Once you join a group, they will see your progress daily.<br/>
            <span className="text-red-400">Choose wisely.</span>
          </p>
        </div>

        {/* Processing state */}
        {isJoining && (
          <div className="text-center mt-4">
            <div className="animate-pulse text-red-400 font-mono text-sm">
              BINDING TO ACCOUNTABILITY GROUP...
            </div>
          </div>
        )}
      </div>
    </OnboardingLayout>
  )
}