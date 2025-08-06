-- Set birthday for klipperdeklip@gmail.com
-- Birthday: 16/12/1988 (December 16, 1988)

UPDATE profiles 
SET birth_date = '1988-12-16'
WHERE email = 'klipperdeklip@gmail.com';

-- Verify the update
SELECT email, birth_date, username
FROM profiles 
WHERE email = 'klipperdeklip@gmail.com';