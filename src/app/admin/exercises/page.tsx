'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RoleBasedNavigation from '@/components/RoleBasedNavigation'
import ExerciseForm from '@/components/ExerciseForm'
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
  created_at: string
  updated_at: string
}

export default function ExerciseManagementPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading, isSupremeAdmin } = useProfile()
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

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
    if (isSupremeAdmin) {
      loadExercises()
    }
  }, [isSupremeAdmin])

  const loadExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name')

      if (error) throw error
      setExercises(data || [])
    } catch (error) {
      console.error('Error loading exercises:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteExercise = async (exerciseId: string) => {
    if (!confirm('Are you sure you want to delete this exercise? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId)

      if (error) throw error
      
      await loadExercises()
      alert('Exercise deleted successfully!')
    } catch (error) {
      console.error('Error deleting exercise:', error)
      alert('Failed to delete exercise: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
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

  return (
    <div className="min-h-screen bg-black">
      <RoleBasedNavigation />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Exercise Management</h1>
            <p className="text-gray-400 mt-1">Add, edit, and manage exercises in the system</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 font-semibold transition-colors border border-gray-600"
            >
              Back to Admin
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 text-white px-6 py-3 hover:bg-green-500 font-semibold transition-colors border border-green-500"
            >
              + Add Exercise
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading exercises...</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-white">All Exercises ({exercises.length})</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Unit</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Points/Unit</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Features</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-900 divide-y divide-gray-700">
                  {exercises.map((exercise) => (
                    <tr key={exercise.id} className="hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-white">{exercise.name}</div>
                        <div className="text-xs text-gray-400">ID: {exercise.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-bold border ${
                          exercise.type === 'recovery' ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-700 text-gray-300 border-gray-600'
                        }`}>
                          {exercise.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{exercise.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-400">{exercise.points_per_unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        <div className="space-y-1">
                          {exercise.is_weighted && <span className="block text-xs bg-yellow-600 text-white px-2 py-1 border border-yellow-500">Weighted</span>}
                          {exercise.is_time_based && <span className="block text-xs bg-purple-600 text-white px-2 py-1 border border-purple-500">Time-based</span>}
                          {exercise.supports_decreased && <span className="block text-xs bg-orange-600 text-white px-2 py-1 border border-orange-500">Decreasing sets</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => setEditingExercise(exercise)}
                            className="bg-blue-600 text-white px-3 py-1 hover:bg-blue-500 transition-colors border border-blue-500"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteExercise(exercise.id)}
                            className="bg-red-600 text-white px-3 py-1 hover:bg-red-500 transition-colors border border-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {exercises.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400">No exercises found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Exercise Modal */}
      <ExerciseForm
        exercise={editingExercise}
        isOpen={showAddForm || !!editingExercise}
        onClose={() => {
          setShowAddForm(false)
          setEditingExercise(null)
        }}
        onSuccess={() => {
          loadExercises()
          setShowAddForm(false)
          setEditingExercise(null)
        }}
      />
    </div>
  )
}