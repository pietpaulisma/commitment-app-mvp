-- System Message Configuration Restructure Migration
-- Removes challenge type, adds public_message type, and creates detailed configuration tables

-- 1. Update message type enums by recreating the constraint
-- First, we need to remove existing challenge entries if any
DELETE FROM system_messages WHERE message_type = 'challenge';
DELETE FROM system_message_configs WHERE message_type = 'challenge';

-- Drop the existing constraint
ALTER TABLE system_messages DROP CONSTRAINT IF EXISTS system_messages_message_type_check;
ALTER TABLE system_message_configs DROP CONSTRAINT IF EXISTS system_message_configs_message_type_check;

-- Add the new constraint with updated types
ALTER TABLE system_messages 
ADD CONSTRAINT system_messages_message_type_check 
CHECK (message_type IN ('daily_summary', 'milestone', 'developer_note', 'public_message'));

ALTER TABLE system_message_configs 
ADD CONSTRAINT system_message_configs_message_type_check 
CHECK (message_type IN ('daily_summary', 'milestone', 'developer_note', 'public_message'));

-- 2. Update existing system_message_configs entries
-- Remove challenge entry
DELETE FROM system_message_configs WHERE message_type = 'challenge';

-- Add public_message entry
INSERT INTO system_message_configs (message_type, enabled, default_rarity, description, can_be_automated, frequency) VALUES
(
  'public_message',
  true,
  'common',
  'System-wide announcements sent to all groups. Used for maintenance notices, platform updates, and important communications.',
  false,
  'manual'
) ON CONFLICT (message_type) DO NOTHING;

-- 3. Create daily_summary_config table for detailed daily summary settings
CREATE TABLE IF NOT EXISTS daily_summary_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  include_commitment_rate BOOLEAN DEFAULT true,
  include_top_performer BOOLEAN DEFAULT true,
  include_member_count BOOLEAN DEFAULT true,
  include_motivational_message BOOLEAN DEFAULT true,
  include_streak_info BOOLEAN DEFAULT false,
  include_weekly_progress BOOLEAN DEFAULT false,
  send_time TIME DEFAULT '20:00:00', -- 8 PM default
  send_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7], -- All days of week (1=Mon, 7=Sun)
  timezone TEXT DEFAULT 'UTC',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default daily summary configuration
INSERT INTO daily_summary_config (
  include_commitment_rate,
  include_top_performer,
  include_member_count,
  include_motivational_message,
  send_time,
  send_days
) VALUES (
  true, true, true, true, '20:00:00', ARRAY[1,2,3,4,5,6,7]
) ON CONFLICT (id) DO NOTHING;

-- 4. Create milestone_config table for milestone settings
CREATE TABLE IF NOT EXISTS milestone_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('pot_amount', 'group_streak', 'total_points', 'member_count')),
  milestone_name TEXT NOT NULL,
  threshold_value DECIMAL NOT NULL,
  enabled BOOLEAN DEFAULT true,
  rarity TEXT DEFAULT 'legendary' CHECK (rarity IN ('common', 'rare', 'legendary')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(milestone_type, threshold_value)
);

-- Insert default milestone configurations
INSERT INTO milestone_config (milestone_type, milestone_name, threshold_value, enabled, rarity, description) VALUES
-- Pot amount milestones
('pot_amount', 'First Hundred', 100, true, 'rare', 'Group pot reaches €100'),
('pot_amount', 'Half a Grand', 500, true, 'legendary', 'Group pot reaches €500'),
('pot_amount', 'One Thousand!', 1000, true, 'legendary', 'Group pot reaches €1000'),
('pot_amount', 'Big Pot Energy', 2500, true, 'legendary', 'Group pot reaches €2500'),
('pot_amount', 'Legendary Pot', 5000, true, 'legendary', 'Group pot reaches €5000'),

-- Group streak milestones
('group_streak', 'Week Warriors', 7, true, 'rare', 'Group maintains 7-day commitment streak'),
('group_streak', 'Two Week Champions', 14, true, 'rare', 'Group maintains 14-day commitment streak'),
('group_streak', 'Monthly Masters', 30, true, 'legendary', 'Group maintains 30-day commitment streak'),
('group_streak', 'Quarter Legends', 90, true, 'legendary', 'Group maintains 90-day commitment streak'),

-- Total points milestones
('total_points', 'First Thousand', 1000, true, 'common', 'Group earns 1,000 total points'),
('total_points', 'Five Thousand Strong', 5000, true, 'rare', 'Group earns 5,000 total points'),
('total_points', 'Ten Thousand Club', 10000, true, 'rare', 'Group earns 10,000 total points'),
('total_points', 'Point Millionaires', 25000, true, 'legendary', 'Group earns 25,000 total points'),
('total_points', 'Ultimate Champions', 50000, true, 'legendary', 'Group earns 50,000 total points'),

