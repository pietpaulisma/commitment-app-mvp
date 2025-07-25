-- Add username column to profiles table
-- Run this SQL directly in your Supabase SQL editor

-- Add username column if it doesn't exist
DO $$ 
BEGIN
    -- Add username column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE profiles ADD COLUMN username text;
    END IF;
END $$;

-- For existing profiles that have first_name and last_name, create username from those
-- This handles any existing data gracefully
UPDATE profiles 
SET username = COALESCE(first_name || ' ' || last_name, first_name, last_name, 'User')
WHERE username IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL);

-- Set a default username for any profiles that still don't have one
UPDATE profiles 
SET username = 'User'
WHERE username IS NULL;

-- Make username required going forward
ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.username IS 'User display name for the application';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'username';