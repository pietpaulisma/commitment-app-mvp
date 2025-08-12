-- Test current week_mode for Matthijs to ensure persistence is working
-- Run this in your Supabase SQL editor

-- Check current week_mode for Matthijs
SELECT 
  username,
  week_mode,
  email,
  updated_at
FROM profiles 
WHERE username = 'Matthijs';

-- Also verify the update works by testing a mode switch
-- (Don't actually run this update - just verify the SELECT above shows 'sane' if you set it to sane)