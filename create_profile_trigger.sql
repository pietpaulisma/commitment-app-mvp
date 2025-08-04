-- Create trigger to automatically create profile when user signs up
-- This ensures every authenticated user gets a profile record

-- Function to create profile for new users
CREATE OR REPLACE FUNCTION create_profile_for_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (
    id,
    email,
    username,
    role,
    group_id,
    preferred_weight,
    is_weekly_mode,
    location,
    personal_color,
    custom_icon
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'user',
    NULL,
    70,
    false,
    'Unknown',
    '#3b82f6',
    '💪'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_new_user();

-- Also create a function to manually create missing profiles for existing users
CREATE OR REPLACE FUNCTION create_missing_profiles() 
RETURNS TEXT AS $$
DECLARE
  missing_count INTEGER;
BEGIN
  INSERT INTO profiles (
    id,
    email,
    username,
    role,
    group_id,
    preferred_weight,
    is_weekly_mode,
    location,
    personal_color,
    custom_icon
  )
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
    'user',
    NULL,
    70,
    false,
    'Unknown',
    '#3b82f6',
    '💪'
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.id
  WHERE p.id IS NULL;
  
  GET DIAGNOSTICS missing_count = ROW_COUNT;
  
  RETURN 'Created ' || missing_count || ' missing profiles';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to create any missing profiles
SELECT create_missing_profiles();