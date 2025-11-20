'use client'

import { useEffect, useState } from 'react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface PenaltyNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  penaltyData: {
    amount: number
    date: string
    reason: string
    targetPoints: number
    actualPoints: number
  }
}

export default function PenaltyNotificationModal({ 
  isOpen, 
  onClose, 
  penaltyData 
}: PenaltyNotificationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-red-500/30 rounded-lg max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Penalty Issued</h3>
              <p className="text-sm text-gray-400">Workout target missed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-red-400 mb-2">
              €{penaltyData.amount}
            </div>
            <p className="text-gray-300 text-sm">
              Penalty for {new Date(penaltyData.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400 uppercase tracking-wide text-xs mb-1">
                  Target Points
                </div>
                <div className="text-white font-semibold">
                  {penaltyData.targetPoints} pts
                </div>
              </div>
              <div>
                <div className="text-gray-400 uppercase tracking-wide text-xs mb-1">
                  Your Points
                </div>
                <div className="text-red-400 font-semibold">
                  {penaltyData.actualPoints} pts
                </div>
              </div>
            </div>
          </div>

          <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 mb-6">
            <p className="text-orange-200 text-sm">
              <strong>Remember:</strong> This penalty helps keep everyone committed to their fitness goals. 
              Stay consistent to avoid future penalties!
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook to check for new penalties and manage popup state
export function usePenaltyNotification() {
  const { user } = useAuth()
  const [showPenalty, setShowPenalty] = useState(false)
  const [penaltyData, setPenaltyData] = useState<any>(null)

  useEffect(() => {
    if (!user) return

    checkForNewPenalties()
  }, [user])

  const checkForNewPenalties = async () => {
    if (!user) return

    try {
      // Get yesterday's date
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      // Check if we've already shown notification for yesterday
      const notificationKey = `penalty_notification_shown_${yesterdayStr}_${user.id}`
      if (localStorage.getItem(notificationKey)) {
        return // Already shown for yesterday
      }

      // Check for penalties from yesterday (including automatic penalties issued today for yesterday's performance)
      const today = new Date().toISOString().split('T')[0]
      
      const { data: penalties, error } = await supabase
        .from('payment_transactions')
        .select('amount, created_at, description')
        .eq('user_id', user.id)
        .eq('transaction_type', 'penalty')
        .or(`and(created_at.gte.${yesterdayStr}T00:00:00,created_at.lt.${yesterdayStr}T23:59:59),and(created_at.gte.${today}T00:00:00,created_at.lt.${today}T06:00:00,description.ilike.*${yesterdayStr}*)`)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error checking for penalties:', error)
        return
      }

      if (penalties && penalties.length > 0) {
        const penalty = penalties[0]
        
        // Parse the automatic penalty description to extract target/actual points
        let targetPoints = 30 // Default fallback
        let actualPoints = 0
        
        const description = penalty.description || ''
        const targetMatch = description.match(/(\d+)\/(\d+) points/)
        if (targetMatch) {
          actualPoints = parseInt(targetMatch[1])
          targetPoints = parseInt(targetMatch[2])
        } else {
          // Try alternative pattern for automatic penalties
          const altMatch = description.match(/target.*?(\d+).*?actual.*?(\d+)/i)
          if (altMatch) {
            targetPoints = parseInt(altMatch[1])
            actualPoints = parseInt(altMatch[2])
          }
        }

        setPenaltyData({
          amount: penalty.amount,
          date: yesterdayStr,
          reason: description,
          targetPoints,
          actualPoints
        })
        
        setShowPenalty(true)
        
        // Mark as shown to prevent showing again
        localStorage.setItem(notificationKey, 'true')
      }
    } catch (error) {
      console.error('Error checking for penalties:', error)
    }
  }

  const closePenaltyModal = () => {
    setShowPenalty(false)
    setPenaltyData(null)
  }

  return {
    showPenalty,
    penaltyData,
    closePenaltyModal
  }
}