'use client'

import { useState, useEffect } from 'react'
import { CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline'
import { formatDateShort, getReasonLabel } from '@/utils/penaltyHelpers'
import { DailyRecapHistoryModal } from './modals/DailyRecapHistoryModal'
import { calculateDailyTarget, RECOVERY_DAY_TARGET_MINUTES } from '@/utils/targetCalculation'
import { supabase } from '@/lib/supabase'

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
}

interface MemberStatus {
  username: string
  userId: string
  target: number
  actual: number
  status: 'completed' | 'to_be_confirmed' | 'pending' | 'disputed' | 'sick' | 'waived' | 'accepted'
  reasonCategory?: string
  reasonMessage?: string
  penaltyId?: string
}

export function DailyRecapWidget({ isAdmin, groupId, userId }: DailyRecapWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<RecapStats | null>(null)
  const [completedMembers, setCompletedMembers] = useState<string[]>([])
  const [toBeConfirmedMembers, setToBeConfirmedMembers] = useState<MemberStatus[]>([])
  const [pendingMembers, setPendingMembers] = useState<MemberStatus[]>([])
  const [disputedMembers, setDisputedMembers] = useState<MemberStatus[]>([])
  const [waivedMembers, setWaivedMembers] = useState<MemberStatus[]>([])
  const [paidMembers, setPaidMembers] = useState<MemberStatus[]>([])
  const [sickMembers, setSickMembers] = useState<string[]>([])
  const [recoveryDayMembers, setRecoveryDayMembers] = useState<string[]>([])
  const [restDayMembers, setRestDayMembers] = useState<string[]>([])
  const [flexRestDayMembers, setFlexRestDayMembers] = useState<string[]>([])
  const [groupStreak, setGroupStreak] = useState(0)
  const [waivingPenalty, setWaivingPenalty] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d
  })
  const [showHistoryModal, setShowHistoryModal] = useState(false)
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
  }, [groupId, userId, selectedDate])

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    setShowHistoryModal(false)
  }

  const handleWaivePenalty = async (penaltyId: string) => {
    if (!penaltyId) return
    
    setWaivingPenalty(penaltyId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/waive-penalty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ penalty_id: penaltyId })
      })

      if (response.ok) {
        // Reload data to reflect the change
        loadRecapData()
      } else {
        console.error('Failed to waive penalty')
      }
    } catch (error) {
      console.error('Error waiving penalty:', error)
    } finally {
      setWaivingPenalty(null)
    }
  }

  const loadRecapData = async () => {
    if (!groupId) {
      return
    }

    try {
      setLoading(true)

      // Use selectedDate instead of hardcoded yesterday
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const targetDateStr = `${year}-${month}-${day}`

      const dayOfWeek = selectedDate.getDay()

      // Get group settings and data
      const [groupSettingsRes, groupDataRes] = await Promise.all([
        supabase
          .from('group_settings')
          .select('rest_days, recovery_days')
          .eq('group_id', groupId)
          .single(),
        supabase
          .from('groups')
          .select('start_date')
          .eq('id', groupId)
          .single()
      ])

      if (!groupDataRes.data) {
        console.error('[DailyRecap] No group data found. Error:', groupDataRes.error)
        return
      }

      const restDays = Array.isArray(groupSettingsRes.data?.rest_days) ? groupSettingsRes.data.rest_days : []
      const recoveryDays = Array.isArray(groupSettingsRes.data?.recovery_days) ? groupSettingsRes.data.recovery_days : []
      const groupStartDate = new Date(groupDataRes.data.start_date)
      // Note: current_streak doesn't exist in groups table, using 0 as placeholder
      setGroupStreak(0)

      // Check if yesterday was a rest day
      const isRestDay = restDays.includes(dayOfWeek)

      // Get all members
      const { data: members } = await supabase
        .from('profiles')
        .select('id, username, week_mode, is_sick_mode, has_flexible_rest_day')
        .eq('group_id', groupId)

      if (!members) {
        console.error('[DailyRecap] No members found')
        return
      }

      // Get all penalties for target date
      const { data: penalties } = await supabase
        .from('pending_penalties')
        .select('id, user_id, status, reason_category, reason_message, target_points, actual_points')
        .eq('group_id', groupId)
        .eq('date', targetDateStr)

      // Create a map of penalties by user_id
      const penaltyMap = new Map(penalties?.map((p: any) => [p.user_id, p]) || [])

      // Calculate days since start
      const daysSinceStart = Math.floor((selectedDate.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))

      // Get all member IDs
      const memberIds = members.map(m => m.id)

      // Fetch all logs for target date and day before (for flex rest day checks) in one query
      const dayBeforeRestDay = new Date(selectedDate)
      dayBeforeRestDay.setDate(dayBeforeRestDay.getDate() - 1)
      const dayBeforeStr = dayBeforeRestDay.toISOString().split('T')[0]

      // Skip log query if no members
      let allLogs = null
      if (memberIds.length > 0) {
        // Use logs table where workouts are actually stored
        const { data, error: logsError } = await supabase
          .from('logs')
          .select('user_id, points, exercise_id, date')
          .in('user_id', memberIds)
          .in('date', [targetDateStr, dayBeforeStr])

        if (logsError) {
          console.error('[DailyRecap] Error fetching logs:', logsError)
        } else {
          allLogs = data
        }
      }

      // Group logs by user_id and date
      const logsByUserAndDate = new Map<string, Map<string, { points: number, exercise_id: string }[]>>()
      allLogs?.forEach(log => {
        if (!logsByUserAndDate.has(log.user_id)) {
          logsByUserAndDate.set(log.user_id, new Map())
        }
        const userLogs = logsByUserAndDate.get(log.user_id)!
        if (!userLogs.has(log.date)) {
          userLogs.set(log.date, [])
        }
        userLogs.get(log.date)!.push({ points: log.points, exercise_id: log.exercise_id })
      })

      // Process each member
      const memberStatuses: MemberStatus[] = []
      const completedList: string[] = []
      const toBeConfirmedList: MemberStatus[] = []
      const pendingList: MemberStatus[] = []
      const disputedList: MemberStatus[] = []
      const waivedList: MemberStatus[] = []
      const paidList: MemberStatus[] = []
      const sickList: string[] = []
      const recoveryDayList: string[] = []
      const restDayList: string[] = []
      const flexRestDayList: string[] = []

      // Get all exercises to check types
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id, type')

      const exerciseTypeMap = new Map(exercises?.map(e => [e.id, e.type]) || [])

      // Fetch recovery day records for all members for the target date
      const { data: recoveryDayRecords } = await supabase
        .from('user_recovery_days')
        .select('user_id, recovery_minutes, is_complete')
        .in('user_id', memberIds)
        .eq('used_date', targetDateStr)

      // Create a map of user_id -> recovery day info
      const recoveryDayMap = new Map(recoveryDayRecords?.map(rd => [rd.user_id, rd]) || [])

      // Fetch historical sick mode records for the target date
      // This tells us who was actually sick on that specific date, not just who is currently sick
      const { data: sickModeRecords } = await supabase
        .from('sick_mode')
        .select('user_id')
        .in('user_id', memberIds)
        .eq('date', targetDateStr)

      // Create a set of user IDs who were sick on this specific date
      const historicallySickUserIds = new Set(sickModeRecords?.map(sm => sm.user_id) || [])

      for (const member of members) {
        // Check if user was sick on this specific date (historical tracking)
        // We use the sick_mode table which logs actual sick days, not just current sick mode status
        const wasSickOnDate = historicallySickUserIds.has(member.id)
        if (wasSickOnDate) {
          sickList.push(member.username)
          continue
        }

        // Handle rest days - show as "Rest Day" or "Flex Rest" instead of "Made It"
        if (isRestDay) {
          // Check for Flex Rest Day qualification
          if (member.has_flexible_rest_day) {
            const userLogs = logsByUserAndDate.get(member.id)
            const prevDayLogs = userLogs?.get(dayBeforeStr) || []

            const prevDayPoints = prevDayLogs.reduce((sum, log) => sum + log.points, 0)
            const prevDaysSinceStart = daysSinceStart - 1
            const prevDayOfWeek = dayBeforeRestDay.getDay()

            const prevDayTarget = calculateDailyTarget({
              daysSinceStart: prevDaysSinceStart,
              weekMode: member.week_mode || 'sane',
              restDays,
              recoveryDays,
              currentDayOfWeek: prevDayOfWeek
            })

            // Qualified for flex rest day (earned by getting 200% the day before)
            if (prevDayPoints >= (prevDayTarget * 2)) {
              flexRestDayList.push(member.username)
              continue
            }
          }

          // Regular rest day
          restDayList.push(member.username)
          continue
        }

        // Check if member had an active recovery day
        const memberRecoveryDay = recoveryDayMap.get(member.id)
        if (memberRecoveryDay) {
          // User had activated a recovery day for this date
          const penalty = penaltyMap.get(member.id)
          const memberStatus: MemberStatus = {
            username: member.username,
            userId: member.id,
            target: RECOVERY_DAY_TARGET_MINUTES,
            actual: memberRecoveryDay.recovery_minutes || 0,
            status: 'completed',
            penaltyId: penalty?.id
          }

          if (memberRecoveryDay.is_complete || memberRecoveryDay.recovery_minutes >= RECOVERY_DAY_TARGET_MINUTES) {
            // Completed recovery day
            memberStatus.status = 'completed'
            recoveryDayList.push(member.username)
          } else {
            // Incomplete recovery day - check for penalty
            if (penalty) {
              memberStatus.reasonCategory = penalty.reason_category
              memberStatus.reasonMessage = penalty.reason_message
              if (penalty.status === 'pending') {
                memberStatus.status = 'pending'
                pendingList.push(memberStatus)
              } else if (penalty.status === 'disputed') {
                memberStatus.status = 'disputed'
                disputedList.push(memberStatus)
              } else if (penalty.status === 'waived') {
                memberStatus.status = 'waived'
                // Technical glitch = they actually made it
                if (penalty.reason_category === 'technical') {
                  recoveryDayList.push(member.username)
                } else {
                  waivedList.push(memberStatus)
                }
              } else if (penalty.status === 'accepted') {
                memberStatus.status = 'accepted'
                paidList.push(memberStatus)
              }
            } else {
              memberStatus.status = 'to_be_confirmed'
              toBeConfirmedList.push(memberStatus)
            }
          }
          memberStatuses.push(memberStatus)
          continue
        }

        // Calculate target for yesterday (regular day, no recovery day)
        // IMPORTANT: Always use 'sane' mode for penalty/made-it evaluation
        // If user hits sane target, they're safe regardless of their display mode
        const dailyTarget = calculateDailyTarget({
          daysSinceStart,
          weekMode: 'sane',
          restDays,
          recoveryDays,
          currentDayOfWeek: dayOfWeek
        })

        // Get workout logs from pre-fetched data
        const userLogs = logsByUserAndDate.get(member.id)
        const logs = userLogs?.get(targetDateStr) || []

        // Calculate actual points with recovery cap
        let totalRecoveryPoints = 0
        let totalNonRecoveryPoints = 0

        logs.forEach(log => {
          const type = exerciseTypeMap.get(log.exercise_id)
          if (type === 'recovery') {
            totalRecoveryPoints += log.points
          } else {
            totalNonRecoveryPoints += log.points
          }
        })

        const recoveryCapLimit = Math.round(dailyTarget * 0.25)
        const cappedRecoveryPoints = Math.min(totalRecoveryPoints, recoveryCapLimit)
        const actualPoints = totalNonRecoveryPoints + cappedRecoveryPoints

        // Check if target was met
        const metTarget = actualPoints >= dailyTarget

        // Check if penalty exists
        const penalty = penaltyMap.get(member.id)

        const memberStatus: MemberStatus = {
          username: member.username,
          userId: member.id,
          target: dailyTarget,
          actual: actualPoints,
          status: 'completed',
          reasonCategory: penalty?.reason_category,
          reasonMessage: penalty?.reason_message,
          penaltyId: penalty?.id
        }

        if (metTarget) {
          // Met target
          memberStatus.status = 'completed'
          completedList.push(member.username)
        } else if (penalty) {
          // Didn't meet target and has penalty
          if (penalty.status === 'pending') {
            memberStatus.status = 'pending'
            pendingList.push(memberStatus)
          } else if (penalty.status === 'disputed') {
            memberStatus.status = 'disputed'
            disputedList.push(memberStatus)
          } else if (penalty.status === 'waived') {
            memberStatus.status = 'waived'
            // Technical glitch = they actually made it
            if (penalty.reason_category === 'technical') {
              completedList.push(member.username)
            } else {
              waivedList.push(memberStatus)
            }
          } else if (penalty.status === 'accepted') {
            memberStatus.status = 'accepted'
            paidList.push(memberStatus)
          }
        } else {
          // Didn't meet target but no penalty yet
          memberStatus.status = 'to_be_confirmed'
          toBeConfirmedList.push(memberStatus)
        }

        memberStatuses.push(memberStatus)
      }

      // Set all state
      setCompletedMembers(completedList)
      setToBeConfirmedMembers(toBeConfirmedList)
      setPendingMembers(pendingList)
      setDisputedMembers(disputedList)
      setWaivedMembers(waivedList)
      setPaidMembers(paidList)
      setSickMembers(sickList)
      setRecoveryDayMembers(recoveryDayList)
      setRestDayMembers(restDayList)
      setFlexRestDayMembers(flexRestDayList)

      setStats({
        total: members.length,
        completed: completedList.length,
        toBeConfirmed: toBeConfirmedList.length,
        pending: pendingList.length,
        disputed: disputedList.length
      })

      // Set user status for non-admin view
      if (!isAdmin && userId) {
        const myStatus = memberStatuses.find(m => m.userId === userId)
        // Check if user was sick on this specific historical date
        const wasISickOnDate = historicallySickUserIds.has(userId)

        setUserStatus({
          targetMet: myStatus?.status === 'completed',
          toBeConfirmed: myStatus?.status === 'to_be_confirmed',
          hasPending: myStatus?.status === 'pending',
          disputed: myStatus?.status === 'disputed',
          isSick: wasISickOnDate,
          points: myStatus?.actual || 0,
          target: myStatus?.target || 0
        })
      }

    } catch (error) {
      console.error('[DailyRecap] Error loading recap data:', error)
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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <CalendarDaysIcon className="w-4 h-4 text-white/60 mr-2" />
            <h3 className="text-xs font-light text-white/80 uppercase tracking-widest">
              Recap: {formatDateShort(selectedDate.toISOString().split('T')[0])}
            </h3>
          </div>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
            aria-label="View history"
          >
            <ClockIcon className="w-4 h-4 text-white/60" />
          </button>
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

          {/* Rest Day */}
          {restDayMembers.length > 0 && (
            <div className="bg-indigo-900/20 border border-indigo-600/30 rounded-lg p-2">
              <div className="text-xs text-indigo-300 font-medium mb-1">
                🌙 Rest Day
              </div>
              <div className="text-xs text-indigo-200/60 space-y-0.5">
                {restDayMembers.map((username, idx) => (
                  <div key={idx}>{username}</div>
                ))}
              </div>
            </div>
          )}

          {/* Flex Rest Day (earned by 200% performance) */}
          {flexRestDayMembers.length > 0 && (
            <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-2">
              <div className="text-xs text-amber-300 font-medium mb-1">
                ✨ Flex Rest
              </div>
              <div className="text-xs text-amber-200/60 space-y-0.5">
                {flexRestDayMembers.map((username, idx) => (
                  <div key={idx}>{username}</div>
                ))}
              </div>
            </div>
          )}

          {/* Recovery Day */}
          {recoveryDayMembers.length > 0 && (
            <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-2">
              <div className="text-xs text-emerald-300 font-medium mb-1">
                🧘 Recovery Day
              </div>
              <div className="text-xs text-emerald-200/60 space-y-0.5">
                {recoveryDayMembers.map((username, idx) => (
                  <div key={idx}>{username}</div>
                ))}
              </div>
            </div>
          )}

          {/* Paid (Accepted Penalties) */}
          {paidMembers.length > 0 && (
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-2">
              <div className="text-xs text-red-300 font-medium mb-1">
                💰 Paid
              </div>
              <div className="text-xs text-red-200/60 space-y-0.5">
                {paidMembers.map(m => (
                  <div key={m.userId}>
                    {m.username} • {m.actual}/{m.target}pts
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waived (Approved Disputes) */}
          {waivedMembers.length > 0 && (
            <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-2">
              <div className="text-xs text-purple-300 font-medium mb-1">
                ✨ Waived
              </div>
              <div className="text-xs text-purple-200/60 space-y-0.5">
                {waivedMembers.map(m => (
                  <div key={m.userId}>
                    {m.username}
                    {m.reasonCategory && (
                      <span className="text-purple-200/40"> • {getReasonLabel(m.reasonCategory)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Under Review (Disputed) */}
          {disputedMembers.length > 0 && (
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-2">
              <div className="text-xs text-blue-300 font-medium mb-1">
                🔍 Under Review
              </div>
              <div className="text-xs text-blue-200/60 space-y-1">
                {disputedMembers.map(m => (
                  <div key={m.userId} className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{m.username}</div>
                      {m.reasonCategory && (
                        <div className="text-blue-200/40 text-[10px]">
                          {getReasonLabel(m.reasonCategory)}
                          {m.reasonMessage && `: ${m.reasonMessage}`}
                        </div>
                      )}
                    </div>
                    {m.penaltyId && (
                      <button
                        onClick={() => handleWaivePenalty(m.penaltyId!)}
                        disabled={waivingPenalty === m.penaltyId}
                        className="text-[9px] px-1.5 py-0.5 bg-green-600/30 hover:bg-green-600/50 text-green-300 rounded transition-colors disabled:opacity-50"
                      >
                        {waivingPenalty === m.penaltyId ? '...' : 'Approve'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Response */}
          {pendingMembers.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-2">
              <div className="text-xs text-yellow-300 font-medium mb-1">
                ⏰ Pending Response
              </div>
              <div className="text-xs text-yellow-200/60 space-y-0.5">
                {pendingMembers.map(m => (
                  <div key={m.userId}>
                    {m.username} • {m.actual}/{m.target}pts
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* To Be Confirmed */}
          {toBeConfirmedMembers.length > 0 && (
            <div className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-2">
              <div className="text-xs text-orange-300 font-medium mb-1">
                ⏳ To Be Confirmed
              </div>
              <div className="text-xs text-orange-200/60 space-y-0.5">
                {toBeConfirmedMembers.map(m => (
                  <div key={m.userId}>
                    {m.username} • {m.actual}/{m.target}pts
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sick Mode */}
          {sickMembers.length > 0 && (
            <div className="bg-gray-800/40 border border-gray-600/30 rounded-lg p-2">
              <div className="text-xs text-gray-300 font-medium mb-1">
                🤒 Sick Mode
              </div>
              <div className="text-xs text-gray-400/60 space-y-0.5">
                {sickMembers.map((username, idx) => (
                  <div key={idx}>{username}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-xs text-white/60 text-center">
            🔥 {groupStreak} day streak
          </p>
        </div>
        {/* History Modal */}
        {showHistoryModal && groupId && (
          <DailyRecapHistoryModal
            groupId={groupId}
            onClose={() => setShowHistoryModal(false)}
            onSelectDate={handleSelectDate}
          />
        )}
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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <CalendarDaysIcon className="w-4 h-4 text-white/60 mr-2" />
          <h3 className="text-xs font-light text-white/80 uppercase tracking-widest">
            Recap ({formatDateShort(selectedDate.toISOString().split('T')[0])})
          </h3>
        </div>
        <button
          onClick={() => setShowHistoryModal(true)}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
          aria-label="View history"
        >
          <ClockIcon className="w-4 h-4 text-white/60" />
        </button>
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
          <div className="bg-gray-800/40 border border-gray-600/30 rounded-lg p-2">
            <div className="text-xs text-gray-300 font-medium">
              🤒 Sick Mode
            </div>
            <div className="text-xs text-gray-400/60 mt-0.5">
              Take care and get well soon!
            </div>
          </div>
        ) : userStatus?.toBeConfirmed ? (
          <div className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-2">
            <div className="text-xs text-orange-300 font-medium">
              ⏳ To Be Confirmed
            </div>
            <div className="text-xs text-orange-200/60 mt-0.5">
              Waiting for penalty check
            </div>
          </div>
        ) : userStatus?.hasPending ? (
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-2">
            <div className="text-xs text-yellow-300 font-medium">
              ⏰ Response Needed
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
      {/* History Modal */}
      {showHistoryModal && groupId && (
        <DailyRecapHistoryModal
          groupId={groupId}
          onClose={() => setShowHistoryModal(false)}
          onSelectDate={handleSelectDate}
        />
      )}
    </div>
  )
}
