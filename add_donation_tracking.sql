-- Add donation tracking to profiles table
-- Run this SQL directly in your Supabase SQL editor

-- Add last_donation_date column to profiles table
DO $$ 
BEGIN
    -- Add last_donation_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_donation_date') THEN
        ALTER TABLE profiles ADD COLUMN last_donation_date date DEFAULT NULL;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN profiles.last_donation_date IS 'Date of the user last donation/penalty payment';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'last_donation_date';