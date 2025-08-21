'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  XMarkIcon, 
  PhotoIcon, 
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  FaceSmileIcon,
  HeartIcon,
  HandThumbUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'
import { 
  HeartIcon as HeartIconSolid,
  HandThumbUpIcon as HandThumbUpIconSolid,
  FaceSmileIcon as FaceSmileIconSolid
} from '@heroicons/react/24/solid'
import { MessageCircle, Plus, Send, X, Reply } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { MessageComponent } from './MessageComponent'
import { SystemMessageComponent } from './SystemMessageComponent'
import { WorkoutSummaryPost } from './WorkoutSummaryPost'
import { SystemMessage } from '@/types/systemMessages'
import { SystemMessageService } from '@/services/systemMessages'

type ChatMessage = {
  id: string
  group_id: string
  user_id: string | null
  message: string
  message_type?: 'text' | 'image' | 'workout_completion'
  image_url?: string
  workout_data?: any
  created_at: string
  user_email?: string
  user_role?: string
  username?: string
  reactions?: MessageReaction[]
  is_system_message?: boolean
  system_message_id?: string
  replyTo?: {
    messageId: string
    userName: string
    content: string
    type: 'text' | 'image' | 'workout'
  }
}

type MessageReaction = {
  id: string
  message_id: string
  user_id: string
  emoji: string
  user_email?: string
}

type EmojiOption = {
  emoji: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  solidIcon: React.ComponentType<{ className?: string }>
}

type GroupChatProps = {
  isOpen: boolean
  onClose: () => void
  onCloseStart?: () => void
}

type WorkoutCompletionMessageProps = {
  message: ChatMessage
  workoutData: any
}

