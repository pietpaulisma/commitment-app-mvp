-- Add missing profile customization fields to fix onboarding
-- Run this SQL directly in your Supabase SQL editor

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add personal_color column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'personal_color') THEN
        ALTER TABLE profiles ADD COLUMN personal_color text DEFAULT '#3b82f6';
    END IF;
    
    -- Add custom_icon column  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'custom_icon') THEN
        ALTER TABLE profiles ADD COLUMN custom_icon text DEFAULT '💪';
    END IF;
END $$;

-- Update existing profiles to have default values
UPDATE profiles 
SET personal_color = '#3b82f6' 
WHERE personal_color IS NULL;

UPDATE profiles 
SET custom_icon = '💪' 
WHERE custom_icon IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.personal_color IS 'User selected color theme in hex format (#rrggbb)';
COMMENT ON COLUMN profiles.custom_icon IS 'User selected emoji icon for their profile';

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('personal_color', 'custom_icon');