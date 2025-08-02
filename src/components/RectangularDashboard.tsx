'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState, memo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ClockIcon, CalendarDaysIcon, ChartBarIcon, ChatBubbleLeftRightIcon, ChartPieIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'

// Helper function to get hilarious hourly commitment messages
const getHourlyMessage = (hour: number): string => {
  const messages = [
    "Still up? That's commitment... or insomnia", // 12AM
    "3AM thoughts: 'I should be working out right now'", // 1AM
    "Night owl or fitness vampire? Either way, you're here", // 2AM
    "The dedication is real... or you have a sleeping problem", // 3AM
    "Rise and grind? More like rise and why am I awake?", // 4AM
    "Early bird gets the gains... and questionable life choices", // 5AM
    "Morning champion! Coffee first, then conquer the world", // 6AM
    "Another day, another chance to pretend you like burpees", // 7AM
    "Breakfast of champions: protein and pure determination", // 8AM
    "9-to-5 warrior reporting for duty (and squats)", // 9AM
    "Mid-morning motivation: you're crushing it, literally", // 10AM
    "Pre-lunch power hour - fuel up that commitment engine", // 11AM
    "Lunch break legend! Time to digest your goals", // 12PM
    "Post-lunch commitment: fighting the food coma like a champ", // 1PM
    "Afternoon achiever! When others nap, you attack", // 2PM
    "3PM slump? More like 3PM pump - let's go!", // 3PM
    "Almost there warrior - the finish line tastes like victory", // 4PM
    "5 o'clock somewhere, commitment o'clock everywhere", // 5PM
    "Evening excellence! When others Netflix, you commit", // 6PM
    "Dinner and dedication - the perfect recipe for success", // 7PM
    "Prime time performer! Your commitment show is rated #1", // 8PM
    "Night shift ninja - slaying goals in the darkness", // 9PM
    "Late-night legend! When the world sleeps, you sweep", // 10PM
    "Almost midnight warrior - tomorrow's gains start tonight" // 11PM
  ]
  return messages[hour] || messages[0]
}

