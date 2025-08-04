-- Fix profile creation for new users
-- Run this in your Supabase SQL editor

-- 1. First, create missing profiles for any existing auth users
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

-- 2. Run the function to create any missing profiles
SELECT create_missing_profiles();

-- 3. Create the profile creation function for new signups
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

-- 4. Create trigger on auth.users table
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_new_user();

-- 5. Also improve the join_group_via_invite function to be more robust
CREATE OR REPLACE FUNCTION join_group_via_invite(p_invite_code TEXT) 
RETURNS JSON AS $$
DECLARE
  group_record RECORD;
  user_profile RECORD;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Get current user profile (try to find it first)
  SELECT * INTO user_profile FROM profiles WHERE id = current_user_id;
  
  -- If profile doesn't exist, try to create it from auth.users
  IF user_profile IS NULL THEN
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
    WHERE au.id = current_user_id;
    
    -- Now get the newly created profile
    SELECT * INTO user_profile FROM profiles WHERE id = current_user_id;
  END IF;
  
  IF user_profile IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User profile could not be found or created'
    );
  END IF;
  
  -- Check if user is already in a group
  IF user_profile.group_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are already in a group'
    );
  END IF;
  
  -- Find group by invite code
  SELECT * INTO group_record 
  FROM groups 
  WHERE invite_code = UPPER(TRIM(p_invite_code));
  
  IF group_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid invite code'
    );
  END IF;
  
  -- Add user to group
  UPDATE profiles 
  SET group_id = group_record.id, updated_at = NOW()
  WHERE id = current_user_id;
  
  RETURN json_build_object(
    'success', true,
    'group_id', group_record.id,
    'group_name', group_record.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Profile creation system fixed!' as status;