-- Simple RLS policy fix for payment_transactions INSERT
-- Run this in your Supabase SQL editor

-- Allow supreme admins to insert payment transactions
CREATE POLICY "Supreme admins can insert payment_transactions" ON payment_transactions
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'supreme_admin'
  )
);

-- Check what policies exist now
SELECT policyname, cmd, with_check
FROM pg_policies 
WHERE tablename = 'payment_transactions'
ORDER BY policyname;