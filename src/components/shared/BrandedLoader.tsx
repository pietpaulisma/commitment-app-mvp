'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface LoadingStage {
  key: string
  label: string
  duration: number // in milliseconds
}

interface BrandedLoaderProps {
  stages?: LoadingStage[]
  currentStage?: string
  message?: string
  fullScreen?: boolean
  className?: string
}

const defaultStages: LoadingStage[] = [
  { key: 'auth', label: 'Authenticating...', duration: 1000 },
  { key: 'profile', label: 'Loading profile...', duration: 800 },
  { key: 'data', label: 'Loading data...', duration: 1200 },
]

export default function BrandedLoader({
  stages = defaultStages,
  currentStage,
  message,
  fullScreen = true,
  className = ''
}: BrandedLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [displayStage, setDisplayStage] = useState(stages[0]?.label || 'Loading...')

  useEffect(() => {
    if (currentStage) {
      const stageIndex = stages.findIndex(stage => stage.key === currentStage)
      if (stageIndex >= 0) {
        const progressPercent = ((stageIndex + 1) / stages.length) * 100
        setProgress(progressPercent)
        setDisplayStage(stages[stageIndex].label)
      }
    } else {
      // Auto-progress through stages for demo purposes
      let currentIndex = 0
      const interval = setInterval(() => {
        if (currentIndex < stages.length) {
          setProgress(((currentIndex + 1) / stages.length) * 100)
          setDisplayStage(stages[currentIndex].label)
          currentIndex++
        } else {
          clearInterval(interval)
        }
      }, 800)

      return () => clearInterval(interval)
    }
  }, [currentStage, stages])

  const content = (
    <div className="text-center space-y-6">
      {/* Logo with pulse animation */}
      <div className="relative">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Commitment App"
            width={40}
            height={40}
            className="w-auto h-8 md:h-10 drop-shadow-2xl transform transition-transform duration-500 hover:scale-105"
            priority
          />
        </div>
        
        {/* Subtle pulse glow behind logo */}
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-red-500/20 animate-ping opacity-30"></div>
          <div className="absolute w-16 h-16 rounded-full bg-orange-500/10 animate-ping opacity-20" style={{ animationDelay: '0.5s' }}></div>
        </div>
      </div>

      {/* Progress section */}
      <div className="space-y-3 max-w-xs mx-auto">
        {/* Progress bar */}
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Stage text */}
        <p className="text-sm text-gray-400 font-medium transition-opacity duration-300">
          {message || displayStage}
        </p>
        
        {/* Progress percentage */}
        <p className="text-xs text-gray-500 font-mono">
          {Math.round(progress)}%
        </p>
      </div>

      {/* Subtle background pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full border border-red-900/20 opacity-30"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full border border-orange-900/20 opacity-20"></div>
      </div>
    </div>
  )

  if (fullScreen) {
    return (
      <div className={`min-h-screen bg-black flex items-center justify-center relative ${className}`}>
        {content}
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center p-8 relative ${className}`}>
      {content}
    </div>
  )
}

// Loading stages helper
export const createLoadingStages = (stages: Array<{ key: string; label: string; duration?: number }>) => {
  return stages.map(stage => ({
    ...stage,
    duration: stage.duration || 1000
  }))
}

// Common loading stage sets
export const AUTH_STAGES = createLoadingStages([
  { key: 'auth', label: 'Authenticating...', duration: 800 },
  { key: 'profile', label: 'Loading profile...', duration: 600 },
])

export const DASHBOARD_STAGES = createLoadingStages([
  { key: 'auth', label: 'Authenticating...', duration: 500 },
  { key: 'profile', label: 'Loading profile...', duration: 400 },
  { key: 'group', label: 'Loading group data...', duration: 800 },
  { key: 'stats', label: 'Loading statistics...', duration: 600 },
])

export const WORKOUT_STAGES = createLoadingStages([
  { key: 'auth', label: 'Authenticating...', duration: 500 },
  { key: 'profile', label: 'Loading profile...', duration: 400 },
  { key: 'exercises', label: 'Loading exercises...', duration: 700 },
  { key: 'progress', label: 'Loading progress...', duration: 500 },
])