-- Member count milestones
('member_count', 'Growing Team', 5, true, 'common', 'Group reaches 5 members'),
('member_count', 'Strong Squad', 10, true, 'rare', 'Group reaches 10 members'),
('member_count', 'Big Family', 20, true, 'rare', 'Group reaches 20 members'),
('member_count', 'Community Champions', 50, true, 'legendary', 'Group reaches 50 members')

ON CONFLICT (milestone_type, threshold_value) DO NOTHING;

-- 5. Enable RLS for new tables
ALTER TABLE daily_summary_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_config ENABLE ROW LEVEL SECURITY;

-- 6. Create policies for new tables (Supreme Admin only)
CREATE POLICY "Supreme admins can view daily summary config" ON daily_summary_config
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supreme_admin'
  )
);

CREATE POLICY "Supreme admins can update daily summary config" ON daily_summary_config
FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supreme_admin'
  )
);

CREATE POLICY "Supreme admins can view milestone config" ON milestone_config
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supreme_admin'
  )
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_milestone_config_type ON milestone_config(milestone_type);
CREATE INDEX IF NOT EXISTS idx_milestone_config_enabled ON milestone_config(enabled);
CREATE INDEX IF NOT EXISTS idx_milestone_config_threshold ON milestone_config(threshold_value);

-- 8. Update insert_system_message_to_chat function to handle public messages
CREATE OR REPLACE FUNCTION insert_system_message_to_chat(
  p_group_id UUID DEFAULT NULL, -- NULL for public messages (all groups)
  p_message_type TEXT DEFAULT 'developer_note',
  p_rarity TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_content TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_sender_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_system_message_id UUID;
  v_chat_message_id UUID;
  v_sender_name TEXT;
  v_rarity TEXT;
  v_title TEXT;
  v_group_record RECORD;
BEGIN
  -- Check if system messages are enabled for this type (skip for public messages)
  IF p_message_type != 'public_message' AND NOT is_message_type_enabled(p_message_type) THEN
    RAISE EXCEPTION 'System messages of type % are currently disabled', p_message_type;
  END IF;

  -- Use default rarity if not specified
  IF p_rarity IS NULL THEN
    v_rarity := get_default_rarity(p_message_type);
  ELSE
    v_rarity := p_rarity;
  END IF;

  -- Use default title if not specified
  IF p_title IS NULL THEN
    v_title := initcap(replace(p_message_type, '_', ' '));
  ELSE
    v_title := p_title;
  END IF;

  -- Use default sender name
  IF p_sender_name IS NULL THEN
    v_sender_name := 'Barry';
  ELSE
    v_sender_name := p_sender_name;
  END IF;

  -- For public messages, send to all groups
  IF p_message_type = 'public_message' THEN
    -- Insert system message once (without group_id for public messages)
    INSERT INTO system_messages (
      group_id, message_type, rarity, title, content, metadata, sender_name
    ) VALUES (
      NULL, p_message_type, v_rarity, v_title, p_content, p_metadata, v_sender_name
    ) RETURNING id INTO v_system_message_id;

    -- Insert chat message to all groups
    FOR v_group_record IN SELECT id, system_sender_name FROM groups LOOP
      INSERT INTO chat_messages (
        group_id, user_id, message, message_type, is_system_message, system_message_id
      ) VALUES (
        v_group_record.id, NULL, p_content, 'text', true, v_system_message_id
      );
    END LOOP;
  ELSE
    -- Regular group-specific message
    IF p_group_id IS NULL THEN
      RAISE EXCEPTION 'Group ID is required for non-public messages';
    END IF;

    -- Get sender name from group settings
    SELECT system_sender_name INTO v_sender_name 
    FROM groups WHERE id = p_group_id;
    
    IF v_sender_name IS NULL THEN
      v_sender_name := 'Barry';
    END IF;

    -- Insert system message
    INSERT INTO system_messages (
      group_id, message_type, rarity, title, content, metadata, sender_name
    ) VALUES (
      p_group_id, p_message_type, v_rarity, v_title, p_content, p_metadata, v_sender_name
    ) RETURNING id INTO v_system_message_id;

    -- Insert into chat_messages for display
    INSERT INTO chat_messages (
      group_id, user_id, message, message_type, is_system_message, system_message_id
    ) VALUES (
      p_group_id, NULL, p_content, 'text', true, v_system_message_id
    ) RETURNING id INTO v_chat_message_id;
  END IF;

  RETURN v_system_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to send public message to all groups
CREATE OR REPLACE FUNCTION send_public_message(
  p_title TEXT,
  p_content TEXT,
  p_rarity TEXT DEFAULT 'common'
) RETURNS UUID AS $$
BEGIN
  RETURN insert_system_message_to_chat(
    p_group_id := NULL,
    p_message_type := 'public_message',
    p_rarity := p_rarity,
    p_title := p_title,
    p_content := p_content,
    p_metadata := jsonb_build_object('sent_at', NOW()),
    p_sender_name := 'System'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;