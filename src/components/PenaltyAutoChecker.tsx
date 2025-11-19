'use client'

import { useState, useEffect } from 'react'
import { PenaltyResponseModal } from './PenaltyResponseModal'
import type { PendingPenalty } from '@/types/penalties'
import { supabase } from '@/lib/supabase'

interface PenaltyAutoCheckerProps {
  userId: string
  onComplete?: () => void
}

export function PenaltyAutoChecker({ userId, onComplete }: PenaltyAutoCheckerProps) {
  const [activePenalties, setActivePenalties] = useState<PendingPenalty[]>([])
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkPenalties()
  }, [userId])

  const checkPenalties = async () => {
    try {
      setIsChecking(true)

      // Get auth session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setIsChecking(false)
        return
      }

      // Call API to get pending penalties
      const response = await fetch('/api/penalties/my-pending', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch pending penalties')
        setIsChecking(false)
        return
      }

      const data = await response.json()
      const penalties: PendingPenalty[] = data.penalties || []

      if (penalties.length === 0) {
        setIsChecking(false)
        return
      }

      // Separate expired and active penalties
      const expired = penalties.filter(p => p.is_expired)
      const active = penalties.filter(p => !p.is_expired)

      // Auto-accept expired penalties
      if (expired.length > 0) {
        await autoAcceptExpiredPenalties(expired, session.access_token)
      }

      // Show modal for active penalties
      if (active.length > 0) {
        setActivePenalties(active)
      } else {
        // If only expired penalties, refresh and close
        if (onComplete) {
          onComplete()
        } else {
          window.location.reload()
        }
      }

      setIsChecking(false)

    } catch (error) {
      console.error('Error checking penalties:', error)
      setIsChecking(false)
    }
  }

  const autoAcceptExpiredPenalties = async (penalties: PendingPenalty[], token: string) => {
    // Auto-accept each expired penalty
    for (const penalty of penalties) {
      try {
        await fetch('/api/penalties/respond', {
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
      } catch (error) {
        console.error('Error auto-accepting penalty:', error)
      }
    }
  }

  const handleComplete = () => {
    setActivePenalties([])
    if (onComplete) {
      onComplete()
    } else {
      // Refresh page to show updated state
      window.location.reload()
    }
  }

  // Don't render anything while checking
  if (isChecking) {
    return null
  }

  // Show modal if there are active penalties
  if (activePenalties.length > 0) {
    return (
      <PenaltyResponseModal
        penalties={activePenalties}
        onComplete={handleComplete}
      />
    )
  }

  // Nothing to show
  return null
}
