'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy } from 'lucide-react'
import { GlassCard } from '@/components/dashboard/v2/GlassCard'
import { CardHeader } from '@/components/dashboard/v2/CardHeader'
import { getCurrentSeason, getWeekDates, getWeekNumber } from '@/utils/seasonHelpers'
import { SeasonalChampionsHistoryModal } from './modals/SeasonalChampionsHistoryModal'

interface ChampionData {
  userId: string
  username: string
  wins: number
  personalColor: string
  weekNumbers: number[]
}

interface SeasonalChampionsWidgetProps {
  groupId: string
}

export function SeasonalChampionsWidget({ groupId }: SeasonalChampionsWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [champions, setChampions] = useState<ChampionData[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const { season, year } = getCurrentSeason()

  // Helper to format date as YYYY-MM-DD in local timezone (not UTC)
  const formatLocalDate = (date: Date): string => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  useEffect(() => {
    if (groupId) {
      loadSeasonalChampions()
    }
  }, [groupId])

  const loadSeasonalChampions = async () => {
    try {
      setLoading(true)

      // Get group members
      const { data: members } = await supabase
        .from('profiles')
        .select('id, username, personal_color')
        .eq('group_id', groupId)

      if (!members || members.length === 0) {
        setChampions([])
        return
      }

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

      // Get all logs for the season (use local date format to avoid UTC timezone issues)
      const { data: seasonLogs } = await supabase
        .from('logs')
        .select('user_id, points, date')
        .in('user_id', members.map(m => m.id))
        .gte('date', formatLocalDate(seasonStartDate))
        .lte('date', formatLocalDate(seasonEndDate))

      // Calculate weekly winners
      const weeklyWinners = new Map<string, { userId: string, weekNumber: number }>() // week key -> { userId, weekNumber }

      let currentWeek = new Date(seasonStartDate)
      while (currentWeek <= seasonEndDate) {
        const { start: weekStart, end: weekEnd } = getWeekDates(currentWeek)

        // Only calculate if week has ended (use local date format for comparisons)
        if (weekEnd < now) {
          const weekStartStr = formatLocalDate(weekStart)
          const weekEndStr = formatLocalDate(weekEnd)
          const weekNum = getWeekNumber(weekStart)

          // Calculate each member's total points for this week
          const memberPoints: Array<{ userId: string, totalPoints: number }> = []

          for (const member of members) {
            const weekLogs = seasonLogs?.filter(log =>
              log.user_id === member.id &&
              log.date >= weekStartStr &&
              log.date <= weekEndStr
            ) || []

            const totalPoints = weekLogs.reduce((sum, log) => sum + log.points, 0)
            memberPoints.push({ userId: member.id, totalPoints })
          }

          // Find the winner: whoever has the most points this week
          if (memberPoints.length > 0) {
            // Sort by points descending
            memberPoints.sort((a, b) => b.totalPoints - a.totalPoints)
            const weekWinner = memberPoints[0]
            
            // Only award if they actually logged some points
            if (weekWinner.totalPoints > 0) {
              weeklyWinners.set(weekStartStr, { userId: weekWinner.userId, weekNumber: weekNum })
            }
          }
        }

        // Move to next week
        currentWeek.setDate(currentWeek.getDate() + 7)
      }

      // Count wins per user and track week numbers
      const winCounts = new Map<string, ChampionData>()

      for (const { userId, weekNumber } of weeklyWinners.values()) {
        const member = members.find(m => m.id === userId)
        if (member) {
          if (winCounts.has(userId)) {
            const existing = winCounts.get(userId)!
            existing.wins++
            existing.weekNumbers.push(weekNumber)
          } else {
            winCounts.set(userId, {
              userId,
              username: member.username,
              wins: 1,
              personalColor: member.personal_color || 'gray',
              weekNumbers: [weekNumber]
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
          title="Season Champions"
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
          title="Season Champions"
          icon={Trophy}
          colorClass="text-yellow-500"
          rightContent={
            <button
              onClick={() => setShowHistory(true)}
              className="cursor-pointer text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all select-none px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 text-[10px] font-bold uppercase tracking-widest"
            >
              History
            </button>
          }
        />

        {/* Champions List */}
        {champions.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-white/10 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No weekly winners yet this season</p>
          </div>
        ) : (
          <div className="p-4 space-y-2.5">
            {champions.map((champion, index) => (
              <div
                key={champion.userId}
                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-black text-zinc-400 min-w-[24px]">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `${index + 1}`}
                    </span>
                    <span className="text-sm font-bold text-zinc-300">
                      {champion.username.slice(0, 4).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" fill="currentColor" />
                    <span className="text-sm font-bold text-yellow-400">
                      {champion.wins}
                    </span>
                  </div>
                </div>
                {/* Week numbers */}
                <div className="ml-[32px] flex flex-wrap gap-1">
                  {champion.weekNumbers.sort((a, b) => a - b).map((weekNum, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded"
                    >
                      W{weekNum}
                    </span>
                  ))}
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
