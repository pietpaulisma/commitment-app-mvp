'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Users, Plus } from 'lucide-react'

export default function GroupSelectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')

  const handleInviteCodeJoin = useCallback(async (code: string) => {
    if (!user || !code.trim()) {
      setError('Invalid invite code')
      return
    }

    setIsJoining(true)
    setError('')

    try {
      const { data, error } = await supabase.rpc('join_group_via_invite', {
        p_invite_code: code.trim().toUpperCase()
      })

      if (error) throw error

      if (data.success) {
        console.log('Successfully joined group:', data.group_name)
        setTimeout(() => {
          router.push('/onboarding/profile')
        }, 500)
      } else {
        throw new Error(data.error || 'Failed to join group')
      }
    } catch (error: any) {
      console.error('Error joining via invite code:', error)
      setError(error.message || 'Invalid or expired invite code')
      setIsJoining(false)
    }
  }, [user, router])

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    const inviteParam = searchParams.get('invite')
    if (inviteParam) {
      setInviteCode(inviteParam.toUpperCase())
      handleInviteCodeJoin(inviteParam)
    }
  }, [user, router, searchParams, handleInviteCodeJoin])

  const handleJoinGroup = async () => {
    if (!user || !inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }
    await handleInviteCodeJoin(inviteCode)
  }

  const handleBack = () => {
    router.push('/onboarding/commit')
  }

  const handleCreateGroup = () => {
    router.push('/onboarding/create-group')
  }

  if (!user) {
    return null
  }

  // Glass Card Component
  const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`relative bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-xl p-6 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.12) 0%, rgba(79, 70, 229, 0.08) 40%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute -top-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-50"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(79, 70, 229, 0.06) 40%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-14">
          <motion.button
            onClick={handleBack}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors p-2 -ml-2 rounded-xl hover:bg-white/5"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </motion.button>
          
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i < 1 ? 'w-6 bg-gradient-to-r from-blue-400 to-purple-500' : 'w-6 bg-white/20'
                }`}
              />
            ))}
          </div>
          
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 py-8 pb-32 max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black">Join Your Group</h1>
          <p className="text-zinc-400">Choose your accountability partners</p>
        </div>

        {/* Invite Code Entry */}
        <GlassCard>
          <div className="space-y-6 text-center">
            <div>
              <h3 className="text-white font-bold text-lg mb-2">
                Enter Invite Code
              </h3>
              <p className="text-zinc-500 text-sm">
                8-character code from your group admin
              </p>
            </div>
            
            <div className="space-y-3">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-5 bg-zinc-900/50 border border-white/10 rounded-2xl text-white text-center font-mono tracking-[0.3em] text-2xl placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all uppercase"
                placeholder="XXXXXXXX"
                disabled={isJoining}
                maxLength={8}
                autoFocus
              />
              <p className="text-zinc-600 text-xs">Example: ABC12345</p>
            </div>
          </div>
        </GlassCard>

        {/* Error */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-950/50 border border-red-500/30 rounded-2xl"
          >
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-zinc-600 text-sm">or</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        {/* Create Group Option */}
        <motion.button
          onClick={handleCreateGroup}
          className="w-full h-16 rounded-2xl flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={20} className="text-blue-400" />
          <span className="text-zinc-300 font-semibold">Create a New Group</span>
        </motion.button>

        <p className="text-center text-zinc-600 text-sm">
          Once you join, your group will see your progress daily
        </p>
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-6 left-4 right-4 z-20">
        <div className="max-w-md mx-auto">
          <motion.button
            onClick={handleJoinGroup}
            disabled={isJoining || !inviteCode.trim()}
            className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 transition-all overflow-hidden disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: !isJoining && inviteCode.trim() 
                ? 'linear-gradient(135deg, rgb(96, 165, 250) 0%, rgb(79, 70, 229) 100%)' 
                : 'linear-gradient(135deg, rgb(63, 63, 70) 0%, rgb(39, 39, 42) 100%)',
              boxShadow: !isJoining && inviteCode.trim() ? '0 0 30px 5px rgba(96, 165, 250, 0.2)' : 'none',
            }}
          >
            <span className="text-white font-bold">
              {isJoining ? 'Joining...' : 'Join Group'}
            </span>
            {!isJoining && <ChevronRight size={20} className="text-white" />}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
