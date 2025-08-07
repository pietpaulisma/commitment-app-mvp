-- Update Marius username from mk@blackroll.com
-- Run this in Supabase SQL Editor or database client

UPDATE profiles 
SET username = 'Marius' 
WHERE email = 'mk@blackroll.com';

-- Verify the update
SELECT email, username FROM profiles WHERE email = 'mk@blackroll.com';