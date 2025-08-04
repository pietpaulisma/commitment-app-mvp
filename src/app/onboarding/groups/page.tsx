'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import OnboardingLayout from '@/components/OnboardingLayout'


export default function GroupSelectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    // Handle invite parameter from URL
    const inviteParam = searchParams.get('invite')
    if (inviteParam) {
      setInviteCode(inviteParam.toUpperCase())
      // Try to auto-join with invite code
      handleInviteCodeJoin(inviteParam)
    }
  }, [user, router, searchParams])


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
    if (!user || !inviteCode.trim()) {
      setError('Please enter an invite code.')
      return
    }

    setIsJoining(true)
    setError('')

    try {
      // Use the invite code to join the group
      await handleInviteCodeJoin(inviteCode)
    } catch (error: any) {
      console.error('Error joining group:', error)
      setError(error.message || 'Failed to join group. Invalid or expired invite code.')
      setIsJoining(false)
    }
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

        {/* Invite Code Entry */}
        <div className="mb-8">
          <div className="bg-gray-900/50 border border-gray-700 p-8 text-center">
            <h3 className="text-white font-bold mb-4 uppercase tracking-wide text-lg">
              Enter Invite Code
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Enter the 8-character code shared by your group admin
            </p>
            
            <div className="max-w-md mx-auto">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-4 bg-gray-800 border-2 border-gray-600 text-white focus:outline-none focus:border-red-400 transition-colors uppercase tracking-widest font-mono text-center text-xl"
                placeholder="ENTER CODE"
                disabled={isJoining}
                maxLength={8}
                autoFocus
              />
              <div className="text-xs text-gray-500 mt-3">
                Example: ABC12345
              </div>
            </div>
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
          disabled={isJoining || !inviteCode.trim()}
          className="w-full bg-red-600 text-white py-4 px-6 border border-red-400 hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-black text-lg"
        >
          {isJoining ? 'JOINING GROUP...' : 'JOIN GROUP'}
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