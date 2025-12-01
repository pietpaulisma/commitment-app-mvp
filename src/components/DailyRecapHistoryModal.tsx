'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'
import { calculateDailyTarget } from '@/utils/targetCalculation'
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
    status: 'completed' | 'pending' | 'disputed' | 'failed' | 'sick' | 'rest'
    reasonCategory?: string
    reasonMessage?: string
}

interface DayStats {
    date: string
    isRestDay: boolean
    completedMembers: MemberStatus[]
    pendingMembers: MemberStatus[]
    failedMembers: MemberStatus[]
    sickMembers: string[]
    restMembers: string[]
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

            // 2. Calculate last 30 days (using local dates)
            const days = []
            const today = new Date()

            for (let i = 1; i <= 30; i++) {
                const d = new Date(today)
                d.setDate(d.getDate() - i)
                // Don't show days before group start
                if (d < groupStartDate) break

                // Construct local date string YYYY-MM-DD
                const year = d.getFullYear()
                const month = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                const dateStr = `${year}-${month}-${day}`

                days.push({ dateObj: d, dateStr })
            }

            if (days.length === 0) {
                setHistory([])
                return
            }

            const endDateStr = days[0].dateStr
            const startDateStr = days[days.length - 1].dateStr

            // 3. Fetch logs for the date range
            const memberIds = members.map(m => m.id)
            const { data: logs } = await supabase
                .from('workout_logs')
                .select('user_id, points, exercise_id, date')
                .in('user_id', memberIds)
                .gte('date', startDateStr)
                .lte('date', endDateStr)

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

            // 6. Process each day
            const stats: DayStats[] = days.map(({ dateObj, dateStr }) => {
                const dayOfWeek = dateObj.getDay()
                const isRestDay = restDays.includes(dayOfWeek)

                // Calculate days since start
                const daysSinceStart = Math.floor((dateObj.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))

                const completedList: MemberStatus[] = []
                const pendingList: MemberStatus[] = []
                const failedList: MemberStatus[] = []
                const sickList: string[] = []
                const restList: string[] = []

                // Fetch logs for day before (for flex rest day check)
                // Note: This is a simplification. Ideally we'd fetch these logs too, but for 30 days history 
                // fetching 30 extra days of logs might be heavy. 
                // For now, we'll assume flex rest day logic only applies if we have the data, 
                // or we can skip the complex flex rest day check for history overview to keep it fast,
                // unless it's critical. Let's stick to basic rest day check for now.

                members.forEach(member => {
                    // Check sick mode (simplified: if currently sick, mark as sick. 
                    // Ideally we need historical sick status)
                    if (member.is_sick_mode) {
                        sickList.push(member.username)
                        return
                    }

                    if (isRestDay) {
                        // Check flex rest day logic would go here
                        // For now, mark as rest
                        restList.push(member.username)
                        return
                    }

                    const dailyTarget = calculateDailyTarget({
                        daysSinceStart,
                        weekMode: member.week_mode || 'sane',
                        restDays,
                        recoveryDays,
                        currentDayOfWeek: dayOfWeek
                    })

                    // Get logs for this user and date
                    const userLogs = logs?.filter(l => l.user_id === member.id && l.date === dateStr) || []

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

                    // Find penalty
                    const penalty = penalties?.find(p => p.user_id === member.id && p.date === dateStr)

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
                        if (penalty?.status === 'pending') {
                            status.status = 'pending'
                            pendingList.push(status)
                        } else if (penalty?.status === 'disputed') {
                            status.status = 'disputed'
                            pendingList.push(status) // Group disputed with pending for overview
                        } else {
                            failedList.push(status)
                        }
                    }
                })

                return {
                    date: dateStr,
                    isRestDay,
                    completedMembers: completedList,
                    pendingMembers: pendingList,
                    failedMembers: failedList,
                    sickMembers: sickList,
                    restMembers: restList
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
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                                                    <span key={m.userId} className="text-sm text-white/80 bg-white/5 px-2 py-1 rounded">
                                                        {m.username}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Pending / Disputed */}
                                    {day.pendingMembers.length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium text-yellow-400 mb-2 uppercase tracking-wider">
                                                ⚠️ Pending / Disputed
                                            </div>
                                            <div className="space-y-1">
                                                {day.pendingMembers.map(m => (
                                                    <div key={m.userId} className="text-sm text-white/80 flex items-center justify-between bg-white/5 px-2 py-1 rounded">
                                                        <span>{m.username}</span>
                                                        <span className="text-xs text-white/40">
                                                            {m.status === 'disputed' ? 'Disputed' : `${m.actual}/${m.target} pts`}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Failed */}
                                    {day.failedMembers.length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium text-red-400 mb-2 uppercase tracking-wider">
                                                ❌ Missed
                                            </div>
                                            <div className="space-y-1">
                                                {day.failedMembers.map(m => (
                                                    <div key={m.userId} className="text-sm text-white/80 flex items-center justify-between bg-white/5 px-2 py-1 rounded">
                                                        <span>{m.username}</span>
                                                        <span className="text-xs text-white/40">
                                                            {m.actual}/{m.target} pts
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sick / Rest */}
                                    {(day.sickMembers.length > 0 || day.restMembers.length > 0) && (
                                        <div>
                                            <div className="text-xs font-medium text-blue-400 mb-2 uppercase tracking-wider">
                                                💤 Sick / Rest
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {day.sickMembers.map(username => (
                                                    <span key={username} className="text-sm text-white/60 bg-white/5 px-2 py-1 rounded">
                                                        {username} (Sick)
                                                    </span>
                                                ))}
                                                {day.restMembers.map(username => (
                                                    <span key={username} className="text-sm text-white/60 bg-white/5 px-2 py-1 rounded">
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
