'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState, memo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ClockIcon, CalendarDaysIcon, ChartBarIcon, ChatBubbleLeftRightIcon, ChartPieIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import TimeDisplay from './TimeDisplay'
import { calculateDailyTarget, getDaysSinceStart } from '@/utils/targetCalculation'
import { useWeekMode } from '@/contexts/WeekModeContext'

// Helper function to get hilarious hourly commitment messages with fake attributions
const getHourlyMessage = (hour: number): { quote: string, author: string } => {
  const messages = [
    { quote: "I'LL BE BACK... after this midnight workout, because I NEVER STOP!", author: "Arnold Schwarzenegger" }, // 12AM
    { quote: "Be the change you wish to see in your abs... even at 3AM", author: "Gandhi" }, // 1AM
    { quote: "RESPECT TO THE MAN IN THE ICE! Night workouts are HYPER HYPER!", author: "H.P. Baxxter" }, // 2AM
    { quote: "Can you smell what The Rock is cooking? IT'S SUCCESS AT 3AM, BABY!", author: "The Rock" }, // 3AM
    { quote: "Insanity is doing the same thing and expecting different abs... wait, that's not how relativity works", author: "Einstein" }, // 4AM
    { quote: "UNLEASH THE POWER WITHIN! Even if it's 5AM and you're questioning your life choices!", author: "Tony Robbins" }, // 5AM
    { quote: "I came, I saw, I conquered... this morning workout before my enemies even woke up", author: "Napoleon" }, // 6AM
    { quote: "Suffering is attachment to not wanting to do burpees... but the path to enlightenment is through 10 more reps", author: "Buddha" }, // 7AM
    { quote: "THIS BREAKFAST IS RAW! Just like your determination should be, you donut!", author: "Gordon Ramsay" }, // 8AM
    { quote: "The supreme art of war is to subdue your laziness without even fighting... but first, squats", author: "Sun Tzu" }, // 9AM
    { quote: "YOU GET GAINS! AND YOU GET GAINS! EVERYBODY GETS GAINS!", author: "Oprah" }, // 10AM
    { quote: "Great wall of gains can be seen from space... probably. I built one brick at a time", author: "Jackie Chan" }, // 11AM
    { quote: "Lunch tastes better when seasoned with the wisdom of completed workouts", author: "Confucius" }, // 12PM
    { quote: "Be like water... flowing around excuses and into the gym", author: "Bruce Lee" }, // 1PM
    { quote: "To workout or not to workout... that is NOT the question. The answer is always workout", author: "Shakespeare" }, // 2PM
    { quote: "I'M A GENIUS! And geniuses work out at 3PM when everyone else is slacking", author: "Kanye West" }, // 3PM
    { quote: "I am speed... especially when running away from my responsibilities to the gym", author: "Lightning McQueen" }, // 4PM
    { quote: "The unexamined workout is not worth living... but examined or not, DO THE WORKOUT", author: "Socrates" }, // 5PM
    { quote: "Think different... like working out while others are watching Netflix", author: "Steve Jobs" }, // 6PM
    { quote: "Bam! A little workout spice makes everything nice, even your evening routine", author: "Emeril Lagasse" }, // 7PM
    { quote: "Don't hassle the Hoff... especially when I'm crushing my evening workout routine, baby!", author: "David Hasselhoff" }, // 8PM
    { quote: "I'm Batman... and Batman never skips leg day, even in the darkness", author: "Batman" }, // 9PM
    { quote: "The power of alternating current is nothing compared to the power of alternating workout days", author: "Tesla" }, // 10PM
    { quote: "Chuck Norris doesn't do push-ups... he pushes the Earth down. But you should still do yours", author: "Chuck Norris" } // 11PM
  ]
  return messages[hour] || messages[0]
}

// Helper function to get hourly messages for when daily target is achieved with fake attributions
const getTargetAchievedMessage = (hour: number): { quote: string, author: string } => {
  const messages = [
    { quote: "Float like a butterfly, sting like a bee, and CRUSH midnight goals like ME!", author: "Muhammad Ali" }, // 12AM
    { quote: "Genius is 1% inspiration, 99% perspiration... and you just NAILED both at 1AM!", author: "Thomas Edison" }, // 1AM
    { quote: "Everyone has a plan until they get hit... but YOU hit your target first, KNOCKOUT!", author: "Mike Tyson" }, // 2AM
    { quote: "Strong with the Force, you are. Complete your daily target, you have. Proud, I am", author: "Yoda" }, // 3AM
    { quote: "I came, I saw, I conquered the ENTIRE known world... but you conquered your 4AM target!", author: "Alexander the Great" }, // 4AM
    { quote: "GOOD. You got after it at 5AM. Discipline equals freedom. Target: DESTROYED", author: "Jocko Willink" }, // 5AM
    { quote: "Write drunk, edit sober... workout consistently, achieve greatness at 6AM", author: "Ernest Hemingway" }, // 6AM
    { quote: "Winners never quit, and quitters never win... and you just WON the morning!", author: "Vince Lombardi" }, // 7AM
    { quote: "I took it personal... when people said they couldn't hit targets. But you? You DIFFERENT", author: "Michael Jordan" }, // 8AM
    { quote: "GET TO THE CHOPPER! Because you just TERMINATED your daily target!", author: "Arnold Schwarzenegger" }, // 9AM
    { quote: "Mamba mentality means attacking every single day... and you just DOMINATED this one", author: "Kobe Bryant" }, // 10AM
    { quote: "Veni, vidi, vici... I came, I saw, I conquered Rome. You conquered your 11AM target", author: "Julius Caesar" }, // 11AM
    { quote: "WHERE'S THE LAMB SAUCE?! Oh wait, you brought the SAUCE with this target completion!", author: "Gordon Ramsay" }, // 12PM
    { quote: "I don't like to lose... and clearly neither do you. Target SERVED at 1PM!", author: "Serena Williams" }, // 1PM
    { quote: "The way I see it, if you want the rainbow, you gotta put up with the rain... TARGET ACHIEVED!", author: "Tiger Woods" }, // 2PM
    { quote: "HARD WORK! DEDICATION! I'm TBE - The Best Ever, but you're TBE at hitting targets!", author: "Floyd Mayweather" }, // 3PM
    { quote: "We're not here to take part, we're here to take over... and you TOOK OVER this target!", author: "Conor McGregor" }, // 4PM
    { quote: "AND HIS NAME IS... TARGET CRUSHER! You can't see me, but you can see VICTORY!", author: "John Cena" }, // 5PM
    { quote: "I'm not a businessman, I'm a business, man... and your business is CRUSHING TARGETS!", author: "LeBron James" }, // 6PM
    { quote: "I conquered the largest continuous land empire in history... impressive, but have you seen this target completion?", author: "Genghis Khan" }, // 7PM
    { quote: "Welcome to Earth! *punches target completion button* Now THAT'S how we do it!", author: "Will Smith" }, // 8PM
    { quote: "I don't want no trouble... but if trouble is hitting targets, then BRING THE TROUBLE!", author: "Jackie Chan" }, // 9PM
    { quote: "Rest in Peace... to your excuses. The Undertaker of targets has ARRIVED", author: "The Undertaker" }, // 10PM
    { quote: "It ain't about how hard you hit, it's about how hard you can get hit and keep moving forward... TARGET DOWN!", author: "Rocky Balboa" } // 11PM
  ]
  return messages[hour] || messages[0]
}

// Helper function to convert Tailwind classes to organic gradient styles
const getGradientStyle = (colorClass: string, type: 'organic' | 'linear' = 'linear') => {
  if (type === 'organic') {
    const organicMap: Record<string, string> = {
      'bg-orange-400': 'radial-gradient(ellipse 200% 100% at 50% 0%, #fb923c 0%, #f97316 30%, #ea580c 60%, #dc2626 100%)',
      'bg-purple-400': 'radial-gradient(ellipse 200% 100% at 50% 0%, #c084fc 0%, #a855f7 30%, #9333ea 60%, #7c3aed 100%)', 
      'bg-gray-500': 'radial-gradient(ellipse 200% 100% at 50% 0%, #6b7280 0%, #4b5563 30%, #374151 60%, #1f2937 100%)',
      'bg-gray-500': 'radial-gradient(ellipse 150% 100% at 50% 0%, #6b7280 0%, #4b5563 40%, #374151 80%, #1f2937 100%)',
      'bg-gray-700': 'radial-gradient(ellipse 150% 100% at 50% 0%, #374151 0%, #1f2937 50%, #111827 100%)'
    }
    return organicMap[colorClass] || colorClass
  }
  
  const gradientMap: Record<string, string> = {
    'bg-orange-400': 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)',
    'bg-purple-400': 'linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #9333ea 100%)', 
    'bg-gray-500': 'linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #374151 100%)',
    'bg-gray-500': 'linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #374151 100%)',
    'bg-gray-700': 'linear-gradient(135deg, #374151 0%, #1f2937 50%, #111827 100%)'
  }
  return gradientMap[colorClass] || colorClass
}


type RecentChat = {
  id: string
  message: string
  created_at: string
  user_email: string
  user_role: string
  is_own_message: boolean
}

type RecentActivity = {
  id: string
  user_email: string
  exercise_name: string
  points: number
  created_at: string
  is_own_activity: boolean
}

