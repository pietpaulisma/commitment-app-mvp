-- Debug function to see what's happening with the invite join
-- Run this to create a debug version that shows the user profile details

CREATE OR REPLACE FUNCTION debug_join_group_via_invite(p_invite_code TEXT) 
RETURNS JSON AS $$
DECLARE
  group_record RECORD;
  user_profile RECORD;
BEGIN
  -- Get current user
  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid();
  
  -- Return debug info about the user
  RETURN json_build_object(
    'user_found', (user_profile IS NOT NULL),
    'user_id', COALESCE(user_profile.id::text, 'null'),
    'user_email', COALESCE(user_profile.email, 'null'),
    'current_group_id', COALESCE(user_profile.group_id::text, 'null'),
    'group_id_is_null', (user_profile.group_id IS NULL),
    'invite_code_provided', p_invite_code,
    'auth_uid', auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;