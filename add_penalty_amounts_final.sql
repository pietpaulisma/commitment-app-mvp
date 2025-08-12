-- Add initial penalty amounts for existing users using payment_transactions table
-- Run this in your Supabase SQL editor

-- Add penalty amounts for each user with their group_id
WITH user_data AS (
  SELECT 
    id,
    username,
    group_id
  FROM profiles 
  WHERE username IN ('Matthijs', 'Marius', 'Pauli', 'Stephan', 'Peter')
  AND group_id IS NOT NULL
)
-- Insert payment transactions for each user
INSERT INTO payment_transactions (user_id, group_id, amount, transaction_type, description, created_at)
SELECT 
  u.id,
  u.group_id,
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