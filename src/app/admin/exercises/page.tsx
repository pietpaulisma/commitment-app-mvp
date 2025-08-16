'use client';

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RoleBasedNavigation from '@/components/RoleBasedNavigation'
import ExerciseForm from '@/components/ExerciseForm'
import TimeGradient from '@/components/TimeGradient'
import { useExercises } from '@/hooks/useExercises'
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
  const { exercises, loading, refreshExercises } = useExercises()
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

  // Exercises are automatically loaded by the useExercises hook


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
      
      await refreshExercises()
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
      {/* Time-based gradient background with increased intensity */}
      <TimeGradient className="fixed inset-0 z-[-1] pointer-events-none" intensity={1.2} />
      
      <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-black">
        <div>
          <h1 className="text-lg font-bold text-white">EXERCISE MANAGEMENT</h1>
          <p className="text-sm text-gray-400">Manage exercises</p>
        </div>
        <button
          onClick={() => router.push('/profile')}
          className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700"
        >
          <span className="text-2xl">×</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-green-600 text-white py-3 hover:bg-green-500 font-semibold transition-colors border border-green-500"
          >
            + Add Exercise
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading exercises...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">ALL EXERCISES ({exercises.length})</h3>
            
            {exercises.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No exercises found</p>
              </div>
            ) : (
              exercises.map((exercise) => (
                <div key={exercise.id} className="bg-gray-900 border border-gray-700 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold">{exercise.name}</h4>
                      <p className="text-xs text-gray-400">ID: {exercise.id}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-bold border ${exercise.type === 'recovery' ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                      {exercise.type}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-400">Unit:</span>
                      <span className="text-gray-300 ml-1">{exercise.unit}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Points:</span>
                      <span className="text-green-400 font-bold ml-1">{exercise.points_per_unit}</span>
                    </div>
                  </div>

                  {(exercise.is_weighted || exercise.is_time_based || exercise.supports_decreased) && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {exercise.is_weighted && <span className="text-xs bg-yellow-600 text-white px-2 py-1 border border-yellow-500">Weighted</span>}
                      {exercise.is_time_based && <span className="text-xs bg-purple-600 text-white px-2 py-1 border border-purple-500">Time-based</span>}
                      {exercise.supports_decreased && <span className="text-xs bg-orange-600 text-white px-2 py-1 border border-orange-500">Decreasing sets</span>}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingExercise(exercise)}
                      className="flex-1 bg-blue-600 text-white py-2 hover:bg-blue-500 transition-colors border border-blue-500 font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteExercise(exercise.id)}
                      className="flex-1 bg-red-600 text-white py-2 hover:bg-red-500 transition-colors border border-red-500 font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
      
      {/* Add/Edit Exercise Modal */}
      <ExerciseForm
        exercise={editingExercise}
        isOpen={showAddForm || !!editingExercise}
        onClose={() => {
          setShowAddForm(false);
          setEditingExercise(null);
        }}
        onSuccess={() => {
          refreshExercises();
          setShowAddForm(false);
          setEditingExercise(null);
        }}
      />
      </div>
    </div>
  );
}