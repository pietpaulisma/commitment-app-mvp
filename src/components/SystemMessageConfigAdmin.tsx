import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { SystemMessageConfigService } from '@/services/systemMessageConfig'
import { GlobalSystemMessageConfig, SystemMessageTypeConfig, SystemMessageType, SystemMessageRarity } from '@/types/systemMessages'
import { useProfile } from '@/hooks/useProfile'
import { 
  CogIcon,
  SparklesIcon,
  TrophyIcon,
  CalendarDaysIcon,
  MegaphoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  PlayIcon,
  BoltIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

interface SystemMessageConfigAdminProps {
  isOpen: boolean
  onClose: () => void
}

export function SystemMessageConfigAdmin({ isOpen, onClose }: SystemMessageConfigAdminProps) {
  const { profile } = useProfile()
  const [config, setConfig] = useState<GlobalSystemMessageConfig | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'configuration' | 'statistics'>('overview')
  const [pendingChanges, setPendingChanges] = useState<{ [key: string]: any }>({})
  const [testMessages, setTestMessages] = useState<{ [key in SystemMessageType]?: string }>({
    daily_summary: "🌅 **Test Daily Summary**\n\n💪 **Commitment Rate**: 85% (4/5 members)\n🏆 **Top Performer**: TestUser (150 points)\n\n✨ Great commitment from the team!",
    challenge: "🎯 **Test Challenge Alert!**\n\n**30-Day Plank Challenge**\n\nHold a plank for 2 minutes every day for the next 30 days. Who's ready to take on the challenge? 💪",
    milestone: "💰 **MILESTONE REACHED!**\n\nThe group pot has hit €1000! 🎉\n\nThis is a legendary moment - you've all been crushing your commitments!\n\nKeep up the amazing work, team! 💪",
    developer_note: "📢 **Developer Update**\n\nWe've added some exciting new features to help you track your progress better. Check out the updated dashboard!\n\nThanks for your attention! 🙏"
  })

  const isSupremeAdmin = profile?.role === 'supreme_admin'

  useEffect(() => {
    if (isOpen && isSupremeAdmin) {
      loadConfig()
      loadStats()
    }
  }, [isOpen, isSupremeAdmin])

  const loadConfig = async () => {
    setIsLoading(true)
    const configData = await SystemMessageConfigService.getGlobalConfig()
    setConfig(configData)
    setIsLoading(false)
  }

  const loadStats = async () => {
    const statsData = await SystemMessageConfigService.getMessageTypeStats()
    setStats(statsData)
  }

  const handleGlobalToggle = async () => {
    if (!config) return

    const newValue = !config.is_globally_enabled
    const success = await SystemMessageConfigService.updateGlobalEnabled(newValue)
    
    if (success) {
      setConfig({ ...config, is_globally_enabled: newValue })
      alert(`System messages ${newValue ? 'enabled' : 'disabled'} globally`)
    } else {
      alert('Failed to update global setting')
    }
  }

  const handleMessageTypeToggle = (messageType: SystemMessageType) => {
    if (!config) return

    const currentConfig = config.message_type_configs.find(c => c.message_type === messageType)
    if (!currentConfig) return

    const newEnabled = !currentConfig.enabled
    
    setPendingChanges(prev => ({
      ...prev,
      [messageType]: {
        ...prev[messageType],
        enabled: newEnabled
      }
    }))

    // Update local state immediately for UI feedback
    const updatedConfigs = config.message_type_configs.map(c =>
      c.message_type === messageType ? { ...c, enabled: newEnabled } : c
    )
    setConfig({ ...config, message_type_configs: updatedConfigs })
  }

  const handleRarityChange = (messageType: SystemMessageType, rarity: SystemMessageRarity) => {
    if (!config) return

    setPendingChanges(prev => ({
      ...prev,
      [messageType]: {
        ...prev[messageType],
        default_rarity: rarity
      }
    }))

    // Update local state immediately for UI feedback
    const updatedConfigs = config.message_type_configs.map(c =>
      c.message_type === messageType ? { ...c, default_rarity: rarity } : c
    )
    setConfig({ ...config, message_type_configs: updatedConfigs })
  }

  const savePendingChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      alert('No changes to save')
      return
    }

    setIsLoading(true)
    
    const updates = Object.entries(pendingChanges).map(([messageType, changes]) => ({
      messageType: messageType as SystemMessageType,
      enabled: changes.enabled !== undefined ? changes.enabled : config?.message_type_configs.find(c => c.message_type === messageType)?.enabled || true,
      defaultRarity: changes.default_rarity || config?.message_type_configs.find(c => c.message_type === messageType)?.default_rarity || 'common'
    }))

    const success = await SystemMessageConfigService.bulkUpdateMessageTypes(updates)
    
    if (success) {
      setPendingChanges({})
      await loadConfig()
      await loadStats()
      alert('Settings saved successfully!')
    } else {
      alert('Failed to save some settings')
    }
    
    setIsLoading(false)
  }

  const sendTestMessage = async (messageType: SystemMessageType) => {
    if (!profile?.group_id || !testMessages[messageType]) return

    setIsLoading(true)
    const success = await SystemMessageConfigService.testSystemMessage(
      profile.group_id,
      messageType,
      testMessages[messageType]!
    )
    
    if (success) {
      alert(`Test ${messageType.replace('_', ' ')} sent successfully!`)
    } else {
      alert(`Failed to send test ${messageType.replace('_', ' ')}`)
    }
    
    setIsLoading(false)
  }

  const getMessageTypeIcon = (messageType: SystemMessageType) => {
    switch (messageType) {
      case 'daily_summary':
        return CalendarDaysIcon
      case 'challenge':
        return TrophyIcon
      case 'milestone':
        return SparklesIcon
      case 'developer_note':
        return CogIcon
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-8 h-8 text-purple-400" />
            <div>
              <h2 className="text-xl font-bold text-white">System Message Configuration</h2>
              <p className="text-sm text-gray-400">Global settings for all system messages</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Global Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">Global System Messages</span>
              <button
                onClick={handleGlobalToggle}
                disabled={isLoading}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${config?.is_globally_enabled ? 'bg-green-600' : 'bg-gray-600'}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${config?.is_globally_enabled ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('configuration')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'configuration'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'statistics'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Statistics
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {config?.message_type_configs.map((typeConfig) => {
                  const IconComponent = getMessageTypeIcon(typeConfig.message_type)
                  return (
                    <div
                      key={typeConfig.message_type}
                      className={`
                        bg-gray-800 rounded-lg p-4 border transition-all duration-200
                        ${typeConfig.enabled 
                          ? 'border-green-500/30 bg-green-500/5' 
                          : 'border-red-500/30 bg-red-500/5'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <IconComponent className={`w-6 h-6 ${typeConfig.enabled ? 'text-green-400' : 'text-red-400'}`} />
                        {typeConfig.enabled ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <h3 className="font-semibold text-white mb-1">
                        {formatMessageType(typeConfig.message_type)}
                      </h3>
                      <p className="text-xs text-gray-400 mb-2">
                        {typeConfig.description.slice(0, 60)}...
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`
                          text-xs px-2 py-1 rounded-full border
                          ${getRarityColor(typeConfig.default_rarity)}
                        `}>
                          {typeConfig.default_rarity}
                        </span>
                        <span className="text-xs text-gray-500">
                          {typeConfig.frequency}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => setActiveTab('configuration')}
                    className="flex items-center gap-2 h-auto p-4 justify-start"
                    variant="outline"
                  >
                    <CogIcon className="w-6 h-6 text-purple-400" />
                    <div className="text-left">
                      <div className="font-medium">Configure Message Types</div>
                      <div className="text-sm text-gray-400">Enable/disable and set default rarities</div>
                    </div>
                  </Button>
                  <Button
                    onClick={() => setActiveTab('statistics')}
                    className="flex items-center gap-2 h-auto p-4 justify-start"
                    variant="outline"
                  >
                    <ChartBarIcon className="w-6 h-6 text-blue-400" />
                    <div className="text-left">
                      <div className="font-medium">View Statistics</div>
                      <div className="text-sm text-gray-400">Analyze system message usage</div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'configuration' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Message Type Configuration</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={savePendingChanges}
                    disabled={isLoading || Object.keys(pendingChanges).length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? 'Saving...' : `Save Changes ${Object.keys(pendingChanges).length > 0 ? `(${Object.keys(pendingChanges).length})` : ''}`}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {config?.message_type_configs.map((typeConfig) => {
                  const IconComponent = getMessageTypeIcon(typeConfig.message_type)
                  const hasPendingChanges = pendingChanges[typeConfig.message_type]
                  
                  return (
                    <div
                      key={typeConfig.message_type}
                      className={`
                        bg-gray-800 rounded-lg p-6 border transition-all duration-200
                        ${hasPendingChanges ? 'border-yellow-400/50 bg-yellow-400/5' : 'border-gray-700'}
                      `}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <IconComponent className="w-8 h-8 text-purple-400" />
                          <div>
                            <h4 className="text-lg font-semibold text-white">
                              {formatMessageType(typeConfig.message_type)}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {typeConfig.description}
                            </p>
                          </div>
                        </div>
                        {hasPendingChanges && (
                          <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                            Modified
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Enable/Disable */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Status
                          </label>
                          <button
                            onClick={() => handleMessageTypeToggle(typeConfig.message_type)}
                            disabled={isLoading}
                            className={`
                              flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
                              ${typeConfig.enabled 
                                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                              }
                              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-opacity-20'}
                            `}
                          >
                            {typeConfig.enabled ? (
                              <>
                                <EyeIcon className="w-4 h-4" />
                                Enabled
                              </>
                            ) : (
                              <>
                                <EyeSlashIcon className="w-4 h-4" />
                                Disabled
                              </>
                            )}
                          </button>
                        </div>

                        {/* Default Rarity */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Default Rarity
                          </label>
                          <div className="flex gap-2">
                            {(['common', 'rare', 'legendary'] as SystemMessageRarity[]).map((rarity) => (
                              <button
                                key={rarity}
                                onClick={() => handleRarityChange(typeConfig.message_type, rarity)}
                                disabled={isLoading}
                                className={`
                                  px-3 py-2 text-xs rounded-lg border transition-all
                                  ${typeConfig.default_rarity === rarity
                                    ? getRarityColor(rarity)
                                    : 'text-gray-400 bg-gray-700 border-gray-600 hover:bg-gray-600'
                                  }
                                `}
                              >
                                {rarity}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Test Message */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Test Message
                          </label>
                          <Button
                            onClick={() => sendTestMessage(typeConfig.message_type)}
                            disabled={isLoading || !typeConfig.enabled || !config?.is_globally_enabled}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <PlayIcon className="w-4 h-4" />
                            Send Test
                          </Button>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            Automation: {typeConfig.can_be_automated ? 'Yes' : 'No'}
                          </span>
                          <span>
                            Frequency: {typeConfig.frequency}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">System Message Statistics</h3>
              
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Total Messages */}
                  <div className="bg-gray-800 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <ChartBarIcon className="w-8 h-8 text-blue-400" />
                      <div>
                        <h4 className="font-semibold text-white">Total Messages</h4>
                        <p className="text-sm text-gray-400">All time</p>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {stats.total_messages.toLocaleString()}
                    </div>
                  </div>

                  {/* Messages by Type */}
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h4 className="font-semibold text-white mb-4">By Message Type</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.messages_by_type).map(([type, count]) => (
                        <div key={type} className="flex justify-between">
                          <span className="text-sm text-gray-400">
                            {formatMessageType(type as SystemMessageType)}
                          </span>
                          <span className="text-sm text-white font-medium">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Messages by Rarity */}
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h4 className="font-semibold text-white mb-4">By Rarity</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.messages_by_rarity).map(([rarity, count]) => (
                        <div key={rarity} className="flex justify-between">
                          <span className={`text-sm font-medium ${
                            rarity === 'legendary' ? 'text-yellow-400' :
                            rarity === 'rare' ? 'text-purple-400' : 'text-blue-400'
                          }`}>
                            {rarity}
                          </span>
                          <span className="text-sm text-white font-medium">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  {stats.recent_activity.length > 0 && (
                    <div className="bg-gray-800 rounded-lg p-6 md:col-span-2 lg:col-span-3">
                      <h4 className="font-semibold text-white mb-4">Recent Activity (Last 7 Days)</h4>
                      <div className="space-y-2">
                        {stats.recent_activity.map((activity: any, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-sm text-gray-400">
                              {new Date(activity.date).toLocaleDateString()}
                            </span>
                            <span className="text-sm text-white font-medium">
                              {activity.count} messages
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Loading statistics...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-800/50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {config && (
                <>
                  System messages are {config.is_globally_enabled ? 'enabled' : 'disabled'} globally
                  {Object.keys(pendingChanges).length > 0 && (
                    <span className="ml-2 text-yellow-400">
                      • {Object.keys(pendingChanges).length} unsaved changes
                    </span>
                  )}
                </>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}