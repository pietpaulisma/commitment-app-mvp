'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/button'

interface UpdateToastProps {
  onUpdate: () => void
  onDismiss: () => void
}

export default function UpdateToast({ onUpdate, onDismiss }: UpdateToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss()
  }

  const handleUpdate = () => {
    onUpdate()
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ArrowPathIcon className="w-5 h-5 flex-shrink-0 animate-spin" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">New version available!</p>
            <p className="text-xs opacity-90 truncate">Update now to get the latest features</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handleUpdate}
            size="sm"
            className="bg-white text-blue-600 hover:bg-gray-100 font-medium px-3 py-1 text-sm"
          >
            Update
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Dismiss"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
