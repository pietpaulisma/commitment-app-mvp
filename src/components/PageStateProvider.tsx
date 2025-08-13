'use client'

import { usePageState } from '@/hooks/usePageState'

interface PageStateProviderProps {
  children: React.ReactNode
}

export default function PageStateProvider({ children }: PageStateProviderProps) {
  // Initialize the page state hook globally
  usePageState()
  
  return <>{children}</>
}