-- Add locked_weights column to profiles table
-- This stores the user's locked weight settings per exercise for more reliable persistence

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS locked_weights JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN profiles.locked_weights IS 'JSON object mapping exercise IDs to locked weight values (e.g., {"push-ups": 0, "pull-ups": 10})';



