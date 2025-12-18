import React from 'react'
import { SystemMessage, SystemMessageRarity } from '@/types/systemMessages'
import {
  SparklesIcon,
  TrophyIcon,
  BoltIcon,
  MegaphoneIcon,
  CalendarDaysIcon,
  CogIcon,
  ExclamationTriangleIcon,
  HeartIcon
} from '@heroicons/react/24/outline'

interface SystemMessageComponentProps {
  message: {
    id: string
    message: string
    created_at: string
    is_system_message: boolean
    system_message_id?: string
  }
  systemMessageData?: SystemMessage
  currentUser: { id: string; email?: string; username?: string }
  onDelete?: (messageId: string) => void
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
}

export function SystemMessageComponent({
  message,
  systemMessageData,
  currentUser,
  onDelete,
  isFirstInGroup = true,
  isLastInGroup = true
}: SystemMessageComponentProps) {

  const getRarityStyles = (rarity: SystemMessageRarity) => {
    switch (rarity) {
      case 'legendary':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
      case 'rare':
        return 'text-purple-400 border-purple-500/30 bg-purple-500/10'
      case 'common':
      default:
        return 'text-zinc-400 border-white/5 bg-white/5'
    }
  }

  const getMessageTypeIcon = (messageType: string, messageText: string = '') => {
    // Check for specific message patterns
    if (messageText.includes('penalty') || messageText.includes('fine')) {
      return ExclamationTriangleIcon
    }
    if (messageText.includes('sick mode')) {
      return HeartIcon
    }

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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const rarity = systemMessageData?.rarity || 'common'
  const messageType = systemMessageData?.message_type || 'developer_note'
  const senderName = systemMessageData?.sender_name || 'Barry'
  const styles = getRarityStyles(rarity)
  const IconComponent = getMessageTypeIcon(messageType, message.message)

  // Parse message content to handle markdown-style formatting
  const formatMessage = (content: string) => {
    // Simple markdown parsing for **bold** text
    return content.split('\n').map((line, index) => {
      // Handle bold text
      const parts = line.split(/(\*\*.*?\*\*)/g)
      const formattedParts = parts.map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <span key={partIndex} className="font-bold">
              {part.slice(2, -2)}
            </span>
          )
        }
        return part
      })

      return (
        <div key={index} className={index > 0 ? 'mt-1' : ''}>
          {formattedParts}
        </div>
      )
    })
  }

  return (
    <div className={`w-full flex justify-center my-3 ${isLastInGroup ? 'mb-4' : 'mb-2'}`}>
      <div
        className={`
          relative flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all duration-300
          ${styles}
        `}
      >
        <IconComponent className="w-3 h-3" />

        <div className="text-[10px] font-bold uppercase tracking-wider">
          {messageType === 'developer_note' ? (
            <span><span className="opacity-70">{senderName}:</span> {message.message}</span>
          ) : (
            <span>{message.message}</span>
          )}
        </div>

        {/* Delete button for admins (only if hovering or always visible if important? kept hidden for minimal look for now) */}
        {onDelete && systemMessageData && (
          <button
            onClick={() => onDelete(systemMessageData.id)}
            className="ml-2 text-white/20 hover:text-red-400 transition-colors"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}