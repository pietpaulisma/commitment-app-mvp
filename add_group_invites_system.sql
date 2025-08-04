-- Add complete group invites system
-- Run this SQL directly in your Supabase SQL editor

-- 1. Create group_invites table
CREATE TABLE IF NOT EXISTS group_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  max_uses INTEGER DEFAULT 10,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add RLS policies for group_invites
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active, non-expired invite codes (needed for joining)
CREATE POLICY "Anyone can read active invite codes" ON group_invites
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Policy: Group admins can manage invites for their groups
CREATE POLICY "Group admins can manage group invites" ON group_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.group_id = group_invites.group_id 
      AND profiles.role IN ('group_admin', 'supreme_admin')
    )
  );

-- 3. Create function to generate random invite codes
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS TEXT AS $$
BEGIN
  -- Generate 8-character alphanumeric code
  RETURN upper(substring(md5(random()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to create group invite
CREATE OR REPLACE FUNCTION create_group_invite(
  p_group_id UUID,
  p_max_uses INTEGER DEFAULT 10,
  p_expires_days INTEGER DEFAULT 30
) RETURNS group_invites AS $$
DECLARE
  new_invite group_invites;
  invite_code TEXT;
BEGIN
  -- Generate unique invite code
  LOOP
    invite_code := generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM group_invites WHERE invite_code = invite_code);
  END LOOP;
  
  -- Create the invite
  INSERT INTO group_invites (group_id, invite_code, max_uses, expires_at, created_by)
  VALUES (
    p_group_id, 
    invite_code, 
    p_max_uses, 
    CASE 
      WHEN p_expires_days > 0 THEN NOW() + (p_expires_days || ' days')::INTERVAL
      ELSE NULL 
    END,
    auth.uid()
  )
  RETURNING * INTO new_invite;
  
  RETURN new_invite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to join group via invite code
CREATE OR REPLACE FUNCTION join_group_via_invite(p_invite_code TEXT) 
RETURNS JSONB AS $$
DECLARE
  invite_record group_invites;
  group_record groups;
  result JSONB;
BEGIN
  -- Find active invite
  SELECT * INTO invite_record 
  FROM group_invites 
  WHERE invite_code = p_invite_code 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses = 0 OR current_uses < max_uses);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invite code'
    );
  END IF;
  
  -- Get group details
  SELECT * INTO group_record FROM groups WHERE id = invite_record.group_id;
  
  -- Update user's group membership
  UPDATE profiles 
  SET group_id = invite_record.group_id, updated_at = NOW()
  WHERE id = auth.uid();
  
  -- Increment invite usage
  UPDATE group_invites 
  SET current_uses = current_uses + 1, updated_at = NOW()
  WHERE id = invite_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'group_id', group_record.id,
    'group_name', group_record.name,
    'message', 'Successfully joined ' || group_record.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fix groups visibility - ensure public read access
CREATE POLICY "Anyone can read groups for joining" ON groups
  FOR SELECT USING (true);

-- 7. Create some default invite codes for existing groups (optional)
-- Uncomment and run this if you want to create invite codes for existing groups
/*
DO $$
DECLARE
  group_record RECORD;
  invite_record group_invites;
BEGIN
  FOR group_record IN SELECT id, name FROM groups LOOP
    -- Create a default invite for each group (run as system)
    INSERT INTO group_invites (group_id, invite_code, max_uses, created_by)
    SELECT 
      group_record.id,
      generate_invite_code(),
      50, -- Higher limit for initial invites
      (SELECT id FROM profiles WHERE role = 'supreme_admin' LIMIT 1)
    WHERE EXISTS (SELECT 1 FROM profiles WHERE role = 'supreme_admin')
    RETURNING * INTO invite_record;
    
    RAISE NOTICE 'Created invite code % for group %', invite_record.invite_code, group_record.name;
  END LOOP;
END $$;
*/

-- 8. Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_group_invites_code ON group_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_invites_group_id ON group_invites(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_active ON group_invites(is_active) WHERE is_active = true;

-- 9. Add comments for documentation
COMMENT ON TABLE group_invites IS 'Stores invite codes for groups with usage tracking and expiration';
COMMENT ON FUNCTION create_group_invite IS 'Creates a new invite code for a group';
COMMENT ON FUNCTION join_group_via_invite IS 'Allows user to join a group using an invite code';

-- Verify the setup
SELECT 'Group invites system installed successfully!' as status;