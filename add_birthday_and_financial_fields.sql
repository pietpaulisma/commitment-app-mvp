-- Add birthday and financial tracking fields to profiles table
-- Run this SQL directly in your Supabase SQL editor

DO $$ 
BEGIN
    -- Add birth_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'birth_date') THEN
        ALTER TABLE profiles ADD COLUMN birth_date date DEFAULT NULL;
    END IF;
    
    -- Add last_donation_date column (if not already exists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_donation_date') THEN
        ALTER TABLE profiles ADD COLUMN last_donation_date date DEFAULT NULL;
    END IF;
    
    -- Add total_donated column to track cumulative donations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'total_donated') THEN
        ALTER TABLE profiles ADD COLUMN total_donated decimal(10,2) DEFAULT 0.00;
    END IF;
    
    -- Add donation_rate column (euros per point)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'donation_rate') THEN
        ALTER TABLE profiles ADD COLUMN donation_rate decimal(6,4) DEFAULT 0.10;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN profiles.birth_date IS 'User date of birth for birthday calculations';
COMMENT ON COLUMN profiles.last_donation_date IS 'Date of the user last donation/penalty payment';
COMMENT ON COLUMN profiles.total_donated IS 'Total amount donated by user in euros';
COMMENT ON COLUMN profiles.donation_rate IS 'Euros per point for donation calculations (default 0.10)';

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('birth_date', 'last_donation_date', 'total_donated', 'donation_rate')
ORDER BY column_name;