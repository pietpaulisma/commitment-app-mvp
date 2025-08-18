-- System Messages Redesign Migration
-- Adds new tables and functionality for the redesigned interface

-- 1. Create weekly_challenge_config table
CREATE TABLE IF NOT EXISTS weekly_challenge_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  message TEXT,
  timing_type TEXT DEFAULT 'end_of_day' CHECK (timing_type IN ('end_of_day', 'custom')),
  custom_time TIME DEFAULT NULL,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default weekly challenge configuration
INSERT INTO weekly_challenge_config (enabled, timing_type) VALUES (false, 'end_of_day')
ON CONFLICT (id) DO NOTHING;

-- 2. Create weekly_summary_config table
CREATE TABLE IF NOT EXISTS weekly_summary_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  include_weekly_stats BOOLEAN DEFAULT true,
  include_member_spotlight BOOLEAN DEFAULT true,
  include_group_achievements BOOLEAN DEFAULT false,
  include_progress_comparison BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  send_day INTEGER DEFAULT 7 CHECK (send_day BETWEEN 1 AND 7), -- 7 = Sunday
  send_time TIME DEFAULT '18:00:00',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default weekly summary configuration
INSERT INTO weekly_summary_config (
  include_weekly_stats,
  include_member_spotlight,
  send_day,
  send_time
) VALUES (
  true, true, 7, '18:00:00'
) ON CONFLICT (id) DO NOTHING;

-- 3. Create personal_summary_config table
CREATE TABLE IF NOT EXISTS personal_summary_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  include_personal_streak BOOLEAN DEFAULT true,
  include_goal_progress BOOLEAN DEFAULT true,
  include_achievements BOOLEAN DEFAULT true,
  include_encouragement BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  send_frequency TEXT DEFAULT 'weekly' CHECK (send_frequency IN ('daily', 'weekly', 'monthly')),
  send_day INTEGER DEFAULT 7 CHECK (send_day BETWEEN 1 AND 7), -- For weekly frequency
  send_time TIME DEFAULT '19:00:00',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default personal summary configuration
INSERT INTO personal_summary_config (
  include_personal_streak,
  include_goal_progress,
  send_frequency,
  send_day,
  send_time
) VALUES (
  true, true, 'weekly', 7, '19:00:00'
) ON CONFLICT (id) DO NOTHING;

-- 4. Create milestone_progress table for tracking current progress
CREATE TABLE IF NOT EXISTS milestone_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_config_id UUID REFERENCES milestone_config(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  current_value DECIMAL DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(milestone_config_id, group_id)
);

-- 5. Add challenge message type to system_message_configs
INSERT INTO system_message_configs (message_type, enabled, default_rarity, description, can_be_automated, frequency) VALUES
('weekly_challenge', false, 'common', 'Motivational weekly challenges to keep the group engaged and active', true, 'weekly')
ON CONFLICT (message_type) DO UPDATE SET
  description = EXCLUDED.description,
  can_be_automated = EXCLUDED.can_be_automated,
  frequency = EXCLUDED.frequency;

-- 6. Update system message type constraints to include weekly_challenge
ALTER TABLE system_messages DROP CONSTRAINT IF EXISTS system_messages_message_type_check;
ALTER TABLE system_messages 
ADD CONSTRAINT system_messages_message_type_check 
CHECK (message_type IN ('daily_summary', 'milestone', 'developer_note', 'public_message', 'weekly_challenge'));

ALTER TABLE system_message_configs DROP CONSTRAINT IF EXISTS system_message_configs_message_type_check;
ALTER TABLE system_message_configs 
ADD CONSTRAINT system_message_configs_message_type_check 
CHECK (message_type IN ('daily_summary', 'milestone', 'developer_note', 'public_message', 'weekly_challenge'));

-- 7. Enable RLS for new tables
ALTER TABLE weekly_challenge_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summary_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_summary_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_progress ENABLE ROW LEVEL SECURITY;

-- 8. Create policies for new tables (Supreme Admin only)
CREATE POLICY "Supreme admins can manage weekly challenge config" ON weekly_challenge_config
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supreme_admin'
  )
);

