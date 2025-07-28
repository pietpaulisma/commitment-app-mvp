'use client'

import RectangularNavigation from '@/components/RectangularNavigation'
import RectangularDashboard from '@/components/RectangularDashboard'
import TimeGradient from '@/components/TimeGradient'

export default function Dashboard() {
  return (
    <div className="relative min-h-screen bg-black">
      {/* Unified gradient background covering entire landing area until Status section */}
      <div className="absolute inset-0 h-[85vh] z-0">
        <TimeGradient />
      </div>
      
      {/* Components with transparent/relative positioning */}
      <div className="relative z-10">
        <RectangularNavigation />
        <RectangularDashboard />
      </div>
    </div>
  )
}