const WorkoutCompletionMessage = ({ message, workoutData }: WorkoutCompletionMessageProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!workoutData) return null
  
  const progressPercentage = workoutData.target_points > 0 
    ? Math.min(100, (workoutData.total_points / workoutData.target_points) * 100)
    : 0

  return (
    <div className="workout-completion-message">
      {/* Main completion header */}
      <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-4 border border-green-500/30">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <TrophyIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-green-400 text-sm">Workout Completed! 🎉</div>
            <div className="text-xs text-gray-400">
              {workoutData.username || 'User'} crushed their target
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-white">{workoutData.total_points}</div>
            <div className="text-xs text-gray-400">points</div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
          <div 
            className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progressPercentage)}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-300">
          <span>Target: {workoutData.target_points} pts</span>
          <span>{Math.round(progressPercentage)}% completed</span>
        </div>
        
        {/* Expand/collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 flex items-center justify-center space-x-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
        >
          <span>{isExpanded ? 'Hide' : 'Show'} workout details</span>
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )}
        </button>
      </div>
      
      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">Exercises Completed</div>
          <div className="space-y-2">
            {Object.entries(workoutData.exercises || {}).map(([exerciseName, exerciseData]: [string, any]) => (
              <div key={exerciseName} className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-white font-medium">{exerciseName}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white">
                    {exerciseData.count} {exerciseData.unit}
                  </div>
                  <div className="text-xs text-gray-400">
                    {exerciseData.points} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Completed at</span>
              <span className="text-sm text-white">
                {new Date(workoutData.completed_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GroupChat({ isOpen, onClose, onCloseStart }: GroupChatProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [groupName, setGroupName] = useState('')
  const [onlineCount, setOnlineCount] = useState(0)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  // Animation states
  const [isAnimatedIn, setIsAnimatedIn] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [showIconTransition, setShowIconTransition] = useState(false)
  
  // Image upload states
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Reaction states
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [reactions, setReactions] = useState<{ [messageId: string]: MessageReaction[] }>({})

  // Reply states
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  // System message states
  const [systemMessages, setSystemMessages] = useState<{ [messageId: string]: SystemMessage }>({})

  // Available emoji reactions
  const emojiOptions: EmojiOption[] = [
    { emoji: '❤️', label: 'heart', icon: HeartIcon, solidIcon: HeartIconSolid },
    { emoji: '👍', label: 'thumbs_up', icon: HandThumbUpIcon, solidIcon: HandThumbUpIconSolid },
    { emoji: '😊', label: 'smile', icon: FaceSmileIcon, solidIcon: FaceSmileIconSolid }
  ]

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true)
    
    // Start reverse icon animation immediately - X flips back to chat
    setShowIconTransition(false)
    
    // Start modal slide down animation
    setIsAnimatedIn(false)
    
    // Notify parent immediately that close animation started (for button sync)
    if (onCloseStart) {
      onCloseStart()
    }
    
    // Wait for animation to complete, then actually close
    setTimeout(() => {
      onClose()
    }, 500) // Match the CSS transition duration
  }

  useEffect(() => {
    if (isOpen && profile?.group_id) {
      // Reset all chat state for fresh loading
      setIsInitialLoad(true)
      setMessages([])
      setSystemMessages({})
      setLoading(true)
      
      loadMessages()
      loadGroupName()
      
      // Wait for modal to be fully mounted before starting animation
      setTimeout(() => {
        setIsAnimatedIn(true)
        
        // Delay icon transition until modal reaches the top
        setTimeout(() => {
          setShowIconTransition(true)
        }, 200) // Delay icon transition
      }, 50) // Small delay to ensure DOM is ready
      
      // Set up real-time subscription
      const channel = supabase
        .channel(`group_chat_${profile.group_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `group_id=eq.${profile.group_id}`
          },
          async (payload) => {
            console.log('Real-time message received:', payload)
            // Skip if this is our own message (already added optimistically) and it's not a system message
            if (payload.new && (payload.new.user_id !== user?.id || payload.new.is_system_message)) {
              try {
                let userInfo = null
                
                // Get user info for regular messages
                if (payload.new.user_id && !payload.new.is_system_message) {
                  const { data } = await supabase
                    .from('profiles')
                    .select('email, role, username')
                    .eq('id', payload.new.user_id)
                    .single()
                  userInfo = data
                }

                const newMessage: ChatMessage = {
                  id: payload.new.id,
                  group_id: payload.new.group_id,
                  user_id: payload.new.user_id,
                  message: payload.new.message,
                  message_type: payload.new.message_type || 'text',
                  image_url: payload.new.image_url,
                  created_at: payload.new.created_at,
                  is_system_message: payload.new.is_system_message || false,
                  system_message_id: payload.new.system_message_id,
                  user_email: userInfo?.email || 'Unknown',
                  user_role: userInfo?.role || 'user',
                  username: userInfo?.username,
                  reactions: []
                }

                // Load system message data if it's a system message
                if (newMessage.is_system_message && newMessage.system_message_id) {
                  await loadSystemMessages([newMessage.system_message_id])
                }

                setMessages(prev => [...prev, newMessage])
              } catch (error) {
                console.error('Error processing real-time message:', error)
                // Fallback to full reload only for others' messages
                if (payload.new.user_id !== user?.id) {
                  loadMessages()
                }
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_reactions'
          },
          async (payload) => {
            console.log('Real-time reaction update:', payload)
            
            if (payload.eventType === 'INSERT') {
              // Get user info for the new reaction
              const { data: userInfo } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', payload.new.user_id)
                .single()

              const newReaction: MessageReaction = {
                id: payload.new.id,
                message_id: payload.new.message_id,
                user_id: payload.new.user_id,
                emoji: payload.new.emoji,
                user_email: userInfo?.email || 'Unknown'
              }

              setMessages(prev => prev.map(msg => 
                msg.id === payload.new.message_id ? {
                  ...msg,
                  reactions: [...(msg.reactions || []), newReaction]
                } : msg
              ))
            } else if (payload.eventType === 'DELETE') {
              setMessages(prev => prev.map(msg => 
                msg.id === payload.old.message_id ? {
                  ...msg,
                  reactions: msg.reactions?.filter(r => r.id !== payload.old.id) || []
                } : msg
              ))
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status)
        })

      return () => {
        supabase.removeChannel(channel)
      }
    } else if (!isOpen) {
      // Reset all states when chat is closed
      setIsAnimatedIn(false)
      setIsClosing(false)
      setShowIconTransition(false)
      setMessages([])
      setLoading(true)
      setSystemMessages({})
    }
  }, [isOpen, profile?.group_id])

  useEffect(() => {
    if (messages.length > 0) {
      // Use requestAnimationFrame for better scroll performance in PWA
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToBottom(isInitialLoad)
        }, isInitialLoad ? 150 : 50)
      })
      
      if (isInitialLoad) {
        setIsInitialLoad(false)
      }
    }
  }, [messages, isInitialLoad])

  const scrollToBottom = (instant = false) => {
    if (messagesEndRef.current) {
      try {
        // Use instant scroll for better PWA performance, especially on initial load
        messagesEndRef.current.scrollIntoView({ 
          behavior: instant || isInitialLoad ? 'instant' : 'smooth',
          block: 'end'
        })
      } catch (e) {
        // Fallback for older iOS versions and PWA edge cases
        const container = messagesEndRef.current.parentElement
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      }
    }
  }

  const loadGroupName = async () => {
    if (!profile?.group_id) return

    try {
      const { data: group } = await supabase
        .from('groups')
        .select('name')
        .eq('id', profile.group_id)
        .single()

      if (group) {
        setGroupName(group.name)
      }
    } catch (error) {
      console.error('Error loading group name:', error)
    }
  }

  const loadMessages = async () => {
    if (!profile?.group_id) return

    try {
      setLoading(true)
      // Limit to 100 recent messages for better mobile performance
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          group_id,
          user_id,
          message,
          message_type,
          image_url,
          created_at,
          is_system_message,
          system_message_id,
          profiles (email, role, username)
        `)
        .eq('group_id', profile.group_id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      const formattedMessages: ChatMessage[] = messagesData?.map(msg => ({
        id: msg.id,
        group_id: msg.group_id,
        user_id: msg.user_id,
        message: msg.message,
        message_type: msg.message_type || 'text',
        image_url: msg.image_url,
        created_at: msg.created_at,
        is_system_message: msg.is_system_message || false,
        system_message_id: msg.system_message_id,
        user_email: msg.profiles?.email || 'Unknown',
        user_role: msg.profiles?.role || 'user',
        username: msg.profiles?.username,
        reactions: []
      })).reverse() || [] // Reverse to get chronological order after descending query

      // Debug: Check for workout completion messages
      const workoutMessages = formattedMessages.filter(m => m.message_type === 'workout_completion')
      console.log('Loaded workout completion messages:', workoutMessages.map(m => ({
        id: m.id,
        user_email: m.user_email,
        message_type: m.message_type,
        created_at: m.created_at,
        message_preview: m.message?.substring(0, 100)
      })))

      // Load system message data for system messages
      await loadSystemMessages(formattedMessages.filter(m => m.is_system_message && m.system_message_id).map(m => m.system_message_id!))

      // Load reactions for all messages
      await loadReactions(formattedMessages.map(m => m.id))
      setMessages(formattedMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSystemMessages = async (systemMessageIds: string[]) => {
    if (systemMessageIds.length === 0) return

    try {
      const { data: systemMessagesData, error } = await supabase
        .from('system_messages')
        .select('*')
        .in('id', systemMessageIds)

      if (error) throw error

      const systemMessagesMap: { [messageId: string]: SystemMessage } = {}
      systemMessagesData?.forEach(msg => {
        systemMessagesMap[msg.id] = msg
      })

      setSystemMessages(prev => ({ ...prev, ...systemMessagesMap }))
    } catch (error) {
      console.error('Error loading system messages:', error)
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `chat-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return null
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      return null
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedImage) || !user || !profile?.group_id || sending || uploading) return

    const messageText = newMessage.trim()
    const tempId = `temp-${Date.now()}`
    
    setSending(true)
    setUploading(selectedImage ? true : false)
    
    try {
      let imageUrl: string | null = null
      
      // Upload image if selected
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage)
        if (!imageUrl) {
          alert('Failed to upload image. Please try again.')
          setSending(false)
          setUploading(false)
          return
        }
      }
      
      // Create reply info if replying
      let replyInfo;
      if (replyingTo) {
        const originalMessage = getReplyingToMessage();
        if (originalMessage) {
          replyInfo = {
            messageId: originalMessage.id,
            userName: originalMessage.username || 'User',
            content: originalMessage.message_type === 'workout_completion' 
              ? 'Workout summary' 
              : originalMessage.message || 'Message',
            type: originalMessage.message_type === 'workout_completion' 
              ? 'workout' as const
              : originalMessage.message_type === 'image' 
                ? 'image' as const 
                : 'text' as const
          };
        }
      }

      // Create optimistic message
      const optimisticMessage: ChatMessage = {
        id: tempId,
        group_id: profile.group_id,
        user_id: user.id,
        message: messageText || '',
        message_type: imageUrl ? 'image' : 'text',
        image_url: imageUrl || undefined,
        created_at: new Date().toISOString(),
        user_email: profile.email,
        user_role: profile.role,
        username: profile.username,
        reactions: [],
        replyTo: replyInfo
      }

      setMessages(prev => [...prev, optimisticMessage])
      setNewMessage('')
      setSelectedImage(null)
      setImagePreview(null)
      setReplyingTo(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Send to database
      const { error, data } = await supabase
        .from('chat_messages')
        .insert({
          group_id: profile.group_id,
          user_id: user.id,
          message: messageText || '',
          message_type: imageUrl ? 'image' : 'text',
          image_url: imageUrl
        })
        .select()

      if (error) {
        console.error('Chat error details:', error)
        // Remove the optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        setNewMessage(messageText) // Restore the message text
        if (selectedImage) {
          setSelectedImage(selectedImage)
          setImagePreview(imagePreview)
        }
        alert(`Failed to send message: ${error.message}`)
        return
      }

      // Replace optimistic message with real one
      if (data && data[0]) {
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? {
            ...optimisticMessage,
            id: data[0].id,
            created_at: data[0].created_at
          } : msg
        ))
      }

      console.log('Message sent successfully:', data)
    } catch (error) {
      console.error('Unexpected error sending message:', error)
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      setNewMessage(messageText) // Restore the message text
      alert('Failed to send message. Please check console for details.')
    } finally {
      setSending(false)
      setUploading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    // Always show just time like WhatsApp, no dates
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const loadReactions = async (messageIds: string[]) => {
    if (messageIds.length === 0) return

    try {
      const { data: reactionsData, error } = await supabase
        .from('message_reactions')
        .select(`
          id,
          message_id,
          user_id,
          emoji,
          profiles!user_id (email)
        `)
        .in('message_id', messageIds)

      if (error) throw error

      const reactionsByMessage: { [messageId: string]: MessageReaction[] } = {}
      reactionsData?.forEach(reaction => {
        if (!reactionsByMessage[reaction.message_id]) {
          reactionsByMessage[reaction.message_id] = []
        }
        reactionsByMessage[reaction.message_id].push({
          id: reaction.id,
          message_id: reaction.message_id,
          user_id: reaction.user_id,
          emoji: reaction.emoji,
          user_email: reaction.profiles?.email || 'Unknown'
        })
      })

      // Update messages with reactions
      setMessages(prev => prev.map(msg => ({
        ...msg,
        reactions: reactionsByMessage[msg.id] || []
      })))
    } catch (error) {
      console.error('Error loading reactions:', error)
    }
  }

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return

    try {
      // Check if user already reacted with this emoji
      const message = messages.find(m => m.id === messageId)
      const existingReaction = message?.reactions?.find(r => r.user_id === user.id && r.emoji === emoji)
      
      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id)

        if (error) throw error

        // Update local state
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? {
            ...msg,
            reactions: msg.reactions?.filter(r => r.id !== existingReaction.id) || []
          } : msg
        ))
      } else {
        // Add reaction
        const { data, error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji: emoji
          })
          .select()
          .single()

        if (error) throw error

        // Update local state
        const newReaction: MessageReaction = {
          id: data.id,
          message_id: messageId,
          user_id: user.id,
          emoji: emoji,
          user_email: profile?.email || 'Unknown'
        }

        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? {
            ...msg,
            reactions: [...(msg.reactions || []), newReaction]
          } : msg
        ))
      }
    } catch (error) {
      console.error('Error managing reaction:', error)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'supreme_admin':
        return 'text-purple-400'
      case 'group_admin':
        return 'text-blue-400'
      default:
        return 'text-gray-400'
    }
  }

  const getUserColor = (email: string, role: string) => {
    // Use role color for admins, hash-based color for regular users
    if (role === 'supreme_admin') return 'text-purple-400'
    if (role === 'group_admin') return 'text-blue-400'
    
    // Generate consistent color based on email hash for regular users
    const colors = [
      'text-red-400',
      'text-orange-400', 
      'text-yellow-400',
      'text-green-400',
      'text-teal-400',
      'text-cyan-400',
      'text-blue-400',
      'text-indigo-400',
      'text-purple-400',
      'text-pink-400',
      'text-rose-400',
      'text-emerald-400'
    ]
    
    // Simple hash function for consistent color assignment
    let hash = 0
    for (let i = 0; i < email.length; i++) {
      hash = ((hash << 5) - hash) + email.charCodeAt(i)
      hash = hash & hash // Convert to 32bit integer
    }
    
    return colors[Math.abs(hash) % colors.length]
  }

  const handleReply = (messageId: string) => {
    setReplyingTo(messageId);
  };

  const getReplyingToMessage = () => {
    return messages.find(msg => msg.id === replyingTo);
  };

  // Helper function to format day dividers
  const getDayLabel = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDate = new Date(date);
    
    // Calculate days difference
    const timeDiff = today.getTime() - messageDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else if (daysDiff <= 7) {
      // Within past week - show weekday
      return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      // Older than a week - show actual date
      return messageDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Analyze message grouping for consecutive messages from same user
  const analyzeMessageGrouping = () => {
    const messageGrouping: Array<{type: 'divider', day: string} | {type: 'message', message: ChatMessage, isFirstInGroup: boolean, isLastInGroup: boolean}> = [];
    let lastDate = '';
    
    messages.forEach((message, index) => {
      const messageDate = new Date(message.created_at).toDateString();
      
      // Add day divider if date changed
      if (messageDate !== lastDate) {
        messageGrouping.push({
          type: 'divider',
          day: getDayLabel(new Date(message.created_at))
        });
        lastDate = messageDate;
      }
      
      // Analyze grouping for this message
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
      
      // Check if previous message is from same user and within time limit and same message type
      const prevIsSameUser = prevMessage && 
        prevMessage.user_id === message.user_id &&
        prevMessage.message_type === message.message_type && // Same message type
        new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() < 5 * 60 * 1000 && // 5 minutes
        new Date(prevMessage.created_at).toDateString() === messageDate; // Same day
      
      // Check if next message is from same user and within time limit and same message type
      const nextIsSameUser = nextMessage &&
        nextMessage.user_id === message.user_id &&
        nextMessage.message_type === message.message_type && // Same message type
        new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime() < 5 * 60 * 1000 && // 5 minutes
        new Date(nextMessage.created_at).toDateString() === messageDate; // Same day
      
      const isFirstInGroup = !prevIsSameUser;
      const isLastInGroup = !nextIsSameUser;
      
      messageGrouping.push({
        type: 'message',
        message,
        isFirstInGroup,
        isLastInGroup
      });
    });
    
    return messageGrouping;
  };

  // Group messages by day (legacy - keeping for compatibility)
  const groupMessagesByDay = () => {
    return analyzeMessageGrouping();
  };

  // Debounced presence tracking for better PWA performance
  const updatePresence = useRef<NodeJS.Timeout | null>(null)
  const updatePresenceDebounced = () => {
    if (!user || !profile?.group_id) return;

    // Clear existing timeout
    if (updatePresence.current) {
      clearTimeout(updatePresence.current)
    }

    // Set new timeout
    updatePresence.current = setTimeout(async () => {
      try {
        await supabase
          .from('profiles')
          .update({ 
            last_seen: new Date().toISOString()
          })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    }, 1000) // Debounce by 1 second
  };

  const loadOnlineCount = async () => {
    if (!profile?.group_id) return;

    try {
      // Calculate cutoff time for "online" users (5 minutes ago)
      const cutoffTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('group_id', profile.group_id)
        .gte('last_seen', cutoffTime);
      
      setOnlineCount(count || 0);
    } catch (error) {
      console.error('Error loading online count:', error);
    }
  };

  // Track presence when chat is open
  useEffect(() => {
    if (isOpen && user && profile?.group_id) {
      updatePresenceDebounced();
      loadOnlineCount();
      
      // Update presence when visibility changes
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          updatePresenceDebounced();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        // Clean up debounced presence update
        if (updatePresence.current) {
          clearTimeout(updatePresence.current)
        }
      };
    }
  }, [isOpen, user, profile?.group_id]);

  // Poll for online count updates every 30 seconds
  useEffect(() => {
    if (!isOpen || !profile?.group_id) return;

    const interval = setInterval(() => {
      loadOnlineCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, profile?.group_id]);

  if (!isOpen) return null

  if (!profile?.group_id) {
    return (
      <div className="fixed inset-0 bg-gray-950 z-60 flex items-center justify-center p-6">
        <div className="text-center">
          <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Group Chat</h3>
          <p className="text-gray-400 mb-4">You need to be in a group to access the chat.</p>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black text-white flex flex-col transition-transform duration-500 ease-out"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        transform: isAnimatedIn ? 'translate3d(0, 0, 0)' : 'translate3d(0, 100vh, 0)',
        willChange: isAnimatedIn ? 'auto' : 'transform',
        backfaceVisibility: 'hidden',
        zIndex: 9999
      }}
    >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-white scale-x-[-1]" />
            <div>
              <h2 className="text-base font-medium">{groupName || 'Group Chat'}</h2>
              <p className="text-xs text-gray-400">
                {onlineCount > 0 ? `${onlineCount} online` : 'Group messaging'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800 w-8 h-8"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto px-4 py-3"
          style={{ 
            WebkitOverflowScrolling: 'touch', 
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
            scrollBehavior: 'smooth',
            position: 'relative',
            zIndex: 1,
            // PWA performance optimizations
            willChange: 'scroll-position',
            transform: 'translateZ(0)', // Force GPU acceleration
            backfaceVisibility: 'hidden'
          }}
        >
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-gray-700 border-t-blue-400 rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-400 text-sm">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4 scale-x-[-1]" />
              <p className="text-gray-400 font-medium">No messages yet</p>
              <p className="text-gray-500 text-sm mt-1">Be the first to say hello!</p>
            </div>
          ) : (
            groupMessagesByDay().map((item, index) => (
              item.type === 'divider' ? (
                <div key={`divider-${index}`} className="flex justify-center my-4">
                  <div className="bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-full">
                    {item.day}
                  </div>
                </div>
              ) : item.message.is_system_message ? (
                <SystemMessageComponent
                  key={item.message.id}
                  message={item.message}
                  systemMessageData={item.message.system_message_id ? systemMessages[item.message.system_message_id] : undefined}
                  currentUser={{ id: user?.id || '', email: profile?.email, username: profile?.username }}
                  onDelete={profile?.role === 'group_admin' || profile?.role === 'supreme_admin' ? async (messageId: string) => {
                    const success = await SystemMessageService.deleteSystemMessage(messageId)
                    if (success) {
                      loadMessages()
                    }
                  } : undefined}
                  isFirstInGroup={'isFirstInGroup' in item ? item.isFirstInGroup : true}
                  isLastInGroup={'isLastInGroup' in item ? item.isLastInGroup : true}
                />
              ) : (
                <MessageComponent
                  key={item.message.id}
                  message={item.message}
                  currentUser={{ id: user?.id || '', email: profile?.email, username: profile?.username }}
                  onAddReaction={addReaction}
                  onReply={handleReply}
                  getUserColor={getUserColor}
                  isFirstInGroup={'isFirstInGroup' in item ? item.isFirstInGroup : true}
                  isLastInGroup={'isLastInGroup' in item ? item.isLastInGroup : true}
                />
              )
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="p-4 border-t border-gray-800 bg-black">
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-32 rounded-lg"
                loading="lazy"
                decoding="async"
                style={{ transform: 'translateZ(0)' }}
              />
              <button
                onClick={() => {
                  setSelectedImage(null)
                  setImagePreview(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Reply indicator */}
        {replyingTo && (
          <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-300 min-w-0 flex-1">
              <Reply className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Replying to {getReplyingToMessage()?.username || 'User'}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-white p-1 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Input */}
        <div className="bg-gray-900 pt-3 px-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          <form onSubmit={sendMessage} className="flex items-center gap-3 bg-gray-800 rounded-full px-3 py-1.5">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setSelectedImage(file)
                  const reader = new FileReader()
                  reader.onload = (e) => setImagePreview(e.target?.result as string)
                  reader.readAsDataURL(file)
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-white hover:bg-gray-700 shrink-0 w-7 h-7 rounded-full"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-transparent border-none text-white placeholder-gray-400 h-7 text-sm focus:ring-0 focus:outline-none"
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(e))}
                disabled={sending || uploading}
                maxLength={500}
              />
            </div>
            <Button
              type="submit"
              disabled={(!newMessage.trim() && !selectedImage) || sending || uploading}
              className="bg-gradient-to-r from-orange-700 to-red-600 hover:from-orange-800 hover:to-red-700 shrink-0 w-7 h-7"
              style={{ borderRadius: '50%' }}
              size="icon"
            >
              {sending || uploading ? (
                <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>

    </div>
  )
}