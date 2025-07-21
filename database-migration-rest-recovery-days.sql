-- Migration: Add rest_days and recovery_days to group_settings
-- Run this in your Supabase SQL editor to enable rest/recovery day functionality

ALTER TABLE group_settings 
ADD COLUMN IF NOT EXISTS rest_days integer[] DEFAULT '{1}', -- Monday by default
ADD COLUMN IF NOT EXISTS recovery_days integer[] DEFAULT '{5}'; -- Friday by default

-- Add comments to explain the columns
COMMENT ON COLUMN group_settings.rest_days IS 'Array of day numbers (0=Sunday, 1=Monday, etc.) that are rest days - no exercises required';
COMMENT ON COLUMN group_settings.recovery_days IS 'Array of day numbers (0=Sunday, 1=Monday, etc.) that are recovery days - only 15 minutes of recovery exercises required';

-- Update existing group_settings records with default values
UPDATE group_settings 
SET rest_days = '{1}', recovery_days = '{5}' 
WHERE rest_days IS NULL OR recovery_days IS NULL;