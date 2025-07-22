'use client'

import { useState, useEffect } from 'react'
import { useProfile, UserRole } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function DevTestingPanel() {
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [isOpen, setIsOpen] = useState(false)
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null)
  const [mounted, setMounted] = useState(false)

  // Only show for supreme admins
  if (!user || profileLoading || profile?.role !== 'supreme_admin') {
    return null
  }

  const toggleRolePreview = (newRole: UserRole) => {
    if (previewRole === newRole) {
      // If clicking the same role, turn off preview
      setPreviewRole(null)
      localStorage.removeItem('role-preview-override')
    } else {
      // Set new preview role
      setPreviewRole(newRole)
      localStorage.setItem('role-preview-override', newRole)
    }
    
    // Trigger a page refresh to apply the new role preview
    window.location.reload()
  }

  const currentDisplayRole = previewRole || profile?.role

  // Initialize after mount to avoid SSR issues
  useEffect(() => {
    setMounted(true)
    const savedPreview = localStorage.getItem('role-preview-override') as UserRole
    if (savedPreview && (savedPreview === 'user' || savedPreview === 'group_admin' || savedPreview === 'supreme_admin')) {
      setPreviewRole(savedPreview)
    }
  }, [])

  // Don't render until mounted to avoid SSR issues
  if (!mounted) {
    return null
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
        <p className="text-sm text-gray-600">
          {previewRole ? 'Previewing Role:' : 'Current Role:'}
          {previewRole && <span className="text-xs text-orange-600 ml-1">(Preview Mode)</span>}
        </p>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          currentDisplayRole === 'supreme_admin' 
            ? 'bg-purple-100 text-purple-800'
            : currentDisplayRole === 'group_admin' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {currentDisplayRole === 'supreme_admin' ? 'Supreme Admin' : 
           currentDisplayRole === 'group_admin' ? 'Group Admin' : 'User'}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-500 mb-2">Preview as:</p>
        
        <button
          onClick={() => toggleRolePreview('user')}
          className={`w-full text-left px-3 py-2 text-sm rounded ${
            previewRole === 'user' 
              ? 'bg-orange-100 text-orange-800 border border-orange-300' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          👤 Regular User {previewRole === 'user' && '✓'}
        </button>
        
        <button
          onClick={() => toggleRolePreview('group_admin')}
          className={`w-full text-left px-3 py-2 text-sm rounded ${
            previewRole === 'group_admin' 
              ? 'bg-orange-100 text-orange-800 border border-orange-300' 
              : 'bg-blue-100 hover:bg-blue-200'
          }`}
        >
          👥 Group Admin {previewRole === 'group_admin' && '✓'}
        </button>
        
        <button
          onClick={() => toggleRolePreview('supreme_admin')}
          className={`w-full text-left px-3 py-2 text-sm rounded ${
            previewRole === 'supreme_admin' 
              ? 'bg-orange-100 text-orange-800 border border-orange-300' 
              : 'bg-purple-100 hover:bg-purple-200'
          }`}
        >
          👑 Supreme Admin {previewRole === 'supreme_admin' && '✓'}
        </button>

        {previewRole && (
          <button
            onClick={() => toggleRolePreview(previewRole)}
            className="w-full text-center px-3 py-2 text-sm bg-orange-100 text-orange-800 hover:bg-orange-200 rounded"
          >
            🔄 Reset to Original Role
          </button>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          Role Preview Testing - Database role unchanged
        </p>
      </div>
    </div>
  )
}