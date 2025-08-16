-- Fix RLS policies for payment_transactions table to allow admin adjustments
-- Run this in your Supabase SQL editor

-- Add policy to allow group admins to insert payment transactions for their group members
CREATE POLICY "Group admins can insert payment_transactions for their group" ON payment_transactions
FOR INSERT 
WITH CHECK (
  -- Allow if the user is a group admin and the transaction is for someone in their group
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.role IN ('group_admin', 'supreme_admin')
    AND (
      -- Either it's a supreme admin (can insert for any group)
      admin_profile.role = 'supreme_admin'
      OR
      -- Or it's a group admin and the group_id matches their managed group
      EXISTS (
        SELECT 1 FROM groups 
        WHERE groups.id = payment_transactions.group_id 
        AND groups.admin_id = auth.uid()
      )
    )
  )
);

-- Add policy to allow supreme admins to insert payment transactions for any group
CREATE POLICY "Supreme admins can insert payment_transactions for any group" ON payment_transactions
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'supreme_admin'
  )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'payment_transactions'
ORDER BY policyname;