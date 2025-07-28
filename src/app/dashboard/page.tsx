'use client'

import RectangularNavigation from '@/components/RectangularNavigation'
import RectangularDashboard from '@/components/RectangularDashboard'
import TimeGradient from '@/components/TimeGradient'

export default function Dashboard() {
  return (
    <div className="relative min-h-screen bg-black">
      {/* Unified gradient background covering entire landing area until Status section */}
      <div className="fixed inset-x-0 top-0 h-[85vh] overflow-hidden z-0">
        <TimeGradient />
      </div>
      
      {/* Components with relative positioning */}
      <div className="relative z-10">
        <RectangularNavigation />
        <RectangularDashboard />
      </div>
    </div>
  )
}