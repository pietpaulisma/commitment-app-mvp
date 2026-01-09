'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'
import { calculateDailyTarget, RECOVERY_DAY_TARGET_MINUTES } from '@/utils/targetCalculation'
import { formatDateShort, getReasonLabel } from '@/utils/penaltyHelpers'

interface DailyRecapHistoryModalProps {
    groupId: string
    onClose: () => void
}

interface MemberStatus {
    username: string
    userId: string
    target: number
    actual: number
    status: 'completed' | 'pending' | 'disputed' | 'waived' | 'accepted' | 'failed' | 'sick' | 'rest'
    reasonCategory?: string
    reasonMessage?: string
}

interface DayStats {
    date: string
    isRestDay: boolean
    completedMembers: MemberStatus[]
    recoveryDayMembers: MemberStatus[]
    paidMembers: MemberStatus[]
    waivedMembers: MemberStatus[]
    underReviewMembers: MemberStatus[]
    pendingMembers: MemberStatus[]
    sickMembers: string[]
    restMembers: string[]
    flexRestMembers: string[]
}

export function DailyRecapHistoryModal({ groupId, onClose }: DailyRecapHistoryModalProps) {
    const [loading, setLoading] = useState(true)
    const [history, setHistory] = useState<DayStats[]>([])



    useEffect(() => {
        loadHistory()
    }, [groupId])

    const loadHistory = async () => {
        try {
            setLoading(true)

            // 1. Get Group Settings & Members
            const [groupSettingsRes, groupDataRes, membersRes] = await Promise.all([
                supabase.from('group_settings').select('rest_days, recovery_days').eq('group_id', groupId).single(),
                supabase.from('groups').select('start_date').eq('id', groupId).single(),
                supabase.from('profiles').select('id, username, week_mode, is_sick_mode, has_flexible_rest_day').eq('group_id', groupId)
            ])

            if (!groupDataRes.data || !membersRes.data) return

            const restDays = Array.isArray(groupSettingsRes.data?.rest_days) ? groupSettingsRes.data.rest_days : []
            const recoveryDays = Array.isArray(groupSettingsRes.data?.recovery_days) ? groupSettingsRes.data.recovery_days : []
            const groupStartDate = new Date(groupDataRes.data.start_date)
            const members = membersRes.data

            // 2. Calculate last 30 days (using UTC dates to match dashboard)
            const days = []
            const today = new Date()

            for (let i = 1; i <= 30; i++) {
                const d = new Date(today)
                d.setDate(d.getDate() - i)
                // Don't show days before group start
                if (d < groupStartDate) break

                // Use UTC-based date string (same as dashboard) for consistency
                const dateStr = d.toISOString().split('T')[0]

                days.push({ dateObj: d, dateStr })
            }

            if (days.length === 0) {
                setHistory([])
                return
            }

            const endDateStr = days[0].dateStr
            const startDateStr = days[days.length - 1].dateStr

            // 3. Fetch logs for the date range
            // Note: Default Supabase limit is 1000, we need more for 30 days of logs for all members
            // Order by date descending to get recent logs first (in case of limit)
            const memberIds = members.map(m => m.id)
            const { data: logs, error: logsError } = await supabase
                .from('logs')
                .select('user_id, points, exercise_id, date')
                .in('user_id', memberIds)
                .gte('date', startDateStr)
                .lte('date', endDateStr)
                .order('date', { ascending: false })
                .range(0, 9999)

            if (logs) {
                // Debug info removed
            }





            // 4. Fetch penalties for the date range
            const { data: penalties } = await supabase
                .from('pending_penalties')
                .select('user_id, date, status, reason_category, reason_message')
                .eq('group_id', groupId)
                .gte('date', startDateStr)
                .lte('date', endDateStr)

            // 5. Fetch exercises for recovery detection
            const { data: exercises } = await supabase
                .from('exercises')
                .select('id, type')
            const exerciseTypeMap = new Map(exercises?.map(e => [e.id, e.type]) || [])

            // 5b. Fetch recovery day records for the date range
            const { data: recoveryDayRecords, error: recoveryError } = await supabase
                .from('user_recovery_days')
                .select('user_id, used_date, recovery_minutes, is_complete')
                .in('user_id', memberIds)
                .gte('used_date', startDateStr)
                .lte('used_date', endDateStr)

            if (logsError) console.error('[RecapHistory] Logs error:', logsError)
            if (recoveryError) console.error('[RecapHistory] Recovery day error:', recoveryError)

            // Group recovery day records by date and user
            const recoveryDayMap = new Map<string, Map<string, { recovery_minutes: number; is_complete: boolean }>>()
            recoveryDayRecords?.forEach(rd => {
                // Normalize date to YYYY-MM-DD format
                // Handle: "2025-12-25", "2025-12-25T00:00:00Z", "2025-12-25+01:00", etc.
                const normalizedDate = rd.used_date.substring(0, 10)
                if (!recoveryDayMap.has(normalizedDate)) {
                    recoveryDayMap.set(normalizedDate, new Map())
                }
                recoveryDayMap.get(normalizedDate)!.set(rd.user_id, {
                    recovery_minutes: rd.recovery_minutes || 0,
                    is_complete: rd.is_complete || false
                })
            })

            // 5c. Fetch historical sick mode records for the date range
            // This tells us who was actually sick on specific dates, not just who is currently sick
            const { data: sickModeRecords } = await supabase
                .from('sick_mode')
                .select('user_id, date')
                .in('user_id', memberIds)
                .gte('date', startDateStr)
                .lte('date', endDateStr)

            // Group sick mode records by date
            const sickModeByDate = new Map<string, Set<string>>()
            sickModeRecords?.forEach(sm => {
                const normalizedDate = sm.date.substring(0, 10)
                if (!sickModeByDate.has(normalizedDate)) {
                    sickModeByDate.set(normalizedDate, new Set())
                }
                sickModeByDate.get(normalizedDate)!.add(sm.user_id)
            })

            // 6. Process each day
            const stats: DayStats[] = days.map(({ dateObj, dateStr }) => {
                const dayOfWeek = dateObj.getDay()
                const isRestDay = restDays.includes(dayOfWeek)

                // Calculate days since start
                const daysSinceStart = Math.floor((dateObj.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))

                const completedList: MemberStatus[] = []
                const recoveryDayList: MemberStatus[] = []
                const paidList: MemberStatus[] = []
                const waivedList: MemberStatus[] = []
                const underReviewList: MemberStatus[] = []
                const pendingList: MemberStatus[] = []
                const sickList: string[] = []
                const restList: string[] = []
                const flexRestList: string[] = []

                // Calculate day before for flex rest day check
                const dayBeforeObj = new Date(dateObj)
                dayBeforeObj.setDate(dayBeforeObj.getDate() - 1)
                const dayBeforeStr = dayBeforeObj.toISOString().split('T')[0]
                const dayBeforeDayOfWeek = dayBeforeObj.getDay()
                const dayBeforeDaysSinceStart = daysSinceStart - 1

                members.forEach(member => {
                    // Check if user was sick on this specific historical date
                    const sickUsersOnDate = sickModeByDate.get(dateStr)
                    if (sickUsersOnDate?.has(member.id)) {
                        sickList.push(member.username)
                        return
                    }

                    if (isRestDay) {
                        // Check flex rest day qualification
                        if (member.has_flexible_rest_day) {
                            // Get day-before logs for this member
                            const dayBeforeLogsForMember = logsByDateAndUser.get(dayBeforeStr)?.get(member.id) || []
                            const dayBeforePoints = dayBeforeLogsForMember.reduce((sum, log) => sum + log.points, 0)
                            
                            const dayBeforeTarget = calculateDailyTarget({
                                daysSinceStart: dayBeforeDaysSinceStart,
                                weekMode: member.week_mode || 'sane',
                                restDays,
                                recoveryDays,
                                currentDayOfWeek: dayBeforeDayOfWeek
                            })
                            
                            // If they got 200% the day before, they earned a flex rest day
                            if (dayBeforePoints >= dayBeforeTarget * 2) {
                                flexRestList.push(member.username)
                                return
                            }
                        }
                        // Regular rest day
                        restList.push(member.username)
                        return
                    }

                    // Check if member had an active recovery day on this date
                    const dateRecoveryDays = recoveryDayMap.get(dateStr)
                    const memberRecoveryDay = dateRecoveryDays?.get(member.id)
                    
                    if (memberRecoveryDay) {
                        const recoveryTarget = RECOVERY_DAY_TARGET_MINUTES
                        const recoveryActual = memberRecoveryDay.recovery_minutes
                        const metRecoveryTarget = memberRecoveryDay.is_complete || recoveryActual >= recoveryTarget
                        const penalty = penalties?.find(p => p.user_id === member.id && p.date.substring(0, 10) === dateStr)

                        const recoveryStatus: MemberStatus = {
                            username: member.username,
                            userId: member.id,
                            target: recoveryTarget,
                            actual: recoveryActual,
                            status: metRecoveryTarget ? 'completed' : 'pending',
                            reasonCategory: penalty?.reason_category,
                            reasonMessage: penalty?.reason_message
                        }

                        if (metRecoveryTarget) {
                            recoveryDayList.push(recoveryStatus)
                        } else if (penalty?.status === 'waived') {
                            recoveryStatus.status = 'waived'
                            // Technical glitch = they actually made it
                            if (penalty.reason_category === 'technical') {
                                recoveryDayList.push(recoveryStatus)
                            } else {
                                waivedList.push(recoveryStatus)
                            }
                        } else if (penalty?.status === 'accepted') {
                            recoveryStatus.status = 'accepted'
                            paidList.push(recoveryStatus)
                        } else if (penalty?.status === 'disputed') {
                            recoveryStatus.status = 'disputed'
                            underReviewList.push(recoveryStatus)
                        } else if (penalty?.status === 'pending') {
                            pendingList.push(recoveryStatus)
                        } else {
                            // No penalty yet - show as pending
                            pendingList.push(recoveryStatus)
                        }
                        return
                    }

                    // IMPORTANT: Always use 'sane' mode for penalty/made-it evaluation
                    const dailyTarget = calculateDailyTarget({
                        daysSinceStart,
                        weekMode: 'sane',
                        restDays,
                        recoveryDays,
                        currentDayOfWeek: dayOfWeek
                    })

                    // Get logs for this user and date (normalize date comparison)
                    const userLogs = logs?.filter(l => l.user_id === member.id && l.date.substring(0, 10) === dateStr) || []

                    let totalRecoveryPoints = 0
                    let totalNonRecoveryPoints = 0

                    userLogs.forEach(log => {
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
                    const metTarget = actualPoints >= dailyTarget

                    // Find penalty (normalize date comparison)
                    const penalty = penalties?.find(p => p.user_id === member.id && p.date.substring(0, 10) === dateStr)

                    const status: MemberStatus = {
                        username: member.username,
                        userId: member.id,
                        target: dailyTarget,
                        actual: actualPoints,
                        status: metTarget ? 'completed' : 'failed',
                        reasonCategory: penalty?.reason_category,
                        reasonMessage: penalty?.reason_message
                    }

                    if (metTarget) {
                        completedList.push(status)
                    } else {
                        if (penalty?.status === 'waived') {
                            status.status = 'waived'
                            // Technical glitch = they actually made it
                            if (penalty.reason_category === 'technical') {
                                completedList.push(status)
                            } else {
                                waivedList.push(status)
                            }
                        } else if (penalty?.status === 'accepted') {
                            status.status = 'accepted'
                            paidList.push(status)
                        } else if (penalty?.status === 'disputed') {
                            status.status = 'disputed'
                            underReviewList.push(status)
                        } else if (penalty?.status === 'pending') {
                            status.status = 'pending'
                            pendingList.push(status)
                        } else {
                            // No penalty yet or other status - show as pending (awaiting penalty check)
                            status.status = 'pending'
                            pendingList.push(status)
                        }
                    }
                })

                return {
                    date: dateStr,
                    isRestDay,
                    completedMembers: completedList,
                    recoveryDayMembers: recoveryDayList,
                    paidMembers: paidList,
                    waivedMembers: waivedList,
                    underReviewMembers: underReviewList,
                    pendingMembers: pendingList,
                    sickMembers: sickList,
                    restMembers: restList,
                    flexRestMembers: flexRestList
                }
            })

            setHistory(stats)

        } catch (error) {
            console.error('Error loading history:', error)
        } finally {
            setLoading(false)
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div
                className="relative bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col"
                style={{
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)',
                    maxHeight: '85vh'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/40">
                    <div className="flex items-center gap-3">
                        <ClockIcon className="w-6 h-6 text-white" />
                        <h2 className="text-xl font-bold text-white">Recap History</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6 text-white" />
                    </button>
                </div>




                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4" style={{ 
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch'
                }}>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
                            <p className="text-white/60">Loading history...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-white/60">No history available</p>
                        </div>
                    ) : (
                        history.map((day) => (
                            <div key={day.date} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                                {/* Day Header */}
                                <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="font-medium text-white">
                                        {formatDateShort(day.date)}
                                    </h3>
                                    {day.isRestDay && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                            Rest Day
                                        </span>
                                    )}
                                </div>

                                {/* Day Content */}
                                <div className="p-4 space-y-4">
                                    {/* Made It */}
                                    {day.completedMembers.length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium text-green-400 mb-2 uppercase tracking-wider">
                                                ✅ Made It
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {day.completedMembers.map(m => (
                                                    <span key={m.userId} className="text-sm text-white/80 bg-green-500/10 px-2 py-1 rounded">
                                                        {m.username}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recovery Day */}
                                    {day.recoveryDayMembers.length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium text-emerald-400 mb-2 uppercase tracking-wider">
                                                🧘 Recovery Day
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {day.recoveryDayMembers.map(m => (
                                                    <span key={m.userId} className="text-sm text-white/80 bg-emerald-500/10 px-2 py-1 rounded">
                                                        {m.username}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Paid */}
                                    {day.paidMembers.length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium text-red-400 mb-2 uppercase tracking-wider">
                                                💰 Paid
                                            </div>
                                            <div className="space-y-1">
                                                {day.paidMembers.map(m => (
                                                    <div key={m.userId} className="text-sm text-white/80 flex items-center justify-between bg-red-500/10 px-2 py-1 rounded">
                                                        <span>{m.username}</span>
                                                        <span className="text-xs text-white/40">
                                                            {m.actual}/{m.target} pts
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Waived */}
                                    {day.waivedMembers.length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium text-purple-400 mb-2 uppercase tracking-wider">
                                                ✨ Waived
                                            </div>
                                            <div className="space-y-1">
                                                {day.waivedMembers.map(m => (
                                                    <div key={m.userId} className="text-sm text-white/80 flex items-center justify-between bg-purple-500/10 px-2 py-1 rounded">
                                                        <span>{m.username}</span>
                                                        {m.reasonCategory && (
                                                            <span className="text-xs text-white/40">
                                                                {getReasonLabel(m.reasonCategory)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Under Review */}
                                    {day.underReviewMembers.length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium text-blue-400 mb-2 uppercase tracking-wider">
                                                🔍 Under Review
                                            </div>
                                            <div className="space-y-1">
                                                {day.underReviewMembers.map(m => (
                                                    <div key={m.userId} className="text-sm text-white/80 bg-blue-500/10 px-2 py-1 rounded">
                                                        <div className="flex items-center justify-between">
                                                            <span>{m.username}</span>
                                                            <span className="text-xs text-white/40">
                                                                {m.actual}/{m.target} pts
                                                            </span>
                                                        </div>
                                                        {m.reasonCategory && (
                                                            <div className="text-xs text-white/40 mt-1">
                                                                {getReasonLabel(m.reasonCategory)}
                                                                {m.reasonMessage && `: ${m.reasonMessage}`}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Pending Response */}
                                    {day.pendingMembers.length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium text-yellow-400 mb-2 uppercase tracking-wider">
                                                ⏰ Pending Response
                                            </div>
                                            <div className="space-y-1">
                                                {day.pendingMembers.map(m => (
                                                    <div key={m.userId} className="text-sm text-white/80 flex items-center justify-between bg-yellow-500/10 px-2 py-1 rounded">
                                                        <span>{m.username}</span>
                                                        <span className="text-xs text-white/40">
                                                            {m.actual}/{m.target} pts
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sick */}
                                    {day.sickMembers.length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                                                🤒 Sick
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {day.sickMembers.map(username => (
                                                    <span key={username} className="text-sm text-white/60 bg-gray-500/10 px-2 py-1 rounded">
                                                        {username}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Rest */}
                                    {day.restMembers.length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium text-indigo-400 mb-2 uppercase tracking-wider">
                                                🌙 Rest Day
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {day.restMembers.map(username => (
                                                    <span key={username} className="text-sm text-white/60 bg-indigo-500/10 px-2 py-1 rounded">
                                                        {username}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Flex Rest */}
                                    {day.flexRestMembers.length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium text-amber-400 mb-2 uppercase tracking-wider">
                                                ✨ Flex Rest
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {day.flexRestMembers.map(username => (
                                                    <span key={username} className="text-sm text-white/60 bg-amber-500/10 px-2 py-1 rounded">
                                                        {username}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
