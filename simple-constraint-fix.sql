-- Simple fix for message type constraint issue
-- This avoids the PostgreSQL version compatibility issues

-- STEP 1: Check what message types currently exist
SELECT 'system_message_configs' as table_name, message_type, count(*) 
FROM system_message_configs 
GROUP BY message_type 
ORDER BY message_type;

SELECT 'system_messages' as table_name, message_type, count(*) 
FROM system_messages 
GROUP BY message_type 
ORDER BY message_type;

-- STEP 2: Drop constraints (ignore errors if they don't exist)
ALTER TABLE system_message_configs DROP CONSTRAINT IF EXISTS system_message_configs_message_type_check;
ALTER TABLE system_messages DROP CONSTRAINT IF EXISTS system_messages_message_type_check;

-- STEP 3: Clean up any rows that might have invalid message types
-- First, let's see what would be deleted:
SELECT 'Would delete from system_message_configs:' as action, message_type, count(*)
FROM system_message_configs 
WHERE message_type NOT IN ('daily_summary', 'milestone', 'developer_note', 'public_message')
GROUP BY message_type;

SELECT 'Would delete from system_messages:' as action, message_type, count(*)
FROM system_messages 
WHERE message_type NOT IN ('daily_summary', 'milestone', 'developer_note', 'public_message')
GROUP BY message_type;

-- Now actually delete invalid message types (if any exist)
DELETE FROM system_message_configs 
WHERE message_type NOT IN ('daily_summary', 'milestone', 'developer_note', 'public_message');

DELETE FROM system_messages 
WHERE message_type NOT IN ('daily_summary', 'milestone', 'developer_note', 'public_message');

-- STEP 4: Add constraints back with weekly_challenge included
ALTER TABLE system_message_configs 
ADD CONSTRAINT system_message_configs_message_type_check 
CHECK (message_type IN ('daily_summary', 'milestone', 'developer_note', 'public_message', 'weekly_challenge'));

ALTER TABLE system_messages 
ADD CONSTRAINT system_messages_message_type_check 
CHECK (message_type IN ('daily_summary', 'milestone', 'developer_note', 'public_message', 'weekly_challenge'));

-- STEP 5: Insert weekly_challenge config
INSERT INTO system_message_configs (message_type, enabled, default_rarity, description, can_be_automated, frequency) VALUES
('weekly_challenge', false, 'common', 'Motivational weekly challenges to keep the group engaged and active', true, 'weekly');

-- STEP 6: Verify everything worked
SELECT 'Final result:' as status, message_type, enabled, default_rarity 
FROM system_message_configs 
ORDER BY message_type;