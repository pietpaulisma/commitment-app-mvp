'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, formatTimeRemaining } from '@/utils/penaltyHelpers'
import type { PendingPenalty, ReasonCategory } from '@/types/penalties'

interface PenaltyResponseModalProps {
  penalties: PendingPenalty[]
  onComplete: () => void
  onDismiss?: () => void
  isTestMode?: boolean
}

type Screen = 'overview' | 'success'

export function PenaltyResponseModal({ penalties, onComplete, onDismiss, isTestMode = false }: PenaltyResponseModalProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('overview')
  const [selectedReason, setSelectedReason] = useState<'accept' | 'technical' | 'other' | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [processingPenalty, setProcessingPenalty] = useState<string | null>(null)

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Get auth token from Supabase session
  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  // Handle dismissal
  const handleDismiss = () => {
    if (onDismiss) {
      // Store dismissal timestamp in localStorage to prevent re-showing immediately
      const dismissalKey = `penalty_dismissed_${currentPenalty?.id}`
      localStorage.setItem(dismissalKey, Date.now().toString())
      onDismiss()
    }
  }

  // Calculate time remaining until end of today
  const getTimeUntilMidnight = () => {
    const now = new Date()
    const midnight = new Date()
    midnight.setHours(24, 0, 0, 0)
    const msRemaining = midnight.getTime() - now.getTime()
    const hoursRemaining = msRemaining / (1000 * 60 * 60)
    return hoursRemaining
  }

  const handleAcceptPenalty = async (penalty: PendingPenalty) => {
    setIsSubmitting(true)
    setError(null)
    setProcessingPenalty(penalty.id)

    // Test mode: skip API call
    if (isTestMode) {
      setSuccessMessage(`✅ Penalty accepted. €${penalty.penalty_amount} added to your balance.`)
      setCurrentScreen('success')

      setTimeout(() => {
        onComplete()
      }, 2000)

      setIsSubmitting(false)
      setProcessingPenalty(null)
      return
    }

    try {
      const token = await getAuthToken()
      const response = await fetch('/api/penalties/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          penalty_id: penalty.id,
          action: 'accept'
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept penalty')
      }

      setSuccessMessage(`✅ Penalty accepted. €${penalty.penalty_amount} added to your balance.`)
      setCurrentScreen('success')

      // Close modal after 2 seconds
      setTimeout(() => {
        onComplete()
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept penalty')
      setIsSubmitting(false)
      setProcessingPenalty(null)
    }
  }

  const handleSubmitReason = async (penalty: PendingPenalty) => {
    if (!selectedReason) {
      setError('Please select a reason')
      return
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      setError('Please provide a message explaining your reason')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setProcessingPenalty(penalty.id)

    // Test mode: skip API call
    if (isTestMode) {
      setSuccessMessage(`✅ Your reason has been shared with the group.`)
      setCurrentScreen('success')

      setTimeout(() => {
        onComplete()
      }, 2000)

      setIsSubmitting(false)
      setProcessingPenalty(null)
      return
    }

    try {
      let reasonCategory: ReasonCategory = 'other'
      let reasonMessage = ''

      if (selectedReason === 'technical') {
        reasonCategory = 'other'
        reasonMessage = 'I completed my workout but the app failed to record it properly'
      } else if (selectedReason === 'other') {
        reasonCategory = 'other'
        reasonMessage = customReason.trim()
      }

      const token = await getAuthToken()
      const response = await fetch('/api/penalties/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          penalty_id: penalty.id,
          action: 'dispute',
          reason_category: reasonCategory,
          reason_message: reasonMessage
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit reason')
      }

      setSuccessMessage(`✅ Your reason has been shared with the group.`)
      setCurrentScreen('success')

      // Close modal after 2 seconds
      setTimeout(() => {
        onComplete()
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit reason')
      setIsSubmitting(false)
      setProcessingPenalty(null)
    }
  }

  // Separate expired and active penalties
  const expiredPenalties = penalties.filter(p => p.is_expired)
  const activePenalties = penalties.filter(p => !p.is_expired)

  if (currentScreen === 'success') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onComplete} />

        <div className="relative bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl p-6 max-w-sm w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-white mb-2">
                Success!
              </h2>
              <p className="text-white/60">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Overview screen - one penalty at a time
  const currentPenalty = activePenalties[0]

  if (!currentPenalty) {
    // All penalties processed
    onComplete()
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onDismiss ? handleDismiss : undefined}
      />

      <div
        className="relative bg-[#0A0A0A] border border-white/10 shadow-2xl rounded-3xl p-6 max-w-sm w-full overflow-hidden"
        style={{
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

        {/* Content wrapper with z-index */}
        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          {/* X Button - Only show if onDismiss is provided */}
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white/80 z-20"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}

          {/* Header - Fixed, doesn't scroll */}
          <div className="flex-shrink-0 text-center mb-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Target: {currentPenalty.target_points} pts
          </h2>
          <p className="text-lg text-orange-400 font-semibold mb-2">
            Actual: {currentPenalty.actual_points} pts
          </p>
          <p className="text-white/60 text-sm">
            {formatDate(currentPenalty.date)}
          </p>
        </div>

        {/* Penalty Info - Fixed, doesn't scroll */}
        <div className="flex-shrink-0 bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-xs text-white/60">Time Left Today</div>
              <div className={`font-bold text-lg ${
                getTimeUntilMidnight() < 2 ? 'text-red-400' :
                getTimeUntilMidnight() < 6 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {formatTimeRemaining(getTimeUntilMidnight())}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/60">Penalty Amount</div>
              <div className="text-orange-400 font-bold text-lg">€{currentPenalty.penalty_amount}</div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-white/10">
            <div>
              <div className="text-xs text-white/60">Target</div>
              <div className="text-white font-bold">{currentPenalty.target_points} pts</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/60">Actual</div>
              <div className="text-orange-400 font-bold">{currentPenalty.actual_points} pts</div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain" style={{ 
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}>
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Options */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => {
                setSelectedReason('accept')
                setCustomReason('')
                setError(null)
              }}
              disabled={isSubmitting}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedReason === 'accept'
                  ? 'bg-green-600/20 border-green-600/50'
                  : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div className="text-white font-medium">💰 Pay the fine</div>
              <div className="text-white/60 text-xs mt-0.5">Add €{currentPenalty.penalty_amount} to group pot</div>
            </button>

            <button
              onClick={() => {
                if (selectedReason === 'technical') {
                  setSelectedReason(null)
                  setError(null)
                } else {
                  setSelectedReason('technical')
                  setCustomReason('') // Clear other reason text
                  setError(null)
                }
              }}
              disabled={isSubmitting}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedReason === 'technical'
                  ? 'bg-blue-600/20 border-blue-600/50'
                  : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div className="text-white font-medium">🔧 App glitch</div>
              <div className="text-white/60 text-xs mt-0.5">I did my duty but the app failed</div>
            </button>

            <button
              onClick={() => {
                if (selectedReason === 'other') {
                  setSelectedReason(null)
                  setCustomReason('')
                  setError(null)
                } else {
                  setSelectedReason('other')
                  setError(null)
                }
              }}
              disabled={isSubmitting}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedReason === 'other'
                  ? 'bg-blue-600/20 border-blue-600/50'
                  : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div className="text-white font-medium">💬 Other reason</div>
              <div className="text-white/60 text-xs mt-0.5">Explain why you missed your target</div>
            </button>
          </div>

          {/* Custom Reason Input - Only shown when "Other reason" is selected */}
          {selectedReason === 'other' && (
            <div className="mb-6">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <label className="block text-xs font-medium text-white/60 mb-2">
                  Your reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Explain why you missed your target..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 resize-none"
                  autoFocus
                />
                <p className="text-xs text-white/40 mt-1">
                  This will be shared with the group
                </p>
              </div>
            </div>
          )}

          {/* Submit Button - Show when any reason is selected */}
          {selectedReason && (
            <div className="mb-6">
              <button
                onClick={() => {
                  if (selectedReason === 'accept') {
                    handleAcceptPenalty(currentPenalty)
                  } else {
                    handleSubmitReason(currentPenalty)
                  }
                }}
                disabled={isSubmitting || (selectedReason === 'other' && !customReason.trim())}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
              >
                {isSubmitting && processingPenalty === currentPenalty.id ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : selectedReason === 'accept' ? (
                  'Pay Fine'
                ) : (
                  'Submit to Group'
                )}
              </button>
            </div>
          )}

          {/* Footer */}
          {activePenalties.length > 1 && (
            <div className="text-center text-xs text-white/60 mt-4">
              1 of {activePenalties.length} penalties
            </div>
          )}

          <div className="text-center text-xs text-white/40 mt-2">
            Respond today or penalty auto-accepts at midnight
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
