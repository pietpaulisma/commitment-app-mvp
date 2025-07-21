-- Migration: Add missing columns to group_settings table
-- Run this in your Supabase SQL editor to enable rest/recovery day and customizable accent color functionality

-- Add the new columns to existing group_settings table
ALTER TABLE group_settings 
ADD COLUMN IF NOT EXISTS rest_days integer[] DEFAULT '{1}';

ALTER TABLE group_settings 
ADD COLUMN IF NOT EXISTS recovery_days integer[] DEFAULT '{5}';

ALTER TABLE group_settings 
ADD COLUMN IF NOT EXISTS accent_color text DEFAULT 'blue';

-- Add comments to explain the columns
COMMENT ON COLUMN group_settings.rest_days IS 'Array of day numbers (0=Sunday, 1=Monday, etc.) that are rest days - no exercises required';
COMMENT ON COLUMN group_settings.recovery_days IS 'Array of day numbers (0=Sunday, 1=Monday, etc.) that are recovery days - only 15 minutes of recovery exercises required';
COMMENT ON COLUMN group_settings.accent_color IS 'Group accent color theme (blue, green, purple, orange, red, cyan)';

-- Update existing records to have default values for new columns
UPDATE group_settings 
SET 
    rest_days = COALESCE(rest_days, '{1}'),
    recovery_days = COALESCE(recovery_days, '{5}'),
    accent_color = COALESCE(accent_color, 'blue')
WHERE rest_days IS NULL OR recovery_days IS NULL OR accent_color IS NULL;