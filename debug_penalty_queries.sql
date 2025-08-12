-- Debug penalty queries to see what's happening
-- Run this in your Supabase SQL editor

-- 1. Check the structure of payment_transactions table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_transactions'
ORDER BY ordinal_position;

-- 2. Check what penalty transactions exist
SELECT 
  pt.id,
  pt.user_id,
  pt.group_id,
  pt.amount,
  pt.transaction_type,
  pt.description,
  p.username,
  p.group_id as profile_group_id
FROM payment_transactions pt
LEFT JOIN profiles p ON p.id = pt.user_id
WHERE pt.transaction_type = 'penalty'
ORDER BY pt.created_at DESC;

-- 3. Check if there are any group_id mismatches
SELECT DISTINCT group_id as payment_group_id FROM payment_transactions WHERE transaction_type = 'penalty';
SELECT DISTINCT group_id as profile_group_id FROM profiles WHERE username IN ('Matthijs', 'Marius', 'Pauli', 'Stephan', 'Peter');

-- 4. Test the exact query the dashboard is using for group penalties
SELECT pt.amount, pt.user_id, p.username
FROM payment_transactions pt
JOIN profiles p ON p.id = pt.user_id
WHERE pt.group_id = (SELECT group_id FROM profiles WHERE username = 'Matthijs' LIMIT 1)
AND pt.transaction_type = 'penalty';

-- 5. Test the exact query for personal penalties (replace with your user_id)
SELECT pt.amount
FROM payment_transactions pt
WHERE pt.user_id = (SELECT id FROM profiles WHERE username = 'Matthijs' LIMIT 1)
AND pt.transaction_type = 'penalty';