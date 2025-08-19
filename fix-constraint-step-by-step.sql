-- Step-by-step fix for message type constraint issue
-- Run each step separately to diagnose the problem

-- STEP 1: Check what message types currently exist
SELECT message_type, count(*) 
FROM system_message_configs 
GROUP BY message_type 
ORDER BY message_type;

-- STEP 2: Check what message types exist in system_messages table
SELECT message_type, count(*) 
FROM system_messages 
GROUP BY message_type 
ORDER BY message_type;

-- STEP 3: Show current constraint (run this to see what constraint exists)
SELECT 
    con.conname as constraint_name,
    con.consrc as constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'system_message_configs'
  AND con.contype = 'c';

-- STEP 4: Remove constraint WITHOUT checking existing data
ALTER TABLE system_message_configs DROP CONSTRAINT IF EXISTS system_message_configs_message_type_check CASCADE;
ALTER TABLE system_messages DROP CONSTRAINT IF EXISTS system_messages_message_type_check CASCADE;

-- STEP 5: Clean up any invalid message types that might exist
-- (This will show what we're cleaning up)
SELECT message_type FROM system_message_configs 
WHERE message_type NOT IN ('daily_summary', 'milestone', 'developer_note', 'public_message', 'weekly_challenge');

-- Delete any invalid message types
DELETE FROM system_message_configs 
WHERE message_type NOT IN ('daily_summary', 'milestone', 'developer_note', 'public_message', 'weekly_challenge');

-- Do the same for system_messages
DELETE FROM system_messages 
WHERE message_type NOT IN ('daily_summary', 'milestone', 'developer_note', 'public_message', 'weekly_challenge');

-- STEP 6: Add constraints back
ALTER TABLE system_message_configs 
ADD CONSTRAINT system_message_configs_message_type_check 
CHECK (message_type IN ('daily_summary', 'milestone', 'developer_note', 'public_message', 'weekly_challenge'));

ALTER TABLE system_messages 
ADD CONSTRAINT system_messages_message_type_check 
CHECK (message_type IN ('daily_summary', 'milestone', 'developer_note', 'public_message', 'weekly_challenge'));

-- STEP 7: Now insert weekly_challenge config
INSERT INTO system_message_configs (message_type, enabled, default_rarity, description, can_be_automated, frequency) VALUES
('weekly_challenge', false, 'common', 'Motivational weekly challenges to keep the group engaged and active', true, 'weekly')
ON CONFLICT (message_type) DO NOTHING;

-- STEP 8: Verify everything is working
SELECT message_type, enabled, default_rarity FROM system_message_configs ORDER BY message_type;