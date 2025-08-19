import React from 'react'
import { SystemMessage, SystemMessageRarity } from '@/types/systemMessages'
import { 
  SparklesIcon, 
  TrophyIcon, 
  BoltIcon, 
  MegaphoneIcon,
  CalendarDaysIcon,
  CogIcon
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
        return {
          border: 'border-yellow-400/50',
          bg: 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10',
          glow: 'shadow-lg shadow-yellow-500/20',
          icon: 'text-yellow-400',
          accent: 'text-yellow-300'
        }
      case 'rare':
        return {
          border: 'border-purple-400/50',
          bg: 'bg-gradient-to-r from-purple-500/10 to-blue-500/10',
          glow: 'shadow-lg shadow-purple-500/20',
          icon: 'text-purple-400',
          accent: 'text-purple-300'
        }
      case 'common':
      default:
        return {
          border: 'border-blue-400/50',
          bg: 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10',
          glow: 'shadow-md shadow-blue-500/10',
          icon: 'text-blue-400',
          accent: 'text-blue-300'
        }
    }
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
  const IconComponent = getMessageTypeIcon(messageType)

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
    <div className={`w-full ${isLastInGroup ? 'mb-4' : 'mb-2'}`}>
      {/* Timestamp - positioned at top right */}
      {isFirstInGroup && (
        <div className="flex justify-end mb-1">
          <div className="text-xs text-gray-400">
            {formatTime(message.created_at)}
          </div>
        </div>
      )}
      
      {/* System Message Card */}
      <div 
        className={`
          relative w-full rounded-xl p-4 border transition-all duration-300
          ${styles.border} ${styles.bg} ${styles.glow}
        `}
      >
        {/* Rarity indicator */}
        {rarity !== 'common' && (
          <div className="absolute top-2 right-2">
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
              ${rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-purple-500/20 text-purple-300'}
            `}>
              <BoltIcon className="w-3 h-3" />
              {rarity}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center
            ${styles.bg} ${styles.border} border
          `}>
            <IconComponent className={`w-6 h-6 ${styles.icon}`} />
          </div>
          <div className="flex-1">
            <div className={`font-bold text-sm ${styles.accent}`}>
              {senderName}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              System Message
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="text-sm text-gray-100 leading-relaxed">
          {formatMessage(message.message)}
        </div>

        {/* System message type badge */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`
              text-xs px-2 py-1 rounded-full font-medium
              ${styles.bg} ${styles.border} border
            `}>
              {messageType.replace('_', ' ').toUpperCase()}
            </div>
          </div>
          
          {/* Delete button for admins */}
          {onDelete && systemMessageData && (
            <button
              onClick={() => onDelete(systemMessageData.id)}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          )}
        </div>

        {/* Animated border for legendary messages */}
        {rarity === 'legendary' && (
          <div className="absolute inset-0 rounded-xl border border-yellow-400/30 animate-pulse pointer-events-none" />
        )}
      </div>
    </div>
  )
}