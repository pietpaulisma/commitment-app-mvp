-- Temporary RLS bypass for debugging chat issues
-- WARNING: This temporarily disables chat security - only use for debugging!

-- Check current RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'chat_messages';

-- Option 1: Temporarily disable RLS to test basic functionality
-- UNCOMMENT THE LINE BELOW ONLY FOR TESTING:
-- ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Option 2: Create a permissive policy for testing
-- UNCOMMENT THE LINES BELOW FOR TESTING:
-- DROP POLICY IF EXISTS "debug_allow_all" ON chat_messages;
-- CREATE POLICY "debug_allow_all" ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Test queries to run after disabling RLS:
-- INSERT INTO chat_messages (id, group_id, user_id, message) 
-- VALUES (gen_random_uuid(), '4e6215d5-6c60-451f-84f6-783545ace8a2', '2abc9aa6-bf76-4012-b544-4b97c005c97d', 'Test message');

-- Check if the insert worked:
-- SELECT * FROM chat_messages WHERE group_id = '4e6215d5-6c60-451f-84f6-783545ace8a2';

-- IMPORTANT: Re-enable RLS after testing!
-- ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "debug_allow_all" ON chat_messages;

-- Check what the current authenticated user ID is
SELECT 
  current_user as postgres_user,
  current_setting('request.jwt.claims', true)::json->>'sub' as jwt_sub,
  auth.uid() as auth_uid;

-- Alternative: Check if you can manually add a group_members entry
-- This might be the simpler fix:
INSERT INTO group_members (id, group_id, user_id, role, joined_at, is_active)
SELECT 
  gen_random_uuid(),
  '4e6215d5-6c60-451f-84f6-783545ace8a2',
  '2abc9aa6-bf76-4012-b544-4b97c005c97d',
  'member',
  now(),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM group_members 
  WHERE user_id = '2abc9aa6-bf76-4012-b544-4b97c005c97d' 
  AND group_id = '4e6215d5-6c60-451f-84f6-783545ace8a2'
);