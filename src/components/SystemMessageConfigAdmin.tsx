import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Textarea } from './ui/textarea'
import { Checkbox } from './ui/checkbox'
import { SystemMessageConfigService } from '@/services/systemMessageConfig'
import { supabase } from '@/lib/supabase'
import { 
  SystemMessageTypeConfig, 
  SystemMessageRarity, 
  DailySummaryConfig, 
  WeeklyChallengeConfig,
  WeeklySummaryConfig,
  PersonalSummaryConfig,
  EnhancedMilestoneConfig,
  TimingConfig,
  SummaryOption
} from '@/types/systemMessages'
import { useProfile } from '@/hooks/useProfile'
import { 
  X, 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  Target, 
  MessageSquare, 
  Settings, 
  Trophy
} from 'lucide-react'

interface SystemMessageConfigAdminProps {
  isOpen: boolean
  onClose: () => void
}

export function SystemMessageConfigAdmin({ isOpen, onClose }: SystemMessageConfigAdminProps) {
  const { profile } = useProfile()
  const [isLoading, setIsLoading] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>('summary')
  const [previewMode, setPreviewMode] = useState<string | null>(null)
  const isMountedRef = useRef(true)
  
  // Configuration states
  const [challengeConfig, setChallengeConfig] = useState<WeeklyChallengeConfig | null>(null)
  const [dailySummaryConfig, setDailySummaryConfig] = useState<DailySummaryConfig | null>(null)
  const [weeklySummaryConfig, setWeeklySummaryConfig] = useState<WeeklySummaryConfig | null>(null)
  const [personalSummaryConfig, setPersonalSummaryConfig] = useState<PersonalSummaryConfig | null>(null)
  const [milestoneConfigs, setMilestoneConfigs] = useState<EnhancedMilestoneConfig[]>([])
  
  // UI state
  const [challengeTiming, setChallengeTiming] = useState<TimingConfig>({ type: 'end_of_day' })
  const [dailySummaryTiming, setDailySummaryTiming] = useState<TimingConfig>({ type: 'end_of_day' })
  const [weeklySummaryTiming, setWeeklySummaryTiming] = useState<TimingConfig>({ type: 'end_of_day' })
  const [personalSummaryTiming, setPersonalSummaryTiming] = useState<TimingConfig>({ type: 'end_of_day' })
  const [developerTiming, setDeveloperTiming] = useState<TimingConfig>({ type: 'custom', customTime: '09:00' })
  const [challengeMessage, setChallengeMessage] = useState('')
  const [developerMessage, setDeveloperMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const isSupremeAdmin = profile?.role === 'supreme_admin'

  // Sample data for summary options (matches Figma design)
  const [dailySummaryOptions, setDailySummaryOptions] = useState<SummaryOption[]>([
    {
      id: 'workout_completion',
      title: 'Workout Completion Rate',
      description: 'Show how many members completed their workouts today',
      enabled: true,
      preview: "💪 Workout Update: 8/10 members crushed their workouts today! Amazing commitment team!"
    },
    {
      id: 'top_performer',
      title: 'Daily MVP',
      description: 'Highlight the member who performed best today',
      enabled: true,
      preview: "🏆 Today's MVP: Sarah with an intense 90-minute strength session! Way to lead by example!"
    },
    {
      id: 'streak_info',
      title: 'Group Streak',
      description: 'Show current group workout streak',
      enabled: true,
      preview: "🔥 STREAK ALERT: We're on a 12-day group streak! Let&apos;s keep this momentum going strong!"
    },
    {
      id: 'motivation',
      title: 'Daily Motivation',
      description: 'Include an inspiring fitness quote',
      enabled: false,
      preview: "✨ \"The only bad workout is the one that didn't happen.\" - Keep pushing forward, team!"
    }
  ])

  const [weeklySummaryOptions, setWeeklySummaryOptions] = useState<SummaryOption[]>([
    {
      id: 'weekly_stats',
      title: 'Weekly Performance',
      description: 'Overview of group workout completion this week',
      enabled: true,
      preview: "📊 Week 12 Recap: 89% completion rate, 47 total workouts, and 3 new personal bests!"
    },
    {
      id: 'member_spotlight',
      title: 'Member Spotlight',
      description: 'Feature a member who showed great progress',
      enabled: true,
      preview: "🌟 Member Spotlight: Mike improved his 5K time by 2 minutes this week! Incredible progress!"
    }
  ])

  const [personalSummaryOptions, setPersonalSummaryOptions] = useState<SummaryOption[]>([
    {
      id: 'personal_streak',
      title: 'Personal Streak',
      description: 'Individual member workout streaks',
      enabled: true,
      preview: "🔥 @Alex: You're on a 15-day streak! Your consistency is inspiring the whole team!"
    },
    {
      id: 'goal_progress',
      title: 'Goal Milestones',
      description: 'Personal fitness goal achievements',
      enabled: true,
      preview: "🎯 @Sam just hit their monthly goal of 20 workouts! Incredible dedication this month!"
    }
  ])

  useEffect(() => {
    isMountedRef.current = true
    
    if (isOpen && isSupremeAdmin) {
      loadConfigurations()
    }
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMountedRef.current = false
      setIsLoading(false)
      setExpandedSection(null)
      setPreviewMode(null)
    }
  }, [isOpen, isSupremeAdmin])

  const loadConfigurations = async () => {
    if (!isMountedRef.current) return
    setIsLoading(true)
    
    try {
      const [
        challengeData,
        dailyData,
        weeklyData,
        personalData,
        milestoneData
      ] = await Promise.all([
        SystemMessageConfigService.getWeeklyChallengeConfig(),
        SystemMessageConfigService.getDailySummaryConfig(),
        SystemMessageConfigService.getWeeklySummaryConfig(),
        SystemMessageConfigService.getPersonalSummaryConfig(),
        SystemMessageConfigService.getEnhancedMilestoneConfigs()
      ])
      
      // Only update state if component is still mounted
      if (!isMountedRef.current) return
      
      setChallengeConfig(challengeData)
      setDailySummaryConfig(dailyData)
      setWeeklySummaryConfig(weeklyData)
      setPersonalSummaryConfig(personalData)
      setMilestoneConfigs(milestoneData)
      
      // Set initial values
      if (challengeData) {
        setChallengeMessage(challengeData.message || '')
        setChallengeTiming({
          type: challengeData.timing_type as 'end_of_day' | 'custom',
          customTime: challengeData.custom_time || undefined
        })
      }
      
      // Update checkbox states based on loaded configs
      if (dailyData) {
        setDailySummaryOptions(prev => prev.map(option => ({
          ...option,
          enabled: {
            'workout_completion': dailyData.include_commitment_rate,
            'top_performer': dailyData.include_top_performer,
            'streak_info': dailyData.include_streak_info,
            'motivation': dailyData.include_motivational_message
          }[option.id] ?? option.enabled
        })))
      }
      
      if (weeklyData) {
        setWeeklySummaryOptions(prev => prev.map(option => ({
          ...option,
          enabled: {
            'weekly_stats': weeklyData.include_weekly_stats,
            'member_spotlight': weeklyData.include_member_spotlight
          }[option.id] ?? option.enabled
        })))
      }
      
      if (personalData) {
        setPersonalSummaryOptions(prev => prev.map(option => ({
          ...option,
          enabled: {
            'personal_streak': personalData.include_personal_streak,
            'goal_progress': personalData.include_goal_progress
          }[option.id] ?? option.enabled
        })))
      }
      
    } catch (error) {
      console.error('Error loading configurations:', error)
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  // Main sections configuration
  const sections = [
    {
      id: 'challenge',
      title: 'Weekly Challenges',
      description: 'Motivational fitness challenges for the group',
      icon: Target,
      enabled: challengeConfig?.enabled || false,
      count: 0
    },
    {
      id: 'summary',
      title: 'Workout Summaries',
      description: 'Daily, weekly, and personal progress updates',
      icon: MessageSquare,
      enabled: dailySummaryConfig?.enabled || false,
      count: dailySummaryOptions.filter(opt => opt.enabled).length + 
             weeklySummaryOptions.filter(opt => opt.enabled).length + 
             personalSummaryOptions.filter(opt => opt.enabled).length
    },
    {
      id: 'admin',
      title: 'Admin Messages',
      description: 'Important announcements from group administrators',
      icon: Settings,
      enabled: true,
      count: 0
    },
    {
      id: 'milestone',
      title: 'Achievement Celebrations',
      description: 'Milestone notifications and achievement unlocks',
      icon: Trophy,
      enabled: true,
      count: milestoneConfigs.filter(m => m.enabled).length
    }
  ]

  // Helper functions
  const toggleSummaryOption = async (options: SummaryOption[], setOptions: React.Dispatch<React.SetStateAction<SummaryOption[]>>, id: string) => {
    // Update local state immediately for responsive UI
    setOptions(options.map(option => 
      option.id === id ? { ...option, enabled: !option.enabled } : option
    ))

    // Auto-save to database in the background
    try {
      const updatedOptions = options.map(option => 
        option.id === id ? { ...option, enabled: !option.enabled } : option
      )
      
      // Determine which config type this is based on the option IDs
      const isDailyOption = updatedOptions.some(opt => ['workout_completion', 'top_performer', 'streak_info', 'motivation'].includes(opt.id))
      const isWeeklyOption = updatedOptions.some(opt => ['weekly_stats', 'member_spotlight'].includes(opt.id))
      const isPersonalOption = updatedOptions.some(opt => ['personal_streak', 'goal_progress'].includes(opt.id))

      if (isDailyOption && dailySummaryConfig) {
        // Save daily summary configuration
        const newConfig = {
          ...dailySummaryConfig,
          include_commitment_rate: updatedOptions.find(opt => opt.id === 'workout_completion')?.enabled || false,
          include_top_performer: updatedOptions.find(opt => opt.id === 'top_performer')?.enabled || false,
          include_streak_info: updatedOptions.find(opt => opt.id === 'streak_info')?.enabled || false,
          include_motivational_message: updatedOptions.find(opt => opt.id === 'motivation')?.enabled || false,
        }
        
        await SystemMessageConfigService.updateDailySummaryConfig(newConfig)
      } else if (isWeeklyOption && weeklySummaryConfig) {
        // Save weekly summary configuration
        const newConfig = {
          ...weeklySummaryConfig,
          include_weekly_stats: updatedOptions.find(opt => opt.id === 'weekly_stats')?.enabled || false,
          include_member_spotlight: updatedOptions.find(opt => opt.id === 'member_spotlight')?.enabled || false,
        }
        
        await SystemMessageConfigService.updateWeeklySummaryConfig(newConfig)
      } else if (isPersonalOption && personalSummaryConfig) {
        // Save personal summary configuration
        const newConfig = {
          ...personalSummaryConfig,
          include_personal_streak: updatedOptions.find(opt => opt.id === 'personal_streak')?.enabled || false,
          include_goal_progress: updatedOptions.find(opt => opt.id === 'goal_progress')?.enabled || false,
        }
        
        await SystemMessageConfigService.updatePersonalSummaryConfig(newConfig)
      }
    } catch (error) {
      console.error('Error auto-saving summary option:', error)
      // Optionally show a toast notification for failed saves
    }
  }

  const toggleMilestoneOption = async (milestoneId: string) => {
    const milestone = milestoneConfigs.find(m => m.id === milestoneId)
    if (!milestone) return

    const success = await SystemMessageConfigService.updateMilestoneConfig(milestoneId, { 
      enabled: !milestone.enabled 
    })
    
    if (success) {
      setMilestoneConfigs(prev => prev.map(m => 
        m.id === milestoneId ? { ...m, enabled: !m.enabled } : m
      ))
    }
  }

  const updateMilestoneRarity = async (milestoneId: string, rarity: SystemMessageRarity) => {
    const success = await SystemMessageConfigService.updateMilestoneConfig(milestoneId, { rarity })
    
    if (success) {
      setMilestoneConfigs(prev => prev.map(m => 
        m.id === milestoneId ? { ...m, rarity } : m
      ))
    }
  }

  const getRarityBadgeStyle = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'rare': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'legendary': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return ''
    }
  }

  const getRarityPreviewStyle = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return {
          container: 'mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/30',
          header: 'text-green-400 text-xs',
          text: 'mt-1 text-green-200 text-xs leading-relaxed'
        }
      case 'rare':
        return {
          container: 'mt-3 p-4 bg-blue-500/15 rounded-lg border-2 border-blue-500/40 shadow-lg shadow-blue-500/10',
          header: 'text-blue-300 text-xs font-medium',
          text: 'mt-1 text-blue-100 text-xs leading-relaxed'
        }
      case 'legendary':
        return {
          container: 'mt-3 p-4 bg-gradient-to-br from-yellow-400/30 via-amber-500/25 to-orange-500/20 rounded-lg border-2 border-yellow-400/60 shadow-xl shadow-yellow-500/20 relative overflow-hidden',
          header: 'text-yellow-200 text-xs font-semibold tracking-wide uppercase',
          text: 'mt-2 text-yellow-50 text-sm leading-relaxed font-medium'
        }
      default:
        return {
          container: 'mt-3 p-3 bg-slate-500/10 rounded-lg border border-slate-500/30',
          header: 'text-slate-400 text-xs',
          text: 'mt-1 text-slate-300 text-xs leading-relaxed'
        }
    }
  }

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-yellow-500'
    if (percentage >= 70) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const sendDeveloperNote = async () => {
    if (!developerMessage.trim() || !profile?.group_id) return

    if (isMountedRef.current) {
      setSendingMessage(true)
    }
    
    const success = await SystemMessageConfigService.createDeveloperNote(
      profile.group_id,
      developerMessage.trim(),
      'common'
    )
    
    if (isMountedRef.current) {
      if (success) {
        setDeveloperMessage('')
        alert('Admin message sent successfully!')
      } else {
        alert('Failed to send admin message')
      }
      setSendingMessage(false)
    }
  }

  const sendDailySummaryNow = async () => {
    if (!profile?.group_id) {
      alert('No group found. Please make sure you are part of a group.')
      return
    }

    if (isMountedRef.current) {
      setSendingMessage(true)
    }
    
    try {
      const { data, error } = await supabase.rpc('generate_daily_summary', {
        p_group_id: profile.group_id
      })

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Daily summary generated with ID:', data)
      alert('Today\'s daily summary sent successfully! Check your group chat.')
    } catch (error) {
      console.error('Error sending daily summary:', error)
      alert(`Failed to send daily summary: ${error.message || error}`)
    }
    
    if (isMountedRef.current) {
      setSendingMessage(false)
    }
  }

  const sendYesterdaysSummaryNow = async () => {
    if (!profile?.group_id) {
      alert('No group found. Please make sure you are part of a group.')
      return
    }

    if (isMountedRef.current) {
      setSendingMessage(true)
    }
    
    try {
      // Calculate yesterday's date
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayDateString = yesterday.toISOString().split('T')[0] // YYYY-MM-DD format

      const { data, error } = await supabase.rpc('generate_daily_summary_for_date', {
        p_group_id: profile.group_id,
        p_date: yesterdayDateString
      })

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Yesterday\'s summary generated with ID:', data)
      alert('Yesterday\'s summary sent successfully! Check your group chat.')
    } catch (error) {
      console.error('Error sending yesterday\'s summary:', error)
      alert(`Failed to send yesterday's summary: ${error.message || error}`)
    }
    
    if (isMountedRef.current) {
      setSendingMessage(false)
    }
  }

  const sendTestNotification = async () => {
    if (!profile?.group_id) {
      alert('No group found. Please make sure you are part of a group.')
      return
    }

    if (isMountedRef.current) {
      setSendingMessage(true)
    }
    
    try {
      // Get group members for testing
      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select('profile_id')
        .eq('group_id', profile.group_id)

      if (membersError) {
        throw membersError
      }

      const userIds = groupMembers.map(member => member.profile_id)

      // Send test notification
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds,
          title: '🧪 Test Notification',
          body: 'This is a test notification from the admin panel! If you see this, push notifications are working correctly.',
          data: {
            type: 'test',
            timestamp: Date.now()
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Test notification result:', result)
      
      if (result.sent > 0) {
        alert(`Test notification sent successfully to ${result.sent} users! Check your device for the notification.`)
      } else {
        alert('Test notification sent, but no active subscriptions found. Users may need to enable notifications first.')
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      alert(`Failed to send test notification: ${error.message || error}`)
    }
    
    if (isMountedRef.current) {
      setSendingMessage(false)
    }
  }

  const sendWeeklySummaryNow = async () => {
    if (!profile?.group_id) {
      alert('No group found. Please make sure you are part of a group.')
      return
    }

    if (isMountedRef.current) {
      setSendingMessage(true)
    }
    
    try {
      // For now, we'll create a generic weekly summary message
      // TODO: Implement generate_weekly_summary database function
      const message = await SystemMessageConfigService.createDeveloperNote(
        profile.group_id,
        '📊 Weekly Summary: This is a placeholder for the weekly summary feature. Full implementation coming soon!',
        'common'
      )

      if (!message) {
        throw new Error('Failed to create weekly summary message')
      }

      console.log('Weekly summary sent successfully')
      alert('Weekly summary sent successfully! Check your group chat.')
    } catch (error) {
      console.error('Error sending weekly summary:', error)
      alert(`Failed to send weekly summary: ${error.message || error}`)
    }
    
    if (isMountedRef.current) {
      setSendingMessage(false)
    }
  }

  const sendPersonalSummaryNow = async () => {
    if (!profile?.group_id) {
      alert('No group found. Please make sure you are part of a group.')
      return
    }

    if (isMountedRef.current) {
      setSendingMessage(true)
    }
    
    try {
      // For now, we'll create a generic personal summary message
      // TODO: Implement generate_personal_summary database function
      const message = await SystemMessageConfigService.createDeveloperNote(
        profile.group_id,
        '🏆 Personal Summary: This is a placeholder for the personal summary feature. Full implementation coming soon!',
        'common'
      )

      if (!message) {
        throw new Error('Failed to create personal summary message')
      }

      console.log('Personal summary sent successfully')
      alert('Personal summary sent successfully! Check your group chat.')
    } catch (error) {
      console.error('Error sending personal summary:', error)
      alert(`Failed to send personal summary: ${error.message || error}`)
    }
    
    if (isMountedRef.current) {
      setSendingMessage(false)
    }
  }

  const renderMilestoneRaritySelector = (milestone: EnhancedMilestoneConfig) => (
    <Select 
      value={milestone.rarity} 
      onValueChange={(value: SystemMessageRarity) => updateMilestoneRarity(milestone.id, value)}
    >
      <SelectTrigger 
        className={`inline-flex items-center h-auto px-2 py-0.5 text-xs border rounded-md cursor-pointer hover:opacity-80 transition-opacity w-auto ${getRarityBadgeStyle(milestone.rarity)}`}
      >
        {milestone.rarity}
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-slate-600">
        <SelectItem value="common">Common</SelectItem>
        <SelectItem value="rare">Rare</SelectItem>
        <SelectItem value="legendary">Legendary</SelectItem>
      </SelectContent>
    </Select>
  )

  const renderSummaryOption = (
    option: SummaryOption, 
    options: SummaryOption[], 
    setOptions: React.Dispatch<React.SetStateAction<SummaryOption[]>>
  ) => (
    <div key={option.id} className="flex items-start justify-between py-4">
      <div className="flex-1 min-w-0 pr-4">
        <h5 className="text-white text-sm">{option.title}</h5>
        <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{option.description}</p>
      </div>
      <div 
        className="shrink-0 touch-manipulation" 
        style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Checkbox
          checked={option.enabled}
          onCheckedChange={() => toggleSummaryOption(options, setOptions, option.id)}
          className="w-5 h-5"
        />
      </div>
    </div>
  )

  const renderMilestoneOption = (milestone: EnhancedMilestoneConfig) => {
    const percentage = Math.min((milestone.current_progress || 0) / milestone.target * 100, 100)
    const isCompleted = percentage >= 100
    const isPreviewVisible = previewMode === `milestone-${milestone.id}`
    const previewStyle = getRarityPreviewStyle(milestone.rarity)
    
    return (
      <div key={milestone.id} className="py-4 border-b border-slate-700/30 last:border-b-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <h5 className="text-white text-sm">{milestone.milestone_name}</h5>
              {isCompleted && <span className="text-xs text-yellow-400">✓ Complete</span>}
            </div>
            <p className="text-slate-400 text-xs mb-3 leading-relaxed">{milestone.description}</p>
            
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Progress</span>
                <span className="text-xs text-slate-400">
                  {milestone.current_progress || 0}/{milestone.target} {milestone.unit}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(percentage)}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">{Math.round(percentage)}%</span>
              </div>
            </div>
            
            <div className="mt-3 flex items-center justify-between">
              <div>
                {renderMilestoneRaritySelector(milestone)}
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setPreviewMode(isPreviewVisible ? null : `milestone-${milestone.id}`)}
                className="text-slate-400 hover:text-slate-300 min-h-[44px] px-4 text-sm touch-manipulation"
              >
                <Eye className="h-4 w-4 mr-2" />
                {isPreviewVisible ? 'Hide' : 'Preview'}
              </Button>
            </div>
            
            {/* Individual Milestone Preview with Rarity-specific Styling */}
            {isPreviewVisible && (
              <div className={previewStyle.container}>
                {milestone.rarity === 'legendary' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/10 to-transparent animate-pulse"></div>
                )}
                <span className={previewStyle.header}>
                  {milestone.rarity === 'legendary' ? '✨ Legendary Achievement Preview ✨' : 
                   milestone.rarity === 'rare' ? '💎 Rare Achievement Preview' : 
                   '🌟 Achievement Preview'}
                </span>
                <p className={previewStyle.text}>{milestone.preview_message}</p>
                {milestone.rarity === 'legendary' && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                )}
              </div>
            )}
          </div>
          <div 
            className="shrink-0 touch-manipulation" 
            style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Checkbox
              checked={milestone.enabled}
              onCheckedChange={() => toggleMilestoneOption(milestone.id)}
              className="w-5 h-5"
            />
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  if (!isSupremeAdmin) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-white mb-4">Access Denied</h3>
          <p className="text-gray-400 mb-6">You need supreme admin privileges to access system message configuration.</p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 bg-slate-950 z-[9999] overflow-y-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="min-h-screen">
        <div className="p-6 max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl text-white">Bot Message Settings</h1>
            <p className="text-slate-400 text-sm mt-1">Configure automated messages for your fitness group</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Section List */}
        <div className="space-y-3">
          {sections.map((section) => {
            const isExpanded = expandedSection === section.id
            const IconComponent = section.icon
            
            return (
              <div key={section.id} className="bg-slate-900/40 rounded-lg border border-slate-800/60">
                
                {/* Section Header */}
                <div 
                  className={`flex items-center justify-between p-4 hover:bg-slate-800/30 cursor-pointer transition-colors rounded-lg ${
                    isExpanded ? 'bg-slate-800/40 border-b border-slate-700/50' : ''
                  }`}
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-5 w-5 text-slate-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white">{section.title}</h3>
                        {section.count > 0 && (
                          <span className="text-xs text-slate-400">({section.count})</span>
                        )}
                        {section.enabled && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm">{section.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {/* Section Content */}
                {isExpanded && (
                  <div className="p-6 bg-slate-800/20 rounded-b-lg">
                    
                    {/* Challenge Configuration */}
                    {section.id === 'challenge' && (
                      <div className="space-y-6">
                        {/* Section Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-lg border border-slate-700/30">
                          <div>
                            <h4 className="text-white text-sm">Enable Weekly Challenges</h4>
                            <p className="text-slate-400 text-xs mt-1">Send motivational challenges to keep the group engaged</p>
                          </div>
                          <div 
                            className="touch-manipulation" 
                            style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Switch
                              checked={challengeConfig?.enabled || false}
                              onCheckedChange={async (enabled) => {
                                await SystemMessageConfigService.updateWeeklyChallengeConfig({ enabled })
                                if (isMountedRef.current) {
                                  setChallengeConfig(prev => prev ? { ...prev, enabled } : null)
                                }
                              }}
                              className="data-[state=checked]:bg-green-600"
                            />
                          </div>
                        </div>

                        {challengeConfig?.enabled && (
                          <>
                            <div className="space-y-2">
                              <Label className="text-white text-sm">Weekly Challenge Message</Label>
                              <Textarea
                                placeholder="e.g., This week's challenge: Complete 100 burpees as a team! 💪"
                                value={challengeMessage}
                                onChange={(e) => setChallengeMessage(e.target.value)}
                                className="bg-slate-800 border-slate-600 text-white min-h-[80px] resize-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-white text-sm">Send Time</Label>
                                <Select 
                                  value={challengeTiming.type} 
                                  onValueChange={(value: 'end_of_day' | 'custom') => 
                                    setChallengeTiming({ type: value, customTime: value === 'custom' ? '09:00' : undefined })
                                  }
                                >
                                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600">
                                    <SelectItem value="end_of_day">End of Day</SelectItem>
                                    <SelectItem value="custom">Custom Time</SelectItem>
                                  </SelectContent>
                                </Select>
                                {challengeTiming.type === 'custom' && (
                                  <Input
                                    type="time"
                                    value={challengeTiming.customTime || '09:00'}
                                    onChange={(e) => setChallengeTiming({ ...challengeTiming, customTime: e.target.value })}
                                    className="bg-slate-800 border-slate-600 text-white"
                                  />
                                )}
                              </div>
                            </div>

                            {challengeMessage && (
                              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
                                <div className="flex items-center gap-2 mb-2">
                                  <Eye className="h-3 w-3 text-slate-500" />
                                  <span className="text-xs text-slate-400">Preview</span>
                                </div>
                                <p className="text-sm text-slate-300">{challengeMessage}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Summary Configuration */}
                    {section.id === 'summary' && (
                      <div className="space-y-8">
                        {/* Section Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-lg border border-slate-700/30">
                          <div>
                            <h4 className="text-white text-sm">Enable Workout Summaries</h4>
                            <p className="text-slate-400 text-xs mt-1">Send daily, weekly, and personal workout progress updates</p>
                          </div>
                          <div 
                            className="touch-manipulation" 
                            style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Switch
                              checked={dailySummaryConfig?.enabled || false}
                              onCheckedChange={async (enabled) => {
                                if (dailySummaryConfig) {
                                  await SystemMessageConfigService.updateDailySummaryConfig({ ...dailySummaryConfig, enabled })
                                  if (isMountedRef.current) {
                                    setDailySummaryConfig(prev => prev ? { ...prev, enabled } : null)
                                  }
                                }
                              }}
                              className="data-[state=checked]:bg-green-600"
                            />
                          </div>
                        </div>

                        {dailySummaryConfig?.enabled && (
                          <>
                            {/* Daily Summaries */}
                            <div className="space-y-4">
                              <h4 className="text-white">Daily Summary Options</h4>
                              
                              <div className="space-y-1 p-4 bg-slate-800/20 rounded-lg border border-slate-700/20">
                                {dailySummaryOptions.map((option) => 
                                  renderSummaryOption(option, dailySummaryOptions, setDailySummaryOptions)
                                )}
                              </div>

                              <div className="flex justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setPreviewMode(previewMode === 'daily' ? null : 'daily')}
                                  className="text-slate-400 hover:text-slate-300 min-h-[44px] px-4 touch-manipulation"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  {previewMode === 'daily' ? 'Hide Preview' : 'Show Preview'}
                                </Button>
                              </div>

                              {previewMode === 'daily' && (
                                <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                                  <span className="text-blue-400 text-xs">Daily Summary Preview</span>
                                  <div className="mt-2 space-y-1">
                                    {dailySummaryOptions.filter(opt => opt.enabled).map(opt => (
                                      <p key={opt.id} className="text-blue-300 text-xs leading-relaxed">{opt.preview}</p>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Daily Summary Timing */}
                              <div className="space-y-4 pt-2">
                                <div className="w-full h-px bg-slate-700/50"></div>
                                <h4 className="text-white text-sm">Daily Summary Timing</h4>
                                <div className="grid grid-cols-1 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-white text-sm">Send Time</Label>
                                    <select
                                      value={dailySummaryTiming.type}
                                      onChange={(e) => 
                                        setDailySummaryTiming({ 
                                          type: e.target.value as 'end_of_day' | 'custom', 
                                          customTime: e.target.value === 'custom' ? '23:59' : undefined 
                                        })
                                      }
                                      className="bg-slate-800 border-slate-600 text-white rounded-md px-3 py-2 text-sm w-full border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                      <option value="end_of_day">End of Day (00:00)</option>
                                      <option value="custom">Custom Time</option>
                                    </select>
                                    {dailySummaryTiming.type === 'custom' && (
                                      <Input
                                        type="time"
                                        value={dailySummaryTiming.customTime || '23:59'}
                                        onChange={(e) => setDailySummaryTiming({ ...dailySummaryTiming, customTime: e.target.value })}
                                        className="bg-slate-800 border-slate-600 text-white"
                                      />
                                    )}
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-3">
                                    <Button
                                      onClick={sendDailySummaryNow}
                                      disabled={sendingMessage}
                                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs sm:text-sm"
                                    >
                                      {sendingMessage ? 'Sending...' : 'Send Today\'s Summary'}
                                    </Button>
                                    <Button
                                      onClick={sendYesterdaysSummaryNow}
                                      disabled={sendingMessage}
                                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs sm:text-sm"
                                    >
                                      {sendingMessage ? 'Sending...' : 'Send Yesterday\'s Summary'}
                                    </Button>
                                  </div>
                                  
                                  <div className="mt-3">
                                    <Button
                                      onClick={sendTestNotification}
                                      disabled={sendingMessage}
                                      className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm"
                                    >
                                      {sendingMessage ? 'Sending...' : '🧪 Send Test Notification'}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Weekly Summaries */}
                            <div className="space-y-4">
                              <div className="w-full h-px bg-slate-700/50"></div>
                              <h4 className="text-white">Weekly Summary Options</h4>
                              
                              <div className="space-y-1 p-4 bg-slate-800/20 rounded-lg border border-slate-700/20">
                                {weeklySummaryOptions.map((option) => 
                                  renderSummaryOption(option, weeklySummaryOptions, setWeeklySummaryOptions)
                                )}
                              </div>

                              <div className="flex justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setPreviewMode(previewMode === 'weekly' ? null : 'weekly')}
                                  className="text-slate-400 hover:text-slate-300 min-h-[44px] px-4 touch-manipulation"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  {previewMode === 'weekly' ? 'Hide Preview' : 'Show Preview'}
                                </Button>
                              </div>

                              {previewMode === 'weekly' && (
                                <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                                  <span className="text-purple-400 text-xs">Weekly Summary Preview</span>
                                  <div className="mt-2 space-y-1">
                                    {weeklySummaryOptions.filter(opt => opt.enabled).map(opt => (
                                      <p key={opt.id} className="text-purple-300 text-xs leading-relaxed">{opt.preview}</p>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Weekly Summary Timing */}
                              <div className="space-y-4 pt-2">
                                <div className="w-full h-px bg-slate-700/50"></div>
                                <h4 className="text-white text-sm">Weekly Summary Timing</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-white text-sm">Send Time</Label>
                                    <select
                                      value={weeklySummaryTiming.type}
                                      onChange={(e) => 
                                        setWeeklySummaryTiming({ 
                                          type: e.target.value as 'end_of_day' | 'custom', 
                                          customTime: e.target.value === 'custom' ? '18:00' : undefined 
                                        })
                                      }
                                      className="bg-slate-800 border-slate-600 text-white rounded-md px-3 py-2 text-sm w-full border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    >
                                      <option value="end_of_day">End of Day (00:00)</option>
                                      <option value="custom">Custom Time</option>
                                    </select>
                                    {weeklySummaryTiming.type === 'custom' && (
                                      <Input
                                        type="time"
                                        value={weeklySummaryTiming.customTime || '18:00'}
                                        onChange={(e) => setWeeklySummaryTiming({ ...weeklySummaryTiming, customTime: e.target.value })}
                                        className="bg-slate-800 border-slate-600 text-white"
                                      />
                                    )}
                                  </div>
                                  
                                  <div className="flex items-end">
                                    <Button
                                      onClick={sendWeeklySummaryNow}
                                      disabled={sendingMessage}
                                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-xs sm:text-sm"
                                    >
                                      {sendingMessage ? 'Sending...' : 'Send Weekly Now'}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Personal Summaries */}
                            <div className="space-y-4">
                              <div className="w-full h-px bg-slate-700/50"></div>
                              <h4 className="text-white">Personal Summary Options</h4>
                              
                              <div className="space-y-1 p-4 bg-slate-800/20 rounded-lg border border-slate-700/20">
                                {personalSummaryOptions.map((option) => 
                                  renderSummaryOption(option, personalSummaryOptions, setPersonalSummaryOptions)
                                )}
                              </div>

                              <div className="flex justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setPreviewMode(previewMode === 'personal' ? null : 'personal')}
                                  className="text-slate-400 hover:text-slate-300 min-h-[44px] px-4 touch-manipulation"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  {previewMode === 'personal' ? 'Hide Preview' : 'Show Preview'}
                                </Button>
                              </div>

                              {previewMode === 'personal' && (
                                <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                                  <span className="text-green-400 text-xs">Personal Summary Preview</span>
                                  <div className="mt-2 space-y-1">
                                    {personalSummaryOptions.filter(opt => opt.enabled).map(opt => (
                                      <p key={opt.id} className="text-green-300 text-xs leading-relaxed">{opt.preview}</p>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Personal Summary Timing */}
                              <div className="space-y-4 pt-2">
                                <div className="w-full h-px bg-slate-700/50"></div>
                                <h4 className="text-white text-sm">Personal Summary Timing</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-white text-sm">Send Time</Label>
                                    <select
                                      value={personalSummaryTiming.type}
                                      onChange={(e) => 
                                        setPersonalSummaryTiming({ 
                                          type: e.target.value as 'end_of_day' | 'custom', 
                                          customTime: e.target.value === 'custom' ? '19:00' : undefined 
                                        })
                                      }
                                      className="bg-slate-800 border-slate-600 text-white rounded-md px-3 py-2 text-sm w-full border focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    >
                                      <option value="end_of_day">End of Day (00:00)</option>
                                      <option value="custom">Custom Time</option>
                                    </select>
                                    {personalSummaryTiming.type === 'custom' && (
                                      <Input
                                        type="time"
                                        value={personalSummaryTiming.customTime || '19:00'}
                                        onChange={(e) => setPersonalSummaryTiming({ ...personalSummaryTiming, customTime: e.target.value })}
                                        className="bg-slate-800 border-slate-600 text-white"
                                      />
                                    )}
                                  </div>
                                  
                                  <div className="flex items-end">
                                    <Button
                                      onClick={sendPersonalSummaryNow}
                                      disabled={sendingMessage}
                                      className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm"
                                    >
                                      {sendingMessage ? 'Sending...' : 'Send Personal Now'}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </>
                        )}
                      </div>
                    )}

                    {/* Admin Messages Configuration */}
                    {section.id === 'admin' && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-white text-sm">Admin Message</Label>
                          <Textarea
                            placeholder="Send important announcements to your fitness group..."
                            value={developerMessage}
                            onChange={(e) => setDeveloperMessage(e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white min-h-[100px] resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white text-sm">Send Time</Label>
                            <Select 
                              value={developerTiming.type} 
                              onValueChange={(value: 'end_of_day' | 'custom') => 
                                setDeveloperTiming({ type: value, customTime: value === 'custom' ? '09:00' : undefined })
                              }
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600">
                                <SelectItem value="end_of_day">End of Day</SelectItem>
                                <SelectItem value="custom">Custom Time</SelectItem>
                              </SelectContent>
                            </Select>
                            {developerTiming.type === 'custom' && (
                              <Input
                                type="time"
                                value={developerTiming.customTime || '09:00'}
                                onChange={(e) => setDeveloperTiming({ ...developerTiming, customTime: e.target.value })}
                                className="bg-slate-800 border-slate-600 text-white"
                              />
                            )}
                          </div>
                          
                          <div className="flex items-end">
                            <Button
                              onClick={sendDeveloperNote}
                              disabled={!developerMessage.trim() || sendingMessage}
                              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                            >
                              {sendingMessage ? 'Sending...' : 'Send Now'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Milestone Configuration */}
                    {section.id === 'milestone' && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-white">Achievement Milestones</h4>
                          <p className="text-slate-400 text-sm">Celebrations are sent instantly when milestones are reached</p>
                          
                          <div className="p-4 bg-slate-800/20 rounded-lg border border-slate-700/20">
                            {milestoneConfigs.map((milestone) => renderMilestoneOption(milestone))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-700/50">
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300 hover:bg-slate-800">
            Cancel
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            Save Settings
          </Button>
        </div>
        </div>
      </div>
    </div>,
    document.body
  )
}