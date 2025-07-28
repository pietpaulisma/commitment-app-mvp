'use client'

import RectangularNavigation from '@/components/RectangularNavigation'
import RectangularDashboard from '@/components/RectangularDashboard'
import TimeGradient from '@/components/TimeGradient'

export default function Dashboard() {
  return (
    <div className="relative min-h-screen">
      {/* Unified gradient background for both components */}
      <div className="absolute inset-x-0 top-0 h-[40vh] overflow-hidden">
        <TimeGradient className="z-0" />
      </div>
      
      {/* Components with relative positioning */}
      <div className="relative z-10">
        <RectangularNavigation />
        <RectangularDashboard />
      </div>
    </div>
  )
}