-- CLEANUP SCRIPT: Remove All Test Data
-- Run this when you're ready to go live with real users

-- WARNING: This will delete test data. Make sure you want to do this!

-- 1. Delete test chat messages (identified by test user IDs or specific content)
DELETE FROM chat_messages 
WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002', 
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
);

-- 2. Delete test workout logs
DELETE FROM logs 
WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002', 
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
);

-- 3. Delete test daily checkins
DELETE FROM daily_checkins 
WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002', 
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
);

-- 4. Delete test profiles (this will cascade delete related data)
DELETE FROM profiles 
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002', 
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
);

-- 5. Delete test auth users (run this if you have access to auth schema)
DELETE FROM auth.users 
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002', 
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005'
);

-- 6. Optional: Clean up any orphaned data
-- DELETE FROM payment_transactions WHERE user_id NOT IN (SELECT id FROM profiles);
-- DELETE FROM group_members WHERE user_id NOT IN (SELECT id FROM profiles);

-- Verification queries to check cleanup worked:
SELECT 'Remaining test profiles:' as check_type, count(*) as count FROM profiles 
WHERE email LIKE '%@example.com';

SELECT 'Remaining test logs:' as check_type, count(*) as count FROM logs 
WHERE user_id IN ('550e8400-e29b-41d4-a716-446655440001','550e8400-e29b-41d4-a716-446655440002','550e8400-e29b-41d4-a716-446655440003','550e8400-e29b-41d4-a716-446655440004','550e8400-e29b-41d4-a716-446655440005');

SELECT 'Remaining test chat messages:' as check_type, count(*) as count FROM chat_messages 
WHERE user_id IN ('550e8400-e29b-41d4-a716-446655440001','550e8400-e29b-41d4-a716-446655440002','550e8400-e29b-41d4-a716-446655440003','550e8400-e29b-41d4-a716-446655440004','550e8400-e29b-41d4-a716-446655440005');

-- All counts should be 0 after cleanup