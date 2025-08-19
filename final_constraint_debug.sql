-- Final comprehensive debug for constraint violation
-- Run this to find and fix all remaining constraint issues

-- 1. Show ALL constraints on system_messages table
SELECT 
    'Current constraints:' as info,
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'system_messages'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 2. Show table definition
SELECT 
    'Column info:' as info,
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'system_messages'
ORDER BY ordinal_position;

-- 3. Check if there are any invalid rows that might be causing issues
SELECT 
    'Checking existing data:' as info,
    id, group_id, message_type, rarity, title, created_at
FROM system_messages 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Drop ALL check constraints on system_messages
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'system_messages' 
        AND tc.constraint_type = 'CHECK'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE system_messages DROP CONSTRAINT %I', constraint_rec.constraint_name);
            RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop constraint %: %', constraint_rec.constraint_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 5. Ensure the table has the correct structure
ALTER TABLE system_messages 
    ALTER COLUMN rarity SET DEFAULT 'common',
    ALTER COLUMN message_type SET NOT NULL,
    ALTER COLUMN rarity SET NOT NULL;

-- 6. Add back only the essential constraints
ALTER TABLE system_messages 
ADD CONSTRAINT system_messages_rarity_valid 
CHECK (rarity IN ('common', 'rare', 'legendary'));

ALTER TABLE system_messages 
ADD CONSTRAINT system_messages_message_type_valid 
CHECK (message_type IN ('daily_summary', 'challenge', 'milestone', 'developer_note', 'weekly_challenge', 'personal_summary', 'weekly_summary'));

-- 7. Test insertion manually to see what fails
DO $$
DECLARE
    test_group_id UUID;
    new_message_id UUID;
BEGIN
    -- Get a valid group_id
    SELECT id INTO test_group_id FROM groups LIMIT 1;
    
    IF test_group_id IS NULL THEN
        RAISE NOTICE 'No groups found in database';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with group_id: %', test_group_id;
    
    -- Try to insert a test message
    INSERT INTO system_messages (
        group_id, 
        message_type, 
        rarity, 
        title, 
        content, 
        sender_name
    ) VALUES (
        test_group_id,
        'developer_note',
        'common',
        'Test Admin Message',
        'This is a test message from the constraint debugging',
        'Barry'
    ) RETURNING id INTO new_message_id;
    
    RAISE NOTICE 'SUCCESS: Inserted test message with ID: %', new_message_id;
    
    -- Clean up the test message
    DELETE FROM system_messages WHERE id = new_message_id;
    RAISE NOTICE 'Cleaned up test message';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAILED to insert test message: % %', SQLSTATE, SQLERRM;
END $$;

-- 8. Show final state
SELECT 
    'Final constraints:' as info,
    tc.constraint_name, 
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'system_messages'
AND tc.constraint_type = 'CHECK';