-- Safe constraint fix - checks before dropping
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

-- 2. Drop specific known constraints that might conflict (only if they exist)
DO $$
BEGIN
    -- Drop system_messages_rarity_check if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'system_messages_rarity_check' 
        AND table_name = 'system_messages'
    ) THEN
        ALTER TABLE system_messages DROP CONSTRAINT system_messages_rarity_check;
        RAISE NOTICE 'Dropped system_messages_rarity_check';
    END IF;
    
    -- Drop system_messages_message_type_check if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'system_messages_message_type_check' 
        AND table_name = 'system_messages'
    ) THEN
        ALTER TABLE system_messages DROP CONSTRAINT system_messages_message_type_check;
        RAISE NOTICE 'Dropped system_messages_message_type_check';
    END IF;
    
    -- Drop any constraint that contains 'rarity' in its check clause
    FOR constraint_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'system_messages' 
        AND tc.constraint_type = 'CHECK'
        AND cc.check_clause ILIKE '%rarity%'
    LOOP
        EXECUTE format('ALTER TABLE system_messages DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
    
    -- Drop any constraint that contains 'message_type' in its check clause
    FOR constraint_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'system_messages' 
        AND tc.constraint_type = 'CHECK'
        AND cc.check_clause ILIKE '%message_type%'
    LOOP
        EXECUTE format('ALTER TABLE system_messages DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
    
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