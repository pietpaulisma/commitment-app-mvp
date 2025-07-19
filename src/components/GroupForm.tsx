'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Group = {
  id: string
  name: string
  start_date: string
  admin_id: string
}

type Profile = {
  id: string
  email: string
  role: string
}

type GroupFormProps = {
  group?: Group | null
  isOpen: boolean
  availableAdmins: Profile[]
  onClose: () => void
  onSuccess: () => void
}

export default function GroupForm({ group, isOpen, availableAdmins, onClose, onSuccess }: GroupFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    admin_id: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        start_date: group.start_date.split('T')[0], // Convert to YYYY-MM-DD format
        admin_id: group.admin_id
      })
    } else {
      setFormData({
        name: '',
        start_date: new Date().toISOString().split('T')[0], // Default to today
        admin_id: availableAdmins[0]?.id || ''
      })
    }
  }, [group, availableAdmins])

  const generateId = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const groupData = {
        ...formData,
        id: group ? group.id : generateId(formData.name),
      }

      if (group) {
        // Update existing group
        const { error } = await supabase
          .from('groups')
          .update(groupData)
          .eq('id', group.id)

        if (error) throw error
      } else {
        // Create new group
        const { error } = await supabase
          .from('groups')
          .insert(groupData)

        if (error) throw error
      }

      onSuccess()
      onClose()
      alert(group ? 'Group updated successfully!' : 'Group created successfully!')
    } catch (error) {
      console.error('Error saving group:', error)
      alert('Failed to save group: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {group ? 'Edit Group' : 'Create New Group'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Morning Warriors"
              required
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Group Admin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Admin *
            </label>
            <select
              value={formData.admin_id}
              onChange={(e) => setFormData({ ...formData, admin_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select an admin...</option>
              {availableAdmins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.email} ({admin.role === 'supreme_admin' ? 'Supreme Admin' : 'Group Admin'})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Only Supreme Admins and Group Admins can be assigned as group administrators
            </p>
          </div>

          {/* Generated ID Preview */}
          {!group && formData.name && (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-xs text-gray-600">Generated ID: <code className="bg-gray-200 px-1 rounded">{generateId(formData.name)}</code></p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (group ? 'Update Group' : 'Create Group')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}