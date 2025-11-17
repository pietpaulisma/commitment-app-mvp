'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { XMarkIcon, TrophyIcon } from '@heroicons/react/24/solid'
import { formatSeasonDisplay, getWeekDates, getSeason, getSeasonYear } from '@/utils/seasonHelpers'
import { calculateDailyTarget } from '@/utils/targetCalculation'

type Season = 'Winter' | 'Spring' | 'Summer' | 'Fall'

interface SeasonData {
  season: Season
  year: number
  champions: ChampionData[]
}

interface ChampionData {
  userId: string
  username: string
  wins: number
  personalColor: string
}

interface SeasonalChampionsHistoryModalProps {
  groupId: string
  onClose: () => void
}

export function SeasonalChampionsHistoryModal({ groupId, onClose }: SeasonalChampionsHistoryModalProps) {
  const [loading, setLoading] = useState(true)
  const [seasonHistory, setSeasonHistory] = useState<SeasonData[]>([])

  useEffect(() => {
    loadSeasonalHistory()
  }, [groupId])

  const loadSeasonalHistory = async () => {
    try {
      setLoading(true)

      // Get group data and members
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
        setSeasonHistory([])
        return
      }

      const groupStartDate = new Date(groupData.start_date)
      const restDays = Array.isArray(groupSettings?.rest_days) ? groupSettings.rest_days : []
      const recoveryDays = Array.isArray(groupSettings?.recovery_days) ? groupSettings.recovery_days : []
      const now = new Date()

      // Get all logs since group start
      const { data: allLogs } = await supabase
        .from('logs')
        .select('user_id, points, date')
        .in('user_id', members.map(m => m.id))
        .gte('date', groupStartDate.toISOString().split('T')[0])
        .lte('date', now.toISOString().split('T')[0])

      // Calculate weekly winners for all weeks
      const weeklyWinnersBySeason = new Map<string, Map<string, string>>() // season key -> (week key -> user_id)

      let currentWeek = new Date(groupStartDate)
      while (currentWeek <= now) {
        const { start: weekStart, end: weekEnd } = getWeekDates(currentWeek)

        // Only calculate if week has ended
        if (weekEnd < now) {
          const weekSeason = getSeason(weekStart)
          const weekYear = getSeasonYear(weekStart)
          const seasonKey = `${weekYear}-${weekSeason}`
          const weekKey = weekStart.toISOString().split('T')[0]

          if (!weeklyWinnersBySeason.has(seasonKey)) {
            weeklyWinnersBySeason.set(seasonKey, new Map())
          }

          // Calculate each member's performance for this week
          const memberPerformance = new Map<string, { totalPoints: number, targetPoints: number }>()

          for (const member of members) {
            const weekLogs = allLogs?.filter(log =>
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
            weeklyWinnersBySeason.get(seasonKey)!.set(weekKey, weekWinner.userId)
          }
        }

        // Move to next week
        currentWeek.setDate(currentWeek.getDate() + 7)
      }

      // Convert to season data structure
      const seasonMap = new Map<string, SeasonData>()

      for (const [seasonKey, weekWinners] of weeklyWinnersBySeason.entries()) {
        const [yearStr, season] = seasonKey.split('-')
        const year = parseInt(yearStr)

        if (!seasonMap.has(seasonKey)) {
          seasonMap.set(seasonKey, {
            season: season as Season,
            year,
            champions: []
          })
        }

        const seasonData = seasonMap.get(seasonKey)!

        // Count wins per user for this season
        for (const userId of weekWinners.values()) {
          const member = members.find(m => m.id === userId)
          if (member) {
            const existingChampion = seasonData.champions.find(c => c.userId === userId)
            if (existingChampion) {
              existingChampion.wins++
            } else {
              seasonData.champions.push({
                userId,
                username: member.username,
                wins: 1,
                personalColor: member.personal_color || 'gray'
              })
            }
          }
        }
      }

      // Sort champions within each season and sort seasons
      const sortedSeasons = Array.from(seasonMap.values())
        .map(season => ({
          ...season,
          champions: season.champions.sort((a, b) => b.wins - a.wins).slice(0, 5)
        }))
        .sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year
          const seasonOrder = { 'Winter': 4, 'Fall': 3, 'Summer': 2, 'Spring': 1 }
          return seasonOrder[b.season] - seasonOrder[a.season]
        })

      setSeasonHistory(sortedSeasons)
    } catch (error) {
      console.error('Error loading seasonal history:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-black/90 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <TrophyIcon className="w-6 h-6 text-yellow-500" />
            <h2 className="text-lg font-bold text-white">Seasonal Champions</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-1"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-6 bg-white/10 rounded w-1/3 mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-10 bg-white/5 rounded"></div>
                    <div className="h-10 bg-white/5 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : seasonHistory.length === 0 ? (
            <div className="text-center py-12">
              <TrophyIcon className="w-16 h-16 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No seasonal data yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {seasonHistory.map((season) => (
                <div key={`${season.year}-${season.season}`}>
                  {/* Season Header */}
                  <h3 className="text-sm font-bold text-white/80 mb-3">
                    {formatSeasonDisplay(season.season, season.year)}
                  </h3>

                  {/* Champions List */}
                  <div className="space-y-2">
                    {season.champions.map((champion, index) => (
                      <div
                        key={champion.userId}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {index === 0 && '🥇'}
                            {index === 1 && '🥈'}
                            {index === 2 && '🥉'}
                            {index > 2 && `${index + 1}.`}
                          </span>
                          <span className="text-sm font-medium text-white">
                            {champion.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrophyIcon className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-bold text-yellow-400">
                            {champion.wins}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            History of all seasonal champions
          </p>
        </div>
      </div>
    </div>
  )
}
