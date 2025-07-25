'use client'

import { ReactNode } from 'react'

interface OnboardingLayoutProps {
  children: ReactNode
  showBackButton?: boolean
  onBack?: () => void
  className?: string
}

export default function OnboardingLayout({ 
  children, 
  showBackButton = false, 
  onBack,
  className = ''
}: OnboardingLayoutProps) {
  return (
    <div className={`min-h-screen bg-black ${className}`}>
      {/* Header with optional back button */}
      {showBackButton && (
        <div className="flex items-center justify-between p-4 border-b border-red-900/50 sticky top-0 bg-black z-40">
          <button
            onClick={onBack}
            className="text-red-400 hover:text-red-300 transition-colors p-2"
            aria-label="Go back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-xs text-red-400/60 uppercase tracking-widest font-mono">
            NO ESCAPE
          </div>
        </div>
      )}

      {/* Main content area - completely scrollable */}
      <div className="pb-20">
        {children}
      </div>

      {/* Subtle warning footer - positioned at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-red-900/30 bg-black">
        <div className="text-center">
          <div className="text-xs text-red-400/40 uppercase tracking-widest font-mono mb-1">
            COMMITMENT PROTOCOL
          </div>
          <div className="text-xs text-gray-600 font-mono">
            Once you begin, there is no turning back.
          </div>
        </div>
      </div>
    </div>
  )
}