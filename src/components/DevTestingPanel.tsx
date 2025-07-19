'use client'

import { useState } from 'react'
import { useProfile, UserRole } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function DevTestingPanel() {
  console.log('🧪 DevTestingPanel component loaded!')
  
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  console.log('DevTestingPanel - user:', !!user, 'profileLoading:', profileLoading, 'profile role:', profile?.role)

  // Temporarily show for all logged in users for testing
  if (!user) {
    console.log('❌ No user, hiding panel')
    return null
  }
  
  console.log('✅ Rendering test panel for user:', user?.email)

  const switchRole = async (newRole: UserRole) => {
    if (!user) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user.id)

      if (error) throw error
      
      // Refresh the page to reload profile data
      window.location.reload()
    } catch (error) {
      console.error('Error switching role:', error)
      alert('Failed to switch role: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-full shadow-lg text-sm font-medium"
        >
          🧪 Test Panel
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-64">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">🧪 Role Testing</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600">Current Role:</p>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          profile?.role === 'supreme_admin' 
            ? 'bg-purple-100 text-purple-800'
            : profile?.role === 'group_admin' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {profile?.role === 'supreme_admin' ? 'Supreme Admin' : 
           profile?.role === 'group_admin' ? 'Group Admin' : 'User'}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-500 mb-2">Switch to:</p>
        
        <button
          onClick={() => switchRole('user')}
          disabled={loading || profile?.role === 'user'}
          className="w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded"
        >
          👤 Regular User
        </button>
        
        <button
          onClick={() => switchRole('group_admin')}
          disabled={loading || profile?.role === 'group_admin'}
          className="w-full text-left px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 disabled:opacity-50 rounded"
        >
          👥 Group Admin
        </button>
        
        <button
          onClick={() => switchRole('supreme_admin')}
          disabled={loading || profile?.role === 'supreme_admin'}
          className="w-full text-left px-3 py-2 text-sm bg-purple-100 hover:bg-purple-200 disabled:opacity-50 rounded"
        >
          👑 Supreme Admin
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          Supreme Admin Testing
        </p>
      </div>
    </div>
  )
}