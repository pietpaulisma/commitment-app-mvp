-- Check RLS policies on payment_transactions table
-- Run this in your Supabase SQL editor

-- 1. Check if RLS is enabled on payment_transactions
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'payment_transactions';

-- 2. Check what RLS policies exist on payment_transactions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'payment_transactions';

-- 3. Also check the current user's role
SELECT current_user, current_setting('role');

-- 4. Test if we can select from payment_transactions directly
SELECT COUNT(*) as total_payment_transactions FROM payment_transactions;
SELECT COUNT(*) as penalty_transactions FROM payment_transactions WHERE transaction_type = 'penalty';