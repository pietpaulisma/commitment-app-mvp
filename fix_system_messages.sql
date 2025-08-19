-- Fix for admin message sending issues
-- 1. Fix system_messages rarity constraint
-- 2. Add missing first_name column to profiles

-- Check current constraint on system_messages table
-- The constraint is expecting specific rarity values but receiving different ones

-- 1. Drop the existing constraint if it exists
ALTER TABLE system_messages DROP CONSTRAINT IF EXISTS system_messages_rarity_check;

-- 2. Add the correct constraint allowing the rarity values used by the application
ALTER TABLE system_messages ADD CONSTRAINT system_messages_rarity_check 
    CHECK (rarity IN ('common', 'rare', 'legendary'));

-- 3. Add missing first_name column to profiles table (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;

-- 4. Add missing last_name column to profiles table (if not exists) 
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 5. Update any existing profiles that might have null first_name/last_name
UPDATE profiles SET 
    first_name = COALESCE(first_name, SPLIT_PART(COALESCE(username, email), '@', 1)),
    last_name = COALESCE(last_name, '')
WHERE first_name IS NULL OR last_name IS NULL;

-- 6. Check if the insert_system_message_to_chat function exists and works properly
-- This function should accept the rarity parameter correctly