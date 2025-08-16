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
import LoadingSpinner from '@/components/shared/LoadingSpinner'

// Helper function to get motivational messages - 4 quotes per hour that cycle
const getHourlyMessage = (hour: number): { quote: string, author: string } => {
  const allMessages = [
    // 12 AM - 1 AM
    { quote: "I'LL BE BACK... after this midnight workout, because I NEVER STOP!", author: "Arnold Schwarzenegger" },
    { quote: "Sleep is for people who skipped the gym.", author: "Ron Burgundy" },
    { quote: "I'm a rider... even at 1 AM.", author: "Zanger Rinus" },
    { quote: "Your dreams can wait, your gains can't.", author: "Arnold Schwarzenegger" },
    
    // 1 AM - 2 AM
    { quote: "If it's quiet, your grunts will echo.", author: "Will Ferrell" },
    { quote: "Leg day at 1 AM. Because why not scare the janitor?", author: "Rocky Balboa" },
    { quote: "The gym lights at 1 AM hit different when you're this dedicated.", author: "Terry Crews" },
    { quote: "This is the hour legends are made… and sleep-deprived.", author: "Muhammad Ali" },
    
    // 2 AM - 3 AM
    { quote: "Push till your shadow leaves.", author: "David Hasselhoff" },
    { quote: "You said you'd start tomorrow. Welcome to tomorrow.", author: "Dwayne Johnson" },
    { quote: "One more set while the world sleeps. That's how champions are built.", author: "Arnold Schwarzenegger" },
    { quote: "The weights don't judge, but I do.", author: "Gordon Ramsay" },
    
    // 3 AM - 4 AM
    { quote: "Your pillow is for the weak.", author: "Scooter" },
    { quote: "If you're here at 3 AM, you're either insane or unstoppable.", author: "Terry Crews" },
    { quote: "3 AM is when the weak go to bed and the strong get started.", author: "Ron Burgundy" },
    { quote: "Train like the sun is watching.", author: "Muhammad Ali" },
    
    // 4 AM - 5 AM
    { quote: "Only ghosts and gains live here.", author: "Ron Burgundy" },
    { quote: "Beat the sunrise, own the day.", author: "Rocky Balboa" },
    { quote: "Starting the day with push-ups while others start with excuses.", author: "Michael Scott" },
    { quote: "Your competition is still asleep.", author: "Arnold Schwarzenegger" },
    
    // 5 AM - 6 AM
    { quote: "HYPER HYPER! THE DAY IS YOURS!", author: "Scooter" },
    { quote: "The early set catches the glory.", author: "Dwayne Johnson" },
    { quote: "5 AM workouts separate the legends from the wannabes.", author: "Terry Crews" },
    { quote: "If you're lifting now, you've already won.", author: "Muhammad Ali" },
    
    // 6 AM - 7 AM
    { quote: "One last set before breakfast destroys your abs.", author: "Gordon Ramsay" },
    { quote: "Do. Or do not. At sunrise, there is no excuse.", author: "Arnold Schwarzenegger" },
    { quote: "You miss 100% of the morning push-ups… enjoy your printer-ink body.", author: "Michael Scott" },
    { quote: "Sweat at sunrise is just liquid victory leaking out.", author: "Will Ferrell" },
    
    // 7 AM - 8 AM
    { quote: "If you want results, wake up before the excuses do.", author: "Muhammad Ali" },
    { quote: "Run like you stole breakfast from Gordon Ramsay's kitchen.", author: "Gordon Ramsay" },
    { quote: "Rise and shine, champ — even my grandma ran faster… and she's been gone for ten years.", author: "Rocky Balboa" },
    { quote: "Real champions do push-ups in the rain while others find excuses.", author: "David Hasselhoff" },
    
    // 8 AM - 9 AM
    { quote: "No traffic at this hour — except for you, sprinting past your limits.", author: "Usain Bolt" },
    { quote: "Bench press like you're proving something to your ex's new boyfriend.", author: "Ron Burgundy" },
    { quote: "HYPER HYPER! FASTER HARDER STRONGER — YOUR BOSS CAN WAIT!", author: "Scooter" },
    { quote: "If you can lift it before 9, you own the whole day.", author: "Arnold Schwarzenegger" },
    
    // 9 AM - 10 AM
    { quote: "Push now, type later. The laptop isn't going anywhere.", author: "Dwayne Johnson" },
    { quote: "Don't just sit there — chair dips won't break your Zoom connection.", author: "Will Ferrell" },
    { quote: "Squats at 9 AM? Your desk chair is already jealous.", author: "Gordon Ramsay" },
    { quote: "Make the printer jealous. It's the only thing here working as hard as you.", author: "Michael Scott" },
    
    // 10 AM - 11 AM
    { quote: "Flex break! Show the interns what real gains look like.", author: "Terry Crews" },
    { quote: "Hydrate like you're about to arm-wrestle Poseidon.", author: "Jason Momoa" },
    { quote: "Punch the bag like it owes you lunch money.", author: "Rocky Balboa" },
    { quote: "If the dumbbell feels heavy, remember — it's lighter than regret.", author: "Arnold Schwarzenegger" },
    
    // 11 AM - 12 PM
    { quote: "This isn't a coffee break, it's a gains break.", author: "Arnold Schwarzenegger" },
    { quote: "Go hard now so you can eat like a king at noon.", author: "Dwayne Johnson" },
    { quote: "Your arms should be shaking harder than the office coffee machine.", author: "Will Ferrell" },
    { quote: "Lunch is earned, not deserved. Keep pushing.", author: "Terry Crews" },
    
    // 12 PM - 1 PM
    { quote: "If you're not sweating, you're just rearranging furniture.", author: "Gordon Ramsay" },
    { quote: "Do curls until your fork feels like a dumbbell.", author: "Ron Burgundy" },
    { quote: "Lunch tastes better after lunges.", author: "Michael Scott" },
    { quote: "Even my salad has more crunch than your core.", author: "Gordon Ramsay" },
    
    // 1 PM - 2 PM
    { quote: "Cycle toward gains, not toward the snack bar.", author: "David Hasselhoff" },
    { quote: "Stand up. Squat. Scare your coworkers.", author: "Will Ferrell" },
    { quote: "Push-ups at 1 PM — because coffee only wakes the mind, not the body.", author: "Rocky Balboa" },
    { quote: "Afternoon workouts hit different when everyone else is food-coma'd.", author: "Terry Crews" },
    
    // 2 PM - 3 PM
    { quote: "If you're not working out, you're working on your excuses.", author: "Arnold Schwarzenegger" },
    { quote: "Wake up those legs before your brain falls asleep.", author: "Dwayne Johnson" },
    { quote: "If your posture drops, so does your reputation.", author: "Ron Burgundy" },
    { quote: "Training, laughing, living while others sit behind desks.", author: "Scooter" },
    
    // 3 PM - 4 PM
    { quote: "No meeting will pump you up like this set will.", author: "Terry Crews" },
    { quote: "Lift now, so you don't lift regrets later.", author: "Muhammad Ali" },
    { quote: "Do it for the pump… and for that mirror selfie at 4 PM.", author: "Arnold Schwarzenegger" },
    { quote: "Green light means go harder, not go home.", author: "Scooter" },
    
    // 4 PM - 5 PM
    { quote: "If you can still text during the set, add weight.", author: "Gordon Ramsay" },
    { quote: "Punch out of work, punch into the gym.", author: "Rocky Balboa" },
    { quote: "Your commute home is the cooldown. No skipping the main set.", author: "Dwayne Johnson" },
    { quote: "Ik trek mijn sportpak aan, jij je jas. We weten wie wint.", author: "Zanger Rinus" },
    
    // 5 PM - 6 PM
    { quote: "If you don't sweat now, you'll cry later.", author: "Scooter" },
    { quote: "This is the real happy hour.", author: "Will Ferrell" },
    { quote: "Load the bar like you load your plate — with ambition.", author: "Arnold Schwarzenegger" },
    { quote: "Tomorrow's soreness is today's evidence of greatness.", author: "Muhammad Ali" },
    
    // 6 PM - 7 PM
    { quote: "If you leave now, you're only cheating yourself.", author: "Muhammad Ali" },
    { quote: "Lift like your dinner depends on it.", author: "Gordon Ramsay" },
    { quote: "Train like you're about to run through a wall.", author: "Rocky Balboa" },
    { quote: "Running, laughing, singing, and winning. That's the formula.", author: "Will Ferrell" },
    
    // 7 PM - 8 PM
    { quote: "Every rep now is one less excuse later.", author: "Dwayne Johnson" },
    { quote: "The day isn't over until your muscles say so.", author: "Terry Crews" },
    { quote: "Sweat more now, shine more later.", author: "Arnold Schwarzenegger" },
    { quote: "Sunset runs hit different when you're chasing your dreams.", author: "Ron Burgundy" },
    
    // 8 PM - 9 PM
    { quote: "If your shirt is dry, you haven't worked out.", author: "Scooter" },
    { quote: "Don't go to bed. The bed is for cowards.", author: "David Hasselhoff" },
    { quote: "If you can still walk after leg day… you didn't do leg day.", author: "Rocky Balboa" },
    { quote: "Ik spring, ik stoot, ik scoor.", author: "Zanger Rinus" },
    
    // 9 PM - 10 PM
    { quote: "Your couch is whispering. Ignore it.", author: "Ron Burgundy" },
    { quote: "Champions finish when others Netflix.", author: "Dwayne Johnson" },
    { quote: "HYPER HYPER! NIGHT TIME IS LIFT TIME!", author: "Scooter" },
    { quote: "The night is dark, but your determination burns bright.", author: "Will Ferrell" },
    
    // 10 PM - 11 PM
    { quote: "Push harder — the world isn't watching, but you are.", author: "Muhammad Ali" },
    { quote: "If you're still here, you're already winning.", author: "Terry Crews" },
    { quote: "Train now, sleep like royalty.", author: "Arnold Schwarzenegger" },
    { quote: "Ik doe nog een rondje… jij doet nog een excuus.", author: "Zanger Rinus" },
    
    // 11 PM - 12 AM
    { quote: "One more set. Your bed will forgive you.", author: "Will Ferrell" },
    { quote: "The iron doesn't care what time it is.", author: "Dwayne Johnson" },
    { quote: "If you lift at midnight, you own tomorrow.", author: "Rocky Balboa" },
    { quote: "This late-night dedication deserves a medal for persistence.", author: "David Hasselhoff" }
  ]
  
  // Get 4 messages for the current hour, cycling through them based on minutes
  const baseIndex = hour * 4
  const minute = new Date().getMinutes()
  const cycleIndex = Math.floor(minute / 15) // Change every 15 minutes
  const messageIndex = (baseIndex + cycleIndex) % allMessages.length
  
  return allMessages[messageIndex] || allMessages[0]
}

