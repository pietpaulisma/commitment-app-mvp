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
  created_at: string
  updated_at: string
}

let exerciseCache: Exercise[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>(exerciseCache || [])
  const [loading, setLoading] = useState(!exerciseCache)
  const [error, setError] = useState<string | null>(null)

  const loadExercises = async (forceRefresh = false) => {
    const now = Date.now()
    
    // Use cache if valid and not forced refresh
    if (!forceRefresh && exerciseCache && (now - cacheTimestamp) < CACHE_DURATION) {
      setExercises(exerciseCache)
      setLoading(false)
      return exerciseCache
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('exercises')
        .select('*')
        .order('name')

      if (supabaseError) throw supabaseError
      
      const exerciseData = data || []
      
      // Update cache
      exerciseCache = exerciseData
      cacheTimestamp = now
      
      setExercises(exerciseData)
      return exerciseData
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load exercises'
      setError(errorMessage)
      console.error('Error loading exercises:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  const refreshExercises = () => loadExercises(true)

  useEffect(() => {
    loadExercises()
  }, [])

  return {
    exercises,
    loading,
    error,
    refreshExercises,
    loadExercises
  }
}