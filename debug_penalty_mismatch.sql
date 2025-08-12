-- Debug why penalty queries are returning empty arrays
-- Run this in your Supabase SQL editor

-- 1. Check what data we actually have in payment_transactions
SELECT 
  pt.id,
  pt.user_id,
  pt.group_id,
  pt.amount,
  pt.transaction_type,
  pt.description,
  pt.created_at
FROM payment_transactions pt
WHERE pt.transaction_type = 'penalty'
ORDER BY pt.created_at DESC;

-- 2. Check Matthijs's profile data (group_id and user_id)
SELECT 
  id as user_id,
  username,
  group_id,
  email
FROM profiles 
WHERE username = 'Matthijs';

-- 3. Check if there's a mismatch between the group_ids
SELECT 
  'payment_transactions' as table_name,
  group_id,
  COUNT(*) as count
FROM payment_transactions 
WHERE transaction_type = 'penalty'
GROUP BY group_id
UNION ALL
SELECT 
  'profiles' as table_name,
  group_id,
  COUNT(*) as count
FROM profiles 
WHERE username IN ('Matthijs', 'Marius', 'Pauli', 'Stephan', 'Peter')
GROUP BY group_id;

-- 4. Test the exact query the dashboard should be running for Matthijs
-- Replace with actual values from query #2 above
WITH matthijs_data AS (
  SELECT id as user_id, group_id FROM profiles WHERE username = 'Matthijs'
)
SELECT 
  'Group query results:' as query_type,
  pt.amount,
  pt.user_id
FROM payment_transactions pt, matthijs_data md
WHERE pt.group_id = md.group_id
AND pt.transaction_type = 'penalty'
UNION ALL
SELECT 
  'User query results:' as query_type,
  pt.amount,
  pt.user_id
FROM payment_transactions pt, matthijs_data md
WHERE pt.user_id = md.user_id
AND pt.transaction_type = 'penalty';