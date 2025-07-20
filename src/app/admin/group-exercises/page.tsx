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
      
      // Load all exercises
      const { data: exercisesData } = await supabase
        .from('exercises')
        .select('*')
        .order('name')

      // Load all groups
      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, name')
        .order('name')

      // Load all group-exercise relationships
      const { data: groupExercisesData } = await supabase
        .from('group_exercises')
        .select('group_id, exercise_id')

      setExercises(exercisesData || [])
      setGroups(groupsData || [])
      setGroupExercises(groupExercisesData || [])
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
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">MANAGE GROUP EXERCISES</h1>
            <p className="text-gray-400 mt-1">Assign exercises to groups</p>
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 font-semibold transition-colors border border-gray-600"
          >
            Back to Profile
          </button>
        </div>

        {/* Group Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            SELECT GROUP
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="mb-6">
              <button
                onClick={() => assignAllExercisesToGroup(selectedGroup)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 mr-4 font-semibold transition-colors border border-green-500"
              >
                Assign All Exercises to Group
              </button>
              <span className="text-gray-400 text-sm">
                {selectedGroupExercises.length} of {exercises.length} exercises assigned
              </span>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Assigned Exercises */}
              <div>
                <h2 className="text-xl font-semibold mb-4 text-green-400">
                  ASSIGNED EXERCISES ({selectedGroupExercises.length})
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedGroupExercises.map(exercise => (
                    <div
                      key={exercise.id}
                      className="bg-green-900/30 border border-green-600 p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{exercise.name}</div>
                        <div className="text-sm text-gray-400">
                          {exercise.type} • {exercise.points_per_unit} pts/{exercise.unit}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExerciseAssignment(exercise.id, selectedGroup)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm font-semibold transition-colors border border-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Exercises */}
              <div>
                <h2 className="text-xl font-semibold mb-4 text-blue-400">
                  AVAILABLE EXERCISES ({availableExercises.length})
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableExercises.map(exercise => (
                    <div
                      key={exercise.id}
                      className="bg-gray-800 border border-gray-600 p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{exercise.name}</div>
                        <div className="text-sm text-gray-400">
                          {exercise.type} • {exercise.points_per_unit} pts/{exercise.unit}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExerciseAssignment(exercise.id, selectedGroup)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm font-semibold transition-colors border border-green-500"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}