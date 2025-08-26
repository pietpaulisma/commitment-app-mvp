import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { SystemMessageService } from '@/services/systemMessages'
import { SystemMessage, SystemMessageRarity } from '@/types/systemMessages'
import { useProfile } from '@/hooks/useProfile'
import { 
  CogIcon,
  PlusIcon,
  SparklesIcon,
  TrophyIcon,
  CalendarDaysIcon,
  MegaphoneIcon,
  TrashIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline'

interface SystemMessageAdminProps {
  groupId: string
  isOpen: boolean
  onClose: () => void
}

export function SystemMessageAdmin({ groupId, isOpen, onClose }: SystemMessageAdminProps) {
  const { profile } = useProfile()
  const [senderName, setSenderName] = useState('Barry')
  const [originalSenderName, setOriginalSenderName] = useState('Barry')
  const [newMessage, setNewMessage] = useState('')
  const [messageCategory, setMessageCategory] = useState('')
  const [messagePriority, setMessagePriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [isLoading, setIsLoading] = useState(false)
  const [recentMessages, setRecentMessages] = useState<SystemMessage[]>([])
  const [activeTab, setActiveTab] = useState<'settings' | 'create' | 'history'>('settings')

  const isAdmin = profile?.role === 'group_admin' || profile?.role === 'supreme_admin'

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadSystemSenderName()
      loadRecentMessages()
    }
  }, [isOpen, groupId, isAdmin])

  const loadSystemSenderName = async () => {
    const name = await SystemMessageService.getSystemSenderName(groupId)
    setSenderName(name)
    setOriginalSenderName(name)
  }

  const loadRecentMessages = async () => {
    const messages = await SystemMessageService.getSystemMessages(groupId, undefined, undefined, 20)
    setRecentMessages(messages)
  }

  const handleSaveSenderName = async () => {
    if (senderName.trim() && senderName !== originalSenderName) {
      setIsLoading(true)
      const success = await SystemMessageService.updateSystemSenderName(groupId, senderName.trim())
      if (success) {
        setOriginalSenderName(senderName.trim())
        alert('System sender name updated successfully!')
      } else {
        alert('Failed to update sender name')
        setSenderName(originalSenderName)
      }
      setIsLoading(false)
    }
  }

  const handleSendDeveloperNote = async () => {
    if (!newMessage.trim()) return

    setIsLoading(true)
    const message = await SystemMessageService.createDeveloperNote(
      groupId,
      newMessage.trim(),
      messagePriority,
      messageCategory.trim() || undefined
    )

    if (message) {
      setNewMessage('')
      setMessageCategory('')
      setMessagePriority('medium')
      await loadRecentMessages()
      alert('Developer note sent successfully!')
    } else {
      alert('Failed to send developer note')
    }
    setIsLoading(false)
  }

  const handleGenerateDailySummary = async () => {
    setIsLoading(true)
    const message = await SystemMessageService.generateDailySummary(groupId)
    
    if (message) {
      await loadRecentMessages()
      alert('Daily summary generated successfully!')
    } else {
      alert('Failed to generate daily summary')
    }
    setIsLoading(false)
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this system message?')) return

    setIsLoading(true)
    const success = await SystemMessageService.deleteSystemMessage(messageId)
    
    if (success) {
      await loadRecentMessages()
      alert('System message deleted successfully!')
    } else {
      alert('Failed to delete system message')
    }
    setIsLoading(false)
  }

  const getMessageTypeIcon = (messageType: string) => {
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
        return 'text-yellow-400'
      case 'rare':
        return 'text-purple-400'
      case 'common':
      default:
        return 'text-blue-400'
    }
  }

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-white mb-4">Access Denied</h3>
          <p className="text-gray-400 mb-6">You need admin privileges to access system message controls.</p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <CogIcon className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-white">System Message Admin</h2>
              <p className="text-sm text-gray-400">Manage system messages and settings</p>
            </div>
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

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Message
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Message History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Sender Name Configuration */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">System Sender Name</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Customize the name that appears on system messages in your group chat.
                </p>
                <div className="flex gap-3">
                  <Input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Enter sender name..."
                    className="flex-1"
                    maxLength={50}
                  />
                  <Button
                    onClick={handleSaveSenderName}
                    disabled={isLoading || !senderName.trim() || senderName === originalSenderName}
                    className="px-6"
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={handleGenerateDailySummary}
                    disabled={isLoading}
                    className="flex items-center gap-2 h-auto p-4 justify-start"
                    variant="outline"
                  >
                    <CalendarDaysIcon className="w-6 h-6 text-blue-400" />
                    <div className="text-left">
                      <div className="font-medium">Generate Daily Summary</div>
                      <div className="text-sm text-gray-400">Create today&apos;s commitment summary</div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Send Developer Note</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Send a message to all group members from the admin team.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category (Optional)
                  </label>
                  <Input
                    value={messageCategory}
                    onChange={(e) => setMessageCategory(e.target.value)}
                    placeholder="e.g., Update, Announcement, Maintenance"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={messagePriority}
                    onChange={(e) => setMessagePriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message Content
                </label>
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Enter your message to the group..."
                  rows={5}
                  maxLength={500}
                  className="resize-none"
                />
                <div className="text-xs text-gray-400 mt-1">
                  {newMessage.length}/500 characters
                </div>
              </div>

              <Button
                onClick={handleSendDeveloperNote}
                disabled={isLoading || !newMessage.trim()}
                className="flex items-center gap-2"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                {isLoading ? 'Sending...' : 'Send Developer Note'}
              </Button>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Recent System Messages</h3>
                <Button
                  onClick={loadRecentMessages}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                >
                  Refresh
                </Button>
              </div>

              {recentMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No system messages found
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMessages.map((message) => {
                    const IconComponent = getMessageTypeIcon(message.message_type)
                    return (
                      <div
                        key={message.id}
                        className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <IconComponent className={`w-5 h-5 ${getRarityColor(message.rarity)}`} />
                            <div>
                              <div className="font-medium text-white">{message.title}</div>
                              <div className="text-sm text-gray-400">
                                {message.message_type.replace('_', ' ')} • {formatDateTime(message.created_at)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getRarityColor(message.rarity)}`}>
                              {message.rarity}
                            </span>
                            <Button
                              onClick={() => handleDeleteMessage(message.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-300 line-clamp-3">
                          {message.content}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-800/50">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}