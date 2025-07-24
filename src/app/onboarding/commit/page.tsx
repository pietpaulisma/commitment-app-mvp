'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OnboardingLayout from '@/components/OnboardingLayout'
import CommitmentButton from '@/components/CommitmentButton'

export default function CommitPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [commitmentStatement, setCommitmentStatement] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)
  const [error, setError] = useState('')

  const handleBack = () => {
    router.push('/onboarding/welcome')
  }

  const handleCommit = async () => {
    setError('')
    
    // Validation
    if (!email || !password || !confirmPassword) {
      setError('All fields are required to proceed with commitment.')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match. The system demands precision.')
      return
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters. Security is non-negotiable.')
      return
    }
    
    if (!commitmentStatement.trim()) {
      setError('You must declare your commitment. Words have power.')
      return
    }

    setIsCommitting(true)
    
    try {
      // Create the user account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            commitment_statement: commitmentStatement.trim(),
            onboarding_started: true
          }
        }
      })

      if (signUpError) {
        throw signUpError
      }

      if (data.user) {
        // Update profile with commitment statement
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            commitment_statement: commitmentStatement.trim()
          })
          .eq('id', data.user.id)

        if (profileError) {
          console.error('Error updating profile:', profileError)
        }

        // Proceed to profile setup
        router.push('/onboarding/profile')
      }
    } catch (error: any) {
      console.error('Commitment failed:', error)
      setError(error.message || 'Commitment failed. The system rejected your attempt.')
      setIsCommitting(false)
    }
  }

  return (
    <OnboardingLayout showBackButton onBack={handleBack}>
      <div className="px-6 py-8 min-h-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-red-400 mb-2 tracking-tight">
            FINAL COMMITMENT
          </h1>
          <p className="text-gray-400 text-sm">
            Enter your details. This binds you to the system.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6 mb-8">
          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-red-400 mb-2 uppercase tracking-wide">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-red-400 transition-colors"
              placeholder="your.email@domain.com"
              disabled={isCommitting}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-red-400 mb-2 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-red-400 transition-colors"
              placeholder="Enter a strong password"
              disabled={isCommitting}
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-bold text-red-400 mb-2 uppercase tracking-wide">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-red-400 transition-colors"
              placeholder="Confirm your password"
              disabled={isCommitting}
              required
            />
          </div>

          {/* Commitment Statement */}
          <div>
            <label className="block text-sm font-bold text-red-400 mb-2 uppercase tracking-wide">
              Your Commitment Statement
            </label>
            <textarea
              value={commitmentStatement}
              onChange={(e) => setCommitmentStatement(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-red-400 transition-colors h-24 resize-none"
              placeholder="I commit to transforming my body and mind through disciplined action..."
              disabled={isCommitting}
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              This will be visible to your accountability group
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

        {/* Commitment Button */}
        <CommitmentButton
          onCommit={handleCommit}
          disabled={isCommitting}
          className="mb-6"
        />

        {/* Final warning */}
        {!isCommitting && (
          <div className="text-center">
            <p className="text-xs text-gray-600 font-mono leading-relaxed">
              By holding the button above, you swear to uphold your commitment.<br/>
              The system will track your every move.<br/>
              <span className="text-red-400">There is no undo.</span>
            </p>
          </div>
        )}

        {/* Processing state */}
        {isCommitting && (
          <div className="text-center">
            <div className="animate-pulse text-red-400 font-mono text-sm">
              PROCESSING COMMITMENT...
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Binding you to the system...
            </div>
          </div>
        )}
      </div>
    </OnboardingLayout>
  )
}