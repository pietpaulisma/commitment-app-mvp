'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ClockIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'
import { calculateDailyTarget } from '@/utils/targetCalculation'
import { formatDateShort } from '@/utils/penaltyHelpers'

interface DailyRecapHistoryModalProps {
    groupId: string
    onClose: () => void
    onSelectDate: (date: Date) => void
}

interface DayStats {
    date: string
    totalMembers: number
    completedMembers: number
    isRestDay: boolean
}

export function DailyRecapHistoryModal({ groupId, onClose, onSelectDate }: DailyRecapHistoryModalProps) {
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
                supabase.from('profiles').select('id, week_mode, is_sick_mode').eq('group_id', groupId)
            ])

            if (!groupDataRes.data || !membersRes.data) return

            const restDays = Array.isArray(groupSettingsRes.data?.rest_days) ? groupSettingsRes.data.rest_days : []
            const recoveryDays = Array.isArray(groupSettingsRes.data?.recovery_days) ? groupSettingsRes.data.recovery_days : []
            const groupStartDate = new Date(groupDataRes.data.start_date)
            const members = membersRes.data

            // 2. Calculate last 30 days
            const days = []
            const today = new Date()
            // Start from yesterday
            for (let i = 1; i <= 30; i++) {
                const d = new Date(today)
                d.setDate(d.getDate() - i)
                // Don't show days before group start
                if (d < groupStartDate) break
                days.push(d)
            }

            if (days.length === 0) {
                setHistory([])
                return
            }

            const endDateStr = days[0].toISOString().split('T')[0]
            const startDateStr = days[days.length - 1].toISOString().split('T')[0]

            // 3. Fetch logs for the date range
            const memberIds = members.map(m => m.id)
            const { data: logs } = await supabase
                .from('workout_logs')
                .select('user_id, points, exercise_id, date')
                .in('user_id', memberIds)
                .gte('date', startDateStr)
                .lte('date', endDateStr)

            // 4. Fetch exercises for recovery detection
            const { data: exercises } = await supabase
                .from('exercises')
                .select('id, type')
            const exerciseTypeMap = new Map(exercises?.map(e => [e.id, e.type]) || [])

            // 5. Process each day
            const stats: DayStats[] = days.map(date => {
                const dateStr = date.toISOString().split('T')[0]
                const dayOfWeek = date.getDay()
                const isRestDay = restDays.includes(dayOfWeek)

                // Calculate days since start
                const daysSinceStart = Math.floor((date.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))

                let completedCount = 0
                let activeMembersCount = 0

                members.forEach(member => {
                    // Skip if sick (simplified logic: if currently sick, assume sick in history? 
                    // Ideally we'd have history of sickness, but for now this is a reasonable approximation or we just count them as total)
                    // Better: Count them in total, but check if they met target.
                    // For this overview, let's just check if they met the target or it was a rest day.

                    activeMembersCount++

                    if (isRestDay) {
                        // Everyone "completes" a rest day for the sake of the overview, 
                        // unless we want to be strict about flex rest days. 
                        // For simplicity in this overview: Rest Day = 100% completion visual usually looks good, 
                        // or we explicitly mark it as "Rest Day".
                        completedCount++
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

                    if (actualPoints >= dailyTarget) {
                        completedCount++
                    }
                })

                return {
                    date: dateStr,
                    totalMembers: activeMembersCount,
                    completedMembers: completedCount,
                    isRestDay
                }
            })

            setHistory(stats)

        } catch (error) {
            console.error('Error loading history:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div
                className="relative bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl max-w-md w-full"
                style={{
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
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
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                            <button
                                key={day.date}
                                onClick={() => onSelectDate(new Date(day.date))}
                                className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all active:scale-[0.98] group"
                            >
                                <div className="flex flex-col items-start">
                                    <span className="text-white font-medium">
                                        {formatDateShort(day.date)}
                                    </span>
                                    <span className="text-xs text-white/40">
                                        {day.isRestDay ? 'Rest Day' : `${day.completedMembers}/${day.totalMembers} Completed`}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    {day.isRestDay ? (
                                        <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                            Rest
                                        </span>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${day.completedMembers === day.totalMembers ? 'bg-green-500' :
                                                            day.completedMembers >= day.totalMembers / 2 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${(day.completedMembers / day.totalMembers) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <ChevronRightIcon className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
