import WorkoutLogger from '@/components/WorkoutLogger'

export default function WorkoutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Workout Logger</h1>
              <p className="text-gray-600">Track your exercises and earn points</p>
            </div>
            <a href="/dashboard" className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      <WorkoutLogger />
    </div>
  )
}