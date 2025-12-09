'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy } from 'lucide-react'
import { GlassCard } from '@/components/dashboard/v2/GlassCard'
import { CardHeader } from '@/components/dashboard/v2/CardHeader'
import { getCurrentSeason, formatSeasonDisplay, getWeekDates } from '@/utils/seasonHelpers'
import { calculateDailyTarget } from '@/utils/targetCalculation'
import { SeasonalChampionsHistoryModal } from './modals/SeasonalChampionsHistoryModal'

interface ChampionData {
  userId: string
  username: string
  wins: number
  personalColor: string
}

interface SeasonalChampionsWidgetProps {
  groupId: string
}

export function SeasonalChampionsWidget({ groupId }: SeasonalChampionsWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [champions, setChampions] = useState<ChampionData[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const { season, year } = getCurrentSeason()

  useEffect(() => {
    if (groupId) {
      loadSeasonalChampions()
    }
  }, [groupId])

  const loadSeasonalChampions = async () => {
    try {
      setLoading(true)

      // Get group settings and members
      const { data: groupData } = await supabase
        .from('groups')
        .select('start_date')
        .eq('id', groupId)
        .single()

      const { data: groupSettings } = await supabase
        .from('group_settings')
        .select('rest_days, recovery_days')
        .eq('group_id', groupId)
        .single()

      const { data: members } = await supabase
        .from('profiles')
        .select('id, username, week_mode, personal_color')
        .eq('group_id', groupId)

      if (!groupData || !members) {
        setChampions([])
        return
      }

      const groupStartDate = new Date(groupData.start_date)
      const restDays = Array.isArray(groupSettings?.rest_days) ? groupSettings.rest_days : []
      const recoveryDays = Array.isArray(groupSettings?.recovery_days) ? groupSettings.recovery_days : []

      // Calculate season start and end dates
      const now = new Date()
      let seasonStartDate: Date
      let seasonEndDate: Date

      if (season === 'Winter') {
        // Winter: Dec 1 (prev year) - Feb 28/29 (current year)
        seasonStartDate = new Date(year - 1, 11, 1) // Dec 1
        seasonEndDate = new Date(year, 2, 0) // Last day of Feb
      } else if (season === 'Spring') {
        // Spring: Mar 1 - May 31
        seasonStartDate = new Date(year, 2, 1)
        seasonEndDate = new Date(year, 5, 0)
      } else if (season === 'Summer') {
        // Summer: Jun 1 - Aug 31
        seasonStartDate = new Date(year, 5, 1)
        seasonEndDate = new Date(year, 8, 0)
      } else {
        // Fall: Sep 1 - Nov 30
        seasonStartDate = new Date(year, 8, 1)
        seasonEndDate = new Date(year, 11, 0)
      }

      // Don't go beyond today
      if (seasonEndDate > now) {
        seasonEndDate = now
      }

      // Get all logs for the season
      const { data: seasonLogs } = await supabase
        .from('logs')
        .select('user_id, points, date')
        .in('user_id', members.map(m => m.id))
        .gte('date', seasonStartDate.toISOString().split('T')[0])
        .lte('date', seasonEndDate.toISOString().split('T')[0])

      // Calculate weekly winners
      const weeklyWinners = new Map<string, string>() // week key -> user_id

      let currentWeek = new Date(seasonStartDate)
      while (currentWeek <= seasonEndDate) {
        const { start: weekStart, end: weekEnd } = getWeekDates(currentWeek)

        // Only calculate if week has ended
        if (weekEnd < now) {
          const weekKey = weekStart.toISOString().split('T')[0]

          // Calculate each member's performance for this week
          const memberPerformance = new Map<string, { totalPoints: number, targetPoints: number }>()

          for (const member of members) {
            const weekLogs = seasonLogs?.filter(log =>
              log.user_id === member.id &&
              log.date >= weekStart.toISOString().split('T')[0] &&
              log.date <= weekEnd.toISOString().split('T')[0]
            ) || []

            const totalPoints = weekLogs.reduce((sum, log) => sum + log.points, 0)

            // Calculate weekly target
            let weeklyTarget = 0
            for (let i = 0; i < 7; i++) {
              const date = new Date(weekStart)
              date.setDate(date.getDate() + i)
              const dayOfWeek = date.getDay()
              const daysSinceStart = Math.floor((date.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24))

              const dailyTarget = calculateDailyTarget({
                daysSinceStart,
                weekMode: member.week_mode || 'sane',
                restDays,
                recoveryDays,
                currentDayOfWeek: dayOfWeek
              })

              weeklyTarget += dailyTarget
            }

            if (totalPoints > weeklyTarget) {
              memberPerformance.set(member.id, {
                totalPoints,
                targetPoints: weeklyTarget
              })
            }
          }

          // Find winner for this week
          let weekWinner: { userId: string, percentage: number } | null = null
          for (const [userId, perf] of memberPerformance.entries()) {
            const percentage = ((perf.totalPoints - perf.targetPoints) / perf.targetPoints) * 100
            if (!weekWinner || percentage > weekWinner.percentage) {
              weekWinner = { userId, percentage }
            }
          }

          if (weekWinner) {
            weeklyWinners.set(weekKey, weekWinner.userId)
          }
        }

        // Move to next week
        currentWeek.setDate(currentWeek.getDate() + 7)
      }

      // Count wins per user
      const winCounts = new Map<string, ChampionData>()

      for (const userId of weeklyWinners.values()) {
        const member = members.find(m => m.id === userId)
        if (member) {
          if (winCounts.has(userId)) {
            winCounts.get(userId)!.wins++
          } else {
            winCounts.set(userId, {
              userId,
              username: member.username,
              wins: 1,
              personalColor: member.personal_color || 'gray'
            })
          }
        }
      }

      // Sort by wins (descending) and take top 5
      const sorted = Array.from(winCounts.values())
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 5)

      setChampions(sorted)
    } catch (error) {
      console.error('Error loading seasonal champions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <GlassCard noPadding>
        <CardHeader
          title={formatSeasonDisplay(season, year)}
          icon={Trophy}
          colorClass="text-yellow-500"
        />
        <div className="p-4 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white/5 rounded-lg h-12"></div>
            </div>
          ))}
        </div>
      </GlassCard>
    )
  }

  return (
    <>
      <GlassCard noPadding>
        <CardHeader
          title={formatSeasonDisplay(season, year)}
          icon={Trophy}
          colorClass="text-yellow-500"
          rightContent={
            champions.length > 0 ? (
              <button
                onClick={() => setShowHistory(true)}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                History
              </button>
            ) : undefined
          }
        />

        {/* Champions List */}
        {champions.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-white/10 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No weekly winners yet this season</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {champions.map((champion, index) => (
              <div
                key={champion.userId}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-zinc-400 min-w-[24px]">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `${index + 1}`}
                  </span>
                  <span className="text-sm font-bold text-zinc-300">
                    {champion.username}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" fill="currentColor" />
                  <span className="text-sm font-bold text-yellow-400">
                    {champion.wins}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* History Modal */}
      {showHistory && (
        <SeasonalChampionsHistoryModal
          groupId={groupId}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  )
}