// Helper function to get achievement messages - 2 quotes per hour that cycle every 30 minutes
const getTargetAchievedMessage = (hour: number): { quote: string, author: string } => {
  const achievementMessages = [
    // 12 AM - 1 AM
    { quote: "Day over. Gains secured. Now rest.", author: "Dwayne Johnson" },
    { quote: "You've already ridden this day to victory.", author: "David Hasselhoff" },
    
    // 1 AM - 2 AM
    { quote: "Victory at 1 AM. Now go dream about how great you are.", author: "Muhammad Ali" },
    { quote: "Today is pure white from the rest you've earned.", author: "Ron Burgundy" },
    
    // 2 AM - 3 AM
    { quote: "All done. The rest of the night is yours.", author: "Ron Burgundy" },
    { quote: "The music keeps playing, but you can finally chill.", author: "Terry Crews" },
    
    // 3 AM - 4 AM
    { quote: "Mission complete. Time to haunt the fridge.", author: "Terry Crews" },
    { quote: "The day may be gray, but your victory is crystal clear.", author: "Muhammad Ali" },
    
    // 4 AM - 5 AM
    { quote: "Goal hit before sunrise. Go watch everyone else wake up.", author: "Rocky Balboa" },
    { quote: "Started the day with victory, now you can rest like a champion.", author: "Ron Burgundy" },
    
    // 5 AM - 6 AM
    { quote: "Done before dawn. You're officially a superhero.", author: "Arnold Schwarzenegger" },
    { quote: "Golden achievement unlocked. You're officially done for the day.", author: "Terry Crews" },
    
    // 6 AM - 7 AM
    { quote: "Target smashed before sunrise. You may now return to being a legend.", author: "Dwayne Johnson" },
    { quote: "Mission complete. You don't need to prove anything else today.", author: "Will Ferrell" },
    
    // 7 AM - 8 AM
    { quote: "Mission accomplished. Go eat breakfast like a king.", author: "Michael Scott" },
    { quote: "You've crossed the finish line while others are still hitting snooze.", author: "David Hasselhoff" },
    
    // 8 AM - 9 AM
    { quote: "All goals crushed. Clock out, champ.", author: "Scooter" },
    { quote: "You've already won the day. Anything else is just showing off.", author: "Ron Burgundy" },
    
    // 9 AM - 10 AM
    { quote: "Green light for rest - you've earned every minute.", author: "Arnold Schwarzenegger" },
    { quote: "You're done. Take the rest of the day off from being this awesome.", author: "Arnold Schwarzenegger" },
    
    // 10 AM - 11 AM
    { quote: "Workout complete. Now hydrate and brag.", author: "Will Ferrell" },
    { quote: "One song, one set, and you're already victorious.", author: "Scooter" },
    
    // 11 AM - 12 PM
    { quote: "Mission complete. Go eat like you just conquered Rome.", author: "Gordon Ramsay" },
    { quote: "You're glowing with victory. Literally radiating success.", author: "Ron Burgundy" },
    
    // 12 PM - 1 PM
    { quote: "Lunchtime and you're already done. Enjoy being superior.", author: "Terry Crews" },
    { quote: "While others cycle to lunch, you're cycling toward your trophy.", author: "Michael Scott" },
    
    // 1 PM - 2 PM
    { quote: "Target met. You are officially excused from all future effort today.", author: "Dwayne Johnson" },
    { quote: "Victory achieved. You can lean back and enjoy the view.", author: "Arnold Schwarzenegger" },
    
    // 2 PM - 3 PM
    { quote: "Crushed it. Go relax while the mortals sweat.", author: "Muhammad Ali" },
    { quote: "Trained hard, laughed harder. Now you get to chill.", author: "Will Ferrell" },
    
    // 3 PM - 4 PM
    { quote: "Achievement unlocked. Rest mode engaged.", author: "Rocky Balboa" },
    { quote: "Orange you glad you're done? No more steps required.", author: "Terry Crews" },
    
    // 4 PM - 5 PM
    { quote: "You're finished. Go home, flex once, and sit down.", author: "Ron Burgundy" },
    { quote: "Ik trek mijn sportpak uit… want jij bent klaar.", author: "Zanger Rinus" },
    
    // 5 PM - 6 PM
    { quote: "Victory hour. The gym misses you already.", author: "Will Ferrell" },
    { quote: "Royal purple throne awaits after this victory.", author: "Gordon Ramsay" },
    
    // 6 PM - 7 PM
    { quote: "Done and dusted. Pass the carbs.", author: "Gordon Ramsay" },
    { quote: "Ran hard, sang loud, now you can relax loud.", author: "David Hasselhoff" },
    
    // 7 PM - 8 PM
    { quote: "Day's work is over. Time to strut.", author: "Terry Crews" },
    { quote: "Today's gold medal is already in your pocket.", author: "Muhammad Ali" },
    
    // 8 PM - 9 PM
    { quote: "Workout complete. Couch mode activated.", author: "David Hasselhoff" },
    { quote: "Ik spring… maar jij hoeft niks meer te doen.", author: "Zanger Rinus" },
    
    // 9 PM - 10 PM
    { quote: "You're done. Everyone else is just late to the party.", author: "Rocky Balboa" },
    { quote: "The day may be dark, but you rest as a champion.", author: "Rocky Balboa" },
    
    // 10 PM - 11 PM
    { quote: "Day finished. Put the dumbbells to bed.", author: "Arnold Schwarzenegger" },
    { quote: "Ik doe nog een rondje… maar jij mag stoppen.", author: "Zanger Rinus" },
    
    // 11 PM - 12 AM
    { quote: "You closed the day with a win. Sleep like royalty.", author: "Scooter" },
    { quote: "Silver lining complete. Tomorrow you prove nothing because today you proved everything.", author: "Gordon Ramsay" }
  ]
  
  // Get 2 messages for the current hour, cycling through them based on minutes (every 30 minutes)
  const baseIndex = hour * 2
  const minute = new Date().getMinutes()
  const cycleIndex = Math.floor(minute / 30) // Change every 30 minutes
  const messageIndex = (baseIndex + cycleIndex) % achievementMessages.length
  
  return achievementMessages[messageIndex] || achievementMessages[0]
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
  
  const today = new Date().toISOString().split('T')[0]
  const groupStartTime = new Date(groupStartDate).getTime()
  
  // Get all dates from logs, but exclude today if no workout yet (to avoid breaking active streaks)
  const workoutDates = Object.keys(dailyPoints)
  const hasWorkedOutToday = dailyPoints[today] > 0
  
  // Sort dates in descending order (most recent first), excluding today if no workout
  const sortedDates = workoutDates
    .filter(date => date !== today || hasWorkedOutToday)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  
  let streak = 0
  
  for (const date of sortedDates) {
    const currentDate = new Date(date)
    const daysSinceStart = Math.floor((currentDate.getTime() - groupStartTime) / (1000 * 60 * 60 * 24))
    const dayOfWeek = currentDate.getDay()
    
    // Skip rest days and recovery days - they don't count toward or break insane streaks
    if (restDays.includes(dayOfWeek) || recoveryDays.includes(dayOfWeek)) {
      continue // Skip this day, don't break or count the streak
    }
    
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

// Calculate longest streak a user has ever had
const calculateLongestStreak = (logs: any[], groupStartDate: string, restDays: number[], recoveryDays: number[]) => {
  if (!logs || logs.length === 0) return 0

  // Group logs by date and sum points for each day
  const dailyPoints = logs.reduce((acc, log) => {
    acc[log.date] = (acc[log.date] || 0) + log.points
    return acc
  }, {} as Record<string, number>)

  // Get all dates and sort chronologically (oldest first for longest streak calculation)
  const sortedDates = Object.keys(dailyPoints).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  
  let maxStreak = 0
  let currentStreak = 0
  const groupStartTime = new Date(groupStartDate).getTime()

  for (const date of sortedDates) {
    const currentDate = new Date(date)
    const daysSinceStart = Math.floor((currentDate.getTime() - groupStartTime) / (1000 * 60 * 60 * 24))
    const dayOfWeek = currentDate.getDay()

    // Skip rest days and recovery days - they don't count toward or break insane streaks
    if (restDays.includes(dayOfWeek) || recoveryDays.includes(dayOfWeek)) {
      continue // Skip this day, don't break or count the streak
    }

    // Calculate insane target for this day
    const insaneTarget = calculateDailyTarget({
      daysSinceStart,
      restDays,
      recoveryDays,
      currentDayOfWeek: dayOfWeek
    })

    // Check if they met the insane target this day
    if (dailyPoints[date] >= insaneTarget) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 0 // Reset streak
    }
  }

  return maxStreak
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
const ChartComponent = ({ stat, index, getLayoutClasses, userProfile, daysSinceDonation, insaneStreak, personalLongestInsaneStreak }: { 
  stat: any, 
  index: number, 
  getLayoutClasses: (blockType: string) => string, 
  userProfile: any,
  daysSinceDonation?: number,
  insaneStreak?: number,
  personalLongestInsaneStreak?: number
}) => {
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

  // Pot Contributors - Vertical list showing pot total and individual contributions
  if (stat.type === 'pot_contributors') {
    const contributors = stat.contributors || []
    const bgColor = 'bg-gray-900/30'
    
    return (
      <div key={index} className={`relative ${bgColor} rounded-lg ${layoutClasses} overflow-hidden`}>
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="mb-2">
            <div className="text-xs text-white uppercase tracking-wide mb-1">{stat.title}</div>
            <div className="text-2xl font-black text-white leading-none mb-1">
              €{stat.value}
            </div>
          </div>
          
          {/* Contributors List */}
          <div className="flex-1 flex flex-col gap-1">
            {contributors.map((contributor: any, i: number) => (
              <div key={i} className="flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white font-medium truncate">
                    {contributor.name}
                  </div>
                  <div className="text-xs text-gray-300 font-bold">
                    €{contributor.amount}
                  </div>
                </div>
                {contributor.timeAgo && (
                  <div className={`text-xs flex items-center gap-1 ${
                    contributor.isMostRecent 
                      ? `text-${contributor.userColor}-400` 
                      : 'text-gray-400'
                  }`}>
                    <span>{contributor.timeAgo}</span>
                  </div>
                )}
              </div>
            ))}
            {contributors.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                No contributions yet
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Streak Progress - Dual section design with progress fill backgrounds like birthday component
  if (stat.type === 'streak_progress') {
    // Read directly from state variables (single source of truth)
    const commitmentDays = daysSinceDonation || 0
    const insaneDays = insaneStreak || 0
    const longestRecord = personalLongestInsaneStreak || 0
    
    // Calculate progress percentages for background fills
    // If on a record (current = longest), fill 100%. Otherwise, show progress toward record.
    const commitmentProgress = commitmentDays >= 44 ? 100 : Math.min((commitmentDays / 44) * 100, 100)
    const insaneProgress = insaneDays >= longestRecord && longestRecord > 0 ? 100 : 
                          longestRecord > 0 ? Math.min((insaneDays / longestRecord) * 100, 100) : 
                          insaneDays > 0 ? 50 : 0 // Show some progress if they have days but no record yet
    
    // Check for new records
    const isCommitmentNewRecord = commitmentDays >= 44
    const isInsaneNewRecord = insaneDays >= longestRecord && longestRecord > 0
    
    return (
      <div key={index} className={`relative rounded-lg ${layoutClasses} overflow-hidden`}>
        {/* Top Section - Commitment Streak */}
        <div className="relative h-1/2 overflow-hidden bg-gray-900/30">
          {/* Progress fill background */}
          <div 
            className="absolute left-0 top-0 bottom-0 transition-all duration-1000 ease-out"
            style={{ 
              background: getGradientStyle('bg-orange-400', 'organic'),
              width: `${commitmentProgress}%`,
              borderTopLeftRadius: '12px'
            }}
          />
          
          {/* Content */}
          <div className="relative p-3 h-full flex flex-col">
            <div className="text-xs text-white/90 uppercase tracking-wider font-bold mb-1">
              COMMITMENT STREAK
            </div>
            <div className="flex-1 flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <div className="text-4xl font-black text-white leading-none">
                  {commitmentDays}
                </div>
                <div className="text-white text-sm font-light mb-1">days</div>
              </div>
              <div className="text-right mb-1">
                {isCommitmentNewRecord ? (
                  <div className="flex items-center gap-1 justify-end mb-1">
                    <span className="text-yellow-300">🔥</span>
                    <span className="text-white text-xs font-bold">NEW</span>
                  </div>
                ) : (
                  <div className="text-white/70 text-xs">RECORD</div>
                )}
                <div className="text-white text-base font-bold">44</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Section - Insane Streak */}
        <div className="relative h-1/2 overflow-hidden bg-gray-900/30">
          {/* Progress fill background */}
          <div 
            className="absolute left-0 top-0 bottom-0 transition-all duration-1000 ease-out"
            style={{ 
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
              width: `${insaneProgress}%`,
              borderBottomLeftRadius: '12px'
            }}
          />
          
          {/* Content */}
          <div className="relative p-3 h-full flex flex-col">
            <div className="text-xs text-white/90 uppercase tracking-wider font-bold mb-1">
              INSANE STREAK
            </div>
            <div className="flex-1 flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <div className="text-4xl font-black text-white leading-none">
                  {insaneDays}
                </div>
                <div className="text-white text-sm font-light mb-1">days</div>
              </div>
              <div className="text-right mb-1">
                {isInsaneNewRecord && (
                  <div className="flex items-center gap-1 justify-end mb-1">
                    <span className="text-yellow-300">🔥</span>
                    <span className="text-white text-xs font-bold">NEW</span>
                  </div>
                )}
                <div className="text-white text-xs font-bold">
                  {isInsaneNewRecord ? 'RECORD!' : `RECORD: ${longestRecord}`}
                </div>
              </div>
            </div>
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

const MemoizedChartComponent = memo(({ stat, index, getLayoutClasses, userProfile, onClick, isPersonalMode, hasPersonalData, daysSinceDonation, insaneStreak, personalLongestInsaneStreak }: {
  stat: any,
  index: number,
  getLayoutClasses: (blockType: string) => string,
  userProfile: any,
  onClick?: () => void,
  isPersonalMode?: boolean,
  hasPersonalData?: boolean,
  daysSinceDonation?: number,
  insaneStreak?: number,
  personalLongestInsaneStreak?: number
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
        daysSinceDonation={daysSinceDonation}
        insaneStreak={insaneStreak}
        personalLongestInsaneStreak={personalLongestInsaneStreak}
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
  const [individualStatsMode, setIndividualStatsMode] = useState<{[key: number]: boolean}>({0: false, 1: false, 2: false, 3: false, 4: false})
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())
  const [isAnimationLoaded, setIsAnimationLoaded] = useState(false)
  const [daysSinceDonation, setDaysSinceDonation] = useState<number>(0)
  const [insaneStreak, setInsaneStreak] = useState<number>(0)
  const [personalLongestInsaneStreak, setPersonalLongestInsaneStreak] = useState<number>(0)

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

  // Prevent multiple personal data loads with session-based flag
  const personalDataLoadedRef = useRef(false)

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
      
      // Try to load online status if columns exist
      try {
        const { data: onlineStatus, error: onlineError } = await supabase
          .from('profiles')
          .select('id, is_online, last_seen')
          .eq('group_id', profile.group_id)
        
        if (!onlineError && onlineStatus) {
          // Add online status to members
          membersWithProgress.forEach(member => {
            const status = onlineStatus.find(s => s.id === member.id)
            if (status) {
              member.is_online = status.is_online
              member.last_seen = status.last_seen
            }
          })
        }
      } catch (onlineError) {
        console.log('Online status columns not available yet, skipping:', onlineError)
        // Continue without online status - this is expected if columns don't exist
      }

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

      // 2. Money Pot - load group transaction data (both penalties and payments)
      const { data: groupTransactions, error: transactionError } = await supabase
        .from('payment_transactions')
        .select('amount, user_id, transaction_type, created_at, profiles!inner(username)')
        .eq('group_id', profile.group_id)
        .in('transaction_type', ['penalty', 'payment'])
        .order('created_at', { ascending: false })

      if (transactionError) {
        console.error('Error loading group transactions:', transactionError)
      }

      // Calculate net amounts (penalties - payments) per user
      const userNetAmountMap = new Map()
      groupTransactions?.forEach(transaction => {
        const userId = transaction.user_id
        const amount = transaction.transaction_type === 'penalty' ? transaction.amount : -transaction.amount
        userNetAmountMap.set(userId, (userNetAmountMap.get(userId) || 0) + amount)
      })
      
      // Calculate total pot amount (sum of all positive net amounts)
      const totalPotAmount = Array.from(userNetAmountMap.values())
        .filter(amount => amount > 0)
        .reduce((sum, amount) => sum + amount, 0)
      
      // Find biggest net contributor
      let biggestContributor = 'No contributions yet'
      let maxNetAmount = 0
      userNetAmountMap.forEach((netAmount, userId) => {
        if (netAmount > maxNetAmount) {
          maxNetAmount = netAmount
          const transaction = groupTransactions?.find(t => t.user_id === userId)
          biggestContributor = transaction?.profiles?.username || 'User'
        }
      })

      // 3. Pot Contributors - detailed data for the new component (reuse the same transaction data)
      let contributors = []
      if (groupTransactions && !transactionError) {
        // Get user colors for styling
        const userColorsMap = new Map()
        const userIds = [...new Set(groupTransactions.map(t => t.user_id))]
        if (userIds.length > 0) {
          const { data: userProfiles } = await supabase
            .from('profiles')
            .select('id, personal_color')
            .in('id', userIds)
          
          userProfiles?.forEach(user => {
            userColorsMap.set(user.id, user.personal_color || 'gray')
          })
        }

        // Aggregate by user and find most recent transaction for each
        const userContributions = new Map()
        groupTransactions.forEach(transaction => {
          const userId = transaction.user_id
          const username = transaction.profiles?.username || 'User'
          const userColor = userColorsMap.get(userId) || 'gray'
          if (!userContributions.has(userId)) {
            userContributions.set(userId, {
              name: username,
              netAmount: 0,
              latestDate: new Date(transaction.created_at),
              userId: userId,
              userColor: userColor
            })
          }
          const existing = userContributions.get(userId)
          const amount = transaction.transaction_type === 'penalty' ? transaction.amount : -transaction.amount
          existing.netAmount += amount
          if (new Date(transaction.created_at) > existing.latestDate) {
            existing.latestDate = new Date(transaction.created_at)
          }
        })

        // Convert to array, filter positive amounts, and sort by amount (highest first)
        const positiveContributors = Array.from(userContributions.values())
          .filter(contributor => contributor.netAmount > 0) // Only show users who owe money
          .sort((a, b) => b.netAmount - a.netAmount)

        // Find the most recent transaction date among all contributors
        const mostRecentDate = positiveContributors.length > 0 
          ? Math.max(...positiveContributors.map(c => c.latestDate.getTime()))
          : 0

        contributors = positiveContributors.map((contributor, index) => {
          const now = new Date()
          const diffTime = now.getTime() - contributor.latestDate.getTime()
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
          const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
          
          let timeAgo = ''
          if (diffDays > 0) {
            timeAgo = `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
          } else if (diffHours > 0) {
            timeAgo = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
          } else {
            timeAgo = 'Just now'
          }

          // Mark as most recent (newest contributor)
          const isMostRecent = contributor.latestDate.getTime() === mostRecentDate

          return {
            name: contributor.name,
            amount: Math.round(contributor.netAmount),
            timeAgo: timeAgo,
            userColor: contributor.userColor,
            isMostRecent: isMostRecent
          }
        })
      }

      // 4. Next Birthday in Group - find the next upcoming birthday
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

      // 5. Streak Progress - Calculate current and longest streaks
      // First get all user logs for streak calculation (not just 30 days)
      const { data: allUserLogs } = await supabase
        .from('logs')
        .select('date, points')
        .in('user_id', memberIds)

      // Get the actual group start date for streak calculations
      const { data: groupData } = await supabase
        .from('groups')
        .select('start_date')
        .eq('id', profile.group_id)
        .single()

      const groupStartDate = groupData?.start_date || today

      // Calculate group-wide current streak (using recent data from past 30 days)
      const currentStreak = calculateInsaneStreak(
        logs || [], 
        groupStartDate, 
        [1], // Default rest days
        [5]  // Default recovery days  
      )

      // Calculate group-wide longest streak ever
      const longestStreak = calculateLongestStreak(
        allUserLogs || [],
        groupStartDate,
        [1], // Default rest days
        [5]  // Default recovery days
      )

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
          value: Math.max(0, Math.round(totalPotAmount)),
          type: 'typography_stat'
        },
        potContributors: {
          title: 'Pot Contributors',
          value: Math.max(0, Math.round(totalPotAmount)),
          contributors: contributors,
          type: 'pot_contributors'
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
        },
        streakProgress: {
          title: 'Streak Progress',
          currentStreak: currentStreak,
          longestStreak: longestStreak,
          commitmentDays: 0, // Will be updated by personal data only
          insaneDays: 0, // Will be updated by personal data only
          type: 'streak_progress'
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
            { ...stats.potContributors, layout: 'vertical' }, // Vertical 1:2 pot contributors
            { ...stats.birthday, layout: 'square' },        // Birthday square
            { ...stats.streakProgress, layout: 'square' },  // Streak square (new!)
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

      // 2. Personal Money Pot (your net contribution)
      const { data: userTransactions, error: userTransactionError } = await supabase
        .from('payment_transactions')
        .select('amount, transaction_type')
        .eq('user_id', user.id)
        .in('transaction_type', ['penalty', 'payment'])

      if (userTransactionError) {
        console.error('Error loading user transactions:', userTransactionError)
      }

      // Calculate net contribution (penalties - payments)
      const personalPenalties = userTransactions?.filter(t => t.transaction_type === 'penalty').reduce((sum, t) => sum + t.amount, 0) || 0
      const personalPayments = userTransactions?.filter(t => t.transaction_type === 'payment').reduce((sum, t) => sum + t.amount, 0) || 0
      const personalMoneyContribution = Math.max(0, personalPenalties - personalPayments)

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
            title: 'Your Contributions',
            value: Math.max(0, Math.round(personalMoneyContribution)),
            contributors: [
              {
                name: profile?.username || 'You',
                amount: Math.max(0, Math.round(personalMoneyContribution)),
                timeAgo: personalMoneyContribution > 0 ? 'Total to date' : '',
                isNew: false
              }
            ],
            type: 'pot_contributors',
            layout: 'vertical' // Vertical 1:2 rectangle
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
            title: 'Your Streaks',
            subtitle: 'commitment progress',
            commitmentDays: daysSinceDonation || 0,
            insaneDays: insaneStreak || 0,
            longestRecord: personalLongestInsaneStreak || 0,
            type: 'streak_progress',
            layout: 'square' // Square layout to match group stats
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

      // Load donation tracking and insane streak data (only once per session)
      if (!personalDataLoadedRef.current) {
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
          
          // Also calculate personal longest streak for the record
          // Get ALL user logs (not just 30 days) for longest streak calculation
          const { data: allPersonalLogs } = await supabase
            .from('logs')
            .select('date, points')
            .eq('user_id', user.id)
          
          const personalLongestStreak = calculateLongestStreak(
            allPersonalLogs || [],
            currentGroupData.start_date,
            restDays,
            recoveryDays
          )
          
          setPersonalLongestInsaneStreak(personalLongestStreak)
          
          // Mark personal data as loaded to prevent multiple loads
          personalDataLoadedRef.current = true
        } else {
          setInsaneStreak(0)
          setPersonalLongestInsaneStreak(0)
          personalDataLoadedRef.current = true
        }
        } catch (error) {
          console.log('Could not load donation/streak data:', error)
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
      <div className="min-h-screen bg-black text-white">
        <LoadingSpinner branded={true} fullScreen={true} message="Loading dashboard..." />
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
      
      <div className="pb-20" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Logo and Quote Box */}
      <div className="mx-1 mb-0">
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
          <div className="mx-1 mb-1 space-y-0">
            {/* DAY Block - Background removed, content left-aligned, "Day" moved above number */}
            <div className="relative">
              {/* DAY Content - No background block */}
              <div className="py-2 px-4 text-left">
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
            <div className="mx-1 my-2">
              <div className="px-6 py-2">
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
              <div className="grid grid-cols-4 gap-3 py-4 px-1">
                {groupMembers.map((member) => {
                  const progressPercentage = Math.round((member.todayPoints / (member.dailyTarget || 100)) * 100)
                  const shouldGlow = progressPercentage > 110
                  const baseColor = member.personal_color || "#ef4444"
                  
                  // Calculate progressive glow intensity based on percentage
                  const getGlowIntensity = () => {
                    if (progressPercentage <= 110) return 0
                    const excessPercentage = progressPercentage - 110
                    const glowLevel = Math.floor(excessPercentage / 10) + 1 // +1 for base glow at 110%
                    const baseSize = 20
                    const maxSize = 60
                    const glowSize = Math.min(baseSize + (glowLevel * 10), maxSize)
                    return { level: glowLevel, size: glowSize }
                  }
                  
                  const glowData = getGlowIntensity()
                  
                  // Calculate stroke progress
                  const radius = 36
                  const circumference = 2 * Math.PI * radius
                  const strokeDasharray = circumference
                  const strokeDashoffset = circumference - (Math.min(progressPercentage, 100) / 100) * circumference
                      
                  return (
                        <div key={member.id} className="flex flex-col items-center relative">
                          {/* Progressive external glow effect - ONLY pulses when over 110% */}
                          {shouldGlow && (
                            <div 
                              className="absolute rounded-full animate-pulse"
                              style={{
                                boxShadow: `0 0 ${glowData.size}px ${baseColor}${60 + glowData.level * 10}, 0 0 ${glowData.size * 2}px ${baseColor}${40 + glowData.level * 5}`,
                                width: '80px',
                                height: '80px',
                                top: '0px',
                                left: '0px',
                                pointerEvents: 'none'
                              }}
                            />
                          )}
                          
                          {/* Stroke-based circular progress */}
                          <div className="relative w-20 h-20 z-10">
                            {/* Background circle - removed separate div, using SVG background */}
                            
                            {/* Progress stroke circle */}
                            <svg 
                              className="w-20 h-20 -rotate-90"
                              viewBox="0 0 80 80"
                            >
                              {/* Background circle fill */}
                              <circle
                                cx="40"
                                cy="40"
                                r={radius}
                                fill="rgba(31, 41, 55, 0.5)"
                                stroke="none"
                              />
                              
                              {/* Background stroke */}
                              <circle
                                cx="40"
                                cy="40"
                                r={radius}
                                fill="none"
                                stroke="#374151"
                                strokeWidth="3"
                              />
                              
                              {/* Progress stroke */}
                              <circle
                                cx="40"
                                cy="40"
                                r={radius}
                                fill="none"
                                stroke={baseColor}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-1000 ease-out"
                              />
                            </svg>
                            
                            {/* Online status indicator */}
                            {member.is_online && (
                              <div 
                                className="absolute top-2.5 right-0.5 w-4 h-4 rounded-full animate-pulse"
                                style={{ 
                                  backgroundColor: member.personal_color || "#ef4444",
                                  boxShadow: `0 0 10px ${member.personal_color || "#ef4444"}80, 0 0 5px ${member.personal_color || "#ef4444"}40`
                                }}
                              />
                            )}
                            
                            {/* Percentage text positioned lower with bigger font - NO PULSING */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center translate-y-1">
                              <span className="text-white font-black text-xl leading-tight">
                                {progressPercentage}%
                              </span>
                              <span className="text-white/50 text-xs font-light tracking-wide">
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
                  daysSinceDonation={daysSinceDonation}
                  insaneStreak={insaneStreak}
                  personalLongestInsaneStreak={personalLongestInsaneStreak}
                />
              </div>
            </div>

            {/* Pot Contributors and Square Components - Proper alignment */}
            <div className="mx-1 mb-1">
              <div className="grid grid-cols-2 gap-1 h-auto">
                {/* Pot Contributors - Vertical 1:2 block */}
                <div className="relative">
                  <div 
                    className="bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl h-full"
                    style={{
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
                      aspectRatio: '1 / 2'
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
                      daysSinceDonation={daysSinceDonation}
                      insaneStreak={insaneStreak}
                      personalLongestInsaneStreak={personalLongestInsaneStreak}
                    />
                  </div>
                </div>

                {/* Right column with 2 squares stacked */}
                <div className="grid grid-rows-2 gap-1 h-full">
                  {/* Birthday Block - Top right square */}
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
                        daysSinceDonation={daysSinceDonation}
                        insaneStreak={insaneStreak}
                        personalLongestInsaneStreak={personalLongestInsaneStreak}
                      />
                    </div>
                  </div>

                  {/* Streak Block - Bottom right square */}
                  <div className="relative">
                    <div 
                      className="aspect-square bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl"
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
                        daysSinceDonation={daysSinceDonation}
                        insaneStreak={insaneStreak}
                        personalLongestInsaneStreak={personalLongestInsaneStreak}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Workout Times - Full width block */}
            <div className="relative">
              <div 
                className="mx-1 mb-20 bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl"
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                <MemoizedChartComponent 
                  key={`${individualStatsMode[4] ? 'personal' : 'group'}-${(individualStatsMode[4] && personalStats?.interestingStats?.[4]) ? personalStats.interestingStats[4].type : groupStats.interestingStats[4].type}-4`}
                  stat={individualStatsMode[4] && personalStats?.interestingStats?.[4] ? personalStats.interestingStats[4] : groupStats.interestingStats[4]} 
                  index={4} 
                  getLayoutClasses={getLayoutClasses}
                  userProfile={profile}
                  onClick={() => toggleIndividualStat(4)}
                  isPersonalMode={individualStatsMode[4]}
                  hasPersonalData={!!personalStats?.interestingStats?.[4]}
                  daysSinceDonation={daysSinceDonation}
                  insaneStreak={insaneStreak}
                  personalLongestInsaneStreak={personalLongestInsaneStreak}
                />
              </div>
            </div>
          </>
        )}

      </div>
    </>
  )
}
