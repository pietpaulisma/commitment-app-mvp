'use client'

import { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft } from 'lucide-react'

interface OnboardingLayoutProps {
  children: ReactNode
  showBackButton?: boolean
  onBack?: () => void
  className?: string
  step?: number
  totalSteps?: number
}

export default function OnboardingLayout({ 
  children, 
  showBackButton = false, 
  onBack,
  className = '',
  step,
  totalSteps
}: OnboardingLayoutProps) {
  return (
    <div className={`min-h-screen bg-black text-white ${className}`}>
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary opal gradient - bottom left */}
        <div
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.12) 0%, rgba(79, 70, 229, 0.08) 40%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        {/* Secondary purple gradient - top right */}
        <div
          className="absolute -top-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-50"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(79, 70, 229, 0.06) 40%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Header with optional back button and progress */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-14">
          {showBackButton ? (
            <motion.button
              onClick={onBack}
              className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors p-2 -ml-2 rounded-xl hover:bg-white/5"
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft size={20} />
              <span className="text-sm font-medium">Back</span>
            </motion.button>
          ) : (
            <div className="w-20" />
          )}
          
          {/* Progress indicator */}
          {step !== undefined && totalSteps !== undefined && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i < step
                        ? 'w-6 bg-gradient-to-r from-blue-400 to-purple-500'
                        : i === step
                        ? 'w-6 bg-white/40'
                        : 'w-1.5 bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
          
          <div className="w-20" />
        </div>
      </div>

      {/* Main content area - scrollable */}
      <div className="relative z-10 pb-32">
        {children}
      </div>
    </div>
  )
}
