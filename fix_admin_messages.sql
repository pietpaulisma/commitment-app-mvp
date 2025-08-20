-- Additional fixes for admin messages functionality

-- 1. Ensure the message_type constraint allows 'developer_note'
ALTER TABLE system_messages DROP CONSTRAINT IF EXISTS system_messages_message_type_check;
ALTER TABLE system_messages ADD CONSTRAINT system_messages_message_type_check 
    CHECK (message_type IN ('daily_summary', 'challenge', 'milestone', 'developer_note', 'weekly_challenge', 'personal_summary', 'weekly_summary'));

-- 2. Check if system_message_configs table has the developer_note type
INSERT INTO system_message_configs (message_type, enabled, default_rarity, description, can_be_automated, frequency) 
VALUES ('developer_note', true, 'common', 'Manual developer notes', false, 'manual')
ON CONFLICT (message_type) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    default_rarity = EXCLUDED.default_rarity,
    description = EXCLUDED.description;

-- 3. Ensure proper RLS policies exist for system messages
-- Update the system message creation policy to allow supreme_admin to create messages
DROP POLICY IF EXISTS "Group admins can create system messages" ON system_messages;
CREATE POLICY "Group admins can create system messages" ON system_messages
FOR INSERT WITH CHECK (
  (created_by = auth.uid() OR created_by IS NULL) AND
  (
    -- Allow supreme_admin to create messages for any group
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'supreme_admin') OR
    -- Allow group_admin to create messages for their group
    (group_id IN (
      SELECT group_id FROM profiles 
      WHERE id = auth.uid() 
      AND group_id IS NOT NULL 
      AND role IN ('group_admin')
    ))
  )
);

-- 4. Verify that the RPC function insert_system_message_to_chat works correctly
-- Update it to handle NULL created_by (for automated messages)
CREATE OR REPLACE FUNCTION insert_system_message_to_chat(
  p_group_id UUID,
  p_message_type TEXT,
  p_rarity TEXT DEFAULT 'common',
  p_title TEXT DEFAULT 'System Message',
  p_content TEXT DEFAULT '',
  p_metadata JSONB DEFAULT '{}',
  p_sender_name TEXT DEFAULT 'Barry'
) RETURNS UUID AS $$
DECLARE
  v_system_message_id UUID;
  v_chat_message_id UUID;
  v_sender_name TEXT;
  v_created_by UUID;
BEGIN
  -- Get current user ID (can be NULL for automated messages)
  v_created_by := auth.uid();
  
  -- Use provided sender name or get from group settings or use default
  IF p_sender_name IS NULL OR p_sender_name = '' THEN
    SELECT COALESCE(system_sender_name, 'Barry') INTO v_sender_name 
    FROM groups WHERE id = p_group_id;
    
    v_sender_name := COALESCE(v_sender_name, 'Barry');
  ELSE
    v_sender_name := p_sender_name;
  END IF;

  -- Insert system message
  INSERT INTO system_messages (
    group_id, message_type, rarity, title, content, metadata, sender_name, created_by
  ) VALUES (
    p_group_id, p_message_type, p_rarity, p_title, p_content, p_metadata, v_sender_name, v_created_by
  ) RETURNING id INTO v_system_message_id;

  -- Insert into chat_messages for display
  INSERT INTO chat_messages (
    group_id, user_id, message, message_type, is_system_message, system_message_id
  ) VALUES (
    p_group_id, NULL, p_content, 'text', true, v_system_message_id
  ) RETURNING id INTO v_chat_message_id;

  RETURN v_system_message_id;
EXCEPTION WHEN OTHERS THEN
  -- Log the error and re-raise
  RAISE NOTICE 'Error in insert_system_message_to_chat: %', SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;