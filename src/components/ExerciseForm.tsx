'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Exercise = {
  id: string
  name: string
  type: string
  unit: string
  points_per_unit: number
  is_weighted: boolean
  is_time_based: boolean
  supports_decreased: boolean
}

type ExerciseFormProps = {
  exercise?: Exercise | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ExerciseForm({ exercise, isOpen, onClose, onSuccess }: ExerciseFormProps) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: '',
    unit: 'rep',
    points_per_unit: 1,
    is_weighted: false,
    is_time_based: false,
    supports_decreased: false
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (exercise) {
      setFormData({
        id: exercise.id,
        name: exercise.name,
        type: exercise.type,
        unit: exercise.unit,
        points_per_unit: exercise.points_per_unit,
        is_weighted: exercise.is_weighted,
        is_time_based: exercise.is_time_based,
        supports_decreased: exercise.supports_decreased
      })
    } else {
      setFormData({
        id: '',
        name: '',
        type: '',
        unit: 'rep',
        points_per_unit: 1,
        is_weighted: false,
        is_time_based: false,
        supports_decreased: false
      })
    }
  }, [exercise])

  const generateId = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const exerciseData = {
        ...formData,
        id: exercise ? formData.id : generateId(formData.name),
        points_unit: formData.unit, // Keep legacy field for compatibility
      }

      if (exercise) {
        // Update existing exercise
        const { error } = await supabase
          .from('exercises')
          .update(exerciseData)
          .eq('id', exercise.id)

        if (error) throw error
      } else {
        // Create new exercise
        const { error } = await supabase
          .from('exercises')
          .insert(exerciseData)

        if (error) throw error
      }

      onSuccess()
      onClose()
      alert(exercise ? 'Exercise updated successfully!' : 'Exercise created successfully!')
    } catch (error) {
      console.error('Error saving exercise:', error)
      alert('Failed to save exercise: ' + (error instanceof Error ? error.message : 'Unknown error'))
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
            {exercise ? 'Edit Exercise' : 'Add New Exercise'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Exercise Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exercise Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Push-ups"
              required
            />
          </div>

          {/* Exercise Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exercise Type *
            </label>
            <input
              type="text"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., pushup, squat, recovery"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Use 'recovery' for recovery exercises</p>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit *
            </label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="rep">Repetitions (rep)</option>
              <option value="second">Seconds (second)</option>
              <option value="minute">Minutes (minute)</option>
              <option value="meter">Meters (meter)</option>
              <option value="kilometer">Kilometers (kilometer)</option>
            </select>
          </div>

          {/* Points per Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Points per Unit *
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={formData.points_per_unit}
              onChange={(e) => setFormData({ ...formData, points_per_unit: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Exercise Features */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Exercise Features</h3>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_weighted"
                checked={formData.is_weighted}
                onChange={(e) => setFormData({ ...formData, is_weighted: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_weighted" className="ml-2 text-sm text-gray-700">
                Supports weight (users can add weight)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_time_based"
                checked={formData.is_time_based}
                onChange={(e) => setFormData({ ...formData, is_time_based: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_time_based" className="ml-2 text-sm text-gray-700">
                Time-based exercise (duration matters)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="supports_decreased"
                checked={formData.supports_decreased}
                onChange={(e) => setFormData({ ...formData, supports_decreased: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="supports_decreased" className="ml-2 text-sm text-gray-700">
                Supports decreasing sets
              </label>
            </div>
          </div>

          {/* Generated ID Preview */}
          {!exercise && formData.name && (
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
              {loading ? 'Saving...' : (exercise ? 'Update Exercise' : 'Add Exercise')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}