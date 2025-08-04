-- Check the current state of the user having trouble
-- Replace the email with the actual email you're testing with

SELECT 
  id,
  email,
  group_id,
  role,
  created_at,
  (group_id IS NULL) as "group_id_is_null",
  (group_id IS NOT NULL) as "group_id_is_not_null"
FROM profiles 
WHERE email = 'boekvandersmoel@gmail.com';

-- Also check if there are any groups this user might already be associated with
SELECT 
  g.id as group_id,
  g.name as group_name,
  g.invite_code,
  p.email as member_email
FROM groups g
JOIN profiles p ON p.group_id = g.id
WHERE p.email = 'boekvandersmoel@gmail.com';