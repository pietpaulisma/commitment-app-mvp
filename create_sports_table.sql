-- Create sports table for managing available sports
CREATE TABLE IF NOT EXISTS sports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    emoji TEXT NOT NULL DEFAULT '⚽',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read sports
CREATE POLICY "Sports are viewable by authenticated users"
    ON sports FOR SELECT
    TO authenticated
    USING (true);

-- Only supreme admins can insert/update/delete sports
CREATE POLICY "Supreme admins can insert sports"
    ON sports FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'supreme_admin'
        )
    );

CREATE POLICY "Supreme admins can update sports"
    ON sports FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'supreme_admin'
        )
    );

CREATE POLICY "Supreme admins can delete sports"
    ON sports FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'supreme_admin'
        )
    );

-- Insert default sports based on the current hardcoded list
INSERT INTO sports (name, emoji) VALUES
    ('Running', '🏃'),
    ('Basketball', '🏀'),
    ('Soccer/Football', '⚽'),
    ('Tennis', '🎾'),
    ('Swimming', '🏊'),
    ('Cycling', '🚴'),
    ('Volleyball', '🏐'),
    ('Hiking', '🥾'),
    ('Rock Climbing', '🧗'),
    ('Surfing', '🏄'),
    ('Mountain Biking', '🚵'),
    ('Canoeing', '🛶'),
    ('Bodycombat', '🥊')
ON CONFLICT (name) DO NOTHING;
