-- Update penalty amounts for all 8 users
-- Historical correction due to failed cron jobs

-- Update Stephan to €330
UPDATE profiles
SET total_penalty_owed = 330
WHERE username = 'Stephan';

-- Update Pauli to €310
UPDATE profiles
SET total_penalty_owed = 310
WHERE username = 'Pauli';

-- Update Sven to €340
UPDATE profiles
SET total_penalty_owed = 340
WHERE username = 'Sven';

-- Update Peter to €270
UPDATE profiles
SET total_penalty_owed = 270
WHERE username = 'Peter';

-- Update Matthijs to €140
UPDATE profiles
SET total_penalty_owed = 140
WHERE username = 'Matthijs';

-- Update Marius to €170
UPDATE profiles
SET total_penalty_owed = 170
WHERE username = 'Marius';

-- Update Harry to €80
UPDATE profiles
SET total_penalty_owed = 80
WHERE username = 'Harry';

-- Update Roel to €70
UPDATE profiles
SET total_penalty_owed = 70
WHERE username = 'Roel';

-- Verify the updates
SELECT username, total_penalty_owed
FROM profiles
WHERE username IN ('Stephan', 'Pauli', 'Sven', 'Peter', 'Matthijs', 'Marius', 'Harry', 'Roel')
ORDER BY username;
