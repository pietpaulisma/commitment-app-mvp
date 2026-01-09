'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PenaltyResponseModal } from './modals/PenaltyResponseModal'
import type { PendingPenalty } from '@/types/penalties'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface PenaltyAutoCheckerProps {
  onComplete?: () => void
}

export function PenaltyAutoChecker({ onComplete }: PenaltyAutoCheckerProps) {
  const { user } = useAuth()
  const [activePenalties, setActivePenalties] = useState<PendingPenalty[]>([])
  const [isChecking, setIsChecking] = useState(true)
  const hasCheckedRef = useRef(false)

  const checkPenalties = useCallback(async () => {
    try {
      setIsChecking(true)
      console.log('[PenaltyAutoChecker] Starting penalty check...')

      // Get auth session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('[PenaltyAutoChecker] No session found, skipping penalty check')
        setIsChecking(false)
        return
      }

      // Auto-create penalty for current user if needed (before checking)
      try {
        // Calculate yesterday in user's local timezone
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const year = yesterday.getFullYear()
        const month = String(yesterday.getMonth() + 1).padStart(2, '0')
        const day = String(yesterday.getDate()).padStart(2, '0')
        const yesterdayDate = `${year}-${month}-${day}`
        
        console.log('[PenaltyAutoChecker] Auto-creating penalty check for date:', yesterdayDate)

        const autoCreateResponse = await fetch('/api/penalties/auto-create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ yesterdayDate })
        })
        
        const autoCreateData = await autoCreateResponse.json()
        
        // Log detailed result for debugging
        if (!autoCreateResponse.ok) {
          console.error('[PenaltyAutoChecker] ❌ Auto-create failed with status:', autoCreateResponse.status, autoCreateData)
        } else if (autoCreateData.penaltyCreated) {
          console.log('[PenaltyAutoChecker] ✅ NEW penalty created:', autoCreateData.penalty?.id)
        } else if (autoCreateData.penaltyExists) {
          console.log('[PenaltyAutoChecker] ℹ️ Penalty already exists:', autoCreateData.penaltyId, 'status:', autoCreateData.penaltyStatus)
        } else if (autoCreateData.noPenalty) {
          console.log('[PenaltyAutoChecker] ✓ No penalty needed:', autoCreateData.reason)
        } else {
          console.log('[PenaltyAutoChecker] Auto-create result:', autoCreateData)
        }
      } catch (error) {
        console.error('[PenaltyAutoChecker] ❌ Error auto-creating penalty:', error)
      }

      // Call API to get pending penalties
      console.log('[PenaltyAutoChecker] Fetching pending penalties...')
      const response = await fetch('/api/penalties/my-pending', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        console.error('[PenaltyAutoChecker] Failed to fetch pending penalties, status:', response.status)
        setIsChecking(false)
        return
      }

      const data = await response.json()
      const penalties: PendingPenalty[] = data.penalties || []
      console.log('[PenaltyAutoChecker] Found penalties:', penalties.length, penalties)

      if (penalties.length === 0) {
        console.log('[PenaltyAutoChecker] No pending penalties found')
        setIsChecking(false)
        return
      }

      // Separate expired and active penalties
      const expired = penalties.filter(p => p.is_expired)
      const active = penalties.filter(p => !p.is_expired)
      console.log('[PenaltyAutoChecker] Expired:', expired.length, 'Active:', active.length)

      // Auto-accept expired penalties
      if (expired.length > 0) {
        console.log('[PenaltyAutoChecker] Auto-accepting expired penalties:', expired.map(p => p.id))
        await autoAcceptExpiredPenalties(expired, session.access_token)
      }

      // Show modal for active penalties
      if (active.length > 0) {
        console.log('[PenaltyAutoChecker] Showing modal for active penalties:', active.map(p => p.id))
        setActivePenalties(active)
      } else {
        // If only expired penalties, refresh and close
        console.log('[PenaltyAutoChecker] Only expired penalties, completing...')
        if (onComplete) {
          onComplete()
        } else {
          window.location.reload()
        }
      }

      setIsChecking(false)

    } catch (error) {
      console.error('[PenaltyAutoChecker] Error checking penalties:', error)
      setIsChecking(false)
    }
  }, [onComplete])

  // Check penalties when user is available
  useEffect(() => {
    if (user && !hasCheckedRef.current) {
      hasCheckedRef.current = true
      checkPenalties()
    }
  }, [user, checkPenalties])

  // Re-check on visibility change (when user returns to app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && activePenalties.length === 0) {
        console.log('[PenaltyAutoChecker] App became visible, re-checking penalties')
        checkPenalties()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, activePenalties.length, checkPenalties])

  const autoAcceptExpiredPenalties = async (penalties: PendingPenalty[], token: string) => {
    // Auto-accept each expired penalty
    for (const penalty of penalties) {
      try {
        console.log('[PenaltyAutoChecker] Auto-accepting expired penalty:', penalty.id)
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
        
        const result = await response.json()
        
        if (!response.ok) {
          console.error('[PenaltyAutoChecker] Failed to auto-accept penalty:', penalty.id, result)
        } else {
          console.log('[PenaltyAutoChecker] Successfully auto-accepted penalty:', penalty.id, result)
        }
      } catch (error) {
        console.error('[PenaltyAutoChecker] Error auto-accepting penalty:', penalty.id, error)
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

  // Don't render anything if no user or while checking
  if (!user || isChecking) {
    return null
  }

  // Show modal if there are active penalties
  if (activePenalties.length > 0) {
    return (
      <PenaltyResponseModal
        penalties={activePenalties}
        onComplete={handleComplete}
        onDismiss={() => setActivePenalties([])}
      />
    )
  }

  // Nothing to show
  return null
}
