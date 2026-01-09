'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Trophy } from 'lucide-react'
import { formatSeasonDisplay, getWeekDates, getSeason, getSeasonYear } from '@/utils/seasonHelpers'

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

  // Helper to format date as YYYY-MM-DD in local timezone (not UTC)
  const formatLocalDate = (date: Date): string => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

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

      const { data: members } = await supabase
        .from('profiles')
        .select('id, username, personal_color')
        .eq('group_id', groupId)

      if (!groupData || !members || members.length === 0) {
        setSeasonHistory([])
        return
      }

      const groupStartDate = new Date(groupData.start_date)
      const now = new Date()

      // Get all logs since group start (use local date format to avoid UTC timezone issues)
      const { data: allLogs } = await supabase
        .from('logs')
        .select('user_id, points, date')
        .in('user_id', members.map(m => m.id))
        .gte('date', formatLocalDate(groupStartDate))
        .lte('date', formatLocalDate(now))

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
          const weekStartStr = formatLocalDate(weekStart)
          const weekEndStr = formatLocalDate(weekEnd)

          if (!weeklyWinnersBySeason.has(seasonKey)) {
            weeklyWinnersBySeason.set(seasonKey, new Map())
          }

          // Calculate each member's total points for this week
          const memberPoints: Array<{ userId: string, totalPoints: number }> = []

          for (const member of members) {
            const weekLogs = allLogs?.filter(log =>
              log.user_id === member.id &&
              log.date >= weekStartStr &&
              log.date <= weekEndStr
            ) || []

            const totalPoints = weekLogs.reduce((sum, log) => sum + log.points, 0)
            memberPoints.push({ userId: member.id, totalPoints })
          }

          // Find the winner: whoever has the most points this week
          if (memberPoints.length > 0) {
            memberPoints.sort((a, b) => b.totalPoints - a.totalPoints)
            const weekWinner = memberPoints[0]
            
            // Only award if they actually logged some points
            if (weekWinner.totalPoints > 0) {
              weeklyWinnersBySeason.get(seasonKey)!.set(weekStartStr, weekWinner.userId)
            }
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

      // Sort champions within each season, filter out seasons with no champions, and sort seasons
      const sortedSeasons = Array.from(seasonMap.values())
        .map(season => ({
          ...season,
          champions: season.champions.sort((a, b) => b.wins - a.wins).slice(0, 5)
        }))
        .filter(season => season.champions.length > 0) // Only show seasons with actual data
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl max-w-2xl w-full"
        style={{
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header - Modern glass design */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Seasonal Champions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content - Condensed, modern styling */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4" style={{ 
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}>
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-6 bg-white/10 rounded w-1/3 mb-3"></div>
                  <div className="space-y-1.5">
                    <div className="h-12 bg-white/5 rounded-xl"></div>
                    <div className="h-12 bg-white/5 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : seasonHistory.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No seasonal data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {seasonHistory.map((season) => (
                <div key={`${season.year}-${season.season}`} className="bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden">
                  {/* Season Header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/5">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                      {formatSeasonDisplay(season.season, season.year)}
                    </h3>
                    <span className="ml-auto text-xs text-zinc-500 font-bold">
                      {season.champions.reduce((sum, c) => sum + c.wins, 0)} weeks
                    </span>
                  </div>

                  {/* Champions List */}
                  <div className="p-3 space-y-1.5">
                    {season.champions.map((champion, index) => (
                      <div
                        key={champion.userId}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
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
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />
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

        {/* Footer - Condensed */}
        <div className="px-6 py-3 border-t border-white/10">
          <p className="text-[10px] text-zinc-600 text-center uppercase tracking-wider font-bold">
            All-time seasonal champions
          </p>
        </div>
      </div>
    </div>
  )
}
