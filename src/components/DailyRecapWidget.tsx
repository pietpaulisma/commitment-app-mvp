'use client'

import { useState, useEffect } from 'react'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import { formatDateShort, getReasonLabel } from '@/utils/penaltyHelpers'
import { calculateDailyTarget } from '@/utils/targetCalculation'
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
  status: 'completed' | 'to_be_confirmed' | 'pending' | 'disputed' | 'sick'
  reasonCategory?: string
  reasonMessage?: string
}

export function DailyRecapWidget({ isAdmin, groupId, userId }: DailyRecapWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<RecapStats | null>(null)
  const [completedMembers, setCompletedMembers] = useState<string[]>([])
  const [toBeConfirmedMembers, setToBeConfirmedMembers] = useState<MemberStatus[]>([])
  const [pendingMembers, setPendingMembers] = useState<MemberStatus[]>([])
  const [disputedMembers, setDisputedMembers] = useState<MemberStatus[]>([])
  const [sickMembers, setSickMembers] = useState<string[]>([])
  const [groupStreak, setGroupStreak] = useState(0)
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
    if (!groupId) {
      return
    }

    try {
      setLoading(true)

      // Get yesterday's date in local time (consistent with auto-create logic)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const year = yesterday.getFullYear()
      const month = String(yesterday.getMonth() + 1).padStart(2, '0')
      const day = String(yesterday.getDate()).padStart(2, '0')
      const yesterdayStr = `${year}-${month}-${day}`

      const yesterdayDate = new Date(yesterdayStr)
      const dayOfWeek = yesterdayDate.getDay()
      setYesterdayDate(yesterdayStr)

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

      // Get all penalties for yesterday
      const { data: penalties } = await supabase
        .from('pending_penalties')
        .select('id, user_id, status, reason_category, reason_message, target_points, actual_points')
        .eq('group_id', groupId)
        .eq('date', yesterdayStr)

      // Create a map of penalties by user_id
      const penaltyMap = new Map(penalties?.map(p => [p.user_id, p]) || [])

      // Calculate days since start
      const daysSinceStart = Math.floor((yesterdayDate.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))

      // Get all member IDs
      const memberIds = members.map(m => m.id)

      // Fetch all logs for yesterday and day before (for flex rest day checks) in one query
      const dayBeforeRestDay = new Date(yesterdayDate)
      dayBeforeRestDay.setDate(dayBeforeRestDay.getDate() - 1)
      const dayBeforeStr = dayBeforeRestDay.toISOString().split('T')[0]

      // Skip log query if no members
      let allLogs = null
      if (memberIds.length > 0) {
        const { data, error: logsError } = await supabase
          .from('logs')
          .select('user_id, points, exercise_id, date')
          .in('user_id', memberIds)
          .in('date', [yesterdayStr, dayBeforeStr])

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
      const sickList: string[] = []

      for (const member of members) {
        // Skip if sick
        if (member.is_sick_mode) {
          sickList.push(member.username)
          continue
        }

        // Handle rest days
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

            // Qualified for flex rest day
            if (prevDayPoints >= (prevDayTarget * 2)) {
              completedList.push(member.username)
              continue
            }
          }

          // Regular rest day
          completedList.push(member.username)
          continue
        }

        // Calculate target for yesterday
        const dailyTarget = calculateDailyTarget({
          daysSinceStart,
          weekMode: member.week_mode || 'sane',
          restDays,
          recoveryDays,
          currentDayOfWeek: dayOfWeek
        })

        // Get yesterday's workout logs from pre-fetched data
        const userLogs = logsByUserAndDate.get(member.id)
        const logs = userLogs?.get(yesterdayStr) || []

        // Calculate actual points with recovery cap
        let totalRecoveryPoints = 0
        let totalNonRecoveryPoints = 0

        const recoveryExercises = [
          'recovery_meditation', 'recovery_stretching', 'recovery_blackrolling', 'recovery_yoga',
          'meditation', 'stretching', 'yoga', 'foam rolling', 'blackrolling'
        ]

        logs.forEach(log => {
          if (recoveryExercises.includes(log.exercise_id)) {
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
          reasonMessage: penalty?.reason_message
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
      setSickMembers(sickList)

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
        const amISick = sickList.some(username => members.find(m => m.id === userId)?.username === username)

        setUserStatus({
          targetMet: myStatus?.status === 'completed',
          toBeConfirmed: myStatus?.status === 'to_be_confirmed',
          hasPending: myStatus?.status === 'pending',
          disputed: myStatus?.status === 'disputed',
          isSick: amISick,
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

          {/* Disputed */}
          {disputedMembers.length > 0 && (
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-2">
              <div className="text-xs text-blue-300 font-medium mb-1">
                💭 Disputed
              </div>
              <div className="text-xs text-blue-200/60 space-y-1">
                {disputedMembers.map(m => (
                  <div key={m.userId}>
                    <div className="font-medium">{m.username}</div>
                    {m.reasonCategory && (
                      <div className="text-blue-200/40 text-[10px]">
                        {getReasonLabel(m.reasonCategory)}
                        {m.reasonMessage && `: ${m.reasonMessage}`}
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

        {/* Footer */}
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
    </div>
  )
}
