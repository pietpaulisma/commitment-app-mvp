-- Add sick mode and flexible rest day columns to profiles table
-- This enables users to temporarily avoid penalties (sick mode) and earn flexible rest days

-- Add sick mode column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_sick_mode BOOLEAN DEFAULT FALSE;

-- Add flexible rest day column  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_flexible_rest_day BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN profiles.is_sick_mode IS 'When true, user is exempt from penalty system temporarily';
COMMENT ON COLUMN profiles.has_flexible_rest_day IS 'When true, user has earned a flexible rest day that can be used';

-- Grant necessary permissions for authenticated users to update these fields
-- (RLS policies should already handle access control)