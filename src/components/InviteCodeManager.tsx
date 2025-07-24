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
      const { error } = await supabase
        .from('group_invites')
        .insert({
          group_id: profile.group_id,
          created_by: user?.id,
          max_uses: 10,
          is_active: true
        })

      if (error) throw error
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
      await loadInvites()
    } catch (error) {
      console.error('Error toggling invite:', error)
      setError('Failed to update invite code')
    }
  }

  const copyToClipboard = (code: string) => {
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
              className={`border p-3 ${
                invite.is_active 
                  ? 'border-gray-600 bg-gray-800/50' 
                  : 'border-gray-700 bg-gray-800/20 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="font-mono text-lg text-orange-400 cursor-pointer hover:text-orange-300"
                  onClick={() => copyToClipboard(invite.invite_code)}
                  title="Click to copy"
                >
                  {invite.invite_code}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 border ${
                    invite.is_active 
                      ? 'text-green-300 border-green-600 bg-green-900/20' 
                      : 'text-gray-400 border-gray-600 bg-gray-800/20'
                  }`}>
                    {invite.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => toggleInvite(invite.id, invite.is_active)}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    {invite.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
              
              <div className="text-xs text-gray-400 space-y-1">
                <div>Uses: {invite.current_uses}/{invite.max_uses}</div>
                <div>Created: {new Date(invite.created_at).toLocaleDateString()}</div>
                {invite.expires_at && (
                  <div>Expires: {new Date(invite.expires_at).toLocaleDateString()}</div>
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