CREATE POLICY "Supreme admins can manage weekly summary config" ON weekly_summary_config
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supreme_admin'
  )
);

CREATE POLICY "Supreme admins can manage personal summary config" ON personal_summary_config
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supreme_admin'
  )
);

CREATE POLICY "Supreme admins can view milestone progress" ON milestone_progress
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supreme_admin'
  )
);

CREATE POLICY "System can manage milestone progress" ON milestone_progress
FOR ALL USING (true); -- Allow system operations for automated progress tracking

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_challenge_config_enabled ON weekly_challenge_config(enabled);
CREATE INDEX IF NOT EXISTS idx_weekly_summary_config_enabled ON weekly_summary_config(enabled);
CREATE INDEX IF NOT EXISTS idx_personal_summary_config_enabled ON personal_summary_config(enabled);
CREATE INDEX IF NOT EXISTS idx_milestone_progress_group ON milestone_progress(group_id);
CREATE INDEX IF NOT EXISTS idx_milestone_progress_milestone ON milestone_progress(milestone_config_id);
CREATE INDEX IF NOT EXISTS idx_milestone_progress_completed ON milestone_progress(is_completed);

-- 10. Create function to get milestone progress for a group
CREATE OR REPLACE FUNCTION get_milestone_progress(p_group_id UUID)
RETURNS TABLE(
  milestone_id UUID,
  milestone_name TEXT,
  milestone_type TEXT,
  threshold_value DECIMAL,
  current_value DECIMAL,
  percentage DECIMAL,
  is_completed BOOLEAN,
  rarity TEXT,
  description TEXT,
  enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id as milestone_id,
    mc.milestone_name,
    mc.milestone_type,
    mc.threshold_value,
    COALESCE(mp.current_value, 0) as current_value,
    ROUND((COALESCE(mp.current_value, 0) / mc.threshold_value) * 100, 1) as percentage,
    COALESCE(mp.is_completed, false) as is_completed,
    mc.rarity,
    mc.description,
    mc.enabled
  FROM milestone_config mc
  LEFT JOIN milestone_progress mp ON mc.id = mp.milestone_config_id AND mp.group_id = p_group_id
  ORDER BY mc.milestone_type, mc.threshold_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to update milestone progress
CREATE OR REPLACE FUNCTION update_milestone_progress(
  p_group_id UUID,
  p_milestone_type TEXT,
  p_current_value DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_milestone_record RECORD;
  v_progress_record RECORD;
BEGIN
  -- Get all milestones for this type
  FOR v_milestone_record IN 
    SELECT id, threshold_value 
    FROM milestone_config 
    WHERE milestone_type = p_milestone_type AND enabled = true
  LOOP
    -- Check if milestone is reached
    IF p_current_value >= v_milestone_record.threshold_value THEN
      -- Upsert milestone progress
      INSERT INTO milestone_progress (milestone_config_id, group_id, current_value, is_completed, completed_at)
      VALUES (v_milestone_record.id, p_group_id, p_current_value, true, NOW())
      ON CONFLICT (milestone_config_id, group_id) 
      DO UPDATE SET
        current_value = EXCLUDED.current_value,
        is_completed = true,
        completed_at = CASE 
          WHEN milestone_progress.is_completed = false THEN NOW()
          ELSE milestone_progress.completed_at
        END,
        updated_at = NOW();
    ELSE
      -- Update progress without completion
      INSERT INTO milestone_progress (milestone_config_id, group_id, current_value, is_completed)
      VALUES (v_milestone_record.id, p_group_id, p_current_value, false)
      ON CONFLICT (milestone_config_id, group_id) 
      DO UPDATE SET
        current_value = EXCLUDED.current_value,
        updated_at = NOW();
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Initialize milestone progress for existing groups (optional - can be run separately)
-- This will create initial progress records for all groups and milestones
-- Uncomment if you want to initialize existing data:
-- 
-- INSERT INTO milestone_progress (milestone_config_id, group_id, current_value, is_completed)
-- SELECT mc.id, g.id, 0, false
-- FROM milestone_config mc
-- CROSS JOIN groups g
-- WHERE mc.enabled = true
-- ON CONFLICT (milestone_config_id, group_id) DO NOTHING;

COMMIT;