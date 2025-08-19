-- System Message Configuration Migration
-- Adds global configuration for system message types

-- 1. Create system_message_configs table for global settings
CREATE TABLE IF NOT EXISTS system_message_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_type TEXT NOT NULL UNIQUE CHECK (message_type IN ('daily_summary', 'challenge', 'milestone', 'developer_note')),
  enabled BOOLEAN DEFAULT true,
  default_rarity TEXT NOT NULL DEFAULT 'common' CHECK (default_rarity IN ('common', 'rare', 'legendary')),
  description TEXT NOT NULL,
  can_be_automated BOOLEAN DEFAULT false,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'on_event', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create global settings table
CREATE TABLE IF NOT EXISTS global_system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_globally_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insert default configuration for each message type
INSERT INTO system_message_configs (message_type, enabled, default_rarity, description, can_be_automated, frequency) VALUES
(
  'daily_summary',
  true,
  'common',
  'Automated daily summaries showing group commitment rates, top performers, and motivational messages. Sent at the end of each day.',
  true,
  'daily'
),
(
  'challenge',
  true,
  'rare',
  'Special challenges introduced by group admins to motivate members. Can include time-limited goals, team competitions, or seasonal events.',
  false,
  'manual'
),
(
  'milestone',
  true,
  'legendary',
  'Celebration messages for major achievements like pot milestones, streak records, or group growth. Automatically triggered by significant events.',
  true,
  'on_event'
),
(
  'developer_note',
  true,
  'common',
  'Administrative messages from group admins or developers. Used for announcements, updates, maintenance notices, and important communications.',
  false,
  'manual'
)
ON CONFLICT (message_type) DO NOTHING;

-- 4. Insert global settings
INSERT INTO global_system_settings (is_globally_enabled) VALUES (true)
ON CONFLICT (id) DO NOTHING;

-- 5. Enable RLS
ALTER TABLE system_message_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_system_settings ENABLE ROW LEVEL SECURITY;

-- 6. Create policies - only supreme admins can manage global settings
CREATE POLICY "Supreme admins can view system message configs" ON system_message_configs
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supreme_admin'
  )
);

CREATE POLICY "Supreme admins can update system message configs" ON system_message_configs
FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supreme_admin'
  )
);

CREATE POLICY "Supreme admins can view global settings" ON global_system_settings
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supreme_admin'
  )
);

CREATE POLICY "Supreme admins can update global settings" ON global_system_settings
FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supreme_admin'
  )
);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_system_message_configs_type ON system_message_configs(message_type);
CREATE INDEX IF NOT EXISTS idx_system_message_configs_enabled ON system_message_configs(enabled);

-- 8. Create function to check if system messages are globally enabled
CREATE OR REPLACE FUNCTION is_system_messages_enabled() RETURNS BOOLEAN AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT is_globally_enabled INTO v_enabled
  FROM global_system_settings
  LIMIT 1;
  
  RETURN COALESCE(v_enabled, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to check if specific message type is enabled
CREATE OR REPLACE FUNCTION is_message_type_enabled(p_message_type TEXT) RETURNS BOOLEAN AS $$
DECLARE
  v_global_enabled BOOLEAN;
  v_type_enabled BOOLEAN;
BEGIN
  -- Check global setting first
  SELECT is_globally_enabled INTO v_global_enabled
  FROM global_system_settings
  LIMIT 1;
  
  IF NOT COALESCE(v_global_enabled, true) THEN
    RETURN false;
  END IF;
  
  -- Check specific message type setting
  SELECT enabled INTO v_type_enabled
  FROM system_message_configs
  WHERE message_type = p_message_type;
  
  RETURN COALESCE(v_type_enabled, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to get default rarity for message type
CREATE OR REPLACE FUNCTION get_default_rarity(p_message_type TEXT) RETURNS TEXT AS $$
DECLARE
  v_rarity TEXT;
BEGIN
  SELECT default_rarity INTO v_rarity
  FROM system_message_configs
  WHERE message_type = p_message_type;
  
  RETURN COALESCE(v_rarity, 'common');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Update the insert_system_message_to_chat function to check if enabled
CREATE OR REPLACE FUNCTION insert_system_message_to_chat(
  p_group_id UUID,
  p_message_type TEXT,
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
BEGIN
  -- Check if system messages are enabled for this type
  IF NOT is_message_type_enabled(p_message_type) THEN
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
    p_group_id, p_message_type, v_rarity, v_title, p_content, p_metadata, v_sender_name
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