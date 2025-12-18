-- Add sport_name column to both logs and workout_logs tables
-- This column stores the specific sport name (e.g., "Running", "Tennis") 
-- separate from exercise_name which stores the intensity (e.g., "Medium Sport")

-- Add to logs table (used by dashboard)
ALTER TABLE logs 
ADD COLUMN IF NOT EXISTS sport_name TEXT NULL;

-- Add to workout_logs table (used by WorkoutModal)
ALTER TABLE workout_logs 
ADD COLUMN IF NOT EXISTS sport_name TEXT NULL;

-- Add indexes for better query performance when filtering by sport
CREATE INDEX IF NOT EXISTS idx_logs_sport_name 
ON logs(sport_name) 
WHERE sport_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_logs_sport_name 
ON workout_logs(sport_name) 
WHERE sport_name IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN logs.sport_name IS 'Specific sport name for sport-type exercises (e.g., Running, Tennis). NULL for non-sport exercises.';
COMMENT ON COLUMN workout_logs.sport_name IS 'Specific sport name for sport-type exercises (e.g., Running, Tennis). NULL for non-sport exercises.';
