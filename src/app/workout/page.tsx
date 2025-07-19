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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Log New Workout</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exercise</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Select an exercise...</option>
                    <option value="squats">Squats (1 pts/rep)</option>
                    <option value="pullups">Pull-ups (4 pts/rep)</option>
                    <option value="burpees">Burpees (3 pts/rep)</option>
                    <option value="plank">Plank (25 pts/minute)</option>
                    <option value="yoga">Yoga - Recovery (10 pts/minute)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter quantity"
                  />
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800">Points for this workout:</span>
                    <span className="text-lg font-bold text-green-600">0</span>
                  </div>
                </div>

                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                  Log Workout
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Today's Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Points:</span>
                  <span className="font-bold text-green-600">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Regular Workouts:</span>
                  <span className="font-bold">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recovery Workouts:</span>
                  <span className="font-bold text-blue-600">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recovery %:</span>
                  <span className="font-bold">0%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Today's Workouts</h3>
              <p className="text-gray-500 text-sm">No workouts logged yet today</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}