// Helper function to get hourly messages for when daily target is achieved
const getTargetAchievedMessage = (hour: number): string => {
  const messages = [
    "Midnight warrior! Target crushed while others dream", // 12AM
    "1AM legend! Your dedication knows no bedtime", // 1AM
    "2AM champion! Even the night shift is impressed", // 2AM
    "3AM victor! This is what peak commitment looks like", // 3AM
    "4AM conqueror! Dawn hasn't even thought about breaking", // 4AM
    "5AM destroyer! You've already won before sunrise", // 5AM
    "6AM dominator! Morning coffee tastes like victory", // 6AM
    "7AM crusher! Started strong, staying stronger", // 7AM
    "8AM annihilator! Breakfast of champions, indeed", // 8AM
    "9AM terminator! Work day? More like victory lap", // 9AM
    "10AM obliterator! Mid-morning and you're unstoppable", // 10AM
    "11AM devastator! Pre-lunch power move complete", // 11AM
    "12PM eliminator! Lunch tastes better when you've won", // 12PM
    "1PM liquidator! Post-lunch slump? Not for legends", // 1PM
    "2PM eradicator! Afternoon energy of a champion", // 2PM
    "3PM pulverizer! 3PM and still crushing dreams", // 3PM
    "4PM vaporizer! Almost evening, already victorious", // 4PM
    "5PM atomizer! 5 o'clock champion reporting for duty", // 5PM
    "6PM disintegrator! Evening excellence achieved", // 6PM
    "7PM demolisher! Dinner and total domination", // 7PM
    "8PM exterminator! Prime time belongs to you", // 8PM
    "9PM annihilator! Night shift ninja strikes again", // 9PM
    "10PM destroyer! Late night legend status confirmed", // 10PM
    "11PM obliterator! Almost midnight and still winning" // 11PM
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

// Helper function to create gradient from user's personal color
const getUserColorGradient = (personalColor: string, type: 'organic' | 'linear' = 'organic') => {
  if (!personalColor) return getGradientStyle('bg-purple-400', type)
  
  // Convert hex to RGB for gradient calculation
  const hex = personalColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  if (type === 'organic') {
    // Create organic radial gradient with darker variations
    const darker1 = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`
    const darker2 = `rgb(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)})`
    const darker3 = `rgb(${Math.max(0, r - 90)}, ${Math.max(0, g - 90)}, ${Math.max(0, b - 90)})`
    
    return `radial-gradient(ellipse 200% 100% at 50% 0%, ${personalColor} 0%, ${darker1} 30%, ${darker2} 60%, ${darker3} 100%)`
  } else {
    // Create linear gradient
    const darker1 = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`
    const darker2 = `rgb(${Math.max(0, r - 80)}, ${Math.max(0, g - 80)}, ${Math.max(0, b - 80)})`
    
    return `linear-gradient(135deg, ${personalColor} 0%, ${darker1} 50%, ${darker2} 100%)`
  }
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
  'text-orange-400',
  'text-green-400', 
  'text-purple-400',
  'text-gray-400',
  'text-yellow-400',
  'text-pink-400'
]

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
              <span className="text-2xl font-thin">€</span>
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
                      background: isHigh ? getUserColorGradient(userProfile?.personal_color) : 
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
                          ? `${userProfile?.personal_color || '#c084fc'} 0%, 
                             ${userProfile?.personal_color || '#c084fc'}dd ${Math.max(0, member.percentage - 15)}%, 
                             ${userProfile?.personal_color || '#c084fc'}66 ${member.percentage}%, 
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
          <div className="text-3xl mb-2">⏰</div>
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
                            ? `${userProfile?.personal_color || '#c084fc'} 0%, 
                               ${userProfile?.personal_color || '#c084fc'}dd ${Math.max(0, percentage - 15)}%, 
                               ${userProfile?.personal_color || '#c084fc'}66 ${percentage}%, 
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
      <div key={index} className={`relative bg-black ${layoutClasses} overflow-hidden`}>
        {/* Full rectangle progress background */}
        <div 
          className="absolute left-0 top-0 bottom-0 transition-all duration-1000 ease-out"
          style={{ 
            background: getUserColorGradient(userProfile?.personal_color, 'organic'),
            width: `${progressPercentage}%`
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
                  style={{ backgroundColor: userProfile?.personal_color || '#c084fc' }}
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
                <span className={`text-xl font-thin ${accentColor} ml-1`}>
                  PT
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
                      background: isRecord ? getUserColorGradient(userProfile?.personal_color, 'linear') : getGradientStyle('bg-gray-500'),
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
                        background: getUserColorGradient(userProfile?.personal_color, 'linear'),
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

const MemoizedChartComponent = memo(ChartComponent)

// Personal stats component with user accent colors

export default function RectangularDashboard() {
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
  `
  const { user, loading: authLoading, isDemoMode, exitDemoMode } = useAuth()
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
  const [showPersonalStats, setShowPersonalStats] = useState(false)
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())
  const [isAnimationLoaded, setIsAnimationLoaded] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && profile) {
      loadDashboardData()
      // Set up real-time updates
      const interval = setInterval(loadDashboardData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [user, profile])

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
      
      // Calculate percentage of day elapsed (for progress bar)
      const totalDayTime = endOfDay.getTime() - startOfDay.getTime()
      const elapsedTime = now.getTime() - startOfDay.getTime()
      const elapsedPercentage = (elapsedTime / totalDayTime) * 100
      
      setTimeLeft(`${hours}h ${minutes}m`)
      setTimeRemainingPercentage(Math.min(100, Math.max(0, elapsedPercentage)))
    }

    updateTimer() // Initial update
    const timer = setInterval(updateTimer, 60000) // Update every minute
    
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
        return { title: 'Recovery Day', subtitle: '15 min recovery exercises', color: 'text-green-400' }
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
      
      // Get all group members
      const { data: allMembers } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .eq('group_id', profile.group_id)

      if (!allMembers) return

      // Get group start date for target calculation
      const { data: group } = await supabase
        .from('groups')
        .select('start_date')
        .eq('id', profile.group_id)
        .single()

      // Calculate today's target using correct formula (with Monday doubling)
      let dailyTarget = 1 // Default fallback (base target = 1)
      if (group?.start_date) {
        const daysSinceStart = Math.floor((new Date().getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24))
        const baseTarget = 1 + Math.max(0, daysSinceStart) // Core app rule: base 1, increment 1
        
        // Check if today is Monday (1) - if so, double the target
        const today = new Date()
        const isMonday = today.getDay() === 1
        dailyTarget = isMonday ? baseTarget * 2 : baseTarget
      }

      // Get today's logs for all members in one query
      const memberIds = allMembers.map(m => m.id)
      const { data: todayLogs } = await supabase
        .from('logs')
        .select('user_id, points')
        .in('user_id', memberIds)
        .eq('date', today)

      // Process members with their points
      const memberPointsMap = new Map()
      todayLogs?.forEach(log => {
        if (!memberPointsMap.has(log.user_id)) {
          memberPointsMap.set(log.user_id, 0)
        }
        memberPointsMap.set(log.user_id, memberPointsMap.get(log.user_id) + log.points)
      })

      // Create final member objects with their points
      const membersWithProgress = allMembers.map(member => ({
        ...member,
        todayPoints: memberPointsMap.get(member.id) || 0,
        dailyTarget: dailyTarget,
        isCurrentUser: member.id === user?.id
      }))
      
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
      // Get all group members first
      const { data: members } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('group_id', profile.group_id)

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

      // 2. Money Pot
      const moneyInPot = totalGroupPoints * 0.10
      
      // Find biggest contributor
      const userPointsMap = new Map()
      logs?.forEach(log => {
        userPointsMap.set(log.user_id, (userPointsMap.get(log.user_id) || 0) + log.points)
      })
      
      let biggestContributor = 'No data'
      let maxPoints = 0
      userPointsMap.forEach((points, userId) => {
        if (points > maxPoints) {
          maxPoints = points
          const user = members.find(m => m.id === userId)
          biggestContributor = user?.email.split('@')[0] || 'Unknown'
        }
      })

      // 3. Birthday (fake data for now)
      const nextBirthdayDays = Math.floor(Math.random() * 365) + 1
      const nextBirthdayDate = new Date()
      nextBirthdayDate.setDate(nextBirthdayDate.getDate() + nextBirthdayDays)
      const monthName = nextBirthdayDate.toLocaleString('default', { month: 'long' })
      const dayNum = nextBirthdayDate.getDate()

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
          value: Math.max(0, Math.round(moneyInPot)),
          type: 'typography_stat'
        },
        birthday: {
          title: 'Next Birthday',
          subtitle: members[0]?.email?.split('@')[0] || 'Member', // Person whose birthday it is
          value: nextBirthdayDays,
          daysUntil: nextBirthdayDays,
          name: `${monthName} ${dayNum}`,
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
      const personalMoneyContribution = totalPersonalPoints * 0.10

      // 3. Personal Birthday (fake data for now, could be user's actual birthday)
      const nextBirthdayDays = Math.floor(Math.random() * 365) + 1
      const nextBirthdayDate = new Date()
      nextBirthdayDate.setDate(nextBirthdayDate.getDate() + nextBirthdayDays)
      const monthName = nextBirthdayDate.toLocaleString('default', { month: 'long' })
      const dayNum = nextBirthdayDate.getDate()

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
            title: 'Your Birthday',
            subtitle: profile?.email?.split('@')[0] || 'You',
            value: nextBirthdayDays,
            daysUntil: nextBirthdayDays,
            name: `${monthName} ${dayNum}`,
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

  const loadDashboardData = async () => {
    if (!user || !profile) return

    try {
      // Get group name and start date
      if (profile.group_id) {
        const { data: group } = await supabase
          .from('groups')
          .select('name, start_date')
          .eq('id', profile.group_id)
          .single()
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
              profiles!inner(email, role)
            `)
            .eq('group_id', profile.group_id)
            .order('created_at', { ascending: false })
            .limit(10)

          const chatsWithOwnership = chats?.map(chat => ({
            ...chat,
            user_email: chat.profiles.email,
            user_role: chat.profiles.role,
            is_own_message: chat.user_id === user.id
          })) || []

          setRecentChats(chatsWithOwnership)
        } catch (error) {
          console.log('Could not load chats:', error)
        }
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
    <div className="min-h-screen pb-8 bg-black">

      {/* Demo Mode Indicator */}
      {isDemoMode && (
        <div className="bg-orange-900/20 border-b border-orange-600/50 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              <span className="text-orange-200 text-sm font-medium">
                Demo Mode Active - Testing with mock data
              </span>
            </div>
            <button
              onClick={exitDemoMode}
              className="text-xs px-4 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                boxShadow: `
                  inset 0 1px 0 rgba(255, 255, 255, 0.2),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.1),
                  0 4px 12px rgba(0, 0, 0, 0.3),
                  0 2px 4px rgba(234, 88, 12, 0.4)
                `,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                color: '#ffffff'
              }}
            >
              Exit Demo Mode
            </button>
          </div>
        </div>
      )}
      
      {/* Inject chart animation styles */}
      <style dangerouslySetInnerHTML={{ __html: chartAnimationStyles }} />
      
      {/* Header with Logo and Settings - Sticky */}
      <div 
        className="sticky top-0 z-[70] mx-2 mb-0 mt-4 bg-black/95 backdrop-blur-sm"
      >
        
        <div className="relative">
          {/* Main container */}
          <div 
            className="relative rounded-2xl border overflow-hidden"
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            
            <div className="relative px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                {/* Logo */}
                <div>
                  <img 
                    src="/logo.png" 
                    alt="The Commitment" 
                    className="h-6 w-auto drop-shadow-lg"
                  />
                </div>
                
                {/* Settings Icon */}
                <Link 
                  href="/profile" 
                  className="flex items-center justify-center transition-all duration-200 hover:opacity-80 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50"
                >
                  <Cog6ToothIcon className="w-6 h-6 text-gray-400 hover:text-white transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Time-Based Challenge Header */}
      {groupStartDate && (
        <div 
          className="relative overflow-hidden mt-2"
        >
          
          {/* Retro Boxed Container with Strokes and Shadows */}
          <div className="relative mx-2 mb-1">
            {/* Main Container with Multiple Stroke Layers */}
            <div className="relative">
              {/* Main Box with Dark Grey Background */}
              <div 
                className="relative rounded-2xl border overflow-hidden"
                style={{
                  background: '#111827',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                
                {/* Content container */}
                <div className="relative px-4 py-6 z-10">
                  {/* Time-based gradient overlay positioned inside the block */}
                  <div 
                    className="absolute inset-3 rounded-xl"
                    style={{
                      background: getTimeBasedGradient().background
                    }}
                  />
                  
                  {/* Content with relative positioning */}
                  <div className="relative z-10">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className={`flex items-baseline space-x-1 ${isAnimationLoaded ? 'animate-day-enter' : ''}`}>
                        <span className="text-5xl font-thin uppercase tracking-wide text-white drop-shadow-lg">DAY</span>
                        <span className="text-5xl font-black text-white drop-shadow-lg">{challengeDay}</span>
                      </div>
                      <p className={`text-sm font-medium -mt-1 text-white/90 drop-shadow ${isAnimationLoaded ? 'animate-day-name-enter' : ''}`}>
                        {getCurrentDayName()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-black text-white drop-shadow-lg ${isAnimationLoaded ? 'animate-time-enter' : ''}`}>
                        {timeLeft.replace(/h/g, 'h').replace(/m/g, 'm').split('').map((char, i) => (
                          <span key={i} className={char === 'h' || char === 'm' ? 'font-thin' : 'font-black'}>
                            {char}
                          </span>
                        ))}
                      </div>
                      <div className={`text-sm font-medium -mt-1 text-white/90 drop-shadow ${isAnimationLoaded ? 'animate-remaining-enter' : ''}`}>
                        remaining
                      </div>
                    </div>
                  </div>
                  
                  {/* Greeting with username and motivational text */}
                  <div className="px-2 py-6">
                    <div className={`text-center ${isAnimationLoaded ? 'animate-sentence-enter' : ''}`}>
                      {(() => {
                        // Find current user's progress
                        const currentUserMember = groupMembers.find(member => member.isCurrentUser)
                        const hasAchievedTarget = currentUserMember && currentUserMember.todayPoints >= currentUserMember.dailyTarget
                        
                        return (
                          <p className="text-sm text-white/80 font-medium drop-shadow">
                            {hasAchievedTarget 
                              ? getTargetAchievedMessage(currentTime.getHours())
                              : getHourlyMessage(currentTime.getHours())}, {user?.email?.split('@')[0] || 'champion'}!
                          </p>
                        )
                      })()}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Today's Activity Header */}
      <div className="relative pt-1 rounded-t-2xl z-10 mx-2 mb-1">
        {/* Retro container with stroke effects */}
        <div className="relative">
          {/* Main container */}
          <div 
            className="relative rounded-2xl border overflow-hidden"
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            
            <div className="relative px-4 py-4 z-10">
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Today's Activity</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1 relative z-10 mx-2">
        {/* Group Status */}
        <div id="group-status" className="relative">
          {/* Retro container wrapper */}
          <div className="relative">
            {/* Outer glow */}
            <div 
              className="absolute inset-0 rounded-2xl blur-lg opacity-15"
              style={{
                background: 'linear-gradient(135deg, #111827, #000000)',
                transform: 'scale(1.01)'
              }}
            />
            
            {/* Main container */}
            <div 
              className="relative rounded-2xl border-2 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #111827 0%, #000000 100%)',
                borderImage: 'linear-gradient(135deg, #000000, #111827, #000000) 1',
                boxShadow: `
                  inset 0 1px 0 rgba(255, 255, 255, 0.05),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.3),
                  0 4px 20px rgba(0, 0, 0, 0.5),
                  0 2px 8px rgba(0, 0, 0, 0.3)
                `
              }}
            >
              {/* Inner highlight */}
              <div 
                className="absolute inset-1 rounded-[14px] pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,255,255,0.01) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.03)'
                }}
              />
              
              <div className="relative py-6 px-4 z-10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 drop-shadow">
                  <ChartBarIcon className="w-5 h-5 text-gray-400" />
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
              <div className="space-y-3">
                {/* Group members in rows of 2 */}
                {Array.from({ length: Math.ceil(groupMembers.length / 2) }, (_, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-2 gap-0">
                    {groupMembers.slice(rowIndex * 2, rowIndex * 2 + 2).map((member, colIndex) => {
                      const progressPercentage = Math.round((member.todayPoints / (member.dailyTarget || 100)) * 100)
                      
                      // Use user's personal color gradient
                      const isCurrentUser = member.id === profile?.id
                      
                      // Use chat background color (gray-900/30) when no progress
                      const backgroundColor = progressPercentage === 0 ? 'bg-gray-900/30' : 'bg-gray-800'
                      
                      // Left member: center to left edge, Right member: center to right edge
                      const isLeftColumn = colIndex === 0
                      const borderRadius = isLeftColumn ? '' : '' // Remove rounded corners
                      
                      return (
                        <div key={member.id} className="relative h-12 bg-gray-900 rounded-full overflow-hidden mx-1">
                          {/* Rounded progress bar background */}
                          <div className="absolute inset-0 bg-gray-800 rounded-full" />
                          
                          {/* Rounded progress fill */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500 ease-out"
                            style={{ 
                              width: `${Math.min(progressPercentage, 100)}%`,
                              background: progressPercentage >= 100 
                                ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
                                : progressPercentage >= 75 
                                  ? 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)'
                                  : progressPercentage > 0
                                    ? 'linear-gradient(90deg, #84cc16 0%, #65a30d 100%)'
                                    : 'transparent'
                            }}
                          />
                          
                          {/* Content overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-sm text-white">
                                {member.isCurrentUser ? 'You' : member.email.split('@')[0]}
                              </span>
                              <div className="font-bold text-base text-white">
                                {progressPercentage}%
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
              </div>
            </div>
          </div>
        </div>

        {/* Chats Section */}
        <div id="chats" className="relative">
          {/* Retro container wrapper */}
          <div className="relative">
            {/* Outer glow */}
            <div 
              className="absolute inset-0 rounded-2xl blur-lg opacity-15"
              style={{
                background: 'linear-gradient(135deg, #111827, #000000)',
                transform: 'scale(1.01)'
              }}
            />
            
            {/* Main container */}
            <div 
              className="relative rounded-2xl border-2 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #111827 0%, #000000 100%)',
                borderImage: 'linear-gradient(135deg, #000000, #111827, #000000) 1',
                boxShadow: `
                  inset 0 1px 0 rgba(255, 255, 255, 0.05),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.3),
                  0 4px 20px rgba(0, 0, 0, 0.5),
                  0 2px 8px rgba(0, 0, 0, 0.3)
                `
              }}
            >
              {/* Inner highlight */}
              <div 
                className="absolute inset-1 rounded-[14px] pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,255,255,0.01) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.03)'
                }}
              />
              
              <div className="relative py-6 px-4 z-10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 drop-shadow">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-400" />
                  Chats
                </h3>
            
            {recentChats.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-gray-400 font-medium text-lg">No recent messages</p>
                <p className="text-gray-500 text-sm mt-2">Start a conversation with your group</p>
              </div>
            ) : (
              <div className="space-y-3 px-4">
                {recentChats.slice(0, 7).map((chat) => {
                  // Check if it's a workout completion message
                  let isWorkoutMessage = false
                  let workoutData = null
                  let displayText = chat.message

                  try {
                    if (chat.message && (chat.message.includes('workout_data') || chat.message.includes('Workout completed!'))) {
                      const parsed = JSON.parse(chat.message)
                      if (parsed.workout_data) {
                        isWorkoutMessage = true
                        workoutData = parsed.workout_data
                        displayText = parsed.text || '🎯 Workout completed!'
                      }
                    }
                  } catch (e) {
                    // If parsing fails, just show the original message
                  }

                  return (
                    <div key={chat.id} className={`px-4 py-3 rounded-2xl ${
                      chat.is_own_message ? 'bg-gray-700' : 'bg-gray-800'
                    } ${isWorkoutMessage ? 'border border-green-500/30' : ''}`}>
                      {isWorkoutMessage && workoutData ? (
                        // Special workout completion display
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-xs">🏆</span>
                              </div>
                              <span className="font-medium text-green-400 text-sm">Workout Completed!</span>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-white">{workoutData.total_points}</div>
                              <div className="text-xs text-gray-400">points</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">
                              {chat.is_own_message ? 'You' : chat.user_email.split('@')[0]} crushed their target
                            </span>
                            <span className="text-gray-500">
                              {formatTimeAgo(chat.created_at)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        // Regular message display  
                        <div className="text-sm text-gray-300">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <span className="font-medium text-white mr-2">
                                {chat.is_own_message ? 'You' : chat.user_email.split('@')[0]}:
                              </span>
                              <span>{displayText}</span>
                            </div>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatTimeAgo(chat.created_at)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
              </div>
            </div>
          </div>
        </div>

        {/* Essential Stats */}
        <div id="group-stats" className="relative">
          {/* Retro container wrapper */}
          <div className="relative">
            {/* Outer glow */}
            <div 
              className="absolute inset-0 rounded-2xl blur-lg opacity-15"
              style={{
                background: 'linear-gradient(135deg, #111827, #000000)',
                transform: 'scale(1.01)'
              }}
            />
            
            {/* Main container */}
            <div 
              className="relative rounded-2xl border-2 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #111827 0%, #000000 100%)',
                borderImage: 'linear-gradient(135deg, #000000, #111827, #000000) 1',
                boxShadow: `
                  inset 0 1px 0 rgba(255, 255, 255, 0.05),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.3),
                  0 4px 20px rgba(0, 0, 0, 0.5),
                  0 2px 8px rgba(0, 0, 0, 0.3)
                `
              }}
            >
              {/* Inner highlight */}
              <div 
                className="absolute inset-1 rounded-[14px] pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,255,255,0.01) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.03)'
                }}
              />
              
              <div className="relative py-6 px-4 z-10">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 drop-shadow">
                    <ChartPieIcon className="w-5 h-5 text-gray-400" />
                    Stats
                  </h3>
              <button
                onClick={() => setShowPersonalStats(!showPersonalStats)}
                className="text-sm px-4 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: showPersonalStats 
                    ? `linear-gradient(135deg, ${profile?.personal_color || '#c084fc'} 0%, #4b5563 100%)`
                    : 'linear-gradient(135deg, rgba(75, 85, 99, 0.3) 0%, rgba(31, 41, 55, 0.3) 100%)',
                  border: `2px solid ${showPersonalStats 
                    ? (profile?.personal_color || '#c084fc') + '40'
                    : 'rgba(156, 163, 175, 0.3)'}`,
                  boxShadow: showPersonalStats 
                    ? `
                      inset 0 1px 0 rgba(255, 255, 255, 0.2),
                      inset 0 -1px 0 rgba(0, 0, 0, 0.1),
                      0 4px 12px rgba(0, 0, 0, 0.4),
                      0 2px 4px ${(profile?.personal_color || '#c084fc')}40
                    `
                    : `
                      inset 0 1px 0 rgba(255, 255, 255, 0.1),
                      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
                      0 2px 8px rgba(0, 0, 0, 0.3)
                    `,
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                  color: showPersonalStats ? '#ffffff' : '#d1d5db'
                }}
              >
                Your Stats
              </button>
            </div>
            
{/* Show either group stats or personal stats based on toggle */}
            {showPersonalStats ? (
              personalStats && personalStats.interestingStats && personalStats.interestingStats.length > 0 ? (
                <div className="space-y-0 border-t border-b border-gray-800">
                  {/* Top row - Personal Points (full width) */}
                  <div className="w-full border-b border-gray-800">
                    <MemoizedChartComponent 
                      key={`personal-${personalStats.interestingStats[0].type}-0`}
                      stat={personalStats.interestingStats[0]} 
                      index={0} 
                      getLayoutClasses={getLayoutClasses}
                      userProfile={profile}
                    />
                  </div>
                  
                  {/* Middle row - Money Pot and Birthday (2 squares) */}
                  <div className="grid grid-cols-2 gap-0 border-b border-gray-800">
                    <div className="border-r border-gray-800">
                      <MemoizedChartComponent 
                        key={`personal-${personalStats.interestingStats[1].type}-1`}
                        stat={personalStats.interestingStats[1]} 
                        index={1} 
                        getLayoutClasses={getLayoutClasses}
                        userProfile={profile}
                      />
                    </div>
                    <MemoizedChartComponent 
                      key={`personal-${personalStats.interestingStats[2].type}-2`}
                      stat={personalStats.interestingStats[2]} 
                      index={2} 
                      getLayoutClasses={getLayoutClasses}
                      userProfile={profile}
                    />
                  </div>
                  
                  {/* Bottom row - Workout Times (full width rectangle) */}
                  <div className="w-full">
                    <MemoizedChartComponent 
                      key={`personal-${personalStats.interestingStats[3].type}-3`}
                      stat={personalStats.interestingStats[3]} 
                      index={3} 
                      getLayoutClasses={getLayoutClasses}
                      userProfile={profile}
                    />
                  </div>
                </div>
              ) : (
                <div className="border-t border-b border-gray-800 p-8 text-center text-gray-400">
                  No personal workout data available
                </div>
              )
            ) : (
              groupStats && groupStats.interestingStats && groupStats.interestingStats.length > 0 ? (
                <div className="space-y-0 border-t border-b border-gray-800">
                  {/* Top row - Group Points (full width) */}
                  <div className="w-full border-b border-gray-800">
                    <MemoizedChartComponent 
                      key={`${groupStats.interestingStats[0].type}-0`}
                      stat={groupStats.interestingStats[0]} 
                      index={0} 
                      getLayoutClasses={getLayoutClasses}
                      userProfile={profile}
                    />
                  </div>
                  
                  {/* Middle row - Money Pot and Birthday (2 squares) */}
                  <div className="grid grid-cols-2 gap-0 border-b border-gray-800">
                    <div className="border-r border-gray-800">
                      <MemoizedChartComponent 
                        key={`${groupStats.interestingStats[1].type}-1`}
                        stat={groupStats.interestingStats[1]} 
                        index={1} 
                        getLayoutClasses={getLayoutClasses}
                        userProfile={profile}
                      />
                    </div>
                    <MemoizedChartComponent 
                      key={`${groupStats.interestingStats[2].type}-2`}
                      stat={groupStats.interestingStats[2]} 
                      index={2} 
                      getLayoutClasses={getLayoutClasses}
                      userProfile={profile}
                    />
                  </div>
                  
                  {/* Bottom row - Workout Times (full width rectangle) */}
                  <div className="w-full">
                    <MemoizedChartComponent 
                      key={`${groupStats.interestingStats[3].type}-3`}
                      stat={groupStats.interestingStats[3]} 
                      index={3} 
                      getLayoutClasses={getLayoutClasses}
                      userProfile={profile}
                    />
                  </div>
                </div>
            ) : (
              <div className="space-y-0">
                <div className="p-4 bg-gray-900/30 rounded-lg h-32">
                  <div className="animate-pulse bg-gray-800 h-4 mb-3 rounded w-24"></div>
                  <div className="animate-pulse bg-gray-700 h-8 mb-2 rounded w-16"></div>
                  <div className="animate-pulse bg-gray-600 h-3 rounded w-20"></div>
                </div>
                <div className="grid grid-cols-2 gap-0">
                  <div className="p-4 bg-gray-900/30 rounded-lg h-32">
                    <div className="animate-pulse bg-gray-800 h-4 mb-3 rounded w-24"></div>
                    <div className="animate-pulse bg-gray-700 h-8 mb-2 rounded w-16"></div>
                    <div className="animate-pulse bg-gray-600 h-3 rounded w-20"></div>
                  </div>
                  <div className="p-4 bg-gray-900/30 rounded-lg h-32">
                    <div className="animate-pulse bg-gray-800 h-4 mb-3 rounded w-24"></div>
                    <div className="animate-pulse bg-gray-700 h-8 mb-2 rounded w-16"></div>
                    <div className="animate-pulse bg-gray-600 h-3 rounded w-20"></div>
                  </div>
                </div>
                <div className="p-4 bg-gray-900/30 rounded-lg h-20">
                  <div className="animate-pulse bg-gray-800 h-4 mb-3 rounded w-24"></div>
                  <div className="animate-pulse bg-gray-700 h-8 mb-2 rounded w-16"></div>
                  <div className="animate-pulse bg-gray-600 h-3 rounded w-20"></div>
                </div>
              </div>
            )
            )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
