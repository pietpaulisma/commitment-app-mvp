'use client'

import { useState } from 'react'
import { useDemoMode } from '@/contexts/DemoModeContext'
import { X, Eye, EyeOff } from 'lucide-react'

export function DemoModeFloatingButton() {
  const { demoMode, isInDemoMode, exitDemoMode } = useDemoMode()
  const [isExpanded, setIsExpanded] = useState(true)

  if (!isInDemoMode) return null

  const getModeLabel = () => {
    switch (demoMode) {
      case 'user':
        return 'Viewing as User'
      case 'group_admin':
        return 'Viewing as Group Admin'
      case 'onboarding':
        return 'Onboarding Demo'
      default:
        return 'Demo Mode'
    }
  }

  const getModeColor = () => {
    switch (demoMode) {
      case 'user':
        return 'from-blue-500 to-cyan-500'
      case 'group_admin':
        return 'from-amber-500 to-orange-500'
      case 'onboarding':
        return 'from-purple-500 to-pink-500'
      default:
        return 'from-zinc-500 to-zinc-600'
    }
  }

  const getModeEmoji = () => {
    switch (demoMode) {
      case 'user':
        return '👤'
      case 'group_admin':
        return '👑'
      case 'onboarding':
        return '🚀'
      default:
        return '👁️'
    }
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-24 right-4 z-[9999] w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/30 flex items-center justify-center animate-pulse"
      >
        <Eye size={20} className="text-white" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-24 right-4 z-[9999] flex flex-col items-end gap-2">
      {/* Main floating pill */}
      <div 
        className={`bg-gradient-to-r ${getModeColor()} rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden`}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="text-lg">{getModeEmoji()}</span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Demo Mode</span>
            <span className="text-sm font-bold text-white">{getModeLabel()}</span>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex border-t border-white/20">
          <button
            onClick={() => setIsExpanded(false)}
            className="flex-1 px-4 py-2 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
          >
            <EyeOff size={14} />
            Hide
          </button>
          <div className="w-px bg-white/20" />
          <button
            onClick={exitDemoMode}
            className="flex-1 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition-colors flex items-center justify-center gap-1"
          >
            <X size={14} />
            Exit Demo
          </button>
        </div>
      </div>
    </div>
  )
}
