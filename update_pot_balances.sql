-- Update pot balances for all users
-- Stephan: 370
-- Pauli: 370
-- derfriesinger: 400
-- Peter: 310
-- Matthijs: 160
-- Marius: 230
-- Harry: 80
-- Roel: 80

UPDATE profiles SET pot_balance = 370 WHERE username = 'Stephan';
UPDATE profiles SET pot_balance = 370 WHERE username = 'Pauli';
UPDATE profiles SET pot_balance = 400 WHERE username = 'derfriesinger';
UPDATE profiles SET pot_balance = 310 WHERE username = 'Peter';
UPDATE profiles SET pot_balance = 160 WHERE username = 'Matthijs';
UPDATE profiles SET pot_balance = 230 WHERE username = 'Marius';
UPDATE profiles SET pot_balance = 80 WHERE username = 'Harry';
UPDATE profiles SET pot_balance = 80 WHERE username = 'Roel';

-- Verify the updates
SELECT username, pot_balance FROM profiles ORDER BY pot_balance DESC;
