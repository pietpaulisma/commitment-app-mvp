// ARCHIVED: Old "SLIDE TO COMMIT" workout input system
// This system used selectedExercise state and is no longer accessible through the UI
// The new system uses selectedWorkoutExercise + workoutInputOpen
// Archived to prevent accidentally fixing the wrong screens

// Lines 1571-1904 from WorkoutModal.tsx
{/* Exercise Input Form - Completely Redesigned */}
{selectedExercise && (
  <div className="bg-black mt-6">
    {/* Points Header with Gradient */}
    <div className="relative overflow-hidden">
      {/* Gradient Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}20 50%, transparent 100%)`
        }}
      />
      <div className="relative p-6">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-3 mb-3">
            {getExerciseIcon(selectedExercise)}
            <h3 className="text-2xl font-bold text-white">{selectedExercise.name}</h3>
          </div>
          <div className="text-6xl font-black mb-2" style={{ color: getCategoryColor(selectedExercise.type, selectedExercise.id) }}>
            {calculatePoints()}
          </div>
          <div className="text-lg text-white font-medium">
            POINTS EARNED
          </div>
          <div className="text-sm text-gray-300">
            {selectedExercise.points_per_unit} pts per {selectedExercise.unit}
          </div>
        </div>
      </div>
    </div>
    
    {/* Intensity Selector for Sport */}
    {selectedExercise.id.startsWith('sport_') && (
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Intensity Level</label>
        <div className="space-y-2">
          {[
            { id: 'light', name: 'Light', points: 125, emoji: '🚶' },
            { id: 'medium', name: 'Medium', points: 250, emoji: '🏃' },
            { id: 'intense', name: 'Intense', points: 375, emoji: '💨' }
          ].map((intensity) => (
            <button
              key={intensity.id}
              type="button"
              onClick={() => {
                setSelectedIntensity(intensity.id)
                // Update the exercise with new points
                const updatedExercise = {
                  ...selectedExercise,
                  points_per_unit: intensity.points,
                  name: selectedExercise.name.replace(/\(.*\)/, '(' + intensity.name + ')')
                }
                setSelectedExercise(updatedExercise)
              }}
              className={`w-full p-3 text-left transition-colors border ${
                selectedIntensity === intensity.id
                  ? 'bg-purple-900/50 border-blue-500 text-blue-300'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{intensity.emoji}</span>
                  <span className="font-medium">{intensity.name}</span>
                </div>
                <span className="text-sm font-bold">
                  {intensity.points} pts/min
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Main Counter Section with Gradient */}
    <div className="p-6">
      <div className="relative overflow-hidden rounded-2xl mb-6">
        {/* Gradient Background */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}30 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}10 100%)`
          }}
        />
        
        <div className="relative p-8">
          <div className="text-center mb-8">
            <div className="text-8xl font-black text-white mb-4" style={{ textShadow: '0 0 30px rgba(255,255,255,0.2)' }}>
              {quantity || (selectedExercise?.is_time_based ? '5' : '1')}
            </div>
            <div className="text-xl text-white font-medium uppercase tracking-wider">
              {selectedExercise.unit}{selectedExercise.unit !== 'rep' && 's'}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(selectedExercise.is_time_based ? 5 : 1, parseFloat(quantity || (selectedExercise?.is_time_based ? '5' : '1')) - (selectedExercise.is_time_based ? 5 : 1)).toString())}
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold transition-all duration-300 hover:scale-110 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40 100%)`,
                boxShadow: `0 10px 30px ${getCategoryColor(selectedExercise.type, selectedExercise.id)}30`
              }}
            >
              −
            </button>
            
            <button
              type="button"
              onClick={() => setQuantity((parseFloat(quantity || (selectedExercise?.is_time_based ? '5' : '1')) + (selectedExercise.is_time_based ? 5 : 1)).toString())}
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold transition-all duration-300 hover:scale-110 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}80 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60 100%)`,
                boxShadow: `0 10px 30px ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40`
              }}
            >
              +
            </button>
          </div>

          {/* Quick Add Buttons */}
          <div className="flex justify-center gap-3">
            {selectedExercise.is_time_based ? (
              <>
                <button
                  type="button"
                  onClick={() => setQuantity((parseFloat(quantity || (selectedExercise?.is_time_based ? '5' : '1')) + 15).toString())}
                  className="px-6 py-3 rounded-full text-white font-bold transition-all duration-300 hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}20 100%)`,
                    border: `2px solid ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60`
                  }}
                >
                  +15min
                </button>
                <button
                  type="button"
                  onClick={() => setQuantity((parseFloat(quantity || (selectedExercise?.is_time_based ? '5' : '1')) + 30).toString())}
                  className="px-6 py-3 rounded-full text-white font-bold transition-all duration-300 hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}20 100%)`,
                    border: `2px solid ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60`
                  }}
                >
                  +30min
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setQuantity((parseFloat(quantity || (selectedExercise?.is_time_based ? '5' : '1')) + 5).toString())}
                  className="px-6 py-3 rounded-full text-white font-bold transition-all duration-300 hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}20 100%)`,
                    border: `2px solid ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60`
                  }}
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => setQuantity((parseFloat(quantity || (selectedExercise?.is_time_based ? '5' : '1')) + 10).toString())}
                  className="px-6 py-3 rounded-full text-white font-bold transition-all duration-300 hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}40 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}20 100%)`,
                    border: `2px solid ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60`
                  }}
                >
                  +10
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Weight & Modifiers Section */}
    {(selectedExercise.is_weighted || selectedExercise.supports_decreased) && (
      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Weight Selection */}
          {selectedExercise.is_weighted && (
            <div className="relative overflow-hidden rounded-xl">
              <div 
                className="absolute inset-0 opacity-30"
                style={{
                  background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}20 0%, transparent 100%)`
                }}
              />
              <div className="relative p-4">
                <div className="text-center text-white font-medium mb-3">Weight</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWeight('0')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                      weight === '0' || weight === '' 
                        ? 'text-white shadow-lg' 
                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                    }`}
                    style={weight === '0' || weight === '' ? {
                      background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}80 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60 100%)`,
                      boxShadow: `0 4px 15px ${getCategoryColor(selectedExercise.type, selectedExercise.id)}30`
                    } : {}}
                  >
                    Body
                  </button>
                  {[10, 15, 20, 25].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWeight(w.toString())}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                        weight === w.toString() 
                          ? 'text-white shadow-lg' 
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                      }`}
                      style={weight === w.toString() ? {
                        background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}80 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60 100%)`,
                        boxShadow: `0 4px 15px ${getCategoryColor(selectedExercise.type, selectedExercise.id)}30`
                      } : {}}
                    >
                      {w}kg
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Decreased Exercise Option */}
          {selectedExercise.supports_decreased && (
            <div className="relative overflow-hidden rounded-xl">
              <div 
                className="absolute inset-0 opacity-30"
                style={{
                  background: `linear-gradient(135deg, #f59e0b20 0%, transparent 100%)`
                }}
              />
              <div className="relative p-4">
                <div className="text-center text-white font-medium mb-3">Difficulty</div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setWeight('')} // Using weight state for this toggle
                    className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                      weight !== 'decreased' 
                        ? 'text-white shadow-lg' 
                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                    }`}
                    style={weight !== 'decreased' ? {
                      background: `linear-gradient(135deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}80 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60 100%)`,
                      boxShadow: `0 4px 15px ${getCategoryColor(selectedExercise.type, selectedExercise.id)}30`
                    } : {}}
                  >
                    Regular
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeight('decreased')}
                    className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                      weight === 'decreased' 
                        ? 'text-white shadow-lg' 
                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                    }`}
                    style={weight === 'decreased' ? {
                      background: `linear-gradient(135deg, #f59e0b80 0%, #f59e0b60 100%)`,
                      boxShadow: `0 4px 15px #f59e0b30`
                    } : {}}
                  >
                    <div>Decreased</div>
                    <div className="text-xs opacity-75">+50% pts</div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Slide to Commit Button */}
    <div className="p-6 pt-0">
      <div className="relative overflow-hidden rounded-2xl">
        {/* Gradient Background */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}60 0%, ${getCategoryColor(selectedExercise.type, selectedExercise.id)}80 100%)`
          }}
        />
        
        <button
          onClick={(e) => {
            e.preventDefault();
            handleSubmit(e as any);
          }}
          disabled={loading || parseFloat(quantity || (selectedExercise?.is_time_based ? '5' : '1')) <= 0}
          className="relative w-full py-8 px-8 text-black font-black text-xl tracking-wider transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl shadow-2xl hover:shadow-3xl"
          style={{
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black/20 rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-l-[8px] border-l-black/60 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
              </div>
              <span>SLIDE TO COMMIT</span>
            </div>
            <div className="text-2xl">
              {loading ? '⏳' : '🚀'}
            </div>
          </div>
          
          {/* Shimmer Effect */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              animation: 'shimmer 2s infinite'
            }}
          />
        </button>
      </div>
    </div>
  </div>
)}