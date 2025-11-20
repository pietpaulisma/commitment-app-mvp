-- Update pot balances for all users
-- Stephan: 340
-- Pauli: 360
-- derfriesinger: 370
-- Peter: 290
-- Matthijs: 140
-- Marius: 200
-- Harry: 80
-- Roel: 70

UPDATE profiles SET pot_balance = 340 WHERE username = 'Stephan';
UPDATE profiles SET pot_balance = 360 WHERE username = 'Pauli';
UPDATE profiles SET pot_balance = 370 WHERE username = 'derfriesinger';
UPDATE profiles SET pot_balance = 290 WHERE username = 'Peter';
UPDATE profiles SET pot_balance = 140 WHERE username = 'Matthijs';
UPDATE profiles SET pot_balance = 200 WHERE username = 'Marius';
UPDATE profiles SET pot_balance = 80 WHERE username = 'Harry';
UPDATE profiles SET pot_balance = 70 WHERE username = 'Roel';

-- Verify the updates
SELECT username, pot_balance FROM profiles ORDER BY pot_balance DESC;
