-- Migration: Create group_settings table with rest/recovery days and accent color
-- Run this in your Supabase SQL editor to enable rest/recovery day and customizable accent color functionality

-- Create the group_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS group_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE UNIQUE NOT NULL,
    daily_target_base INTEGER DEFAULT 100 NOT NULL,
    daily_increment INTEGER DEFAULT 5 NOT NULL,
    rest_days integer[] DEFAULT '{1}', -- Monday by default
    recovery_days integer[] DEFAULT '{5}', -- Friday by default
    accent_color text DEFAULT 'blue', -- Default blue accent color
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add comments to explain the columns
COMMENT ON COLUMN group_settings.rest_days IS 'Array of day numbers (0=Sunday, 1=Monday, etc.) that are rest days - no exercises required';
COMMENT ON COLUMN group_settings.recovery_days IS 'Array of day numbers (0=Sunday, 1=Monday, etc.) that are recovery days - only 15 minutes of recovery exercises required';
COMMENT ON COLUMN group_settings.accent_color IS 'Group accent color theme (blue, green, purple, orange, red, cyan)';

-- Enable RLS (Row Level Security)
ALTER TABLE group_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read their group settings
CREATE POLICY "Users can view their group settings" ON group_settings
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM profiles WHERE group_id = group_settings.group_id
    ));

-- Create policy for group admins to manage their group settings
CREATE POLICY "Group admins can manage their group settings" ON group_settings
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM profiles WHERE group_id = group_settings.group_id AND role IN ('group_admin', 'supreme_admin')
    ));

-- Insert default settings for existing groups that don't have settings
INSERT INTO group_settings (group_id, daily_target_base, daily_increment, rest_days, recovery_days, accent_color)
SELECT 
    id as group_id,
    100 as daily_target_base,
    5 as daily_increment,
    '{1}' as rest_days,
    '{5}' as recovery_days,
    'blue' as accent_color
FROM groups 
WHERE id NOT IN (SELECT group_id FROM group_settings WHERE group_id IS NOT NULL);