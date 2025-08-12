-- Fix RLS policies for payment_transactions table
-- Run this in your Supabase SQL editor

-- 1. Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'payment_transactions';

-- 2. Enable RLS if not already enabled
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- 3. Add a policy to allow users to read payment_transactions from their group
CREATE POLICY "Users can view payment_transactions from their group" ON payment_transactions
FOR SELECT 
USING (
  group_id IN (
    SELECT group_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 4. Add a policy to allow users to view their own payment_transactions
CREATE POLICY "Users can view their own payment_transactions" ON payment_transactions
FOR SELECT 
USING (user_id = auth.uid());

-- 5. Test the policies work
SELECT 
  pt.amount,
  pt.user_id,
  pt.transaction_type,
  p.username
FROM payment_transactions pt
JOIN profiles p ON p.id = pt.user_id
WHERE pt.transaction_type = 'penalty'
ORDER BY pt.created_at DESC;