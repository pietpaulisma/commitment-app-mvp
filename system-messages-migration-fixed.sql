-- System Messages Migration for Group Chat (FIXED VERSION)
-- Creates tables and structures for system messages from the app

-- 1. Create system_messages table
CREATE TABLE IF NOT EXISTS system_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('daily_summary', 'challenge', 'milestone', 'developer_note')),
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'legendary')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  sender_name TEXT NOT NULL DEFAULT 'Barry',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for automated messages
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add system message sender name to groups table
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS system_sender_name TEXT DEFAULT 'Barry';

-- 3. Update chat_messages table to support system messages
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS system_message_id UUID REFERENCES system_messages(id) ON DELETE CASCADE;

-- 4. Enable RLS for system_messages
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for system_messages
CREATE POLICY "Users can view system messages in their group" ON system_messages
FOR SELECT USING (
  group_id IN (
    SELECT group_id FROM profiles WHERE id = auth.uid() AND group_id IS NOT NULL
  )
);

CREATE POLICY "Group admins can create system messages" ON system_messages
FOR INSERT WITH CHECK (
  created_by = auth.uid() AND
  group_id IN (
    SELECT group_id FROM profiles 
    WHERE id = auth.uid() 
    AND group_id IS NOT NULL 
    AND role IN ('group_admin', 'supreme_admin')
  )
);

CREATE POLICY "Group admins can update system messages" ON system_messages
FOR UPDATE USING (
  group_id IN (
    SELECT group_id FROM profiles 
    WHERE id = auth.uid() 
    AND group_id IS NOT NULL 
    AND role IN ('group_admin', 'supreme_admin')
  )
);

