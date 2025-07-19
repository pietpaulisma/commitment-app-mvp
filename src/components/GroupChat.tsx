'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type ChatMessage = {
  id: string
  group_id: string
  user_id: string
  message: string
  created_at: string
  user_email?: string
  user_role?: string
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

  useEffect(() => {
    if (isOpen && profile?.group_id) {
      loadMessages()
      loadGroupName()
      
      // Set up real-time subscription
      const channel = supabase
        .channel('group_chat')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages',
            filter: `group_id=eq.${profile.group_id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              loadMessages() // Reload to get user info
            }
          }
        )
        .subscribe()

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
          created_at,
          profiles (email, role)
        `)
        .eq('group_id', profile.group_id)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error

      const formattedMessages = messagesData?.map(msg => ({
        id: msg.id,
        group_id: msg.group_id,
        user_id: msg.user_id,
        message: msg.message,
        created_at: msg.created_at,
        user_email: msg.profiles?.email || 'Unknown',
        user_role: msg.profiles?.role || 'user'
      })) || []

      setMessages(formattedMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !profile?.group_id || sending) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          group_id: profile.group_id,
          user_id: user.id,
          message: newMessage.trim()
        })

      if (error) {
        console.error('Chat error:', error)
        alert(`Failed to send message: ${error.message}. Check console for details.`)
        return
      }

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please check console for details.')
    } finally {
      setSending(false)
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl w-full max-w-md p-6 border border-gray-700">
          <div className="text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-white mb-2">No Group Chat</h3>
            <p className="text-gray-400 mb-4">You need to be in a group to access the chat.</p>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-md h-[600px] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-white">{groupName} Chat</h3>
            <p className="text-sm text-gray-400">Group discussion</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
              <p className="mt-2 text-gray-400 text-sm">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-gray-400">No messages yet</p>
              <p className="text-gray-500 text-sm">Be the first to say hello!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                    message.user_id === user?.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {message.user_id !== user?.id && (
                    <div className="text-xs opacity-75 mb-1">
                      <span className={getRoleColor(message.user_role || 'user')}>
                        {message.user_email}
                      </span>
                    </div>
                  )}
                  <div className="text-sm">{message.message}</div>
                  <div className="text-xs opacity-75 mt-1">
                    {formatTime(message.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-gray-700">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {newMessage.length}/500 characters
          </div>
        </form>
      </div>
    </div>
  )
}