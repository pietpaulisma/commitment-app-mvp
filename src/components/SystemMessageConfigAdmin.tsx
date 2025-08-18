import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { SystemMessageConfigService } from '@/services/systemMessageConfig'
import { SystemMessageTypeConfig, SystemMessageType, SystemMessageRarity, DailySummaryConfig, MilestoneConfig } from '@/types/systemMessages'
import { useProfile } from '@/hooks/useProfile'
import { 
  CogIcon,
  SparklesIcon,
  CalendarDaysIcon,
  MegaphoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  BellIcon
} from '@heroicons/react/24/outline'

interface SystemMessageConfigAdminProps {
  isOpen: boolean
  onClose: () => void
}

export function SystemMessageConfigAdmin({ isOpen, onClose }: SystemMessageConfigAdminProps) {
  const { profile } = useProfile()
  const [messageConfigs, setMessageConfigs] = useState<SystemMessageTypeConfig[]>([])
  const [dailySummaryConfig, setDailySummaryConfig] = useState<DailySummaryConfig | null>(null)
  const [milestoneConfigs, setMilestoneConfigs] = useState<MilestoneConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedCard, setExpandedCard] = useState<SystemMessageType | null>(null)
  const [developerNote, setDeveloperNote] = useState('')
  const [publicMessage, setPublicMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const isSupremeAdmin = profile?.role === 'supreme_admin'

  useEffect(() => {
    if (isOpen && isSupremeAdmin) {
      loadConfigurations()
    }
  }, [isOpen, isSupremeAdmin])

  const loadConfigurations = async () => {
    setIsLoading(true)
    try {
      // Load all configuration data
      const [globalConfig, dailyConfig, milestoneConfig] = await Promise.all([
        SystemMessageConfigService.getGlobalConfig(),
        SystemMessageConfigService.getDailySummaryConfig(),
        SystemMessageConfigService.getMilestoneConfigs()
      ])
      
      if (globalConfig) {
        setMessageConfigs(globalConfig.message_type_configs)
      }
      setDailySummaryConfig(dailyConfig)
      setMilestoneConfigs(milestoneConfig)
    } catch (error) {
      console.error('Error loading configurations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMessageType = async (messageType: SystemMessageType) => {
    const config = messageConfigs.find(c => c.message_type === messageType)
    if (!config) return

    setIsLoading(true)
    const success = await SystemMessageConfigService.updateMessageTypeConfig(messageType, {
      enabled: !config.enabled
    })
    
    if (success) {
      setMessageConfigs(prev => prev.map(c => 
        c.message_type === messageType ? { ...c, enabled: !c.enabled } : c
      ))
    }
    setIsLoading(false)
  }

  const sendDeveloperNote = async () => {
    if (!developerNote.trim() || !profile?.group_id) return

    setSendingMessage(true)
    const success = await SystemMessageConfigService.createDeveloperNote(
      profile.group_id,
      developerNote.trim(),
      'medium'
    )
    
    if (success) {
      setDeveloperNote('')
      alert('Developer note sent successfully!')
    } else {
      alert('Failed to send developer note')
    }
    setSendingMessage(false)
  }

  const sendPublicMessage = async () => {
    if (!publicMessage.trim()) return

    setSendingMessage(true)
    const success = await SystemMessageConfigService.sendPublicMessage(
      'System Announcement',
      publicMessage.trim()
    )
    
    if (success) {
      setPublicMessage('')
      alert('Public message sent to all groups!')
    } else {
      alert('Failed to send public message')
    }
    setSendingMessage(false)
  }

  const updateDailySummaryConfig = async (field: keyof DailySummaryConfig, value: any) => {
    if (!dailySummaryConfig) return

    const updatedConfig = {
      ...dailySummaryConfig,
      [field]: value
    }
    
    setDailySummaryConfig(updatedConfig)
    
    // Save to database
    const success = await SystemMessageConfigService.updateDailySummaryConfig(updatedConfig)
    if (!success) {
      // Revert on failure
      setDailySummaryConfig(dailySummaryConfig)
      alert('Failed to update daily summary configuration')
    }
  }

  const updateMilestoneEnabled = async (milestoneId: string, enabled: boolean) => {
    const success = await SystemMessageConfigService.updateMilestoneConfig(milestoneId, { enabled })
    
    if (success) {
      setMilestoneConfigs(prev => prev.map(m => 
        m.id === milestoneId ? { ...m, enabled } : m
      ))
    } else {
      alert('Failed to update milestone configuration')
    }
  }

  const getMessageTypeIcon = (messageType: SystemMessageType) => {
    switch (messageType) {
      case 'daily_summary':
        return CalendarDaysIcon
      case 'milestone':
        return SparklesIcon
      case 'developer_note':
        return CogIcon
      case 'public_message':
        return BellIcon
      default:
        return MegaphoneIcon
    }
  }

  const getRarityColor = (rarity: SystemMessageRarity) => {
    switch (rarity) {
      case 'legendary':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      case 'rare':
        return 'text-purple-400 bg-purple-400/10 border-purple-400/30'
      case 'common':
      default:
        return 'text-blue-400 bg-blue-400/10 border-blue-400/30'
    }
  }

  const formatMessageType = (messageType: SystemMessageType) => {
    if (messageType === 'daily_summary') {
      return 'Summary'
    }
    return messageType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (!isOpen) return null

  if (!isSupremeAdmin) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-white mb-4">Access Denied</h3>
          <p className="text-gray-400 mb-6">You need supreme admin privileges to access system message configuration.</p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-8 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white">System Message Configuration</h1>
          <p className="text-gray-400 mt-2">Configure and manage system message types</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-gray-400 hover:text-white h-10 w-10"
        >
          ✕
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          <div className="space-y-6">
            {/* Message Type Cards */}
            {messageConfigs.map((typeConfig) => {
              const IconComponent = getMessageTypeIcon(typeConfig.message_type)
              const isExpanded = expandedCard === typeConfig.message_type
              
              return (
                <div
                  key={typeConfig.message_type}
                  className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden transition-all duration-200 hover:border-gray-600"
                >
                  {/* Card Header - Always Visible */}
                  <div 
                    className="p-8 cursor-pointer"
                    onClick={() => setExpandedCard(isExpanded ? null : typeConfig.message_type)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div>
                          <h2 className="text-xl font-semibold text-white">
                            {formatMessageType(typeConfig.message_type)}
                          </h2>
                          <p className="text-gray-400 mt-2">
                            {typeConfig.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {/* Status Indicator */}
                        <div className="flex items-center gap-3">
                          {typeConfig.enabled ? (
                            <>
                              <CheckCircleIcon className="w-6 h-6 text-green-400" />
                              <span className="text-green-400 font-medium">Enabled</span>
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="w-6 h-6 text-red-400" />
                              <span className="text-red-400 font-medium">Disabled</span>
                            </>
                          )}
                        </div>
                        {/* Expand/Collapse Icon */}
                        {isExpanded ? (
                          <ChevronUpIcon className="w-6 h-6 text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 p-8 bg-gray-800/50">
                      {typeConfig.message_type === 'daily_summary' && (
                        <div className="space-y-8">
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-2">Summary Configuration</h3>
                            <p className="text-gray-400">Configure automated summaries for groups including daily, weekly, and milestone recaps</p>
                          </div>
                          
                          {dailySummaryConfig ? (
                            <div className="space-y-6">
                              {/* Content Sections */}
                              <div>
                                <h4 className="text-lg font-medium text-white mb-6">Content Elements</h4>
                                <div className="grid grid-cols-2 gap-6">
                                  <label className="flex items-start gap-4 p-6 bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-600 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={dailySummaryConfig.include_commitment_rate}
                                      onChange={(e) => updateDailySummaryConfig('include_commitment_rate', e.target.checked)}
                                      className="w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 mt-1"
                                    />
                                    <div>
                                      <div className="text-base font-medium text-white">Commitment Rate</div>
                                      <div className="text-sm text-gray-400 mt-1">Show daily commitment percentage and group performance</div>
                                    </div>
                                  </label>

                                  <label className="flex items-start gap-4 p-6 bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-600 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={dailySummaryConfig.include_top_performer}
                                      onChange={(e) => updateDailySummaryConfig('include_top_performer', e.target.checked)}
                                      className="w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 mt-1"
                                    />
                                    <div>
                                      <div className="text-base font-medium text-white">Top Performer</div>
                                      <div className="text-sm text-gray-400 mt-1">Highlight best performing member and celebrate achievements</div>
                                    </div>
                                  </label>

                                  <label className="flex items-start gap-4 p-6 bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-600 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={dailySummaryConfig.include_member_count}
                                      onChange={(e) => updateDailySummaryConfig('include_member_count', e.target.checked)}
                                      className="w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 mt-1"
                                    />
                                    <div>
                                      <div className="text-base font-medium text-white">Member Count</div>
                                      <div className="text-sm text-gray-400 mt-1">Show total active members and participation stats</div>
                                    </div>
                                  </label>

                                  <label className="flex items-start gap-4 p-6 bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-600 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={dailySummaryConfig.include_motivational_message}
                                      onChange={(e) => updateDailySummaryConfig('include_motivational_message', e.target.checked)}
                                      className="w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 mt-1"
                                    />
                                    <div>
                                      <div className="text-base font-medium text-white">Motivational Message</div>
                                      <div className="text-sm text-gray-400 mt-1">Include inspiring quotes and encouragement</div>
                                    </div>
                                  </label>

                                  <label className="flex items-start gap-4 p-6 bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-600 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={dailySummaryConfig.include_streak_info}
                                      onChange={(e) => updateDailySummaryConfig('include_streak_info', e.target.checked)}
                                      className="w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 mt-1"
                                    />
                                    <div>
                                      <div className="text-base font-medium text-white">Streak Information</div>
                                      <div className="text-sm text-gray-400 mt-1">Show current group streak and streak milestones</div>
                                    </div>
                                  </label>

                                  <label className="flex items-start gap-4 p-6 bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-600 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={dailySummaryConfig.include_weekly_progress}
                                      onChange={(e) => updateDailySummaryConfig('include_weekly_progress', e.target.checked)}
                                      className="w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 mt-1"
                                    />
                                    <div>
                                      <div className="text-base font-medium text-white">Weekly Progress</div>
                                      <div className="text-sm text-gray-400 mt-1">Show week-over-week trends and improvements</div>
                                    </div>
                                  </label>
                                </div>
                              </div>

                              {/* Timing Settings */}
                              <div>
                                <h4 className="text-lg font-medium text-white mb-6">Timing & Schedule</h4>
                                <div className="grid grid-cols-2 gap-8">
                                  <div>
                                    <label className="block text-base font-medium text-white mb-3">
                                      Send Time
                                    </label>
                                    <input
                                      type="time"
                                      value={dailySummaryConfig.send_time}
                                      onChange={(e) => updateDailySummaryConfig('send_time', e.target.value)}
                                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <p className="text-sm text-gray-400 mt-2">Time when summaries are automatically sent</p>
                                  </div>

                                  <div>
                                    <label className="block text-base font-medium text-white mb-3">
                                      Timezone
                                    </label>
                                    <select
                                      value={dailySummaryConfig.timezone}
                                      onChange={(e) => updateDailySummaryConfig('timezone', e.target.value)}
                                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                      <option value="UTC">UTC</option>
                                      <option value="America/New_York">Eastern Time</option>
                                      <option value="America/Chicago">Central Time</option>
                                      <option value="America/Denver">Mountain Time</option>
                                      <option value="America/Los_Angeles">Pacific Time</option>
                                      <option value="Europe/London">London</option>
                                      <option value="Europe/Paris">Paris/Berlin</option>
                                      <option value="Asia/Tokyo">Tokyo</option>
                                    </select>
                                    <p className="text-sm text-gray-400 mt-2">Timezone for sending summaries</p>
                                  </div>
                                </div>
                              </div>

                              {/* Days of Week */}
                              <div>
                                <h4 className="text-lg font-medium text-white mb-6">Active Days</h4>
                                <div className="grid grid-cols-7 gap-4">
                                  {[
                                    { num: 1, name: 'Monday', short: 'Mon' },
                                    { num: 2, name: 'Tuesday', short: 'Tue' },
                                    { num: 3, name: 'Wednesday', short: 'Wed' },
                                    { num: 4, name: 'Thursday', short: 'Thu' },
                                    { num: 5, name: 'Friday', short: 'Fri' },
                                    { num: 6, name: 'Saturday', short: 'Sat' },
                                    { num: 7, name: 'Sunday', short: 'Sun' }
                                  ].map((day) => (
                                    <label
                                      key={day.num}
                                      className={`flex flex-col items-center p-4 rounded-xl cursor-pointer transition-colors ${
                                        dailySummaryConfig.send_days.includes(day.num)
                                          ? 'bg-blue-600 text-white shadow-lg'
                                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                      }`}
                                      title={day.name}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={dailySummaryConfig.send_days.includes(day.num)}
                                        onChange={(e) => {
                                          const newDays = e.target.checked
                                            ? [...dailySummaryConfig.send_days, day.num]
                                            : dailySummaryConfig.send_days.filter(d => d !== day.num)
                                          updateDailySummaryConfig('send_days', newDays)
                                        }}
                                        className="sr-only"
                                      />
                                      <span className="text-sm font-medium">{day.short}</span>
                                    </label>
                                  ))}
                                </div>
                                <p className="text-sm text-gray-400 mt-3">Select which days summaries should be automatically sent</p>
                              </div>

                              {/* Summary Status */}
                              <div className="flex items-center justify-between p-6 bg-gray-700 rounded-xl border border-gray-600">
                                <div>
                                  <div className="text-base font-medium text-white">Summary Automation</div>
                                  <div className="text-sm text-gray-400 mt-1">
                                    {dailySummaryConfig.enabled ? 'Automated summaries are active and will be sent according to the schedule above' : 'Summary automation is disabled'}
                                  </div>
                                </div>
                                <button
                                  onClick={() => updateDailySummaryConfig('enabled', !dailySummaryConfig.enabled)}
                                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                                    dailySummaryConfig.enabled ? 'bg-green-600' : 'bg-gray-600'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                      dailySummaryConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              Loading daily summary configuration...
                            </div>
                          )}
                        </div>
                      )}

                      {typeConfig.message_type === 'milestone' && (
                        <div className="space-y-8">
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-2">Milestone Configuration</h3>
                            <p className="text-gray-400">Configure milestone notifications for group achievements and progress markers</p>
                          </div>
                          
                          {milestoneConfigs.length > 0 ? (
                            <div className="space-y-6">
                              {/* Milestone Types */}
                              {['pot_amount', 'group_streak', 'total_points', 'member_count'].map((type) => {
                                const typeMilestones = milestoneConfigs.filter(m => m.milestone_type === type)
                                const typeTitle = type.split('_').map(word => 
                                  word.charAt(0).toUpperCase() + word.slice(1)
                                ).join(' ')
                                
                                return (
                                  <div key={type} className="bg-gray-700 rounded-xl p-6 border border-gray-600">
                                    <h4 className="text-lg font-medium text-white mb-4">{typeTitle} Milestones</h4>
                                    <div className="space-y-3">
                                      {typeMilestones.map((milestone) => (
                                        <div key={milestone.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                                          <div className="flex items-center gap-4">
                                            <button
                                              onClick={() => updateMilestoneEnabled(milestone.id, !milestone.enabled)}
                                              className={`w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
                                                milestone.enabled 
                                                  ? 'bg-green-500 border-green-500' 
                                                  : 'border-gray-500 hover:border-gray-400'
                                              }`}
                                            >
                                              {milestone.enabled && (
                                                <CheckCircleIcon className="w-3 h-3 text-white" />
                                              )}
                                            </button>
                                            <div>
                                              <div className="text-base font-medium text-white">
                                                {milestone.milestone_name}
                                              </div>
                                              <div className="text-sm text-gray-400 mt-1">
                                                {milestone.description || `Reach ${milestone.threshold_value}`}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                            <span className={`text-sm px-3 py-1 rounded-full border font-medium ${getRarityColor(milestone.rarity)}`}>
                                              {milestone.rarity}
                                            </span>
                                            <span className="text-sm text-gray-400 font-medium min-w-0">
                                              {type === 'pot_amount' && '€'}
                                              {milestone.threshold_value.toLocaleString()}
                                              {type === 'group_streak' && ' days'}
                                              {type === 'total_points' && ' pts'}
                                              {type === 'member_count' && ' members'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                              
                              {/* Overall Milestone Status */}
                              <div className="flex items-center justify-between p-6 bg-gray-700 rounded-xl border border-gray-600">
                                <div>
                                  <div className="text-base font-medium text-white">Milestone System Overview</div>
                                  <div className="text-sm text-gray-400 mt-1">
                                    {typeConfig.enabled ? 'Milestone notifications are active and will be sent when thresholds are reached' : 'Milestone notifications are disabled'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-white">
                                    {milestoneConfigs.filter(m => m.enabled).length}/{milestoneConfigs.length}
                                  </div>
                                  <div className="text-sm text-gray-400">milestones active</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-12 text-gray-400">
                              Loading milestone configuration...
                            </div>
                          )}
                        </div>
                      )}

                      {typeConfig.message_type === 'developer_note' && (
                        <div className="space-y-8">
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-2">Send Developer Note</h3>
                            <p className="text-gray-400">Send development updates, maintenance notices, or technical information to your group</p>
                          </div>
                          
                          <div className="space-y-6">
                            <div>
                              <label className="block text-base font-medium text-white mb-3">
                                Message Content
                              </label>
                              <textarea
                                value={developerNote}
                                onChange={(e) => setDeveloperNote(e.target.value)}
                                placeholder="Enter your developer note message..."
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                                rows={5}
                              />
                              <p className="text-sm text-gray-400 mt-2">This message will be sent to your current group with developer note formatting</p>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div className="text-sm text-gray-400">
                                Note: Developer notes are sent with medium priority and appear as system messages
                              </div>
                              <Button
                                onClick={sendDeveloperNote}
                                disabled={sendingMessage || !developerNote.trim() || !typeConfig.enabled}
                                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 text-base"
                              >
                                {sendingMessage ? 'Sending...' : 'Send Developer Note'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {typeConfig.message_type === 'public_message' && (
                        <div className="space-y-8">
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-2">Send Public Message</h3>
                            <p className="text-gray-400">Send system-wide announcements to all groups simultaneously - use for maintenance notices, platform updates, and important communications</p>
                          </div>
                          
                          <div className="space-y-6">
                            <div>
                              <label className="block text-base font-medium text-white mb-3">
                                Announcement Content
                              </label>
                              <textarea
                                value={publicMessage}
                                onChange={(e) => setPublicMessage(e.target.value)}
                                placeholder="Enter your public announcement message..."
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                                rows={5}
                              />
                              <p className="text-sm text-gray-400 mt-2">This message will be sent to all groups across the platform</p>
                            </div>
                            
                            <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl">
                              <div className="flex items-start gap-3">
                                <span className="text-yellow-400 text-xl">⚠️</span>
                                <div>
                                  <div className="text-sm font-medium text-yellow-400">Important</div>
                                  <div className="text-sm text-yellow-300 mt-1">
                                    This message will be delivered to every group on the platform. Use responsibly for critical announcements only.
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div className="text-sm text-gray-400">
                                Public messages appear as system announcements from "System"
                              </div>
                              <Button
                                onClick={sendPublicMessage}
                                disabled={sendingMessage || !publicMessage.trim() || !typeConfig.enabled}
                                className="bg-orange-600 hover:bg-orange-700 px-6 py-3 text-base font-medium"
                              >
                                {sendingMessage ? 'Sending...' : 'Send to All Groups'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Common Controls */}
                      <div className="mt-8 pt-8 border-t border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <Button
                              onClick={() => toggleMessageType(typeConfig.message_type)}
                              disabled={isLoading}
                              variant={typeConfig.enabled ? "destructive" : "default"}
                              size="lg"
                              className="px-6 py-3 text-base"
                            >
                              {typeConfig.enabled ? 'Disable Message Type' : 'Enable Message Type'}
                            </Button>
                            <div className="flex items-center gap-3">
                              <span className={`text-sm px-3 py-2 rounded-full border font-medium ${getRarityColor(typeConfig.default_rarity)}`}>
                                {typeConfig.default_rarity} rarity
                              </span>
                              <span className="text-sm text-gray-400">
                                {typeConfig.frequency} • {typeConfig.can_be_automated ? 'Automated' : 'Manual'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}