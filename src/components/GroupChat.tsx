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
  HandThumbUpIcon
} from '@heroicons/react/24/outline'
import { 
  HeartIcon as HeartIconSolid,
  HandThumbUpIcon as HandThumbUpIconSolid,
  FaceSmileIcon as FaceSmileIconSolid
} from '@heroicons/react/24/solid'

type ChatMessage = {
  id: string
  group_id: string
  user_id: string
  message: string
  message_type?: 'text' | 'image'
  image_url?: string
  created_at: string
  user_email?: string
  user_role?: string
  reactions?: MessageReaction[]
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
}

export default function GroupChat({ isOpen, onClose }: GroupChatProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [groupName, setGroupName] = useState('')
  
  // Image upload states
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Reaction states
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [reactions, setReactions] = useState<{ [messageId: string]: MessageReaction[] }>({})

  // Available emoji reactions
  const emojiOptions: EmojiOption[] = [
    { emoji: '❤️', label: 'heart', icon: HeartIcon, solidIcon: HeartIconSolid },
    { emoji: '👍', label: 'thumbs_up', icon: HandThumbUpIcon, solidIcon: HandThumbUpIconSolid },
    { emoji: '😊', label: 'smile', icon: FaceSmileIcon, solidIcon: FaceSmileIconSolid }
  ]

  useEffect(() => {
    if (isOpen && profile?.group_id) {
      loadMessages()
      loadGroupName()
      
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
            // Skip if this is our own message (already added optimistically)
            if (payload.new && payload.new.user_id !== user?.id) {
              try {
                // Get user info for the new message
                const { data: userInfo } = await supabase
                  .from('profiles')
                  .select('email, role')
                  .eq('id', payload.new.user_id)
                  .single()

                const newMessage: ChatMessage = {
                  id: payload.new.id,
                  group_id: payload.new.group_id,
                  user_id: payload.new.user_id,
                  message: payload.new.message,
                  message_type: payload.new.message_type || 'text',
                  image_url: payload.new.image_url,
                  created_at: payload.new.created_at,
                  user_email: userInfo?.email || 'Unknown',
                  user_role: userInfo?.role || 'user',
                  reactions: []
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
    }
  }, [isOpen, profile?.group_id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
          profiles (email, role)
        `)
        .eq('group_id', profile.group_id)
        .order('created_at', { ascending: true })
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
        user_email: msg.profiles?.email || 'Unknown',
        user_role: msg.profiles?.role || 'user',
        reactions: []
      })) || []

      // Load reactions for all messages
      await loadReactions(formattedMessages.map(m => m.id))
      setMessages(formattedMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
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
        reactions: []
      }

      setMessages(prev => [...prev, optimisticMessage])
      setNewMessage('')
      setSelectedImage(null)
      setImagePreview(null)
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
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
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
          profiles (email)
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

  return (
    <div className="fixed inset-0 bg-gray-950 z-60 flex flex-col fixed-fullscreen">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div>
            <h3 className="text-lg font-semibold text-white">{groupName} Chat</h3>
            <p className="text-sm text-gray-400">Group discussion</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
            aria-label="Close chat"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-gray-700 border-t-blue-400 rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-400 text-sm">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">No messages yet</p>
              <p className="text-gray-500 text-sm mt-1">Be the first to say hello!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end space-x-2 ${
                  message.user_id === user?.id ? 'justify-end flex-row-reverse space-x-reverse' : 'justify-start'
                }`}
              >
                {/* User Avatar */}
                {message.user_id !== user?.id && (
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-gray-300">
                      {message.user_email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                
                <div className="max-w-xs lg:max-w-md">
                  {/* User name (for others' messages) */}
                  {message.user_id !== user?.id && (
                    <div className="text-xs mb-1 px-2">
                      <span className={getRoleColor(message.user_role || 'user')}>
                        {message.user_email?.split('@')[0] || 'Unknown'}
                      </span>
                    </div>
                  )}
                  
                  {/* Message bubble */}
                  <div
                    className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                      message.user_id === user?.id
                        ? message.id.startsWith('temp-') 
                          ? 'bg-blue-600 text-white opacity-70' 
                          : 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-white border border-gray-700'
                    }`}
                  >
                    {/* Image message */}
                    {message.message_type === 'image' && message.image_url && (
                      <div className="mb-2">
                        <img 
                          src={message.image_url} 
                          alt="Shared image" 
                          className="rounded-lg max-w-full h-auto"
                          style={{ maxHeight: '300px' }}
                        />
                      </div>
                    )}
                    
                    {/* Text content */}
                    {message.message && (
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.message}
                      </div>
                    )}
                    
                    {/* Timestamp and status */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs opacity-75">
                        {formatTime(message.created_at)}
                      </div>
                      {message.id.startsWith('temp-') && (
                        <div className="w-4 h-4 animate-spin border border-white border-t-transparent rounded-full opacity-50"></div>
                      )}
                    </div>
                    
                    {/* Reaction button */}
                    <button
                      onClick={() => setShowReactionPicker(
                        showReactionPicker === message.id ? null : message.id
                      )}
                      className="absolute -bottom-2 right-2 w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors border border-gray-600"
                    >
                      <FaceSmileIcon className="w-3 h-3 text-gray-300" />
                    </button>
                  </div>
                  
                  {/* Reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 px-2">
                      {Object.entries(
                        message.reactions.reduce((acc, reaction) => {
                          if (!acc[reaction.emoji]) {
                            acc[reaction.emoji] = []
                          }
                          acc[reaction.emoji].push(reaction)
                          return acc
                        }, {} as { [emoji: string]: MessageReaction[] })
                      ).map(([emoji, reactions]) => (
                        <button
                          key={emoji}
                          onClick={() => addReaction(message.id, emoji)}
                          className={`px-2 py-1 rounded-full text-xs flex items-center space-x-1 transition-colors ${
                            reactions.some(r => r.user_id === user?.id)
                              ? 'bg-blue-900/50 border border-blue-600/50 text-blue-300'
                              : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span>{reactions.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Reaction picker */}
                  {showReactionPicker === message.id && (
                    <div className="flex space-x-2 mt-2 p-2 bg-gray-800 rounded-lg border border-gray-700">
                      {emojiOptions.map((option) => (
                        <button
                          key={option.emoji}
                          onClick={() => {
                            addReaction(message.id, option.emoji)
                            setShowReactionPicker(null)
                          }}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <option.icon className="w-5 h-5 text-gray-300" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="p-4 border-t border-gray-800 bg-gray-900">
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-32 rounded-lg"
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

        {/* Message Input */}
        <form onSubmit={sendMessage} className="p-4 pb-safe border-t border-gray-800 bg-gray-900" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-end space-x-3">
            {/* Image upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-shrink-0 w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors border border-gray-700"
              aria-label="Upload image"
            >
              <PhotoIcon className="w-5 h-5 text-gray-400" />
            </button>
            
            {/* Text input */}
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[2.75rem]"
                disabled={sending || uploading}
                maxLength={500}
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                }}
              />
              <div className="text-xs text-gray-500 mt-1 px-1">
                {newMessage.length}/500 characters
              </div>
            </div>
            
            {/* Send button */}
            <button
              type="submit"
              disabled={(!newMessage.trim() && !selectedImage) || sending || uploading}
              className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              aria-label="Send message"
            >
              {sending || uploading ? (
                <div className="w-5 h-5 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <PaperAirplaneIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setSelectedImage(file)
                const reader = new FileReader()
                reader.onload = (e) => setImagePreview(e.target?.result as string)
                reader.readAsDataURL(file)
              }
            }}
            className="hidden"
          />
        </form>
    </div>
  )
}