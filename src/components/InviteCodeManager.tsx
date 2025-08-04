'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'

type GroupInvite = {
  id: string
  group_id: string
  invite_code: string
  max_uses: number
  current_uses: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export default function InviteCodeManager() {
  const { user } = useAuth()
  const { profile, hasAdminPrivileges } = useProfile()
  const [invites, setInvites] = useState<GroupInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && hasAdminPrivileges && profile?.group_id) {
      loadInvites()
    }
  }, [user, hasAdminPrivileges, profile?.group_id])

  const loadInvites = async () => {
    if (!profile?.group_id) return

    try {
      const { data, error } = await supabase
        .from('group_invites')
        .select('*')
        .eq('group_id', profile.group_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setInvites(data || [])
    } catch (error) {
      console.error('Error loading invites:', error)
      setError('Failed to load invite codes')
    } finally {
      setLoading(false)
    }
  }

  const createInvite = async () => {
    if (!profile?.group_id) return

    setCreating(true)
    setError('')

    try {
      const { data, error } = await supabase.rpc('create_group_invite', {
        p_group_id: profile.group_id,
        p_max_uses: 10,
        p_expires_days: 30
      })

      if (error) throw error

      // Reload invites to show the new one
      await loadInvites()
    } catch (error) {
      console.error('Error creating invite:', error)
      setError('Failed to create invite code')
    } finally {
      setCreating(false)
    }
  }

  const toggleInvite = async (inviteId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('group_invites')
        .update({ is_active: !isActive })
        .eq('id', inviteId)

      if (error) throw error

      // Reload invites to show updated status
      await loadInvites()
    } catch (error) {
      console.error('Error toggling invite:', error)
      setError('Failed to update invite code')
    }
  }

  const copyToClipboard = (code: string) => {
    const inviteLink = `${window.location.origin}/onboarding/groups?invite=${code}`
    navigator.clipboard.writeText(inviteLink)
    alert('Invite link copied to clipboard!')
  }

  const copyCodeOnly = (code: string) => {
    navigator.clipboard.writeText(code)
    alert('Invite code copied to clipboard!')
  }

  if (!hasAdminPrivileges) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-gray-900/30 border border-gray-800 p-4">
        <div className="text-center text-gray-400">Loading invite codes...</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/30 border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold uppercase tracking-wide">
          Group Invite Codes
        </h3>
        <button
          onClick={createInvite}
          disabled={creating}
          className="bg-green-600 text-white px-3 py-1 text-sm border border-green-400 hover:bg-green-500 transition-colors disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'New Code'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-600 p-3 mb-4">
          <div className="text-red-200 text-sm">{error}</div>
        </div>
      )}

      {invites.length === 0 ? (
        <div className="text-center text-gray-400 py-4">
          No invite codes created yet
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <div 
              key={invite.id} 
              className={`border p-4 rounded-lg ${
                invite.is_active 
                  ? 'border-gray-600 bg-gray-800/50' 
                  : 'border-gray-700 bg-gray-800/20 opacity-60'
              }`}
            >
              {/* Header with status */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-white">Invite #{invite.id.slice(0, 8)}</div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 border rounded ${
                    invite.is_active 
                      ? 'text-green-300 border-green-600 bg-green-900/20' 
                      : 'text-gray-400 border-gray-600 bg-gray-800/20'
                  }`}>
                    {invite.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => toggleInvite(invite.id, invite.is_active)}
                    className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded border border-gray-600 hover:border-gray-500"
                  >
                    {invite.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              {/* Invite Code - Large and prominent */}
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-1">INVITE CODE</div>
                <div className="flex items-center space-x-3">
                  <div className="font-mono text-2xl text-orange-400 font-bold tracking-wider">
                    {invite.invite_code}
                  </div>
                  <button
                    onClick={() => copyCodeOnly(invite.invite_code)}
                    className="px-3 py-2 bg-orange-600/20 border border-orange-600/40 text-orange-300 text-sm hover:bg-orange-600/30 transition-colors rounded"
                    title="Copy code only"
                  >
                    Copy Code
                  </button>
                </div>
              </div>

              {/* Invite Link */}
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-1">INVITE LINK</div>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 text-sm text-gray-300 font-mono bg-gray-900/50 px-3 py-2 rounded border border-gray-700 truncate">
                    {`${window.location.origin}/onboarding/groups?invite=${invite.invite_code}`}
                  </div>
                  <button
                    onClick={() => copyToClipboard(invite.invite_code)}
                    className="px-3 py-2 bg-blue-600/20 border border-blue-600/40 text-blue-300 text-sm hover:bg-blue-600/30 transition-colors rounded"
                    title="Copy full invite link"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
              
              {/* Usage info */}
              <div className="text-xs text-gray-400 space-x-4 flex">
                <span>Uses: {invite.current_uses}/{invite.max_uses}</span>
                <span>Created: {new Date(invite.created_at).toLocaleDateString()}</span>
                {invite.expires_at && (
                  <span>Expires: {new Date(invite.expires_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4">
        Share these codes with people you want to join your group. Click any code to copy it.
      </div>
    </div>
  )
}