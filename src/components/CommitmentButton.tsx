'use client'

import { useState, useRef, useCallback } from 'react'

interface CommitmentButtonProps {
  onCommit: () => void
  disabled?: boolean
  className?: string
}

const HOLD_DURATION = 10000 // 10 seconds in milliseconds
const MESSAGES = [
  { time: 0, text: "Hold to commit...", color: "text-red-400" },
  { time: 1000, text: "Are you sure?", color: "text-red-300" },
  { time: 2500, text: "There's no way back...", color: "text-red-200" },
  { time: 4000, text: "This is permanent.", color: "text-orange-300" },
  { time: 5500, text: "Are you VERY sure?", color: "text-orange-200" },
  { time: 7000, text: "Last chance to stop...", color: "text-yellow-300" },
  { time: 8500, text: "FINAL WARNING", color: "text-yellow-200" },
  { time: 9500, text: "COMMITTING...", color: "text-white" }
]

export default function CommitmentButton({ 
  onCommit, 
  disabled = false, 
  className = '' 
}: CommitmentButtonProps) {
  const [isHolding, setIsHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentMessage, setCurrentMessage] = useState(MESSAGES[0])
  const [isCompleted, setIsCompleted] = useState(false)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  const startHold = useCallback(() => {
    if (disabled || isCompleted) return
    
    setIsHolding(true)
    setProgress(0)
    startTimeRef.current = Date.now()
    
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const progressPercent = Math.min((elapsed / HOLD_DURATION) * 100, 100)
      
      setProgress(progressPercent)
      
      // Update message based on elapsed time
      const currentMsg = MESSAGES.reduce((prev, curr) => {
        return elapsed >= curr.time ? curr : prev
      }, MESSAGES[0])
      setCurrentMessage(currentMsg)
      
      // Complete the commitment when we reach 100%
      if (elapsed >= HOLD_DURATION) {
        setIsCompleted(true)
        setIsHolding(false)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        
        // Brief delay before calling onCommit for dramatic effect
        setTimeout(() => {
          onCommit()
        }, 300)
      }
    }, 50) // Update every 50ms for smooth progress
  }, [disabled, isCompleted, onCommit])

  const stopHold = useCallback(() => {
    if (isCompleted) return
    
    setIsHolding(false)
    setProgress(0)
    setCurrentMessage(MESSAGES[0])
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [isCompleted])

  const getBackgroundColor = () => {
    if (isCompleted) return 'bg-green-600'
    if (progress < 25) return 'bg-red-600'
    if (progress < 50) return 'bg-red-500'
    if (progress < 75) return 'bg-orange-500'
    return 'bg-yellow-500'
  }

  const getBorderColor = () => {
    if (isCompleted) return 'border-green-400'
    if (progress < 25) return 'border-red-400'
    if (progress < 50) return 'border-red-300'
    if (progress < 75) return 'border-orange-300'
    return 'border-yellow-300'
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Progress indicator */}
      {isHolding && (
        <div className="mb-4">
          <div className="bg-gray-900 border border-gray-800 h-3 overflow-hidden">
            <div 
              className={`h-full transition-all duration-75 ${getBackgroundColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-center mt-2">
            <span className="text-xs text-gray-400 font-mono">
              {Math.ceil((HOLD_DURATION - (progress * HOLD_DURATION / 100)) / 1000)}s remaining
            </span>
          </div>
        </div>
      )}

      {/* Message display */}
      <div className="text-center mb-6 h-8 flex items-center justify-center">
        <span className={`text-lg font-bold transition-colors duration-300 ${currentMessage.color}`}>
          {currentMessage.text}
        </span>
      </div>

      {/* The commitment button */}
      <button
        onMouseDown={startHold}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={startHold}
        onTouchEnd={stopHold}
        disabled={disabled || isCompleted}
        className={`
          w-full py-6 px-8 
          ${isCompleted ? 'bg-green-600 border-green-400' : getBackgroundColor()} 
          ${getBorderColor()}
          border-2 
          text-black font-black text-xl 
          transition-all duration-200
          ${isHolding ? 'scale-95 shadow-inner' : 'scale-100 shadow-lg'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          select-none
          active:scale-95
        `}
        style={{
          textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
        }}
      >
        {isCompleted ? '✓ COMMITTED' : 'HOLD TO COMMIT'}
      </button>

      {/* Warning text */}
      <div className="text-center mt-4">
        <p className="text-xs text-red-400/60 uppercase tracking-widest font-mono">
          Hold button for {HOLD_DURATION / 1000} seconds to proceed
        </p>
        <p className="text-xs text-gray-600 mt-1 font-mono">
          Release early and you must start over
        </p>
      </div>
    </div>
  )
}