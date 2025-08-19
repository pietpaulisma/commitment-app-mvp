-- Quick fix for the immediate message type constraint issue
-- Run this in your Supabase SQL editor

-- 1. Fix the constraint that's causing the rarity check failure
DO $$
BEGIN
    -- Drop and recreate the rarity constraint
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'system_messages_rarity_check' 
               AND table_name = 'system_messages') THEN
        ALTER TABLE system_messages DROP CONSTRAINT system_messages_rarity_check;
    END IF;
    
    ALTER TABLE system_messages ADD CONSTRAINT system_messages_rarity_check 
        CHECK (rarity IN ('common', 'rare', 'legendary'));
        
    -- Add first_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
    END IF;
    
    -- Add last_name column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
    END IF;
END $$;