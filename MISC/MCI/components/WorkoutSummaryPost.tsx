import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';

interface Exercise {
  name: string;
  reps?: number;
  duration?: string;
  points: number;
}

interface WorkoutData {
  title: string;
  points: number;
  target: number;
  percentage: number;
  exercises: Exercise[];
  completedAt: string;
}

interface WorkoutSummaryPostProps {
  workoutData: WorkoutData;
  user?: any;
  compact?: boolean;
}

export function WorkoutSummaryPost({ workoutData, user, compact }: WorkoutSummaryPostProps) {
  const data = workoutData;
  const [showDetails, setShowDetails] = useState(false);

  // Generate workout type based on exercises
  const getWorkoutType = (exercises: Exercise[]): string => {
    const exerciseNames = exercises.map(ex => ex.name.toLowerCase());
    
    const hasStrength = exerciseNames.some(name => 
      name.includes('pull-up') || name.includes('push-up') || name.includes('dip') || 
      name.includes('squat') || name.includes('deadlift') || name.includes('bench')
    );
    
    const hasCardio = exerciseNames.some(name => 
      name.includes('run') || name.includes('bike') || name.includes('swim') || 
      name.includes('cardio') || name.includes('hiit')
    );
    
    const hasYoga = exerciseNames.some(name => 
      name.includes('yoga') || name.includes('stretch') || name.includes('meditation')
    );
    
    const hasCore = exerciseNames.some(name => 
      name.includes('plank') || name.includes('crunch') || name.includes('sit-up') || 
      name.includes('abs')
    );

    if (hasStrength && hasYoga) return "Strength & Recovery";
    if (hasStrength && hasCardio) return "HIIT Training";
    if (hasStrength && hasCore) return "Full Body Power";
    if (hasCardio && hasYoga) return "Cardio Flow";
    if (hasStrength) return "Strength Training";
    if (hasCardio) return "Cardio Blast";
    if (hasYoga) return "Mindful Movement";
    if (hasCore) return "Core Crusher";
    
    return "Mixed Training";
  };

  // Determine if workout was "sane" or "insane"
  const getIntensityLabel = (percentage: number, points: number): string => {
    if (percentage >= 100 || points > 500) return "INSANE";
    return "sane";
  };

  const workoutType = getWorkoutType(data.exercises);
  const intensity = getIntensityLabel(data.percentage, data.points);
  const isInsane = intensity === "INSANE";

  return (
    <div className="bg-gray-900 rounded-xl p-4 text-white w-full border border-gray-800">
      {/* Compact Header with inline info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-white">{workoutType}</h3>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-300">
          <div className="text-right">
            <span className="font-medium text-white">{data.points}</span>
            <span className="text-gray-400 ml-1">pts</span>
          </div>
        </div>
      </div>

      {/* Progress bar with inline stats */}
      <div className="mb-3">        
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden mb-2">
          <div 
            className={`h-full transition-all duration-500 ${
              isInsane 
                ? data.percentage > 100 
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse' 
                  : 'bg-gradient-to-r from-red-500 to-orange-500'
                : data.percentage > 100
                  ? 'bg-gradient-to-r from-green-500 to-blue-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse'
                  : 'bg-gradient-to-r from-green-500 to-blue-500'
            }`}
            style={{ width: `${Math.min(data.percentage, 100)}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center text-gray-400">
          <span className="text-xs">{intensity}</span>
          <span 
            className={`font-medium transition-all duration-300 ${
              data.percentage >= 140 
                ? 'text-xl text-white' 
                : data.percentage >= 120 
                  ? 'text-lg text-white' 
                  : data.percentage >= 105 
                    ? 'text-base text-white' 
                    : 'text-xs'
            } ${
              data.percentage > 100 && isInsane 
                ? 'text-orange-400 drop-shadow-[0_0_4px_rgba(251,146,60,0.8)]'
                : data.percentage > 100 
                  ? 'text-green-400 drop-shadow-[0_0_4px_rgba(34,197,94,0.8)]'
                  : ''
            }`}
          >
            {data.percentage}%
          </span>
        </div>
      </div>

      {/* Exercise summary inline */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 text-xs text-gray-300">
          {data.exercises.slice(0, 3).map((exercise, index) => (
            <span key={index} className="bg-gray-800 px-2 py-1 rounded">
              {exercise.name}
            </span>
          ))}
          {data.exercises.length > 3 && (
            <span className="text-gray-500">+{data.exercises.length - 3}</span>
          )}
        </div>
        
        <Button
          variant="ghost"
          onClick={() => setShowDetails(!showDetails)}
          className="text-gray-400 hover:text-white hover:bg-gray-800 h-6 px-2 text-xs"
        >
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      {/* Detailed exercise breakdown */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
          {data.exercises.map((exercise, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className={`w-1.5 h-1.5 rounded-full ${
                    isInsane ? 'bg-red-400' : 'bg-green-400'
                  }`}
                />
                <span className="text-white">{exercise.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-300">
                <span>{exercise.reps ? `${exercise.reps} reps` : exercise.duration}</span>
                <span className="text-gray-500">{exercise.points}pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}