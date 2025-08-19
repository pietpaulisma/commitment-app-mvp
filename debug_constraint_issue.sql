-- Debug and fix the constraint issue completely
-- Run this in Supabase SQL editor

-- 1. First, let's see what constraints actually exist
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    ccu.column_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'system_messages'
ORDER BY tc.constraint_name;

-- 2. Check what's actually in system_messages table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'system_messages'
ORDER BY ordinal_position;

-- 3. Look for any rows that might be violating constraints
SELECT rarity, COUNT(*) 
FROM system_messages 
GROUP BY rarity;

-- 4. Drop ALL constraints related to rarity and message_type
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Drop any existing rarity constraints
    FOR constraint_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'system_messages' 
        AND cc.check_clause ILIKE '%rarity%'
    LOOP
        EXECUTE format('ALTER TABLE system_messages DROP CONSTRAINT %I', constraint_name);
    END LOOP;
    
    -- Drop any existing message_type constraints  
    FOR constraint_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'system_messages' 
        AND cc.check_clause ILIKE '%message_type%'
    LOOP
        EXECUTE format('ALTER TABLE system_messages DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END $$;

-- 5. Add the correct constraints
ALTER TABLE system_messages 
ADD CONSTRAINT system_messages_rarity_check 
CHECK (rarity IN ('common', 'rare', 'legendary'));

ALTER TABLE system_messages 
ADD CONSTRAINT system_messages_message_type_check 
CHECK (message_type IN ('daily_summary', 'challenge', 'milestone', 'developer_note', 'weekly_challenge', 'personal_summary', 'weekly_summary'));

-- 6. Verify the constraints are correct
SELECT 
    tc.constraint_name, 
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'system_messages'
AND tc.constraint_type = 'CHECK';