// Constant colors array to avoid useMemo issues
const CHART_COLORS = [
  'text-white',
  'text-green-400', 
  'text-purple-400',
  'text-gray-400',
  'text-yellow-400',
  'text-pink-400'
]

// Helper function to calculate days since last donation
const calculateDaysSinceDonation = (lastDonationDate: string | null, profileCreatedAt?: string): number => {
  const today = new Date()
  
  if (!lastDonationDate) {
    // If no donation date, calculate days since profile creation or return a default
    if (profileCreatedAt) {
      const createdDate = new Date(profileCreatedAt)
      const diffTime = today.getTime() - createdDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      return diffDays >= 0 ? diffDays : 0
    }
    return 0 // Return 0 only if we truly have no reference date
  }
  
  const donationDate = new Date(lastDonationDate)
  const diffTime = today.getTime() - donationDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays >= 0 ? diffDays : 0
}

// Helper function to calculate consecutive "insane" workout days 
// Fixed logic: Only count days where user met/exceeded their actual insane target
const calculateInsaneStreak = (logs: any[], groupStartDate: string, restDays: number[] = [1], recoveryDays: number[] = [5]): number => {
  if (!logs || logs.length === 0) return 0
  
  // Group logs by date and sum points per day
  const dailyPoints = logs.reduce((acc, log) => {
    const date = log.date
    acc[date] = (acc[date] || 0) + log.points
    return acc
  }, {} as Record<string, number>)
  
  // Sort dates in descending order (most recent first)
  const sortedDates = Object.keys(dailyPoints).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  
  let streak = 0
  const groupStartTime = new Date(groupStartDate).getTime()
  
  for (const date of sortedDates) {
    const currentDate = new Date(date)
    const daysSinceStart = Math.floor((currentDate.getTime() - groupStartTime) / (1000 * 60 * 60 * 24))
    const dayOfWeek = currentDate.getDay()
    
    // Calculate what the insane target would have been for this date
    const insaneTarget = calculateDailyTarget({
      daysSinceStart,
      weekMode: 'insane',
      restDays,
      recoveryDays,
      currentDayOfWeek: dayOfWeek
    })
    
    // Only count as insane streak if they met/exceeded the insane target
    if (dailyPoints[date] >= insaneTarget) {
      streak++
    } else {
      break // Streak broken - they didn't meet the insane target
    }
  }
  
  return streak
}

// Helper function to get dynamic colors based on streak/count progression
const getProgressiveColor = (count: number, type: 'bg' | 'text' | 'border' = 'bg') => {
  let colorClass = ''
  
  if (count === 0) {
    // Boring grey for 0
    colorClass = type === 'bg' ? 'bg-gray-500/20' : type === 'text' ? 'text-gray-400' : 'border-gray-500/30'
  } else if (count >= 1 && count <= 2) {
    // Light grey for 1-2
    colorClass = type === 'bg' ? 'bg-gray-400/30' : type === 'text' ? 'text-gray-300' : 'border-gray-400/40'
  } else if (count >= 3 && count <= 6) {
    // Blue for 3-6
    colorClass = type === 'bg' ? 'bg-blue-500/30' : type === 'text' ? 'text-blue-300' : 'border-blue-500/50'
  } else if (count >= 7 && count <= 13) {
    // Purple for 7-13
    colorClass = type === 'bg' ? 'bg-purple-500/30' : type === 'text' ? 'text-purple-300' : 'border-purple-500/50'
  } else if (count >= 14 && count <= 20) {
    // Red for 14-20
    colorClass = type === 'bg' ? 'bg-red-500/30' : type === 'text' ? 'text-red-300' : 'border-red-500/50'
  } else if (count >= 21 && count <= 29) {
    // Gold for 21-29
    colorClass = type === 'bg' ? 'bg-yellow-500/30' : type === 'text' ? 'text-yellow-300' : 'border-yellow-500/50'
  } else {
    // Rainbow gradient for 30+
    if (type === 'bg') {
      return 'bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-indigo-500/30'
    } else if (type === 'text') {
      return 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400'
    } else {
      return 'border-gradient-to-r from-pink-500/50 via-purple-500/50 to-indigo-500/50'
    }
  }
  
  return colorClass
}

