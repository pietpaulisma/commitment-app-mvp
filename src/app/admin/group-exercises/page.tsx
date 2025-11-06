'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Exercise = {
  id: string
  name: string
  type: string
  unit: string
  points_per_unit: number
  is_weighted: boolean
  is_time_based: boolean
}

type Group = {
  id: string
  name: string
}

type GroupExercise = {
  group_id: string
  exercise_id: string
}

export default function GroupExercisesPage() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [groupExercises, setGroupExercises] = useState<GroupExercise[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!profileLoading && profile?.role !== 'supreme_admin') {
      router.push('/dashboard')
    }
  }, [profile, profileLoading, router])

  useEffect(() => {
    if (user && profile?.role === 'supreme_admin') {
      loadData()
    }
  }, [user, profile])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load all data in parallel for better performance
      const [exercisesResult, groupsResult, groupExercisesResult] = await Promise.all([
        supabase
          .from('exercises')
          .select('*')
          .order('name'),
        supabase
          .from('groups')
          .select('id, name')
          .order('name'),
        supabase
          .from('group_exercises')
          .select('group_id, exercise_id')
      ])

      setExercises(exercisesResult.data || [])
      setGroups(groupsResult.data || [])
      setGroupExercises(groupExercisesResult.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isExerciseAssigned = (exerciseId: string, groupId: string) => {
    return groupExercises.some(ge => 
      ge.exercise_id === exerciseId && ge.group_id === groupId
    )
  }

  const toggleExerciseAssignment = async (exerciseId: string, groupId: string) => {
    const isAssigned = isExerciseAssigned(exerciseId, groupId)
    
    try {
      if (isAssigned) {
        // Remove assignment
        await supabase
          .from('group_exercises')
          .delete()
          .eq('exercise_id', exerciseId)
          .eq('group_id', groupId)
          
        setGroupExercises(prev => 
          prev.filter(ge => !(ge.exercise_id === exerciseId && ge.group_id === groupId))
        )
      } else {
        // Add assignment
        await supabase
          .from('group_exercises')
          .insert({ exercise_id: exerciseId, group_id: groupId })
          
        setGroupExercises(prev => [...prev, { exercise_id: exerciseId, group_id: groupId }])
      }
    } catch (error) {
      console.error('Error updating exercise assignment:', error)
    }
  }

  const assignAllExercisesToGroup = async (groupId: string) => {
    const unassignedExercises = exercises.filter(ex => !isExerciseAssigned(ex.id, groupId))
    
    try {
      const newAssignments = unassignedExercises.map(ex => ({
        exercise_id: ex.id,
        group_id: groupId
      }))
      
      if (newAssignments.length > 0) {
        await supabase
          .from('group_exercises')
          .insert(newAssignments)
        
        setGroupExercises(prev => [...prev, ...newAssignments])
      }
    } catch (error) {
      console.error('Error assigning all exercises:', error)
    }
  }

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || profile?.role !== 'supreme_admin') {
    return null
  }

  const selectedGroupExercises = selectedGroup 
    ? exercises.filter(ex => isExerciseAssigned(ex.id, selectedGroup))
    : []
  const availableExercises = selectedGroup
    ? exercises.filter(ex => !isExerciseAssigned(ex.id, selectedGroup))
    : []

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Safe area wrapper */}
      <div className="fixed inset-0 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-black">
          <div>
            <h1 className="text-lg font-bold text-white">Group Exercises</h1>
            <p className="text-sm text-gray-400">Assign exercises to groups</p>
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
        <div className="max-w-6xl mx-auto">

        {/* Group Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
            Select Group
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full max-w-md px-4 py-3 rounded-lg border border-gray-700 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose a group...</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        {selectedGroup && (
          <>
            {/* Quick Actions */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={() => assignAllExercisesToGroup(selectedGroup)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors border border-green-500"
              >
                Assign All Exercises
              </button>
              <span className="text-gray-400 text-sm">
                {selectedGroupExercises.length} of {exercises.length} exercises assigned
              </span>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Assigned Exercises */}
              <div>
                <h2 className="text-lg font-semibold mb-3 text-green-400 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                  Assigned Exercises ({selectedGroupExercises.length})
                </h2>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {selectedGroupExercises.map(exercise => (
                    <div
                      key={exercise.id}
                      className="bg-green-900/20 border border-green-700/50 p-4 rounded-lg flex items-center justify-between hover:bg-green-900/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white">{exercise.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {exercise.type || 'regular'} • {exercise.points_per_unit} pts/{exercise.unit}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExerciseAssignment(exercise.id, selectedGroup)}
                        className="ml-3 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-sm rounded font-medium transition-colors border border-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {selectedGroupExercises.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No exercises assigned yet
                    </div>
                  )}
                </div>
              </div>

              {/* Available Exercises */}
              <div>
                <h2 className="text-lg font-semibold mb-3 text-blue-400 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                  Available Exercises ({availableExercises.length})
                </h2>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {availableExercises.map(exercise => (
                    <div
                      key={exercise.id}
                      className="bg-gray-900 border border-gray-700 p-4 rounded-lg flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white">{exercise.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {exercise.type || 'regular'} • {exercise.points_per_unit} pts/{exercise.unit}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExerciseAssignment(exercise.id, selectedGroup)}
                        className="ml-3 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm rounded font-medium transition-colors border border-green-500"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                  {availableExercises.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      All exercises assigned
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        </div>
        </div>
      </div>
    </div>
  )
}