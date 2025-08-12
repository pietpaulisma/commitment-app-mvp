-- Add initial penalty amounts for existing users using payment_transactions table
-- Run this in your Supabase SQL editor

-- First, let's check the structure of payment_transactions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payment_transactions'
ORDER BY ordinal_position;

-- Add penalty amounts for each user
WITH user_data AS (
  SELECT 
    id,
    username,
    group_id
  FROM profiles 
  WHERE username IN ('Matthijs', 'Marius', 'Pauli', 'Stephan', 'Peter')
)
-- Insert payment transactions for each user (assuming penalty amounts are positive)
INSERT INTO payment_transactions (user_id, amount, transaction_type, description, created_at)
SELECT 
  u.id,
  CASE u.username
    WHEN 'Matthijs' THEN 100
    WHEN 'Marius' THEN 150  
    WHEN 'Pauli' THEN 240
    WHEN 'Stephan' THEN 280
    WHEN 'Peter' THEN 200
  END as amount,
  'penalty' as transaction_type,
  'Initial penalty balance' as description,
  NOW() as created_at
FROM user_data u;

-- Verify the payments were added
SELECT p.username, pt.amount, pt.transaction_type, pt.description, pt.created_at
FROM payment_transactions pt
JOIN profiles p ON p.id = pt.user_id
WHERE p.username IN ('Matthijs', 'Marius', 'Pauli', 'Stephan', 'Peter')
ORDER BY p.username;