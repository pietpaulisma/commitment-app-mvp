-- Simple and reliable constraint fix
-- Run this in Supabase SQL editor

-- 1. First, let's see what constraints actually exist
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'system_messages'
    AND tc.constraint_type = 'CHECK'
ORDER BY tc.constraint_name;

-- 2. Try to drop known constraint names individually (ignore errors if they don't exist)
DO $$
BEGIN
    BEGIN
        ALTER TABLE system_messages DROP CONSTRAINT system_messages_rarity_check;
        RAISE NOTICE 'Dropped system_messages_rarity_check';
    EXCEPTION WHEN undefined_object THEN
        RAISE NOTICE 'system_messages_rarity_check does not exist, skipping';
    END;
    
    BEGIN
        ALTER TABLE system_messages DROP CONSTRAINT system_messages_message_type_check;
        RAISE NOTICE 'Dropped system_messages_message_type_check';
    EXCEPTION WHEN undefined_object THEN
        RAISE NOTICE 'system_messages_message_type_check does not exist, skipping';
    END;
    
    -- Try some other common constraint names that might exist
    BEGIN
        ALTER TABLE system_messages DROP CONSTRAINT check_rarity;
        RAISE NOTICE 'Dropped check_rarity';
    EXCEPTION WHEN undefined_object THEN
        RAISE NOTICE 'check_rarity does not exist, skipping';
    END;
    
    BEGIN
        ALTER TABLE system_messages DROP CONSTRAINT check_message_type;
        RAISE NOTICE 'Dropped check_message_type';
    EXCEPTION WHEN undefined_object THEN
        RAISE NOTICE 'check_message_type does not exist, skipping';
    END;
END $$;

-- 3. Add the correct constraints
ALTER TABLE system_messages 
ADD CONSTRAINT system_messages_rarity_check 
CHECK (rarity IN ('common', 'rare', 'legendary'));

ALTER TABLE system_messages 
ADD CONSTRAINT system_messages_message_type_check 
CHECK (message_type IN ('daily_summary', 'challenge', 'milestone', 'developer_note', 'weekly_challenge', 'personal_summary', 'weekly_summary'));

-- 4. Verify the constraints are correct
SELECT 
    'Final constraints:' as status,
    tc.constraint_name, 
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'system_messages'
AND tc.constraint_type = 'CHECK';

-- 5. Test inserting a developer note to see if it works
SELECT 'Testing insert...' as status;
INSERT INTO system_messages (group_id, message_type, rarity, title, content, sender_name)
VALUES (
    (SELECT id FROM groups LIMIT 1),
    'developer_note',
    'common',
    'Test Message',
    'This is a test message to verify constraints work',
    'Barry'
);

SELECT 'Insert successful!' as status;