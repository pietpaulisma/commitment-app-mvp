-- Fix Chat Permissions Issue
-- This fixes the RLS policies to work with the profiles table instead of group_members

-- Step 1: Drop existing policies that check group_members
DROP POLICY IF EXISTS "Users can send chat messages to their groups" ON chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages for their groups" ON chat_messages;

-- Step 2: Create new policies that check profiles table (where your group membership is stored)
CREATE POLICY "Users can view group chat messages" ON chat_messages
FOR SELECT USING (
  group_id IN (
    SELECT group_id FROM profiles WHERE id = auth.uid() AND group_id IS NOT NULL
  )
);

CREATE POLICY "Users can send group chat messages" ON chat_messages
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  group_id IN (
    SELECT group_id FROM profiles WHERE id = auth.uid() AND group_id IS NOT NULL
  )
);

-- Alternative approach: Add you to group_members table if you prefer to keep existing policies
-- Uncomment the lines below if you want to use this approach instead:

-- INSERT INTO group_members (id, group_id, user_id, role, joined_at, is_active)
-- VALUES (
--   gen_random_uuid(),
--   '4e6215d5-6c60-451f-84f6-783545ace8a2', -- Girls group
--   '2abc9aa6-bf76-4012-b544-4b97c005c97d', -- Your user ID
--   'member',
--   now(),
--   true
-- ) ON CONFLICT DO NOTHING;

-- Verification: Check if policies are working
SELECT 'Policy check' as test, 
       EXISTS(SELECT 1 FROM chat_messages WHERE group_id = '4e6215d5-6c60-451f-84f6-783545ace8a2') as can_read_messages;