// Memoized chart component for performance
const ChartComponent = ({ stat, index, getLayoutClasses, userProfile }: { stat: any, index: number, getLayoutClasses: (blockType: string) => string, userProfile: any }) => {
  // Simple color selection without useMemo to avoid circular dependencies
  const accentColor = CHART_COLORS[index % CHART_COLORS.length] || 'text-gray-400'

  const layoutClasses = getLayoutClasses(stat.layout)

  // Skip placeholder stats from rendering
  if (stat.isPlaceholder) {
    return (
      <div key={index} className={`relative bg-gray-900/10 rounded-lg border-2 border-dashed border-gray-700 ${layoutClasses}`}>
        <div className="p-4 h-full flex flex-col justify-center items-center text-center opacity-30">
          <div className="text-gray-500 text-lg mb-1">{stat.value}</div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">{stat.title}</div>
          <div className="text-xs text-gray-700">{stat.subtitle}</div>
        </div>
      </div>
    )
  }

  // Typography stat - Big number with accent background
  if (stat.type === 'typography_stat') {
    const bgColor = 'bg-gray-900/30' // Use neutral background
    
    return (
      <div key={index} className={`relative ${bgColor} rounded-lg ${layoutClasses} overflow-hidden`}>
        <div className="p-4 h-full flex flex-col">
          <div className="mb-3">
            <div className="text-xs text-white uppercase tracking-wide mb-1">{stat.title}</div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-white leading-none mb-1">
              <span className="text-6xl font-black">{stat.value}</span>
            </div>
            {stat.name && (
              <div className="text-sm text-gray-300 font-bold">
                {stat.name}
              </div>
            )}
            {stat.subtitle && (
              <div className="text-xs text-gray-500 font-medium">{stat.subtitle}</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Heatmap grid - 24-hour activity squares
  if (stat.type === 'heatmap_grid') {
    const data = stat.data || []
    const maxActivity = Math.max(...data.map((d: any) => d.activity), 1)
    
    return (
      <div key={index} className={`relative bg-gray-900/20 ${layoutClasses} overflow-hidden`}>
        <div className="p-4 h-full flex flex-col">
          <div className="mb-3">
            <div className="text-xs text-white uppercase tracking-wide mb-1">{stat.title}</div>
          </div>
          
          {/* 24-hour grid (12x2) */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-12 grid-rows-2 gap-1">
              {data.map((hour: any, i: number) => {
                const intensity = (hour.activity / maxActivity) * 100
                const isHigh = intensity > 70
                
                return (
                  <div
                    key={i}
                    className="aspect-square rounded transition-all duration-500"
                    style={{
                      background: isHigh ? getGradientStyle('bg-purple-400') : 
                                 intensity > 30 ? getGradientStyle('bg-gray-500') : getGradientStyle('bg-gray-700'),
                      animationDelay: `${i * 30}ms`,
                      animation: 'fadeInScale 0.6s ease-out forwards'
                    }}
                    title={`${hour.hour}:00 - ${hour.activity} logs`}
                  />
                )
              })}
            </div>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Peak: {data.find((h: any) => h.activity === maxActivity)?.hour || '0:00'}
          </div>
        </div>
      </div>
    )
  }

  // Stacked bars for overachievers
  if (stat.type === 'stacked_bars') {
    const data = stat.data || []
    
    return (
      <div key={index} className={`relative bg-gray-900/20 rounded-lg ${layoutClasses} overflow-hidden`}>
        <div className="p-3 h-full flex flex-col">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{stat.title}</div>
          
          <div className="flex-1 flex flex-col justify-center gap-2">
            {data.map((member: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-12 text-xs text-gray-300 font-medium truncate">
                  {member.name}
                </div>
                <div className="flex-1 bg-gray-700 h-4 relative overflow-hidden">
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: '100%',
                      background: `linear-gradient(to right, 
                        ${i === 0 
                          ? `#c084fc 0%, 
                             #c084fcdd ${Math.max(0, member.percentage - 15)}%, 
                             #c084fc66 ${member.percentage}%, 
                             #374151 ${Math.min(100, member.percentage + 20)}%`
                          : `#6b7280 0%, #6b7280dd ${Math.max(0, member.percentage - 15)}%, #6b728066 ${member.percentage}%, #374151 ${Math.min(100, member.percentage + 20)}%`
                        })`,
                      animationDelay: `${i * 200}ms`,
                      animation: 'slideInLeft 0.8s ease-out forwards'
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-2">
                    <span className="text-xs font-bold text-white">
                      {member.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Time stat with clock icon
  if (stat.type === 'time_stat') {
    const bgColor = accentColor.replace('text-', 'bg-').replace('-400', '-400') + '/20'
    
    return (
      <div key={index} className={`relative ${bgColor} rounded-lg ${layoutClasses} overflow-hidden border border-gray-700/30`}>
        <div className="p-3 h-full flex flex-col justify-center text-center">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{stat.title}</div>
          <div className={`text-2xl font-black ${accentColor} mb-1 leading-none`}>
            {stat.time}
          </div>
          {stat.subtitle && (
            <div className="text-xs text-gray-400 font-medium">{stat.subtitle}</div>
          )}
        </div>
      </div>
    )
  }

  // Horizontal bar chart - Vertical rectangle with horizontal bars
  if (stat.type === 'horizontal_bar_chart') {
    const data = stat.data || []
    const maxCount = Math.max(...data.map((d: any) => d.count), 1)
    
    return (
      <div key={index} className={`relative bg-gray-900/20 rounded-lg ${layoutClasses} overflow-hidden`}>
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="mb-4">
            <div className="text-xs text-white uppercase tracking-wide mb-1">{stat.title}</div>
            <div className="text-xs text-gray-500">{stat.subtitle}</div>
          </div>
          
          {/* Horizontal Bars */}
          <div className="flex-1 flex flex-col justify-center gap-2">
            {data.map((workout: any, i: number) => {
              const percentage = (workout.count / maxCount) * 100
              const isTop = i === 0
              
              return (
                <div key={i} className="relative">
                  {/* Background bar */}
                  <div className="w-full bg-gray-700 h-6 relative overflow-hidden">
                    {/* Liquid gradient filled bar */}
                    <div 
                      className="h-full transition-all duration-700"
                      style={{ 
                        width: '100%',
                        background: `linear-gradient(to right, 
                          ${isTop 
                            ? `#c084fc 0%, 
                               #c084fcdd ${Math.max(0, percentage - 15)}%, 
                               #c084fc66 ${percentage}%, 
                               #374151 ${Math.min(100, percentage + 20)}%`
                            : `#6b7280 0%, #6b7280dd ${Math.max(0, percentage - 15)}%, #6b728066 ${percentage}%, #374151 ${Math.min(100, percentage + 20)}%`
                          })`,
                        animationDelay: `${i * 100}ms`,
                        animation: 'slideInLeft 0.8s ease-out forwards'
                      }}
                    />
                    
                    {/* Workout name inside bar */}
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="text-xs font-medium text-white truncate">
                        {workout.name}
                      </span>
                      <span className="ml-auto text-xs font-bold text-white">
                        {workout.count}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Countdown bar chart - Full rectangle bar chart for birthday countdown
  if (stat.type === 'countdown_bar') {
    const daysUntil = stat.daysUntil || 0
    const maxDays = 365
    const progressPercentage = Math.max(0, ((maxDays - daysUntil) / maxDays) * 100)
    
    return (
      <div key={index} className={`relative ${layoutClasses} overflow-hidden`}>
        {/* Full rectangle progress background */}
        <div 
          className="absolute left-0 top-0 bottom-0 transition-all duration-1000 ease-out"
          style={{ 
            background: getGradientStyle('bg-purple-400'),
            width: `${progressPercentage}%`,
            borderTopLeftRadius: '16px',
            borderBottomLeftRadius: '16px'
          }}
        />
        
        {/* Content overlay */}
        <div className="relative p-4 h-full flex flex-col z-10">
          <div className="mb-3">
            <div className="text-xs text-white uppercase tracking-wide mb-1">{stat.title}</div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            {/* Days remaining - big copy */}
            <div className="text-white leading-none mb-1">
              <span className="text-6xl font-black">{daysUntil}</span>
              <span className="text-2xl font-thin ml-1">DAYS</span>
            </div>
            
            {/* Person name with birthday icon */}
            <div className="flex items-center gap-1 text-white">
              <div className="w-3 h-3 bg-white rounded-full relative">
                <div 
                  className="absolute top-0.5 left-0.5 w-2 h-1.5 rounded-t-full"
                  style={{ backgroundColor: '#c084fc' }}
                ></div>
              </div>
              <span className="text-sm font-bold">{stat.subtitle}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Line chart - Horizontal rectangular line chart for trends
  if (stat.type === 'line_chart') {
    const data = stat.data || []
    const maxValue = Math.max(...data.map((d: any) => d.points), 1)
    const recordIndex = data.findIndex((d: any) => d.points === maxValue)
    const recordDay = recordIndex >= 0 ? data[recordIndex] : null
    
    return (
      <div key={index} className={`relative bg-gray-900/20 rounded-lg ${layoutClasses} overflow-hidden`}>
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="mb-3">
            <div className="text-xs text-white uppercase tracking-wide mb-1">{stat.title}</div>
            {recordDay && (
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black ${accentColor}`}>
                  {recordDay.points}
                </span>
                <span className="text-xs text-gray-500">MAX {recordDay.day}</span>
              </div>
            )}
          </div>
          
          {/* Vertical Bar Chart */}
          <div className="flex-1 flex items-end gap-1 px-4">
            {data.slice(-40).map((point: any, i: number) => {
              const height = Math.max(2, (point.points / maxValue) * 70)
              const isRecord = data.indexOf(point) === recordIndex
              
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center"
                >
                  {/* Vertical bar */}
                  <div
                    className="w-0.5 transition-all duration-700"
                    style={{ 
                      background: isRecord ? getGradientStyle('bg-purple-400') : getGradientStyle('bg-gray-500'),
                      height: `${height}px`,
                      animationDelay: `${i * 20}ms`,
                      animation: 'slideUpScale 0.8s ease-out forwards',
                      minHeight: '2px'
                    }}
                  />
                  {/* Record highlight dot */}
                  {isRecord && (
                    <div 
                      className="w-2 h-2 rounded-full -mt-1 animate-pulse"
                      style={{ 
                        background: getGradientStyle('bg-purple-400'),
                        animationDelay: `${(i * 20) + 400}ms`
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Wide chart - Full width bar chart with enhanced animations and hover
  if (stat.type === 'wide_chart') {
    const maxValue = Math.max(...(stat.data?.map((d: any) => d.points) || [100]))
    const bgColor = accentColor.replace('text-', 'bg-').replace('-400', '-400') + '/20'
    return (
      <div key={index} className={`relative overflow-hidden ${bgColor} rounded-lg ${layoutClasses} group cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105`}>
        {/* Chart implementation continues... */}
        <div className="p-4 h-full flex items-center justify-center">
          <span className={`text-lg font-bold ${accentColor}`}>{stat.title}</span>
        </div>
      </div>
    )
  }

  // Default simple stat display - some get accent backgrounds for visual variety
  const shouldHaveAccentBg = (index % 4 === 1 || index % 4 === 3) // Every 2nd and 4th item
  const bgColor = shouldHaveAccentBg ? 
    accentColor.replace('text-', 'bg-').replace('-400', '') : 
    'bg-gray-900/30'
  const textColor = shouldHaveAccentBg ? 'text-black' : 'text-white'
  const subtitleColor = shouldHaveAccentBg ? 'text-black/70' : 'text-gray-400'
  const valueColor = shouldHaveAccentBg ? 'text-black' : accentColor
  
  return (
    <div key={index} className={`relative ${bgColor} rounded-lg ${layoutClasses} group cursor-pointer hover:shadow-xl transition-all duration-500 ${shouldHaveAccentBg ? 'hover:opacity-90' : 'hover:bg-gray-900/40'}`}>
      <div className="p-3 h-full flex flex-col justify-center items-center text-center">
        <div className={`text-3xl font-black ${valueColor} mb-2 leading-none`}>{stat.value}</div>
        <div className={`text-xs ${textColor} uppercase tracking-wide mb-1`}>{stat.title}</div>
        <div className={`text-xs ${subtitleColor} font-medium`}>{stat.subtitle}</div>
      </div>
    </div>
  )
}

// Wrapper component that adds interactive functionality to any stat component
const InteractiveStatWrapper = ({ children, onClick, isPersonalMode, hasPersonalData, userProfile }: {
  children: React.ReactNode,
  onClick?: () => void,
  isPersonalMode?: boolean,
  hasPersonalData?: boolean,
  userProfile: any
}) => {
  const personalBorderColor = isPersonalMode ? '#c084fc60' : 'transparent'
  
  return (
    <div 
      className={`relative transition-all duration-300 ${onClick && hasPersonalData ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg' : ''}`}
      onClick={onClick && hasPersonalData ? onClick : undefined}
      style={{
        border: isPersonalMode ? `2px solid ${personalBorderColor}` : '2px solid transparent',
        boxShadow: isPersonalMode ? `0 0 15px ${personalBorderColor}40` : undefined,
        borderRadius: '8px'
      }}
    >
      {/* Personal mode indicator */}
      {isPersonalMode && (
        <div className="absolute top-2 right-2 z-20">
          <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: '#c084fc' }}></div>
        </div>
      )}
      {/* Add "(You)" to title for personal mode */}
      <div className="relative">
        {children}
        {isPersonalMode && (
          <div className="absolute top-4 left-4 z-10">
            <span className="text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">(You)</span>
          </div>
        )}
      </div>
    </div>
  )
}

const MemoizedChartComponent = memo(({ stat, index, getLayoutClasses, userProfile, onClick, isPersonalMode, hasPersonalData }: {
  stat: any,
  index: number,
  getLayoutClasses: (blockType: string) => string,
  userProfile: any,
  onClick?: () => void,
  isPersonalMode?: boolean,
  hasPersonalData?: boolean
}) => {
  return (
    <InteractiveStatWrapper
      onClick={onClick}
      isPersonalMode={isPersonalMode}
      hasPersonalData={hasPersonalData}
      userProfile={userProfile}
    >
      <ChartComponent
        stat={stat}
        index={index}
        getLayoutClasses={getLayoutClasses}
        userProfile={userProfile}
      />
    </InteractiveStatWrapper>
  )
})

// Personal stats component with user accent colors

export default function RectangularDashboard() {
  const { weekMode } = useWeekMode()
  
  // Get time-of-day gradient - same as dashboard background
  const getTimeOfDayGradient = () => {
    const now = new Date()
    const hour = now.getHours()
    
    if (hour >= 5 && hour < 8) {
      // Dawn - vibrant orange/pink from bottom
      return 'radial-gradient(ellipse 150% 120% at 30% 80%, rgba(255, 94, 77, 0.35) 0%, rgba(255, 159, 67, 0.25) 30%, rgba(0, 0, 0, 0.85) 50%, #000000 75%)'
    } else if (hour >= 8 && hour < 11) {
      // Morning - powerful warm sunrise from bottom
      return 'radial-gradient(ellipse 160% 130% at 40% 85%, rgba(255, 193, 7, 0.45) 0%, rgba(255, 152, 0, 0.35) 25%, rgba(255, 87, 34, 0.25) 45%, rgba(0, 0, 0, 0.8) 65%, #000000 80%)'
    } else if (hour >= 11 && hour < 17) {
      // Day - vibrant blue/cyan from bottom
      return 'radial-gradient(ellipse 130% 100% at 50% 85%, rgba(59, 130, 246, 0.3) 0%, rgba(116, 185, 255, 0.22) 35%, rgba(0, 0, 0, 0.85) 50%, #000000 75%)'
    } else if (hour >= 17 && hour < 20) {
      // Evening - vibrant purple/magenta from bottom
      return 'radial-gradient(ellipse 140% 120% at 60% 80%, rgba(168, 85, 247, 0.35) 0%, rgba(199, 121, 208, 0.25) 35%, rgba(0, 0, 0, 0.85) 50%, #000000 75%)'
    } else {
      // Night - vibrant deep blue/purple from bottom
      return 'radial-gradient(ellipse 120% 110% at 25% 85%, rgba(79, 70, 229, 0.3) 0%, rgba(106, 90, 205, 0.22) 35%, rgba(0, 0, 0, 0.85) 50%, #000000 75%)'
    }
  }

  // Add keyframe animations for enhanced chart effects and header animations
  const chartAnimationStyles = `
    @keyframes slideUpScale {
      0% { transform: scaleY(0); opacity: 0.8; }
      100% { transform: scaleY(1); opacity: 1; }
    }
    @keyframes ringProgress {
      0% { stroke-dashoffset: ${2 * Math.PI * 30}; }
      100% { stroke-dashoffset: 0; }
    }
    @keyframes slideInLeft {
      0% { transform: translateX(-20px); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    @keyframes countUp {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes fadeInScale {
      0% { transform: scale(0.9); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes fadeInUp {
      0% { transform: translateY(10px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    /* Header Animation Keyframes */
    @keyframes slideDownFromTop {
      0% { transform: translateY(-100px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes foldOutDown {
      0% { transform: translateY(-20px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideInFromLeft {
      0% { transform: translateX(-100px); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeInSmooth {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }
    
    /* Animation utility classes */
    .animate-day-enter {
      animation: slideDownFromTop 0.8s ease-out forwards;
      animation-delay: 0.2s;
      opacity: 0;
    }
    .animate-day-name-enter {
      animation: foldOutDown 0.6s ease-out forwards;
      animation-delay: 0.6s;
      opacity: 0;
    }
    .animate-time-enter {
      animation: slideInFromLeft 0.8s ease-out forwards;
      animation-delay: 1.0s;
      opacity: 0;
    }
    .animate-remaining-enter {
      animation: foldOutDown 0.6s ease-out forwards;
      animation-delay: 1.4s;
      opacity: 0;
    }
    .animate-sentence-enter {
      animation: fadeInSmooth 1.0s ease-out forwards;
      animation-delay: 1.8s;
      opacity: 0;
    }
    
    @keyframes smooth-fill {
      from {
        stroke-dashoffset: 226.2;
      }
      to {
        stroke-dashoffset: calc(226.2 - var(--progress) * 226.2 / 100);
      }
    }
  `
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const [recentChats, setRecentChats] = useState<RecentChat[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [groupName, setGroupName] = useState('')
  const [groupStartDate, setGroupStartDate] = useState<string | null>(null)
  const [challengeDay, setChallengeDay] = useState(1)
  const [dayType, setDayType] = useState<'rest' | 'recovery' | 'normal'>('normal')
  const [timeLeft, setTimeLeft] = useState('')
  const [timeRemainingPercentage, setTimeRemainingPercentage] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [restDays, setRestDays] = useState<number[]>([1]) // Default Monday (1)
  const [recoveryDays, setRecoveryDays] = useState<number[]>([5]) // Default Friday (5)
  const [accentColor, setAccentColor] = useState('gray') // Default gray
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [groupStats, setGroupStats] = useState<any>(null)
  const [personalStats, setPersonalStats] = useState<any>(null)
  const [individualStatsMode, setIndividualStatsMode] = useState<{[key: number]: boolean}>({0: false, 1: false, 2: false, 3: false})
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())
  const [isAnimationLoaded, setIsAnimationLoaded] = useState(false)
  const [daysSinceDonation, setDaysSinceDonation] = useState<number>(0)
  const [insaneStreak, setInsaneStreak] = useState<number>(0)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Main data loading - don't reload everything when weekMode changes
  useEffect(() => {
    if (user && profile) {
      loadDashboardData()
      // Set up real-time updates
      const interval = setInterval(loadDashboardData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [user, profile])

  // Only reload member data when weekMode changes (for group status display)
  useEffect(() => {
    if (user && profile && weekMode) {
      // Only reload member data to show individual modes in group status
      loadGroupMembers()
      // Note: Don't reload personal stats here - let workout modal handle its own target calculation
    }
  }, [weekMode])

  // Trigger animations after component mounts and data loads
  useEffect(() => {
    if (user && profile && groupStartDate) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setIsAnimationLoaded(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [user, profile, groupStartDate])



  // Countdown timer effect
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      setCurrentTime(now) // Update currentTime state
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      
      const timeDiff = endOfDay.getTime() - now.getTime()
      const hours = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
      
      // Calculate percentage of day elapsed (for progress bar)
      const totalDayTime = endOfDay.getTime() - startOfDay.getTime()
      const elapsedTime = now.getTime() - startOfDay.getTime()
      const elapsedPercentage = (elapsedTime / totalDayTime) * 100
      
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      setTimeRemainingPercentage(Math.min(100, Math.max(0, elapsedPercentage)))
    }

    updateTimer() // Initial update
    const timer = setInterval(updateTimer, 1000) // Update every second
    
    return () => clearInterval(timer)
  }, [])

  // Calculate challenge day and day type when group data loads
  useEffect(() => {
    if (groupStartDate) {
      calculateChallengeInfo()
    }
  }, [groupStartDate, restDays, recoveryDays])

  const calculateChallengeInfo = () => {
    if (!groupStartDate) return

    const startDate = new Date(groupStartDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time for accurate day calculation
    
    const timeDiff = today.getTime() - startDate.getTime()
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1 // +1 because day 1 is the start date
    
    setChallengeDay(Math.max(1, daysDiff))
    
    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
    const currentDayOfWeek = today.getDay()
    
    // Determine day type
    if (restDays.includes(currentDayOfWeek)) {
      setDayType('rest')
    } else if (recoveryDays.includes(currentDayOfWeek)) {
      setDayType('recovery')
    } else {
      setDayType('normal')
    }
  }

  const getAccentColors = () => {
    const colorMap = {
      'gray': {
        primary: 'text-gray-400',
        bg: 'bg-gray-900/50',
        border: 'border-gray-400',
        borderL: 'border-l-purple-500'
      },
      'green': {
        primary: 'text-yellow-400',
        bg: 'bg-yellow-900/50',
        border: 'border-yellow-400',
        borderL: 'border-l-yellow-500'
      },
      'purple': {
        primary: 'text-purple-400',
        bg: 'bg-purple-900/50',
        border: 'border-purple-400',
        borderL: 'border-l-purple-500'
      },
      'orange': {
        primary: 'text-yellow-400',
        bg: 'bg-yellow-900/50',
        border: 'border-yellow-400',
        borderL: 'border-l-yellow-500'
      },
      'red': {
        primary: 'text-purple-400',
        bg: 'bg-purple-900/50',
        border: 'border-purple-400',
        borderL: 'border-l-purple-500'
      },
      'cyan': {
        primary: 'text-yellow-400',
        bg: 'bg-yellow-900/50',
        border: 'border-yellow-400',
        borderL: 'border-l-yellow-500'
      }
    }
    return colorMap[accentColor as keyof typeof colorMap] || colorMap.gray
  }

  const getDayTypeDisplay = () => {
    const colors = getAccentColors()
    switch (dayType) {
      case 'rest':
        return { title: 'Rest Day', subtitle: 'No exercises required', color: colors.primary }
      case 'recovery':
        return { title: 'Recovery Day', subtitle: '25% target, recovery only', color: 'text-green-400' }
      default:
        return { title: 'Training Day', subtitle: 'Complete your daily target', color: colors.primary }
    }
  }

  const getCurrentDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[new Date().getDay()]
  }

  const getTimeBasedBarColor = () => {
    // Calculate actual hours remaining
    const now = new Date()
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    const hoursRemaining = (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursRemaining <= 1) {
      // Last hour: urgent red
      return 'bg-red-500'
    } else if (hoursRemaining <= 3) {
      // Low time: warning orange
      return 'bg-orange-500'
    } else {
      // Plenty of time: calm grey
      return 'bg-gray-400'
    }
  }

  const getTimeTextColor = () => {
    // Calculate actual hours remaining
    const now = new Date()
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    const hoursRemaining = (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursRemaining <= 1) {
      // Last hour: urgent red text
      return 'text-red-400'
    } else if (hoursRemaining <= 3) {
      // Low time: warning orange text
      return 'text-orange-400'
    } else {
      // Plenty of time: calm grey text
      return 'text-gray-400'
    }
  }


  // Time-based gradient that moves horizontally across the day
  const getTimeBasedGradient = () => {
    const now = new Date()
    const hour = now.getHours()
    const minutes = now.getMinutes()
    
    // Calculate position as percentage across the day (6AM = 0%, 6PM = 100%)
    const dayStart = 6 // 6AM
    const dayEnd = 18 // 6PM
    const currentTime = hour + (minutes / 60)
    
    let position = 0
    if (currentTime >= dayStart && currentTime <= dayEnd) {
      position = ((currentTime - dayStart) / (dayEnd - dayStart)) * 100
    } else if (currentTime < dayStart) {
      position = 0 // Before 6AM, stay at left
    } else {
      position = 100 // After 6PM, stay at right
    }
    
    // Clamp position between 0 and 100
    position = Math.max(0, Math.min(100, position))
    
    // Get time-based colors with rgba values
    let primaryColor, secondaryColor
    
    if (hour >= 5 && hour < 7) {
      primaryColor = 'rgba(252, 165, 165, 0.3)' // orange-300
      secondaryColor = 'rgba(254, 240, 138, 0.15)' // yellow-300
    } else if (hour >= 7 && hour < 10) {
      primaryColor = 'rgba(251, 146, 60, 0.35)' // orange-400
      secondaryColor = 'rgba(250, 204, 21, 0.2)' // yellow-400
    } else if (hour >= 10 && hour < 16) {
      primaryColor = 'rgba(250, 204, 21, 0.3)' // yellow-400
      secondaryColor = 'rgba(252, 165, 165, 0.15)' // orange-300
    } else if (hour >= 16 && hour < 18) {
      primaryColor = 'rgba(249, 115, 22, 0.35)' // orange-500
      secondaryColor = 'rgba(248, 113, 113, 0.2)' // red-400
    } else if (hour >= 18 && hour < 20) {
      primaryColor = 'rgba(239, 68, 68, 0.3)' // red-500
      secondaryColor = 'rgba(168, 85, 247, 0.15)' // purple-500
    } else {
      primaryColor = 'rgba(107, 114, 128, 0.25)' // gray-500
      secondaryColor = 'rgba(75, 85, 99, 0.12)' // gray-600
    }
    
    return {
      background: `radial-gradient(ellipse 80% 60% at ${position}% 80%, ${primaryColor} 0%, ${secondaryColor} 40%, transparent 70%)`,
      position
    }
  }

  const loadGroupMembers = async () => {
    if (!profile?.group_id) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get all group members including their individual week_mode
      const { data: allMembers, error: membersError } = await supabase
        .from('profiles')
        .select('id, email, username, personal_color, created_at, week_mode')
        .eq('group_id', profile.group_id)

      if (membersError) {
        console.error('Error fetching group members:', membersError)
        return
      }
      if (!allMembers) return

      // Get group start date for target calculation
      const { data: group } = await supabase
        .from('groups')
        .select('start_date')
        .eq('id', profile.group_id)
        .single()

      // Get group settings for proper target calculation
      const { data: groupSettings } = await supabase
        .from('group_settings')
        .select('*')
        .eq('group_id', profile.group_id)
        .maybeSingle()

      // Calculate days since start for target calculations
      const daysSinceStart = group?.start_date ? getDaysSinceStart(group.start_date) : 1
      
      // Calculate today's target using centralized utility
      let dailyTarget = 1 // Default fallback
      if (group?.start_date) {
        dailyTarget = calculateDailyTarget({
          daysSinceStart,
          weekMode,
          restDays: groupSettings?.rest_days || [1],
          recoveryDays: groupSettings?.recovery_days || [5]
        })
      }

      // Get today's logs for all members with exercise types for recovery capping
      const memberIds = allMembers.map(m => m.id)
      const { data: todayLogs } = await supabase
        .from('logs')
        .select('user_id, points, exercise_id, exercises(type)')
        .in('user_id', memberIds)
        .eq('date', today)

      // Check if today is a recovery day
      const currentDayOfWeek = new Date().getDay()
      const recoveryDays = groupSettings?.recovery_days || [5]
      const isRecoveryDay = recoveryDays.includes(currentDayOfWeek)

      // Process members with their capped points (same logic as other components)
      const memberPointsMap = new Map()
      todayLogs?.forEach(log => {
        if (!memberPointsMap.has(log.user_id)) {
          memberPointsMap.set(log.user_id, { regular: 0, recovery: 0 })
        }
        
        const current = memberPointsMap.get(log.user_id)
        if (log.exercises?.type === 'recovery') {
          current.recovery += log.points
        } else {
          current.regular += log.points
        }
      })

      // Apply recovery capping for each member
      memberIds.forEach(userId => {
        if (memberPointsMap.has(userId)) {
          const { regular, recovery } = memberPointsMap.get(userId)
          let effectiveRecovery = recovery
          
          if (!isRecoveryDay && recovery > 0) {
            const maxRecoveryAllowed = Math.floor(dailyTarget * 0.25)
            effectiveRecovery = Math.min(recovery, maxRecoveryAllowed)
          }
          
          // Store the capped total
          memberPointsMap.set(userId, regular + effectiveRecovery)
        } else {
          memberPointsMap.set(userId, 0)
        }
      })

      // Create final member objects with their points and individual targets
      const membersWithProgress = allMembers.map(member => {
        // Calculate individual daily target based on member's week_mode
        const memberWeekMode = member.week_mode as 'sane' | 'insane' | null
        const memberDailyTarget = calculateDailyTarget({
          daysSinceStart,
          weekMode: memberWeekMode || 'insane', // Default to insane if null
          restDays: groupSettings?.rest_days || [1],
          recoveryDays: groupSettings?.recovery_days || [5]
        })
        
        return {
          ...member,
          todayPoints: memberPointsMap.get(member.id) || 0,
          dailyTarget: memberDailyTarget,
          isCurrentUser: member.id === user?.id
        }
      })
      
      // Sort by points descending
      membersWithProgress.sort((a, b) => b.todayPoints - a.todayPoints)
      setGroupMembers(membersWithProgress)
    } catch (error) {
      console.error('Error loading group members:', error)
    }
  }

  const calculateEssentialStats = async () => {
    if (!profile?.group_id) return null

    try {
      // Get all group members first including their individual week_mode
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('id, email, username, personal_color, week_mode')
        .eq('group_id', profile.group_id)

      if (membersError) {
        console.error('Error fetching members for stats:', membersError)
        return null
      }
      if (!members || members.length === 0) return null

      const memberIds = members.map(m => m.id)
      const today = new Date().toISOString().split('T')[0]

      // 1. Group Points (30 days)
      const past30Days = Array.from({length: 30}, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split('T')[0]
      }).reverse()

      const { data: logs } = await supabase
        .from('logs')
        .select('date, points')
        .in('user_id', memberIds)
        .in('date', past30Days)

      const dailyTotals = past30Days.map(date => {
        const dayLogs = logs?.filter(log => log.date === date) || []
        const totalPoints = dayLogs.reduce((sum, log) => sum + log.points, 0)
        return { date, totalPoints }
      })

      const totalGroupPoints = dailyTotals.reduce((sum, day) => sum + day.totalPoints, 0)

      // 2. Money Pot - load group penalty data
      const { data: groupPenalties, error: penaltyError } = await supabase
        .from('payment_transactions')
        .select('amount, user_id, profiles!inner(username)')
        .eq('group_id', profile.group_id)
        .eq('transaction_type', 'penalty')

      if (penaltyError) {
        console.error('Error loading group penalties:', penaltyError)
      }

      const totalPenaltyAmount = groupPenalties?.reduce((sum, penalty) => sum + penalty.amount, 0) || 0
      
      // Find biggest penalty payer
      const userPenaltyMap = new Map()
      groupPenalties?.forEach(penalty => {
        const userId = penalty.user_id
        userPenaltyMap.set(userId, (userPenaltyMap.get(userId) || 0) + penalty.amount)
      })
      
      let biggestContributor = 'No penalties yet'
      let maxPenalties = 0
      userPenaltyMap.forEach((amount, userId) => {
        if (amount > maxPenalties) {
          maxPenalties = amount
          const penalty = groupPenalties?.find(p => p.user_id === userId)
          biggestContributor = penalty?.profiles?.username || 'User'
        }
      })

      // 3. Next Birthday in Group - find the next upcoming birthday
      const { data: memberProfiles } = await supabase
        .from('profiles')
        .select('email, birth_date')
        .in('id', memberIds)
        .not('birth_date', 'is', null)
      
      let nextBirthdayDays = 0
      let monthName = 'None Set'
      let dayNum = ''
      let nextBirthdayPerson = 'No birthdays'
      
      if (memberProfiles && memberProfiles.length > 0) {
        const today = new Date()
        let closestBirthday: Date | null = null
        let closestPerson = ''
        
        memberProfiles.forEach(member => {
          if (member.birth_date) {
            const birthDate = new Date(member.birth_date)
            const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
            
            // If birthday has passed this year, set it to next year
            if (nextBirthday < today) {
              nextBirthday.setFullYear(today.getFullYear() + 1)
            }
            
            // Check if this is the closest birthday
            if (!closestBirthday || nextBirthday < closestBirthday) {
              closestBirthday = nextBirthday
              closestPerson = member.username || 'Member'
            }
          }
        })
        
        if (closestBirthday) {
          const diffTime = closestBirthday.getTime() - today.getTime()
          nextBirthdayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          monthName = closestBirthday.toLocaleString('default', { month: 'long' })
          dayNum = closestBirthday.getDate().toString()
          nextBirthdayPerson = closestPerson
        }
      }

      // 4. Workout Times
      const { data: timeLogs } = await supabase
        .from('logs')
        .select('created_at')
        .in('user_id', memberIds)

      const hourCounts = new Array(24).fill(0)
      timeLogs?.forEach(log => {
        const hour = new Date(log.created_at).getHours()
        hourCounts[hour]++
      })

      const mostPopularHour = hourCounts.indexOf(Math.max(...hourCounts))
      const peakTime = `${mostPopularHour}:00`

      return {
        groupPoints: {
          title: 'Group Points',
          subtitle: '30-day total',
          value: `${totalGroupPoints} PT`,
          data: dailyTotals.map((day, i) => ({ 
            day: `D${i+1}`, 
            points: day.totalPoints 
          })),
          type: 'line_chart'
        },
        moneyPot: {
          title: 'Money Pot',
          subtitle: `top: ${biggestContributor}`,
          value: Math.max(0, Math.round(totalPenaltyAmount)),
          type: 'typography_stat'
        },
        birthday: {
          title: 'Next Birthday',
          subtitle: nextBirthdayPerson, // Person whose birthday it is
          value: nextBirthdayDays,
          daysUntil: nextBirthdayDays,
          name: nextBirthdayDays > 0 ? `${monthName} ${dayNum}` : 'None set',
          doublePoints: true,
          type: 'countdown_bar'
        },
        workoutTimes: {
          title: 'Peak Workout Time',
          subtitle: 'most active hour',
          value: peakTime,
          data: hourCounts.map((count, hour) => ({
            hour: `${hour}:00`,
            count,
            activity: count
          })),
          type: 'heatmap_grid'
        }
      }
    } catch (error) {
      console.error('Error calculating essential stats:', error)
      return null
    }
  }

  const loadGroupStats = async () => {
    if (!profile?.group_id) return

    try {
      const stats = await calculateEssentialStats()
      if (stats) {
        setGroupStats({
          interestingStats: [
            { ...stats.groupPoints, layout: 'col-span-2' }, // Top row - full width
            { ...stats.moneyPot, layout: 'square' },        // Bottom left - square
            { ...stats.birthday, layout: 'square' },        // Bottom right - square  
            { ...stats.workoutTimes, layout: 'col-span-2' } // Bottom - full width rectangle
          ]
        })
      }
    } catch (error) {
      console.error('Error loading group stats:', error)
      setGroupStats({ interestingStats: [] })
    }
  }

  const loadPersonalStats = async () => {
    if (!user) return

    try {
      // Get personal workout data for the last 30 days
      const past30Days = Array.from({length: 30}, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split('T')[0]
      }).reverse()

      const { data: logs } = await supabase
        .from('logs')
        .select('date, points, created_at')
        .eq('user_id', user.id)
        .in('date', past30Days)

      // 1. Personal Points (30-day line chart)
      const dailyTotals = past30Days.map(date => {
        const dayLogs = logs?.filter(log => log.date === date) || []
        const totalPoints = dayLogs.reduce((sum, log) => sum + log.points, 0)
        return { date, totalPoints }
      })

      const totalPersonalPoints = dailyTotals.reduce((sum, day) => sum + day.totalPoints, 0)

      // 2. Personal Money Pot (your contribution)
      const { data: userPenalties, error: userPenaltyError } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('transaction_type', 'penalty')

      if (userPenaltyError) {
        console.error('Error loading user penalties:', userPenaltyError)
      }

      const personalMoneyContribution = userPenalties?.reduce((sum, penalty) => sum + penalty.amount, 0) || 0

      // 3. Personal Birthday - use real birth date from profile
      let nextBirthdayDays = 0
      let monthName = 'Not Set'
      let dayNum = ''
      
      if (profile?.birth_date) {
        const birthDate = new Date(profile.birth_date)
        const today = new Date()
        
        // Calculate next birthday
        const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
        
        // If birthday has passed this year, set it to next year
        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1)
        }
        
        // Calculate days until next birthday
        const diffTime = nextBirthday.getTime() - today.getTime()
        nextBirthdayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        monthName = nextBirthday.toLocaleString('default', { month: 'long' })
        dayNum = nextBirthday.getDate().toString()
      } else {
        // No birthday set - show placeholder
        nextBirthdayDays = 0
        monthName = 'Not Set'
        dayNum = ''
      }

      // 4. Personal Workout Times
      const { data: allPersonalLogs } = await supabase
        .from('logs')
        .select('created_at')
        .eq('user_id', user.id)

      const hourCounts = new Array(24).fill(0)
      allPersonalLogs?.forEach(log => {
        const hour = new Date(log.created_at).getHours()
        hourCounts[hour]++
      })

      const mostPopularHour = hourCounts.indexOf(Math.max(...hourCounts))
      const peakTime = `${mostPopularHour}:00`

      // Create personal stats using same visualization types as group stats
      setPersonalStats({
        interestingStats: [
          {
            title: 'Your Points',
            subtitle: '30-day total',
            value: `${totalPersonalPoints} PT`,
            data: dailyTotals.map((day, i) => ({ 
              day: `D${i+1}`, 
              points: day.totalPoints 
            })),
            type: 'line_chart',
            layout: 'col-span-2' // Top row - full width
          },
          {
            title: 'Your Contribution',
            subtitle: 'money pot',
            value: Math.max(0, Math.round(personalMoneyContribution)),
            type: 'typography_stat',
            layout: 'square' // Bottom left - square
          },
          {
            title: profile?.birth_date ? 'Your Birthday' : 'Set Birthday',
            subtitle: profile?.username || 'You',
            value: profile?.birth_date ? nextBirthdayDays : 0,
            daysUntil: profile?.birth_date ? nextBirthdayDays : 0,
            name: profile?.birth_date ? `${monthName} ${dayNum}` : 'Tap to set',
            doublePoints: true,
            type: 'countdown_bar',
            layout: 'square' // Bottom right - square  
          },
          {
            title: 'Your Peak Time',
            subtitle: 'most active hour',
            value: peakTime,
            data: hourCounts.map((count, hour) => ({
              hour: `${hour}:00`,
              count,
              activity: count
            })),
            type: 'heatmap_grid',
            layout: 'col-span-2' // Bottom - full width rectangle
          }
        ]
      })
    } catch (error) {
      console.error('Error loading personal stats:', error)
      setPersonalStats({ interestingStats: [] })
    }
  }

  // Predefined 2×4 grid layouts with 8 cells each
  // A = 1×1 (square), B = 1×2 (tall), C = 2×1 (wide)
  const PREDEFINED_LAYOUTS = [
    // Layout 1: A A | A A | B1 A | B2 A  
    [
      { position: 0, type: 'A' }, { position: 1, type: 'A' },
      { position: 2, type: 'A' }, { position: 3, type: 'A' },
      { position: 4, type: 'B1' }, { position: 5, type: 'A' },
      { position: 6, type: 'B2' }, { position: 7, type: 'A' }
    ],
    // Layout 2: C1 C2 | A B1 | A B2 | C1 C2
    [
      { position: 0, type: 'C1' }, { position: 1, type: 'C2' },
      { position: 2, type: 'A' }, { position: 3, type: 'B1' },
      { position: 4, type: 'A' }, { position: 5, type: 'B2' },
      { position: 6, type: 'C1' }, { position: 7, type: 'C2' }
    ],
    // Layout 3: B1 B1 | B2 B2 | A A | C1 C2
    [
      { position: 0, type: 'B1' }, { position: 1, type: 'B1' },
      { position: 2, type: 'B2' }, { position: 3, type: 'B2' },
      { position: 4, type: 'A' }, { position: 5, type: 'A' },
      { position: 6, type: 'C1' }, { position: 7, type: 'C2' }
    ],
    // Layout 4: C1 C2 | C1 C2 | A A | B1 B1
    [
      { position: 0, type: 'C1' }, { position: 1, type: 'C2' },
      { position: 2, type: 'C1' }, { position: 3, type: 'C2' },
      { position: 4, type: 'A' }, { position: 5, type: 'A' },
      { position: 6, type: 'B1' }, { position: 7, type: 'B1' }
    ],
    // Layout 5: A B1 | A B2 | C1 C2 | C1 C2
    [
      { position: 0, type: 'A' }, { position: 1, type: 'B1' },
      { position: 2, type: 'A' }, { position: 3, type: 'B2' },
      { position: 4, type: 'C1' }, { position: 5, type: 'C2' },
      { position: 6, type: 'C1' }, { position: 7, type: 'C2' }
    ],
    // Layout 6: A A | B1 C1 | B2 C2 | A A
    [
      { position: 0, type: 'A' }, { position: 1, type: 'A' },
      { position: 2, type: 'B1' }, { position: 3, type: 'C1' },
      { position: 4, type: 'B2' }, { position: 5, type: 'C2' },
      { position: 6, type: 'A' }, { position: 7, type: 'A' }
    ]
  ]

  // Simple layout classes without useCallback to avoid circular dependencies
  const getLayoutClasses = (blockType: string) => {
    switch (blockType) {
      case 'A': return 'aspect-square' // 1×1 square
      case 'B1': return 'aspect-[1/2]' // 1×2 tall (top part)
      case 'B2': return 'hidden' // 1×2 tall (bottom part - handled by B1)
      case 'C1': return 'aspect-[2/1]' // 2×1 wide (left part)  
      case 'C2': return 'hidden' // 2×1 wide (right part - handled by C1)
      case 'square': return 'aspect-square' // 1×1 square (alias)
      case 'col-span-2': return 'aspect-[2/1]' // 2×1 wide
      case 'vertical': return 'aspect-[1/2]' // 1×2 vertical rectangle
      default: return 'aspect-square'
    }
  }

  // Simple layout selection without useMemo to avoid circular dependencies
  const getSelectedLayout = () => {
    try {
      const currentHour = new Date().getHours()
      const layoutIndex = currentHour % PREDEFINED_LAYOUTS.length
      return PREDEFINED_LAYOUTS[layoutIndex]
    } catch (error) {
      console.error('Error in getSelectedLayout:', error)
      // Return fallback layout
      return PREDEFINED_LAYOUTS[0]
    }
  }

  const getStatLayout = (stats: any[], isShowingAll = false) => {
    
    // Filter out hidden positions (B2, C2)
    const selectedLayout = getSelectedLayout()
    const visiblePositions = selectedLayout.filter(pos => pos.type !== 'B2' && pos.type !== 'C2')
    
    const layouts = []
    let statIndex = 0
    
    if (isShowingAll) {
      // For showing all stats, repeat layouts as needed
      for (let i = 0; i < stats.length; i++) {
        const layoutPos = visiblePositions[i % visiblePositions.length]
        layouts.push({ ...stats[i], layout: layoutPos.type, position: layoutPos.position })
      }
      return layouts
    }
    
    // For main view: use exactly 8 positions but only show visible ones (typically 5-6)
    visiblePositions.forEach((layoutPos) => {
      if (statIndex < stats.length) {
        layouts.push({ ...stats[statIndex], layout: layoutPos.type, position: layoutPos.position })
        statIndex++
      } else {
        // Create placeholder for empty slots
        layouts.push({
          type: 'placeholder',
          layout: layoutPos.type,
          position: layoutPos.position,
          title: 'Coming Soon',
          subtitle: 'More stats',
          value: '...',
          isPlaceholder: true
        })
      }
    })
    
    return layouts
  }


  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  const toggleIndividualStat = (index: number) => {
    setIndividualStatsMode(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const loadDashboardData = async () => {
    if (!user || !profile) return

    let currentGroupData: any = null

    try {
      // Get group name and start date
      if (profile.group_id) {
        const { data: group } = await supabase
          .from('groups')
          .select('name, start_date')
          .eq('id', profile.group_id)
          .single()
        
        currentGroupData = group // Store for use in streak calculation
        setGroupName(group?.name || 'Your Group')
        setGroupStartDate(group?.start_date || null)

        // Load group members and stats
        await Promise.all([loadGroupMembers(), loadGroupStats(), loadPersonalStats()])

        // Try to load group settings for rest/recovery days and UI configuration
        try {
          const { data: groupSettings, error: settingsError } = await supabase
            .from('group_settings')
            .select('rest_days, recovery_days, accent_color')
            .eq('group_id', profile.group_id)
            .maybeSingle()

          if (!settingsError && groupSettings) {
            setRestDays(groupSettings.rest_days || [1]) // Default Monday
            setRecoveryDays(groupSettings.recovery_days || [5]) // Default Friday
            setAccentColor(groupSettings.accent_color || 'gray') // Default gray
          }
        } catch (error) {
          console.log('Group settings not available, using defaults')
        }
      }

      // Load recent chats
      if (profile.group_id) {
        try {
          const { data: chats } = await supabase
            .from('chat_messages')
            .select(`
              id, 
              message, 
              created_at, 
              user_id,
              profiles!inner(email, role, username)
            `)
            .eq('group_id', profile.group_id)
            .order('created_at', { ascending: false })
            .limit(10)

          const chatsWithOwnership = chats?.map(chat => ({
            ...chat,
            user_email: chat.profiles.email,
            user_role: chat.profiles.role,
            username: chat.profiles.username,
            is_own_message: chat.user_id === user.id
          })) || []

          setRecentChats(chatsWithOwnership)
        } catch (error) {
          console.log('Could not load chats:', error)
        }
      }

      // Load donation tracking and insane streak data
      try {
        // Get profile with last_donation_date and created_at
        const { data: profileData } = await supabase
          .from('profiles')
          .select('last_donation_date, created_at')
          .eq('id', user.id)
          .single()

        // Calculate days since donation (use profile creation date as fallback)
        const donationGap = calculateDaysSinceDonation(profileData?.last_donation_date, profileData?.created_at)
        setDaysSinceDonation(donationGap)

        // Get logs for streak calculation (last 30 days)
        const past30Days = Array.from({ length: 30 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - i)
          return date.toISOString().split('T')[0]
        })

        const { data: userLogs } = await supabase
          .from('logs')
          .select('date, points')
          .eq('user_id', user.id)
          .in('date', past30Days)

        // Calculate insane streak using proper group data
        if (currentGroupData?.start_date) {
          const streak = calculateInsaneStreak(
            userLogs || [], 
            currentGroupData.start_date, 
            restDays, 
            recoveryDays
          )
          setInsaneStreak(streak)
        } else {
          setInsaneStreak(0)
        }
      } catch (error) {
        console.log('Could not load donation/streak data:', error)
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes}m`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d`
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'supreme_admin':
        return 'text-purple-400'
      case 'group_admin':
        return 'text-yellow-400'
      default:
        return 'text-purple-300'
    }
  }

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-purple-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const dayTypeInfo = getDayTypeDisplay()
  const colors = getAccentColors()

  return (
    <>
      {/* Inject chart animation styles */}
      <style dangerouslySetInnerHTML={{ __html: chartAnimationStyles }} />
      
      <div className="pb-8">

      
      {/* Logo and Quote Box */}
      <div className="mx-1 mb-1" style={{ marginTop: '8px' }}>
        <div 
          className="bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl py-2 px-6"
          style={{
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className="flex items-center justify-between">
              <img 
                src="/logo.png" 
                alt="The Commitment" 
                className="h-8 w-auto drop-shadow-lg"
              />
              <Link 
                href="/profile" 
                className="flex items-center justify-center transition-all duration-200 hover:opacity-80 p-2"
              >
                <Cog6ToothIcon className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dashboard Content */}
      {groupStartDate && (
        <div className="relative overflow-hidden">

          {/* DAY and Time Display */}
          <div className="mx-1 mb-1 space-y-1">
            {/* DAY Block - Background removed, content left-aligned, "Day" moved above number */}
            <div className="relative">
              {/* DAY Content - No background block */}
              <div className="py-6 px-4 text-left">
                <div className="flex flex-col justify-start items-start">
                  <div className="text-6xl font-black text-white drop-shadow-lg mb-2">
                    {challengeDay}
                  </div>
                  <p className="text-sm font-medium text-white/90 drop-shadow">
                    {getCurrentDayName()}
                  </p>
                </div>
              </div>
            </div>

            {/* Time Display Block - 50% less tall and twice the width */}
            <div className="relative">
              <div style={{ aspectRatio: '4/1' }}>
                <TimeDisplay className="w-full h-full" />
              </div>
            </div>
          </div>

          {/* Motivational Quote - Moved below DAY and Time components */}
          {groupStartDate && (
            <div className="mx-1 mb-1">
              <div className="px-6">
                <div className={`text-left ${isAnimationLoaded ? 'animate-sentence-enter' : ''}`}>
                  {(() => {
                    // Find current user's progress
                    const currentUserMember = groupMembers.find(member => member.isCurrentUser)
                    const hasAchievedTarget = currentUserMember && currentUserMember.todayPoints >= currentUserMember.dailyTarget
                    const message = hasAchievedTarget 
                      ? getTargetAchievedMessage(currentTime.getHours())
                      : getHourlyMessage(currentTime.getHours())
                    
                    return (
                      <div>
                        <p className="text-sm text-white/90 font-medium drop-shadow leading-relaxed mb-2">
                          "{message.quote}"
                        </p>
                        <p className="text-xs text-white/60 font-normal">
                          — {message.author}
                        </p>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Streaks Box */}
          <div className="mx-1 mb-1">
            <div 
              className="bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="relative z-10 py-6 px-6">
                <h3 className="text-xs font-light text-white/80 mb-6 uppercase tracking-widest drop-shadow" style={{ fontFamily: 'Helvetica, system-ui, -apple-system, sans-serif' }}>
                  Streaks
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  <div className="text-center">
                    <div className="text-4xl font-black text-white drop-shadow-lg mb-2">
                      {daysSinceDonation}
                    </div>
                    <p className="text-sm font-medium text-white/60 drop-shadow">
                      days since donation
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-white drop-shadow-lg mb-2">
                      {insaneStreak}
                    </div>
                    <p className="text-sm font-medium text-white/60 drop-shadow">
                      days insane streak
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      <div className="relative z-10">
        {/* Group Status */}
        <div id="group-status" className="relative">
          {/* Glass morphism container wrapper */}
          <div className="relative">
            {/* Main container */}
            <div 
              className="mx-1 mb-1 bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
              }}
            >
              
              <div className="relative py-6 px-4 z-10">
                <h3 className="text-xs font-light text-white/80 mb-4 uppercase tracking-widest drop-shadow" style={{ fontFamily: 'Helvetica, system-ui, -apple-system, sans-serif' }}>
                  Status
                </h3>
            
            {groupMembers.length === 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-gray-900/30">
                  <div className="animate-pulse bg-gray-800 rounded h-10 mb-2"></div>
                  <div className="animate-pulse bg-gray-700 rounded h-4"></div>
                </div>
                <div className="p-3 rounded-lg bg-gray-900/30">
                  <div className="animate-pulse bg-gray-800 rounded h-10 mb-2"></div>
                  <div className="animate-pulse bg-gray-700 rounded h-4"></div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-start gap-2 py-4 px-2">
                {groupMembers.map((member) => {
                  const progressPercentage = Math.round((member.todayPoints / (member.dailyTarget || 100)) * 100)
                      
                  return (
                        <div key={member.id} className="flex flex-col items-center">
                          {/* Bigger circular progress */}
                          <div className="relative w-20 h-20">
                            {/* Background circle */}
                            <div className="w-20 h-20 rounded-full bg-gray-800/50 border border-white/10"></div>
                            
                            {/* Progress circle with bottom-to-top fill animation */}
                            <svg 
                              className="absolute top-0 left-0 w-20 h-20"
                              viewBox="0 0 80 80"
                            >
                              <defs>
                                <clipPath id={`circle-clip-${progressPercentage}`}>
                                  <circle cx="40" cy="40" r="36" />
                                </clipPath>
                              </defs>
                              
                              {/* Background circle border */}
                              <circle
                                cx="40"
                                cy="40"
                                r="36"
                                fill="none"
                                stroke="#374151"
                                strokeWidth="2"
                              />
                              
                              {/* Filled progress area */}
                              <rect
                                x="4"
                                y={76 - (progressPercentage / 100) * 72}
                                width="72"
                                height={(progressPercentage / 100) * 72}
                                fill={member.personal_color || "#ef4444"}
                                clipPath={`url(#circle-clip-${progressPercentage})`}
                                className="transition-all duration-1000 ease-out"
                              />
                            </svg>
                            
                            {/* Bigger, bolder percentage text with mode indicator */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-white font-black text-lg leading-tight">
                                {progressPercentage}%
                              </span>
                              <span className="text-white/60 text-xs font-light tracking-wide">
                                {member.week_mode || 'insane'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Person name */}
                          <div className="mt-2 text-center">
                            <span className="text-white/80 text-xs font-light" style={{ fontFamily: 'Helvetica, system-ui, -apple-system, sans-serif' }}>
                              {member.isCurrentUser ? 'You' : (member.username || 'User')}
                            </span>
                          </div>
                    </div>
                  )
                })}
              </div>
            )}
              </div>
            </div>
          </div>
        </div>

        {/* Chats Section */}
        <div id="chats" className="relative">
          {/* Glass morphism container wrapper */}
          <div className="relative">
            {/* Main container */}
            <div 
              className="mx-1 mb-1 bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
              }}
            >
              
              <div className="relative py-6 px-4 z-10">
                <h3 className="text-xs font-light text-white/80 mb-4 uppercase tracking-widest drop-shadow" style={{ fontFamily: 'Helvetica, system-ui, -apple-system, sans-serif' }}>
                  Chats
                </h3>
            
            {recentChats.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-gray-400 font-medium text-lg">No recent messages</p>
                <p className="text-gray-500 text-sm mt-2">Start a conversation with your group</p>
              </div>
            ) : (
              <div className="space-y-3 px-4">
                {recentChats
                  .filter((chat) => {
                    // Filter out workout completion messages from dashboard
                    try {
                      if (chat.message && (chat.message.includes('workout_data') || chat.message.includes('Workout completed!'))) {
                        const parsed = JSON.parse(chat.message)
                        if (parsed.workout_data) {
                          return false // Skip workout messages on dashboard
                        }
                      }
                    } catch (e) {
                      // If parsing fails, include the message
                    }
                    return true // Include regular messages
                  })
                  .slice(0, 7)
                  .map((chat) => {
                  // Only regular messages reach here now
                  let displayText = chat.message

                  return (
                    <div key={chat.id} className="p-2 mx-2 mb-2 text-sm rounded-xl"
                    style={{
                      background: chat.is_own_message 
                        ? 'rgba(255, 255, 255, 0.08)' 
                        : 'rgba(255, 255, 255, 0.05)'
                    }}>
                      {/* Regular message display only - workout messages filtered out */}
                      <div className="text-sm text-gray-300">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <span className="font-medium text-white mr-2">
                              {chat.is_own_message ? 'You' : (chat.username || 'User')}:
                            </span>
                            <span>{displayText}</span>
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatTimeAgo(chat.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
              </div>
            </div>
          </div>
        </div>

        {/* Individual Stat Blocks - integrated into dashboard */}
        {groupStats && groupStats.interestingStats && groupStats.interestingStats.length > 0 && (
          <>
            {/* Group Points - Full width block */}
            <div className="relative">
              <div 
                className="mx-1 mb-1 bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl"
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                <MemoizedChartComponent 
                  key={`${individualStatsMode[0] ? 'personal' : 'group'}-${(individualStatsMode[0] && personalStats?.interestingStats?.[0]) ? personalStats.interestingStats[0].type : groupStats.interestingStats[0].type}-0`}
                  stat={individualStatsMode[0] && personalStats?.interestingStats?.[0] ? personalStats.interestingStats[0] : groupStats.interestingStats[0]} 
                  index={0} 
                  getLayoutClasses={getLayoutClasses}
                  userProfile={profile}
                  onClick={() => toggleIndividualStat(0)}
                  isPersonalMode={individualStatsMode[0]}
                  hasPersonalData={!!personalStats?.interestingStats?.[0]}
                />
              </div>
            </div>

            {/* Money Pot and Birthday - Two square blocks side by side */}
            <div className="grid grid-cols-2 gap-1 mx-1 mb-1">
              {/* Money Pot Block */}
              <div className="relative">
                <div 
                  className="aspect-square bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl"
                  style={{
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <MemoizedChartComponent 
                    key={`${individualStatsMode[1] ? 'personal' : 'group'}-${(individualStatsMode[1] && personalStats?.interestingStats?.[1]) ? personalStats.interestingStats[1].type : groupStats.interestingStats[1].type}-1`}
                    stat={individualStatsMode[1] && personalStats?.interestingStats?.[1] ? personalStats.interestingStats[1] : groupStats.interestingStats[1]} 
                    index={1} 
                    getLayoutClasses={getLayoutClasses}
                    userProfile={profile}
                    onClick={() => toggleIndividualStat(1)}
                    isPersonalMode={individualStatsMode[1]}
                    hasPersonalData={!!personalStats?.interestingStats?.[1]}
                  />
                </div>
              </div>

              {/* Birthday Block */}
              <div className="relative">
                <div 
                  className="aspect-square bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl"
                  style={{
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <MemoizedChartComponent 
                    key={`${individualStatsMode[2] ? 'personal' : 'group'}-${(individualStatsMode[2] && personalStats?.interestingStats?.[2]) ? personalStats.interestingStats[2].type : groupStats.interestingStats[2].type}-2`}
                    stat={individualStatsMode[2] && personalStats?.interestingStats?.[2] ? personalStats.interestingStats[2] : groupStats.interestingStats[2]} 
                    index={2} 
                    getLayoutClasses={getLayoutClasses}
                    userProfile={profile}
                    onClick={() => toggleIndividualStat(2)}
                    isPersonalMode={individualStatsMode[2]}
                    hasPersonalData={!!personalStats?.interestingStats?.[2]}
                  />
                </div>
              </div>
            </div>

            {/* Workout Times - Full width block */}
            <div className="relative">
              <div 
                className="mx-1 mb-1 bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl"
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                <MemoizedChartComponent 
                  key={`${individualStatsMode[3] ? 'personal' : 'group'}-${(individualStatsMode[3] && personalStats?.interestingStats?.[3]) ? personalStats.interestingStats[3].type : groupStats.interestingStats[3].type}-3`}
                  stat={individualStatsMode[3] && personalStats?.interestingStats?.[3] ? personalStats.interestingStats[3] : groupStats.interestingStats[3]} 
                  index={3} 
                  getLayoutClasses={getLayoutClasses}
                  userProfile={profile}
                  onClick={() => toggleIndividualStat(3)}
                  isPersonalMode={individualStatsMode[3]}
                  hasPersonalData={!!personalStats?.interestingStats?.[3]}
                />
              </div>
            </div>
          </>
        )}

      </div>
    </>
  )
}
