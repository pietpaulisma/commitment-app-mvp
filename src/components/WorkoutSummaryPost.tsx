import React, { useState } from 'react';

interface Exercise {
  name: string;
  reps?: number;
  count?: number;
  duration?: string;
  points: number;
  unit?: string;
}

interface WorkoutData {
  title?: string;
  points?: number;
  total_points?: number;
  target?: number;
  target_points?: number;
  percentage?: number;
  exercises?: Exercise[] | { [key: string]: any };
  completedAt?: string;
  completed_at?: string;
  username?: string;
  week_mode?: 'sane' | 'insane';
}

interface WorkoutSummaryPostProps {
  workoutData: WorkoutData;
  user?: any;
  compact?: boolean;
  isCurrentUser?: boolean;
  isLastInGroup?: boolean;
}

export function WorkoutSummaryPost({ workoutData, user, compact, isCurrentUser, isLastInGroup }: WorkoutSummaryPostProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Normalize the workout data
  const points = workoutData.points || workoutData.total_points || 0;
  const target = workoutData.target || workoutData.target_points || 500; // Default target if not specified

  const data = {
    title: workoutData.title || 'Workout Completed',
    points: points,
    target: target,
    exercises: Array.isArray(workoutData.exercises)
      ? workoutData.exercises
      : workoutData.exercises
        ? Object.entries(workoutData.exercises).map(([name, data]: [string, any]) => ({
          name,
          count: data.count || data.reps,
          points: data.points,
          unit: data.unit || 'reps'
        }))
        : [],
    completedAt: workoutData.completedAt || workoutData.completed_at || new Date().toLocaleTimeString(),
    percentage: workoutData.percentage || (target > 0
      ? (points / target) * 100
      : 0)
  };

  // Generate workout type based on exercises
  const getWorkoutType = (exercises: Exercise[]): string => {
    if (!exercises || exercises.length === 0) return "Mixed Training";

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
  const getIntensityLabel = (percentage: number, points: number, weekMode?: 'sane' | 'insane'): string => {
    // Use actual week mode if available (new workout summaries)
    if (weekMode) {
      return weekMode === 'insane' ? "INSANE" : "sane";
    }

    // Fallback to old guessing logic for backward compatibility (old workout summaries)
    if (percentage >= 150 || points > 750) return "INSANE";
    return "sane";
  };

  const workoutType = getWorkoutType(data.exercises);
  const intensity = getIntensityLabel(data.percentage, data.points, workoutData.week_mode);
  const isInsane = intensity === "INSANE";

  // Use distinctive styling for user's own workouts
  const bgClass = isCurrentUser 
    ? isInsane 
      ? 'bg-[#1a1a1a] border border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
      : 'bg-[#1a1a1a] border border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
    : 'bg-[#1a1a1a]';

  return (
    <div className={`${bgClass} rounded-[1.5rem] p-4 text-white min-w-[280px] ${isLastInGroup
      ? isCurrentUser
        ? 'rounded-br-[4px]'
        : 'rounded-bl-[4px]'
      : ''
      }`}>

      {/* Message tail for received messages */}
      {!isCurrentUser && isLastInGroup && (
        <div className="absolute -left-[6px] bottom-0 w-[6px] h-[16px] overflow-hidden">
          <svg viewBox="0 0 6 16" className="w-full h-full text-[#1a1a1a] fill-current">
            <path d="M6 16V0C6 0 0 16 0 16H6Z" />
          </svg>
        </div>
      )}
      {/* Header: Percentage and Icon */}
      <div className={`flex items-center justify-between mb-3 pb-3 border-b border-white/5`}>
        <div className="flex items-center gap-2">
          <div className="text-sm">💪</div>
          <div className="text-xs font-bold text-white/60 uppercase tracking-wider">Workout</div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-black uppercase tracking-wider ${isInsane ? 'text-orange-500 drop-shadow-[0_0_3px_rgba(249,115,22,0.5)]' : 'text-cyan-400'}`}>
            {isInsane ? 'INSANE' : 'SANE'}
          </span>
          <div className={`text-sm font-black ${isInsane
            ? 'text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.6)]'
            : 'text-cyan-400'
            }`}>
            {Math.round(data.percentage)}%
          </div>
        </div>
      </div>

      {/* Exercise List - Always visible */}
      {data.exercises.length > 0 ? (
        <div className="space-y-1.5">
          {data.exercises.map((exercise, index) => (
            <div key={index} className="grid grid-cols-[1fr_auto_60px] gap-3 items-center text-xs">
              <span className="text-white/90 font-medium truncate">{exercise.name}</span>
              <span className="text-white/60 font-medium whitespace-nowrap text-right">
                {exercise.count || exercise.reps || 0} {exercise.unit || 'reps'}
              </span>
              <span className="text-white/40 font-medium text-right font-mono text-[10px]">
                +{Math.round(exercise.points)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-white/40 italic">No exercises recorded</div>
      )}
    </div>
  );
}