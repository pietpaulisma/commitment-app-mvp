'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import OnboardingLayout from '@/components/OnboardingLayout'
import EmojiPicker from '@/components/EmojiPicker'

export default function ProfileSetupPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [personalColor, setPersonalColor] = useState('#ef4444') // Default red
  const [customIcon, setCustomIcon] = useState('💪') // Default muscle
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const availableColors = [
    { color: '#ef4444', name: 'Blood Red' },
    { color: '#f97316', name: 'Fire Orange' },
    { color: '#f59e0b', name: 'Warning Yellow' },
    { color: '#84cc16', name: 'Toxic Green' },
    { color: '#06b6d4', name: 'Ice Blue' },
    { color: '#3b82f6', name: 'Electric Blue' },
    { color: '#6366f1', name: 'Royal Purple' },
    { color: '#8b5cf6', name: 'Dark Purple' },
    { color: '#ec4899', name: 'Neon Pink' },
    { color: '#6b7280', name: 'Steel Gray' }
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
    
    if (!firstName.trim() || !lastName.trim()) {
      setError('Both first and last name are required to continue.')
      return
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      setError('Names must be at least 2 characters long.')
      return
    }

    setIsSubmitting(true)

    try {
      // First, get the user's current group to check for uniqueness
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('group_id')
        .eq('id', user?.id)
        .single()

      if (currentProfile?.group_id) {
        // Check if color is already taken in this group
        const { data: colorConflict } = await supabase
          .from('profiles')
          .select('id')
          .eq('group_id', currentProfile.group_id)
          .eq('personal_color', personalColor)
          .neq('id', user?.id)
          .single()

        if (colorConflict) {
          setError('This color is already taken by another group member. Please choose a different color.')
          setIsSubmitting(false)
          return
        }

        // Check if icon is already taken in this group
        const { data: iconConflict } = await supabase
          .from('profiles')
          .select('id')
          .eq('group_id', currentProfile.group_id)
          .eq('custom_icon', customIcon)
          .neq('id', user?.id)
          .single()

        if (iconConflict) {
          setError('This icon is already taken by another group member. Please choose a different icon.')
          setIsSubmitting(false)
          return
        }
      }

      // Update profile with uniqueness guaranteed
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          onboarding_completed: true,
          ...(personalColor && { personal_color: personalColor }),
          ...(customIcon && { custom_icon: customIcon })
        })
        .eq('id', user?.id)

      if (updateError) {
        // If it's a column not found error, proceed without the missing columns for now
        if (updateError.message.includes('custom_icon') || updateError.message.includes('personal_color')) {
          console.warn('Profile customization columns not yet available in database, proceeding with basic profile update')
          
          // Try updating just the basic fields
          const { error: basicUpdateError } = await supabase
            .from('profiles')
            .update({
              first_name: firstName.trim(),
              last_name: lastName.trim(),
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

      // Onboarding complete! Go to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Profile setup failed:', error)
      setError(error.message || 'Failed to save profile. The system rejected your data.')
      setIsSubmitting(false)
    }
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
            IDENTITY PROTOCOL
          </h1>
          <p className="text-gray-400 text-sm">
            Define yourself within your group. Choose wisely - no duplicates allowed.
          </p>
        </div>

        {/* Preview */}
        <div className="bg-gray-900/50 border border-gray-700 p-6 mb-8">
          <div className="text-center">
            <div 
              className="w-16 h-16 border-2 flex items-center justify-center mx-auto mb-3"
              style={{ 
                backgroundColor: personalColor,
                borderColor: personalColor 
              }}
            >
              <span className="text-2xl">{customIcon}</span>
            </div>
            <div className="text-white font-bold">
              {firstName || 'First'} {lastName || 'Last'}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">
              COMMITTED MEMBER
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6 mb-8">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-red-400 mb-2 uppercase tracking-wide">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-red-400 transition-colors"
                placeholder="John"
                disabled={isSubmitting}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-red-400 mb-2 uppercase tracking-wide">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-red-400 transition-colors"
                placeholder="Doe"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {/* Color selection */}
          <div>
            <label className="block text-sm font-bold text-red-400 mb-3 uppercase tracking-wide">
              Your Color Identity
            </label>
            <div className="grid grid-cols-5 gap-3">
              {availableColors.map(({ color, name }) => (
                <button
                  key={color}
                  onClick={() => setPersonalColor(color)}
                  disabled={isSubmitting}
                  className={`w-12 h-12 border-2 transition-all ${
                    personalColor === color 
                      ? 'border-white scale-110' 
                      : 'border-gray-600 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={name}
                />
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              This color represents you in the system
            </div>
          </div>

          {/* Icon selection */}
          <EmojiPicker
            selectedEmoji={customIcon}
            onEmojiSelect={setCustomIcon}
            disabled={isSubmitting}
          />
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-900/50 border border-red-600 p-4 mb-6">
            <div className="text-red-200 text-sm font-mono">
              {error}
            </div>
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={isSubmitting || !firstName.trim() || !lastName.trim()}
          className="w-full bg-red-600 text-white py-4 px-6 border border-red-400 hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-black text-lg"
        >
          {isSubmitting ? 'REGISTERING IDENTITY...' : 'COMPLETE COMMITMENT'}
        </button>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-600 font-mono">
            This information will be visible to your accountability group
          </p>
        </div>

        {/* Processing state */}
        {isSubmitting && (
          <div className="text-center mt-4">
            <div className="animate-pulse text-red-400 font-mono text-sm">
              UPDATING SYSTEM RECORDS...
            </div>
          </div>
        )}
      </div>
    </OnboardingLayout>
  )
}