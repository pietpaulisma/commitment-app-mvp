-- Add initial penalty amounts for existing users
-- Run this in your Supabase SQL editor

-- First, let's get the user IDs and group ID for the penalties
WITH user_data AS (
  SELECT 
    id,
    username,
    group_id
  FROM profiles 
  WHERE username IN ('Matthijs', 'Marius', 'Pauli', 'Stephan', 'Peter')
)
-- Insert penalty logs for each user
INSERT INTO penalty_logs (user_id, group_id, amount, reason, created_at)
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
  'Initial penalty balance' as reason,
  NOW() as created_at
FROM user_data u;

-- Verify the penalties were added
SELECT p.username, pl.amount, pl.reason, pl.created_at
FROM penalty_logs pl
JOIN profiles p ON p.id = pl.user_id
WHERE p.username IN ('Matthijs', 'Marius', 'Pauli', 'Stephan', 'Peter')
ORDER BY p.username;