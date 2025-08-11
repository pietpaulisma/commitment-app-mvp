-- Add penalty tracking system to the database
-- Run this SQL directly in your Supabase SQL editor

-- Add penalty tracking fields to profiles table
DO $$ 
BEGIN
    -- Add total_penalty_owed column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'total_penalty_owed') THEN
        ALTER TABLE profiles ADD COLUMN total_penalty_owed decimal(10,2) DEFAULT 0.00;
    END IF;
    
    -- Add last_penalty_check column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_penalty_check') THEN
        ALTER TABLE profiles ADD COLUMN last_penalty_check date DEFAULT NULL;
    END IF;
END $$;

-- Create penalty_logs table for audit trail
CREATE TABLE IF NOT EXISTS penalty_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    penalty_date date NOT NULL,
    amount decimal(10,2) NOT NULL DEFAULT 10.00,
    reason text NOT NULL DEFAULT 'Missed daily target',
    target_points integer,
    actual_points integer,
    created_at timestamp with time zone DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS penalty_logs_user_id_idx ON penalty_logs(user_id);
CREATE INDEX IF NOT EXISTS penalty_logs_group_id_idx ON penalty_logs(group_id);
CREATE INDEX IF NOT EXISTS penalty_logs_penalty_date_idx ON penalty_logs(penalty_date);

-- Add RLS policies for penalty_logs
ALTER TABLE penalty_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own penalty logs
CREATE POLICY "Users can view own penalty logs" ON penalty_logs
    FOR SELECT USING (user_id = auth.uid());

-- Group admins can read all penalty logs in their group
CREATE POLICY "Group admins can view group penalty logs" ON penalty_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.group_id = penalty_logs.group_id 
            AND profiles.role = 'group_admin'
        )
    );

-- Supreme admins can read all penalty logs
CREATE POLICY "Supreme admins can view all penalty logs" ON penalty_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'supreme_admin'
        )
    );

-- Only system can insert penalty logs (no user INSERT policy)
-- This prevents users from creating fake penalties

-- Add comments for documentation
COMMENT ON COLUMN profiles.total_penalty_owed IS 'Total amount owed in penalties (EUR)';
COMMENT ON COLUMN profiles.last_penalty_check IS 'Last date when penalty check was performed';
COMMENT ON TABLE penalty_logs IS 'Audit trail for all penalty charges';
COMMENT ON COLUMN penalty_logs.penalty_date IS 'Date the penalty was incurred (day target was missed)';
COMMENT ON COLUMN penalty_logs.amount IS 'Penalty amount in EUR';
COMMENT ON COLUMN penalty_logs.reason IS 'Reason for penalty (e.g., missed target, rest day violation)';
COMMENT ON COLUMN penalty_logs.target_points IS 'Required points for that day';
COMMENT ON COLUMN penalty_logs.actual_points IS 'Points actually achieved';

-- Verify the columns were added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('total_penalty_owed', 'last_penalty_check')
ORDER BY column_name;

-- Verify the penalty_logs table was created
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'penalty_logs'
ORDER BY ordinal_position;