CREATE POLICY "Group admins can delete system messages" ON system_messages
FOR DELETE USING (
  group_id IN (
    SELECT group_id FROM profiles 
    WHERE id = auth.uid() 
    AND group_id IS NOT NULL 
    AND role IN ('group_admin', 'supreme_admin')
  )
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_messages_group_id ON system_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_system_messages_type ON system_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_system_messages_rarity ON system_messages(rarity);
CREATE INDEX IF NOT EXISTS idx_system_messages_created_at ON system_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_system ON chat_messages(is_system_message, system_message_id);

-- 7. Create function to insert system message into chat
CREATE OR REPLACE FUNCTION insert_system_message_to_chat(
  p_group_id UUID,
  p_message_type TEXT,
  p_rarity TEXT,
  p_title TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_sender_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_system_message_id UUID;
  v_chat_message_id UUID;
  v_sender_name TEXT;
BEGIN
  -- Get sender name from group settings or use default
  IF p_sender_name IS NULL THEN
    SELECT system_sender_name INTO v_sender_name 
    FROM groups WHERE id = p_group_id;
    
    IF v_sender_name IS NULL THEN
      v_sender_name := 'Barry';
    END IF;
  ELSE
    v_sender_name := p_sender_name;
  END IF;

  -- Insert system message
  INSERT INTO system_messages (
    group_id, message_type, rarity, title, content, metadata, sender_name
  ) VALUES (
    p_group_id, p_message_type, p_rarity, p_title, p_content, p_metadata, v_sender_name
  ) RETURNING id INTO v_system_message_id;

  -- Insert into chat_messages for display
  INSERT INTO chat_messages (
    group_id, user_id, message, message_type, is_system_message, system_message_id
  ) VALUES (
    p_group_id, NULL, p_content, 'text', true, v_system_message_id
  ) RETURNING id INTO v_chat_message_id;

  RETURN v_system_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to generate daily summary
CREATE OR REPLACE FUNCTION generate_daily_summary(p_group_id UUID) RETURNS UUID AS $$
DECLARE
  v_summary_content TEXT;
  v_total_members INTEGER;
  v_committed_members INTEGER;
  v_commitment_rate DECIMAL;
  v_top_performer TEXT;
  v_top_points INTEGER;
BEGIN
  -- Calculate daily stats
  SELECT COUNT(DISTINCT p.id) INTO v_total_members
  FROM profiles p
  WHERE p.group_id = p_group_id;

  SELECT COUNT(DISTINCT dc.user_id) INTO v_committed_members
  FROM daily_checkins dc
  JOIN profiles p ON dc.user_id = p.id
  WHERE dc.group_id = p_group_id 
  AND dc.date = CURRENT_DATE 
  AND dc.is_complete = true;

  v_commitment_rate := CASE 
    WHEN v_total_members > 0 THEN (v_committed_members::DECIMAL / v_total_members::DECIMAL) * 100
    ELSE 0
  END;

  -- Find top performer
  SELECT p.username, dc.total_points 
  INTO v_top_performer, v_top_points
  FROM daily_checkins dc
  JOIN profiles p ON dc.user_id = p.id
  WHERE dc.group_id = p_group_id 
  AND dc.date = CURRENT_DATE
  ORDER BY dc.total_points DESC
  LIMIT 1;

  -- Build summary content
  v_summary_content := format(
    '🌅 **Daily Summary** - %s

💪 **Commitment Rate**: %s%% (%s/%s members)
🏆 **Top Performer**: %s (%s points)

%s',
    CURRENT_DATE::DATE,
    ROUND(v_commitment_rate, 1),
    v_committed_members,
    v_total_members,
    COALESCE(v_top_performer, 'No one yet'),
    COALESCE(v_top_points, 0),
    CASE 
      WHEN v_commitment_rate = 100 THEN '🎉 Everyone is committed today! Amazing work!'
      WHEN v_commitment_rate >= 80 THEN '✨ Great commitment from the team!'
      WHEN v_commitment_rate >= 50 THEN '📈 Good progress, let''s keep it up!'
      ELSE '💪 Let''s crush those goals today!'
    END
  );

  -- Insert system message
  RETURN insert_system_message_to_chat(
    p_group_id,
    'daily_summary',
    'common',
    'Daily Summary',
    v_summary_content,
    jsonb_build_object(
      'commitment_rate', v_commitment_rate,
      'committed_members', v_committed_members,
      'total_members', v_total_members,
      'top_performer', v_top_performer,
      'top_points', v_top_points
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create sample system messages for testing (only if group exists)
INSERT INTO system_messages (
  group_id, message_type, rarity, title, content, sender_name
) 
SELECT 
  '4e6215d5-6c60-451f-84f6-783545ace8a2'::UUID,
  'milestone',
  'legendary',
  'Pot Alert! 🚨',
  '💰 **MILESTONE REACHED!** 💰

The group pot has hit €500! 🎉

This is a legendary moment - you''ve all been crushing your commitments and the pot is growing strong! 

Keep up the amazing work, team! 💪',
  'Barry'
WHERE EXISTS (SELECT 1 FROM groups WHERE id = '4e6215d5-6c60-451f-84f6-783545ace8a2');

-- 10. Simple RLS policies for chat_messages (no NEW reference issues)
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view messages in their group" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their group" ON chat_messages;

-- Create new policies without NEW references
CREATE POLICY "Users can view messages in their group" ON chat_messages
FOR SELECT USING (
  group_id IN (
    SELECT group_id FROM profiles WHERE id = auth.uid() AND group_id IS NOT NULL
  )
);

-- Separate policies for regular messages and system messages
CREATE POLICY "Users can send regular messages to their group" ON chat_messages
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND 
  (is_system_message IS NULL OR is_system_message = false) AND
  group_id IN (
    SELECT group_id FROM profiles WHERE id = auth.uid() AND group_id IS NOT NULL
  )
);

CREATE POLICY "Admins can create system messages" ON chat_messages
FOR INSERT WITH CHECK (
  user_id IS NULL AND 
  is_system_message = true AND
  system_message_id IS NOT NULL AND
  auth.uid() IN (
    SELECT p.id FROM profiles p
    JOIN system_messages sm ON sm.group_id = p.group_id
    WHERE sm.id = system_message_id
    AND p.role IN ('group_admin', 'supreme_admin')
  )
);