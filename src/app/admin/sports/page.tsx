'use client';

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import TimeGradient from '@/components/TimeGradient'
import { supabase } from '@/lib/supabase'
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'

type Sport = {
  id: string
  name: string
  emoji: string
  created_at?: string
  updated_at?: string
}

export default function SportsManagementPage() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, isSupremeAdmin } = useProfile()
  const router = useRouter()
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSport, setEditingSport] = useState<Sport | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmoji, setFormEmoji] = useState('⚽')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!profileLoading && profile && !isSupremeAdmin) {
      router.push('/dashboard')
    }
  }, [profile, profileLoading, isSupremeAdmin, router])

  useEffect(() => {
    if (user && profile && isSupremeAdmin) {
      loadSports()
    }
  }, [user, profile, isSupremeAdmin])

  const loadSports = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sports')
        .select('*')
        .order('name')

      if (error) throw error
      setSports(data || [])
    } catch (error) {
      console.error('Error loading sports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formName.trim()) {
      alert('Please enter a sport name')
      return
    }

    try {
      if (editingSport) {
        // Update existing sport
        const { error } = await supabase
          .from('sports')
          .update({
            name: formName.trim(),
            emoji: formEmoji,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSport.id)

        if (error) throw error
        alert('Sport updated successfully!')
      } else {
        // Create new sport
        const { error } = await supabase
          .from('sports')
          .insert({
            name: formName.trim(),
            emoji: formEmoji,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (error) throw error
        alert('Sport added successfully!')
      }

      // Reset form and reload
      setFormName('')
      setFormEmoji('⚽')
      setShowAddForm(false)
      setEditingSport(null)
      await loadSports()
    } catch (error) {
      console.error('Error saving sport:', error)
      alert('Failed to save sport: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleEdit = (sport: Sport) => {
    setEditingSport(sport)
    setFormName(sport.name)
    setFormEmoji(sport.emoji)
    setShowAddForm(true)
  }

  const handleDelete = async (sportId: string) => {
    if (!confirm('Are you sure you want to delete this sport? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('sports')
        .delete()
        .eq('id', sportId)

      if (error) throw error

      await loadSports()
      alert('Sport deleted successfully!')
    } catch (error) {
      console.error('Error deleting sport:', error)
      alert('Failed to delete sport: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleCloseForm = () => {
    setShowAddForm(false)
    setEditingSport(null)
    setFormName('')
    setFormEmoji('⚽')
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || !isSupremeAdmin) {
    return null
  }

  const commonEmojis = ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥊', '🥋', '🤼', '🤺', '⛳', '🏹', '🎣', '🥏', '🪀', '🛹', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤸', '🤾', '🏊', '🚴', '🚵', '🧘', '🏇', '🤽']

  return (
    <div className="min-h-screen bg-black">
      {/* Time-based gradient background */}
      <TimeGradient className="fixed inset-0 z-[-1] pointer-events-none" intensity={0.6} />

      <div className="fixed inset-0 bg-black/60 z-50 flex flex-col backdrop-blur-sm">
        {/* Header with safe area padding */}
        <div className="sticky top-0 bg-gradient-to-b from-black/90 to-black/70 border-b border-white/10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex justify-between items-center px-4 py-3">
            <div>
              <h1 className="text-xl font-bold text-white">Sports</h1>
              <p className="text-xs text-gray-400">Manage sports library</p>
            </div>
            <button
              onClick={() => router.push('/profile')}
              className="text-gray-400 hover:text-white transition-all p-2 hover:bg-white/10 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center backdrop-blur-sm"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-4 py-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-violet-600 text-white py-2.5 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-purple-500/20 border border-purple-500/20 flex items-center justify-center gap-2 mb-4"
          >
            <PlusIcon className="w-5 h-5" />
            Add Sport
          </button>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-purple-500 mx-auto"></div>
              <p className="mt-2 text-gray-400">Loading sports...</p>
            </div>
          ) : sports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm mb-2">No sports added yet</p>
              <p className="text-gray-500 text-xs">Click &ldquo;Add Sport&rdquo; to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sports.map((sport) => (
                <div
                  key={sport.id}
                  className="bg-gradient-to-br from-purple-600/10 to-violet-600/5 border border-purple-500/20 backdrop-blur-sm rounded-2xl overflow-hidden"
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl">{sport.emoji}</span>
                        <h4 className="text-white font-semibold text-sm truncate">{sport.name}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleEdit(sport)}
                          className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all active:scale-95"
                          aria-label="Edit"
                        >
                          <PencilIcon className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(sport.id)}
                          className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all active:scale-95"
                          aria-label="Delete"
                        >
                          <TrashIcon className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">
                    {editingSport ? 'Edit Sport' : 'Add Sport'}
                  </h2>
                  <button
                    onClick={handleCloseForm}
                    className="text-gray-400 hover:text-white"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sport Name
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g., Basketball, Tennis, Swimming"
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Emoji
                    </label>
                    <div className="grid grid-cols-8 gap-2 mb-3">
                      {commonEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setFormEmoji(emoji)}
                          className={`text-2xl p-2 rounded-lg transition-all ${
                            formEmoji === emoji
                              ? 'bg-purple-600 scale-110'
                              : 'bg-gray-800 hover:bg-gray-700'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={formEmoji}
                      onChange={(e) => setFormEmoji(e.target.value)}
                      placeholder="Or type custom emoji"
                      maxLength={2}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      className="flex-1 px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                    >
                      {editingSport ? 'Update' : 'Add'} Sport
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
