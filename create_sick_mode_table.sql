-- Create sick_mode table to track historical sick days
-- This table logs each day a user was in sick mode, for accurate historical reporting

CREATE TABLE IF NOT EXISTS sick_mode (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Add index for faster lookups by user and date range
CREATE INDEX IF NOT EXISTS idx_sick_mode_user_date ON sick_mode(user_id, date);

-- Add RLS policies
ALTER TABLE sick_mode ENABLE ROW LEVEL SECURITY;

-- Allow users to view sick mode records for their group members
CREATE POLICY "Users can view sick mode records for their group"
    ON sick_mode
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p1, profiles p2
            WHERE p1.id = sick_mode.user_id
            AND p2.id = auth.uid()
            AND p1.group_id = p2.group_id
        )
    );

-- Allow service role to insert/update
CREATE POLICY "Service role can manage sick mode records"
    ON sick_mode
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE sick_mode IS 'Tracks historical sick days for each user, logged by daily penalty cron job';
COMMENT ON COLUMN sick_mode.date IS 'The date the user was in sick mode';



