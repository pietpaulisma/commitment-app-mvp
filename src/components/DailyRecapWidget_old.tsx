'use client'

import { useState, useEffect } from 'react'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import { formatDateShort, formatTimeRemaining, getReasonLabel } from '@/utils/penaltyHelpers'
import { calculateDailyTarget } from '@/utils/targetCalculation'
import { supabase } from '@/lib/supabase'
import type { PendingMemberInfo, DisputedMemberInfo } from '@/types/penalties'

interface DailyRecapWidgetProps {
  isAdmin: boolean
  groupId?: string
  userId?: string
}

interface RecapStats {
  total: number
  completed: number
  toBeConfirmed: number
  pending: number
  disputed: number
  autoAccepted: number
}

interface MemberWorkoutStatus {
  userId: string
  username: string
  targetPoints: number
  actualPoints: number
  metTarget: boolean
  hasPendingPenalty: boolean
  hasDisputedPenalty: boolean
  penaltyId?: string
  reasonCategory?: string
  reasonMessage?: string
}

export function DailyRecapWidget({ isAdmin, groupId, userId }: DailyRecapWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<RecapStats | null>(null)
  const [completedMembers, setCompletedMembers] = useState<string[]>([])
  const [toBeConfirmedMembers, setToBeConfirmedMembers] = useState<PendingMemberInfo[]>([])
  const [pendingMembers, setPendingMembers] = useState<PendingMemberInfo[]>([])
  const [disputedMembers, setDisputedMembers] = useState<DisputedMemberInfo[]>([])
  const [sickMembers, setSickMembers] = useState<string[]>([])
  const [groupStreak, setGroupStreak] = useState(0)
  const [totalPot, setTotalPot] = useState(0)
  const [yesterdayDate, setYesterdayDate] = useState('')
  const [userStatus, setUserStatus] = useState<{
    targetMet: boolean
    toBeConfirmed: boolean
    hasPending: boolean
    disputed: boolean
    isSick: boolean
    points: number
    target: number
  } | null>(null)

  useEffect(() => {
    if (groupId) {
      loadRecapData()
    }
  }, [groupId, userId])

  const loadRecapData = async () => {
    if (!groupId) return

    try {
      setLoading(true)

      // Get yesterday's date
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const yesterdayDate = new Date(yesterdayStr)
      setYesterdayDate(yesterdayStr)

      // Get group settings
      const { data: groupSettings } = await supabase
        .from('group_settings')
        .select('rest_days, recovery_days')
        .eq('group_id', groupId)
        .single()

      const restDays = Array.isArray(groupSettings?.rest_days) ? groupSettings.rest_days : []
      const recoveryDays = Array.isArray(groupSettings?.recovery_days) ? groupSettings.recovery_days : []

      // Get group start date
      const { data: groupData } = await supabase
        .from('groups')
        .select('start_date, current_streak')
        .eq('id', groupId)
        .single()

      if (!groupData) return

      setGroupStreak(groupData.current_streak || 0)
      const groupStartDate = new Date(groupData.start_date)

      // Get all members in the group
      const { data: members } = await supabase
        .from('profiles')
        .select('id, username, week_mode, is_sick_mode, has_flexible_rest_day')
        .eq('group_id', groupId)

      if (!members) return

      // Fetch ALL penalties (pending and disputed) for yesterday
      const { data: penalties } = await supabase
        .from('pending_penalties')
        .select('id, user_id, status, reason_category, reason_message, target_points, actual_points, deadline')
        .eq('group_id', groupId)
        .eq('date', yesterdayStr)
        .in('status', ['pending', 'disputed'])

      // Deduplicate pending penalties by user_id - keep most recent per user
      const pendingByUser = new Map<string, PendingMemberInfo>()
      if (pending) {
        pending.forEach(p => {
          const deadlineDate = new Date(p.deadline)
          const now = new Date()
          const hoursRemaining = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)

          const memberInfo: PendingMemberInfo = {
            username: (p.profiles as any).username,
            userId: p.user_id,
            actual: p.actual_points,
            target: p.target_points,
            hours_remaining: Math.max(0, hoursRemaining),
            penaltyId: p.id
          }

          // Keep the most recent penalty per user
          if (!pendingByUser.has(p.user_id)) {
            pendingByUser.set(p.user_id, memberInfo)
          }
        })
      }
      const pendingList = Array.from(pendingByUser.values())
      setPendingMembers(pendingList)

      // Fetch disputed penalties
      const { data: disputed } = await supabase
        .from('pending_penalties')
        .select(`
          id,
          user_id,
          reason_category,
          reason_message,
          profiles!inner(username)
        `)
        .eq('group_id', groupId)
        .eq('status', 'disputed')

      const disputedList: DisputedMemberInfo[] = []
      if (disputed) {
        disputed.forEach(p => {
          disputedList.push({
            username: (p.profiles as any).username,
            userId: p.user_id,
            reason_category: p.reason_category as any,
            reason_message: p.reason_message || '',
            penaltyId: p.id
          })
        })
      }
      setDisputedMembers(disputedList)

      // Get total members count and sick mode status
      const { data: allMembers } = await supabase
        .from('profiles')
        .select('id, username, is_sick_mode')
        .eq('group_id', groupId)

      const totalMembers = allMembers?.length || 0

      // Get sick members
      const sickMembers = allMembers?.filter(m => m.is_sick_mode) || []
      const sickUsernames = sickMembers.map(m => m.username)

      // Get members who actually completed (not in pending/disputed)
      const pendingUserIds = new Set(pendingList.map(p => p.userId))
      const disputedUserIds = new Set(disputedList.map(d => d.userId))
      const sickUserIds = new Set(sickMembers.map(m => m.id))

      const completedMembersList = allMembers?.filter(m =>
        !pendingUserIds.has(m.id) &&
        !disputedUserIds.has(m.id) &&
        !sickUserIds.has(m.id)
      ) || []

      const completed = completedMembersList.length

      setStats({
        total: totalMembers || 0,
        completed,
        pending: pendingList.length,
        disputed: disputedList.length,
        autoAccepted: 0 // This would need to be tracked separately
      })

      // Get completed members list (for admin view)
      if (isAdmin) {
        const completedUsernames = completedMembersList.map(m => m.username)
        setCompletedMembers(completedUsernames)
        setSickMembers(sickUsernames)
      }

      // Get group streak
      const { data: groupData } = await supabase
        .from('groups')
        .select('current_streak')
        .eq('id', groupId)
        .single()

      setGroupStreak(groupData?.current_streak || 0)

      // Get total pot
      const { data: potData } = await supabase
        .from('profiles')
        .select('total_penalty_owed')
        .eq('group_id', groupId)

      const pot = potData?.reduce((sum, p) => sum + (p.total_penalty_owed || 0), 0) || 0
      setTotalPot(pot)

      // Get user's personal status (for non-admin view)
      if (!isAdmin && userId) {
        const myPending = pendingList.find(p => p.userId === userId)
        const myDisputed = disputedList.find(p => p.userId === userId)
        const amISick = sickUsernames.includes(allMembers?.find(m => m.username)?.username || '')

        setUserStatus({
          targetMet: !myPending && !myDisputed && !amISick,
          hasPending: !!myPending,
          disputed: !!myDisputed,
          isSick: amISick,
          points: myPending?.actual || 0,
          target: myPending?.target || 0
        })
      }

    } catch (error) {
      console.error('Error loading recap data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div
        className="bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-3"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div className="flex items-center justify-center py-4">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          <span className="ml-2 text-xs text-white/60">Loading recap...</span>
        </div>
      </div>
    )
  }

  // Admin view
  if (isAdmin) {
    return (
      <div
        className="bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-3 flex flex-col"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
          aspectRatio: '1 / 2'
        }}
      >
        {/* Header */}
        <div className="flex items-center mb-2">
          <CalendarDaysIcon className="w-4 h-4 text-white/60 mr-2" />
          <h3 className="text-xs font-light text-white/80 uppercase tracking-widest">
            Yesterday&apos;s Recap
          </h3>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1" style={{ maxHeight: 'calc(100% - 3rem)' }}>
          {/* Who Made It */}
          {completedMembers.length > 0 && (
            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-2">
              <div className="text-xs text-green-300 font-medium mb-1">
                ✅ Made It
              </div>
              <div className="text-xs text-green-200/60 space-y-0.5">
                {completedMembers.map((username, idx) => (
                  <div key={idx}>{username}</div>
                ))}
              </div>
            </div>
          )}

          {/* Who Didn't Make It - Pending */}
          {pendingMembers.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-2">
              <div className="text-xs text-yellow-300 font-medium mb-1">
                ⏳ Didn&apos;t Make It
              </div>
              <div className="text-xs text-yellow-200/60 space-y-0.5">
                {pendingMembers.map(m => (
                  <div key={m.penaltyId}>
                    {m.username} • {m.actual}/{m.target}pts
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Who Didn't Make It - Disputed with Reasons */}
          {disputedMembers.length > 0 && (
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-2">
              <div className="text-xs text-blue-300 font-medium mb-1">
                💭 Didn&apos;t Make It - With Reason
              </div>
              <div className="text-xs text-blue-200/60 space-y-1">
                {disputedMembers.map(m => (
                  <div key={m.penaltyId}>
                    <div className="font-medium">{m.username}</div>
                    {m.reason_category && (
                      <div className="text-blue-200/40 text-[10px]">
                        {getReasonLabel(m.reason_category)}
                        {m.reason_message && `: ${m.reason_message}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sick Mode */}
          {sickMembers.length > 0 && (
            <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-2">
              <div className="text-xs text-purple-300 font-medium mb-1">
                🤒 Sick Mode
              </div>
              <div className="text-xs text-purple-200/60 space-y-0.5">
                {sickMembers.map((username, idx) => (
                  <div key={idx}>{username}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Streak only */}
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-xs text-white/60 text-center">
            🔥 {groupStreak} day streak
          </p>
        </div>
      </div>
    )
  }

  // Regular user view
  return (
    <div
      className="bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-3"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
      }}
    >
      {/* Header */}
      <div className="flex items-center mb-2">
        <CalendarDaysIcon className="w-4 h-4 text-white/60 mr-2" />
        <h3 className="text-xs font-light text-white/80 uppercase tracking-widest">
          Last Night ({yesterdayDate && formatDateShort(yesterdayDate)})
        </h3>
      </div>

      {/* User Status */}
      <div className="space-y-1">
        {userStatus?.targetMet ? (
          <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-2">
            <div className="text-xs text-green-300 font-medium">
              ✅ Target Met
            </div>
            <div className="text-xs text-green-200/60 mt-0.5">
              💪 Keep it up!
            </div>
          </div>
        ) : userStatus?.isSick ? (
          <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-2">
            <div className="text-xs text-purple-300 font-medium">
              🤒 Sick Mode
            </div>
            <div className="text-xs text-purple-200/60 mt-0.5">
              Take care and get well soon!
            </div>
          </div>
        ) : userStatus?.hasPending ? (
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-2">
            <div className="text-xs text-yellow-300 font-medium">
              ⏳ Response Needed
            </div>
            <div className="text-xs text-yellow-200/60 mt-0.5">
              Check the pop-up to accept or dispute
            </div>
          </div>
        ) : userStatus?.disputed ? (
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-2">
            <div className="text-xs text-blue-300 font-medium">
              💭 Under Review
            </div>
            <div className="text-xs text-blue-200/60 mt-0.5">
              Your reason is being reviewed
            </div>
          </div>
        ) : null}
      </div>

      {/* Group Stats */}
      <div className="mt-2 pt-2 border-t border-white/10">
        <p className="text-xs text-white/60 text-center">
          Group: {stats.completed}/{stats.total} hit target
        </p>
      </div>
    </div>
  )
}
