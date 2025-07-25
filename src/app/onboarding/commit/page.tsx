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
  const [isCommitting, setIsCommitting] = useState(false)
  const [error, setError] = useState('')

  const handleBack = () => {
    router.push('/onboarding/welcome')
  }

  const handleCommit = async () => {
    setError('')
    setIsCommitting(true)
    
    try {
      // For testing purposes, if no email/password provided, create a mock session
      if (!email.trim() || !password.trim()) {
        // Create a test user session
        const testUser = {
          id: 'test-onboarding-user-' + Date.now(),
          email: email.trim() || 'test@onboarding.com',
          role: 'user'
        }
        localStorage.setItem('demo-user', JSON.stringify(testUser))
        
        // Add a small delay to ensure localStorage is set before navigation
        setTimeout(() => {
          // Force page reload to trigger auth context update - go to groups first
          window.location.href = '/onboarding/groups'
        }, 100)
        return
      }

      // If email/password provided, validate them
      if (password !== confirmPassword) {
        setError('Passwords do not match. The system demands precision.')
        setIsCommitting(false)
        return
      }
      
      if (password.length < 6) {
        setError('Password must be at least 6 characters. Security is non-negotiable.')
        setIsCommitting(false)
        return
      }

      // Create the real user account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            onboarding_started: true
          }
        }
      })

      if (signUpError) {
        throw signUpError
      }

      if (data.user) {
        // Proceed to group selection first
        router.push('/onboarding/groups')
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
              Email Address (Optional for testing)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-red-400 transition-colors"
              placeholder="Leave empty to skip for testing"
              disabled={isCommitting}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-red-400 mb-2 uppercase tracking-wide">
              Password (Optional for testing)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-red-400 transition-colors"
              placeholder="Leave empty to skip for testing"
              disabled={isCommitting}
            />
          </div>

          {/* Confirm Password - only show if password is entered */}
          {password && (
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
              />
            </div>
          )}
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

        {/* Login link */}
        {!isCommitting && (
          <div className="text-center mb-4">
            <button
              onClick={() => router.push('/login')}
              className="text-gray-400 text-sm hover:text-white transition-colors underline"
            >
              Already have an account? Sign in
            </button>
          </div>
        )}

        {/* Final warning */}
        {!isCommitting && (
          <div className="text-center">
            <p className="text-xs text-gray-600 font-mono leading-relaxed">
              By holding the button above, you enter the commitment system.<br/>
              {email.trim() || password.trim() ? (
                <>The system will track your every move.<br/><span className="text-red-400">There is no undo.</span></>
              ) : (
                <span className="text-orange-400">Testing mode: Leave fields empty to skip account creation.</span>
              )}
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