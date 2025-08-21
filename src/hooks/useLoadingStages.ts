'use client'

import { useState, useEffect } from 'react'

interface LoadingStage {
  key: string
  label: string
  duration: number
}

export function useLoadingStages(stages: LoadingStage[]) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  
  const currentStage = stages[currentStageIndex]
  const progress = ((currentStageIndex + 1) / stages.length) * 100

  const nextStage = () => {
    if (currentStageIndex < stages.length - 1) {
      setCurrentStageIndex(prev => prev + 1)
    } else {
      setIsComplete(true)
    }
  }

  const setStage = (stageKey: string) => {
    const index = stages.findIndex(stage => stage.key === stageKey)
    if (index >= 0) {
      setCurrentStageIndex(index)
    }
  }

  const reset = () => {
    setCurrentStageIndex(0)
    setIsComplete(false)
  }

  const complete = () => {
    // Ensure we show the final stage at 100% before marking complete
    setCurrentStageIndex(stages.length - 1)
    // Small delay to show 100% before marking complete
    setTimeout(() => {
      setIsComplete(true)
    }, 300)
  }

  return {
    currentStage: currentStage?.key || '',
    currentStageLabel: currentStage?.label || '',
    progress,
    isComplete,
    nextStage,
    setStage,
    reset,
    complete
  }
}