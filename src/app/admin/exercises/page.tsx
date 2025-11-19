'use client';

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ExerciseForm from '@/components/ExerciseForm'
import TimeGradient from '@/components/TimeGradient'
import { useExercises } from '@/hooks/useExercises'
import { supabase } from '@/lib/supabase'
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'

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
  const { user, loading: authLoading } = useAuth()
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
      {/* Time-based gradient background */}
      <TimeGradient className="fixed inset-0 z-[-1] pointer-events-none" intensity={0.6} />

      <div className="fixed inset-0 bg-black/60 z-50 flex flex-col backdrop-blur-sm">
      {/* Header with safe area padding */}
      <div className="sticky top-0 bg-gradient-to-b from-black/90 to-black/70 border-b border-white/10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex justify-between items-center px-4 py-3">
          <div>
            <h1 className="text-xl font-bold text-white">Exercises</h1>
            <p className="text-xs text-gray-400">Manage workout library</p>
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
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-green-500/20 border border-green-500/20 flex items-center justify-center gap-2 mb-4"
        >
          <PlusIcon className="w-5 h-5" />
          Add Exercise
        </button>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading exercises...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Regular Exercises */}
            {(() => {
              const regularExercises = exercises.filter(ex => ex.type !== 'recovery' && ex.type !== 'sport')
              return regularExercises.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 shadow-lg shadow-blue-500/50"></div>
                    <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide">Regular ({regularExercises.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {regularExercises.map((exercise) => (
                      <ExerciseCard key={exercise.id} exercise={exercise} onEdit={setEditingExercise} onDelete={deleteExercise} />
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Recovery Exercises */}
            {(() => {
              const recoveryExercises = exercises.filter(ex => ex.type === 'recovery')
              return recoveryExercises.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 shadow-lg shadow-green-500/50"></div>
                    <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide">Recovery ({recoveryExercises.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {recoveryExercises.map((exercise) => (
                      <ExerciseCard key={exercise.id} exercise={exercise} onEdit={setEditingExercise} onDelete={deleteExercise} />
                    ))}
                  </div>
                </div>
              )
            })()}


            {exercises.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No exercises found</p>
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

// Exercise Card Component - condensed with gradients
function ExerciseCard({
  exercise,
  onEdit,
  onDelete
}: {
  exercise: Exercise
  onEdit: (exercise: Exercise) => void
  onDelete: (id: string) => void
}) {
  const getTypeGradient = () => {
    if (exercise.type === 'recovery') return 'from-green-600/10 to-emerald-600/5 border-green-500/20'
    if (exercise.type === 'sport') return 'from-purple-600/10 to-violet-600/5 border-purple-500/20'
    return 'from-blue-600/10 to-blue-500/5 border-blue-500/20'
  }

  const getTypeBadge = () => {
    if (exercise.type === 'recovery') return 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
    if (exercise.type === 'sport') return 'bg-gradient-to-r from-purple-600 to-violet-600 text-white'
    return 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
  }

  return (
    <div className={`bg-gradient-to-br ${getTypeGradient()} border backdrop-blur-sm rounded-2xl overflow-hidden`}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-semibold text-sm truncate">{exercise.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-gray-400">{exercise.unit}</span>
              <span className="text-[10px] text-green-400 font-semibold">{exercise.points_per_unit} pts</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onEdit(exercise)}
              className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all active:scale-95"
              aria-label="Edit"
            >
              <PencilIcon className="w-4 h-4 text-blue-400" />
            </button>
            <button
              onClick={() => onDelete(exercise.id)}
              className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all active:scale-95"
              aria-label="Delete"
            >
              <TrashIcon className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>

        {(exercise.is_weighted || exercise.is_time_based || exercise.supports_decreased) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {exercise.is_weighted && (
              <span className="text-[10px] bg-yellow-500/10 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-500/20">
                ⚖️
              </span>
            )}
            {exercise.is_time_based && (
              <span className="text-[10px] bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">
                ⏱️
              </span>
            )}
            {exercise.supports_decreased && (
              <span className="text-[10px] bg-orange-500/10 text-orange-300 px-1.5 py-0.5 rounded border border-orange-500/20">
                📉
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}