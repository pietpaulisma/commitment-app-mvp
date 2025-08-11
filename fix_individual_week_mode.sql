-- Fix week_mode to be individual per user instead of group-wide
-- Run this SQL directly in your Supabase SQL editor

-- Add week_mode column to profiles table for individual user preferences
DO $$ 
BEGIN
    -- Add week_mode column to profiles if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'week_mode') THEN
        ALTER TABLE profiles ADD COLUMN week_mode TEXT DEFAULT 'insane' CHECK (week_mode IN ('sane', 'insane'));
    END IF;
END $$;

-- Set all existing users to 'insane' mode (current default)
UPDATE profiles 
SET week_mode = 'insane' 
WHERE week_mode IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.week_mode IS 'Individual user week mode preference (sane or insane)';

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'week_mode';