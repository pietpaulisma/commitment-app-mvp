'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, User, Palette, Check } from 'lucide-react'
import EmojiPicker from '@/components/EmojiPicker'

export default function ProfileSetupPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [username, setUsername] = useState('')
  const [personalColor, setPersonalColor] = useState('#3B82F6')
  const [customIcon, setCustomIcon] = useState('💪')
  const [birthDate, setBirthDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const availableColors = [
    '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B',
    '#EF4444', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
  ]

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  const handleBack = () => {
    router.push('/onboarding/groups')
  }

  const handleContinue = async () => {
    setError('')
    
    if (!username.trim()) {
      setError('Username is required')
      return
    }
    
    if (!birthDate) {
      setError('Birthday is required')
      return
    }

    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters')
      return
    }

    setIsSubmitting(true)

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('group_id')
        .eq('id', user?.id)
        .single()

      if (currentProfile?.group_id) {
        const { data: colorConflict } = await supabase
          .from('profiles')
          .select('id')
          .eq('group_id', currentProfile.group_id)
          .eq('personal_color', personalColor)
          .neq('id', user?.id)
          .single()

        if (colorConflict) {
          setError('This color is already taken by another group member')
          setIsSubmitting(false)
          return
        }

        const { data: iconConflict } = await supabase
          .from('profiles')
          .select('id')
          .eq('group_id', currentProfile.group_id)
          .eq('custom_icon', customIcon)
          .neq('id', user?.id)
          .single()

        if (iconConflict) {
          setError('This icon is already taken by another group member')
          setIsSubmitting(false)
          return
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          onboarding_completed: true,
          ...(personalColor && { personal_color: personalColor }),
          ...(customIcon && { custom_icon: customIcon }),
          ...(birthDate && { birth_date: birthDate })
        })
        .eq('id', user?.id)

      if (updateError) {
        if (updateError.message.includes('custom_icon') || updateError.message.includes('personal_color')) {
          console.warn('Profile customization columns not available, proceeding with basic update')
          
          const { error: basicUpdateError } = await supabase
            .from('profiles')
            .update({
              username: username.trim(),
              onboarding_completed: true
            })
            .eq('id', user?.id)
            
          if (basicUpdateError) {
            throw basicUpdateError
          }
        } else {
          throw updateError
        }
      }

      router.push('/dashboard')
    } catch (error: any) {
      console.error('Profile setup failed:', error)
      setError(error.message || 'Failed to save profile')
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
                  i < 2 ? 'w-6 bg-gradient-to-r from-blue-400 to-purple-500' : 'w-6 bg-white/40'
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
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <User className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black">Your Identity</h1>
          <p className="text-zinc-400">Define yourself within your group</p>
        </div>

        {/* Preview Card */}
        <GlassCard>
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: personalColor }}
            >
              <span className="text-3xl">{customIcon}</span>
            </div>
            <div className="text-white font-bold text-lg">
              {username || 'Username'}
            </div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">
              Committed Member
            </div>
          </div>
        </GlassCard>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Username */}
          <GlassCard>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="Enter your username"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-zinc-600">This will be your display name in the group</p>
            </div>
          </GlassCard>

          {/* Birthday */}
          <GlassCard>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Birthday
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-2xl text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-zinc-600">Double points required on your birthday!</p>
            </div>
          </GlassCard>

          {/* Color Selection */}
          <GlassCard>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Your Color
              </label>
              <div className="grid grid-cols-5 gap-3">
                {availableColors.map((color) => (
                  <motion.button
                    key={color}
                    onClick={() => setPersonalColor(color)}
                    disabled={isSubmitting}
                    className={`aspect-square rounded-xl transition-all ${
                      personalColor === color 
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A0A0A] scale-105' 
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  />
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Icon Selection */}
          <GlassCard>
            <EmojiPicker
              selectedEmoji={customIcon}
              onEmojiSelect={setCustomIcon}
              disabled={isSubmitting}
            />
          </GlassCard>
        </div>

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
            onClick={handleContinue}
            disabled={isSubmitting || !username.trim()}
            className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 transition-all overflow-hidden disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: !isSubmitting && username.trim() 
                ? 'linear-gradient(135deg, rgb(96, 165, 250) 0%, rgb(79, 70, 229) 100%)' 
                : 'linear-gradient(135deg, rgb(63, 63, 70) 0%, rgb(39, 39, 42) 100%)',
              boxShadow: !isSubmitting && username.trim() ? '0 0 30px 5px rgba(96, 165, 250, 0.2)' : 'none',
            }}
          >
            <span className="text-white font-bold">
              {isSubmitting ? 'Saving...' : 'Complete Setup'}
            </span>
            {!isSubmitting && <ChevronRight size={20} className="text-white" />}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
