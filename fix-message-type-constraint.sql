-- Fix message type constraint for weekly_challenge
-- This script fixes the constraint issue preventing weekly_challenge insertion

-- First, remove any existing weekly_challenge entries that might have failed
DELETE FROM system_message_configs WHERE message_type = 'weekly_challenge';
DELETE FROM system_messages WHERE message_type = 'weekly_challenge';

-- Drop the existing constraints
ALTER TABLE system_messages DROP CONSTRAINT IF EXISTS system_messages_message_type_check;
ALTER TABLE system_message_configs DROP CONSTRAINT IF EXISTS system_message_configs_message_type_check;

-- Add the new constraints with weekly_challenge included
ALTER TABLE system_messages 
ADD CONSTRAINT system_messages_message_type_check 
CHECK (message_type IN ('daily_summary', 'milestone', 'developer_note', 'public_message', 'weekly_challenge'));

ALTER TABLE system_message_configs 
ADD CONSTRAINT system_message_configs_message_type_check 
CHECK (message_type IN ('daily_summary', 'milestone', 'developer_note', 'public_message', 'weekly_challenge'));

-- Now insert the weekly_challenge configuration
INSERT INTO system_message_configs (message_type, enabled, default_rarity, description, can_be_automated, frequency) VALUES
('weekly_challenge', false, 'common', 'Motivational weekly challenges to keep the group engaged and active', true, 'weekly')
ON CONFLICT (message_type) DO UPDATE SET
  description = EXCLUDED.description,
  can_be_automated = EXCLUDED.can_be_automated,
  frequency = EXCLUDED.frequency;

-- Verify the insertion worked
SELECT message_type, enabled, default_rarity, description FROM system_message_configs WHERE message_type = 'weekly_challenge';