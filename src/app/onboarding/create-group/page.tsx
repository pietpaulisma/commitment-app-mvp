'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import OnboardingLayout from '@/components/OnboardingLayout'

export default function CreateGroupPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [groupName, setGroupName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    // Set default start date to today
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
  }, [user, router])

  const handleBack = () => {
    router.push('/onboarding/groups')
  }

  const handleCreateGroup = async () => {
    setError('')
    
    if (!groupName.trim()) {
      setError('Group name is required to proceed.')
      return
    }

    if (groupName.trim().length < 3) {
      setError('Group name must be at least 3 characters long.')
      return
    }

    if (!startDate) {
      setError('Start date is required.')
      return
    }

    const selectedDate = new Date(startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      setError('Start date cannot be in the past.')
      return
    }

    setIsSubmitting(true)

    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName.trim(),
          start_date: startDate,
          admin_id: user?.id
        })
        .select()
        .single()

      if (groupError) throw groupError

      // Update user profile to be group admin and join the group
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'group_admin',
          group_id: groupData.id,
          onboarding_completed: true
        })
        .eq('id', user?.id)

      if (profileError) throw profileError

      // Create initial invite code for the group
      const { error: inviteError } = await supabase
        .from('group_invites')
        .insert({
          group_id: groupData.id,
          created_by: user?.id,
          max_uses: 10,
          is_active: true
        })

      if (inviteError) {
        console.error('Error creating invite code:', inviteError)
        // Don't fail the whole process for this
      }

      // Success! Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error creating group:', error)
      setError(error.message || 'Failed to create group. The system rejected your request.')
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <OnboardingLayout showBackButton onBack={handleBack}>
      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-orange-400 mb-2 tracking-tight">
            LEADERSHIP PROTOCOL
          </h1>
          <p className="text-gray-400 text-sm">
            Take responsibility for others' commitment.
          </p>
        </div>

        {/* Warning */}
        <div className="bg-orange-900/20 border border-orange-600/50 p-6 mb-8">
          <div className="text-center">
            <div className="text-orange-400 font-mono text-xs uppercase tracking-widest mb-2">
              ADMIN RESPONSIBILITY
            </div>
            <p className="text-orange-200 text-sm leading-relaxed">
              As a group admin, you will be responsible for monitoring and guiding your members. 
              Their failures reflect on your leadership. Their success is your success.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6 mb-8">
          {/* Group name */}
          <div>
            <label className="block text-sm font-bold text-orange-400 mb-2 uppercase tracking-wide">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-orange-400 transition-colors"
              placeholder="Iron Wolves, Steel Warriors, etc."
              disabled={isSubmitting}
              required
              maxLength={50}
            />
            <div className="text-xs text-gray-500 mt-1">
              Choose something that inspires commitment and fear
            </div>
          </div>

          {/* Start date */}
          <div>
            <label className="block text-sm font-bold text-orange-400 mb-2 uppercase tracking-wide">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-orange-400 transition-colors"
              disabled={isSubmitting}
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              When your group's commitment journey begins
            </div>
          </div>
        </div>

        {/* Admin privileges preview */}
        <div className="bg-gray-900/50 border border-gray-700 p-6 mb-8">
          <h3 className="text-white font-bold mb-4 uppercase tracking-wide">
            Your Admin Powers
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-400 flex-shrink-0"></div>
              <span className="text-gray-300">Monitor all member activity and progress</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-400 flex-shrink-0"></div>
              <span className="text-gray-300">Generate invite codes to recruit members</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-400 flex-shrink-0"></div>
              <span className="text-gray-300">Set group challenges and targets</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-400 flex-shrink-0"></div>
              <span className="text-gray-300">Remove members who break commitment</span>
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

        {/* Create button */}
        <button
          onClick={handleCreateGroup}
          disabled={isSubmitting || !groupName.trim() || !startDate}
          className="w-full bg-orange-600 text-black py-4 px-6 border border-orange-400 hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-black text-lg"
        >
          {isSubmitting ? 'ESTABLISHING LEADERSHIP...' : 'ACCEPT LEADERSHIP'}
        </button>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-600 font-mono leading-relaxed">
            By creating a group, you accept full responsibility for its members.<br/>
            <span className="text-orange-400">Lead by example.</span>
          </p>
        </div>

        {/* Processing state */}
        {isSubmitting && (
          <div className="text-center mt-4">
            <div className="animate-pulse text-orange-400 font-mono text-sm">
              CREATING GROUP & ASSIGNING ADMIN ROLE...
            </div>
          </div>
        )}
      </div>
    </OnboardingLayout>
  )
}