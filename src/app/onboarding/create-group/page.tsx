'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Crown, Users, Calendar, DollarSign } from 'lucide-react'

export default function CreateGroupPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [groupName, setGroupName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [penaltyAmount, setPenaltyAmount] = useState(10)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
  }, [user, router])

  const handleBack = () => {
    router.push('/onboarding/groups')
  }

  const handleCreateGroup = async () => {
    setError('')
    
    if (!groupName.trim()) {
      setError('Group name is required')
      return
    }

    if (groupName.trim().length < 3) {
      setError('Group name must be at least 3 characters')
      return
    }

    if (!startDate) {
      setError('Start date is required')
      return
    }

    const selectedDate = new Date(startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      setError('Start date cannot be in the past')
      return
    }

    setIsSubmitting(true)

    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName.trim(),
          start_date: startDate,
          admin_id: user?.id,
          penalty_amount: penaltyAmount
        })
        .select()
        .single()

      if (groupError) throw groupError

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'group_admin',
          group_id: groupData.id
        })
        .eq('id', user?.id)

      if (profileError) throw profileError

      console.log('Group created successfully')
      router.push('/onboarding/profile')
    } catch (error: any) {
      console.error('Error creating group:', error)
      setError(error.message || 'Failed to create group')
      setIsSubmitting(false)
    }
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
            background: 'radial-gradient(circle, rgba(249, 115, 22, 0.12) 0%, rgba(234, 88, 12, 0.08) 40%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute -top-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-50"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.1) 0%, rgba(249, 115, 22, 0.06) 40%, transparent 70%)',
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
                  i < 1 ? 'w-6 bg-gradient-to-r from-orange-400 to-amber-400' : 'w-6 bg-white/20'
                }`}
              />
            ))}
          </div>
          
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 py-8 pb-32 max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-400 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <Crown className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black">Create Group</h1>
          <p className="text-zinc-400">Lead your accountability squad</p>
        </div>

        {/* Admin Note */}
        <GlassCard className="border-orange-500/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-orange-400 font-semibold text-sm mb-1">Leadership Role</p>
              <p className="text-zinc-400 text-sm">
                As admin, you&apos;ll manage members, generate invite codes, and oversee group progress.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Group Name */}
          <GlassCard>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-orange-400" />
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Group Name
                </label>
              </div>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="Iron Wolves, Steel Warriors..."
                disabled={isSubmitting}
                required
                maxLength={50}
              />
              <p className="text-xs text-zinc-600">Choose something that inspires commitment</p>
            </div>
          </GlassCard>

          {/* Start Date */}
          <GlassCard>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-orange-400" />
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Start Date
                </label>
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-2xl text-white focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-zinc-600">When your group&apos;s journey begins</p>
            </div>
          </GlassCard>

          {/* Penalty Amount */}
          <GlassCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-orange-400" />
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Daily Penalty
                  </label>
                </div>
                <span className="text-2xl font-black text-orange-400">€{penaltyAmount}</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={penaltyAmount}
                onChange={(e) => setPenaltyAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500"
                disabled={isSubmitting}
              />
              <div className="flex justify-between text-xs text-zinc-600">
                <span>€10</span>
                <span>€100</span>
              </div>
              <p className="text-xs text-zinc-600">What members pay for missing their commitment</p>
            </div>
          </GlassCard>
        </div>

        {/* Admin Powers Preview */}
        <GlassCard>
          <h3 className="text-white font-bold mb-4">Your Admin Powers</h3>
          <div className="space-y-3">
            {[
              'Monitor all member activity',
              'Generate invite codes',
              'Set group challenges',
              'Remove uncommitted members'
            ].map((power, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span className="text-zinc-400">{power}</span>
              </div>
            ))}
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
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-6 left-4 right-4 z-20">
        <div className="max-w-md mx-auto">
          <motion.button
            onClick={handleCreateGroup}
            disabled={isSubmitting || !groupName.trim() || !startDate}
            className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 transition-all overflow-hidden disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: !isSubmitting && groupName.trim() && startDate 
                ? 'linear-gradient(135deg, rgb(249, 115, 22) 0%, rgb(234, 88, 12) 100%)' 
                : 'linear-gradient(135deg, rgb(63, 63, 70) 0%, rgb(39, 39, 42) 100%)',
              boxShadow: !isSubmitting && groupName.trim() && startDate ? '0 0 30px 5px rgba(249, 115, 22, 0.2)' : 'none',
            }}
          >
            <span className="text-white font-bold">
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </span>
            {!isSubmitting && <ChevronRight size={20} className="text-white" />}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
