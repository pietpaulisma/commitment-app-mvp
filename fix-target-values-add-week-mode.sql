-- Fix target values and add week_mode column
-- This migration corrects the daily_target_base and daily_increment values
-- to the correct app rules (1 and 1) and adds week_mode functionality

-- Add week_mode column to group_settings if it doesn't exist
ALTER TABLE group_settings 
ADD COLUMN IF NOT EXISTS week_mode TEXT DEFAULT 'sane' CHECK (week_mode IN ('sane', 'insane'));

-- Update all existing group_settings to have the correct target values
UPDATE group_settings 
SET 
  daily_target_base = 1,
  daily_increment = 1,
  week_mode = COALESCE(week_mode, 'sane')
WHERE daily_target_base != 1 OR daily_increment != 1 OR week_mode IS NULL;

-- Create group_settings records for groups that don't have them yet with correct values
INSERT INTO group_settings (
  group_id, 
  daily_target_base, 
  daily_increment, 
  penalty_amount, 
  recovery_percentage, 
  rest_days, 
  recovery_days, 
  accent_color,
  week_mode
)
SELECT 
  g.id,
  1, -- correct base target
  1, -- correct daily increment  
  10, -- default penalty
  25, -- default recovery percentage
  ARRAY[1], -- Monday as rest day
  ARRAY[5], -- Friday as recovery day
  'blue', -- default accent color
  'sane' -- default week mode
FROM groups g
LEFT JOIN group_settings gs ON gs.group_id = g.id
WHERE gs.id IS NULL;

-- Verify the changes
SELECT 
  g.name as group_name,
  gs.daily_target_base,
  gs.daily_increment,
  gs.week_mode
FROM groups g
LEFT JOIN group_settings gs ON gs.group_id = g.id
ORDER BY g.name;