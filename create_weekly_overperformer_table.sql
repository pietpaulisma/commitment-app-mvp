-- Create table for tracking weekly overperformer winners
CREATE TABLE IF NOT EXISTS weekly_overperformer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  season TEXT NOT NULL, -- 'Winter', 'Spring', 'Summer', 'Fall'
  year INTEGER NOT NULL,
  percentage_over_target DECIMAL(10, 2) NOT NULL,
  total_points INTEGER NOT NULL,
  target_points INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one winner per week per group
  UNIQUE(group_id, week_start_date)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_weekly_overperformer_group_season
  ON weekly_overperformer_history(group_id, year, season);

CREATE INDEX IF NOT EXISTS idx_weekly_overperformer_user
  ON weekly_overperformer_history(user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_overperformer_date
  ON weekly_overperformer_history(week_start_date DESC);

-- Enable Row Level Security
ALTER TABLE weekly_overperformer_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view records for their group
CREATE POLICY "Users can view group overperformer history"
  ON weekly_overperformer_history
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Only admins can insert records
CREATE POLICY "Admins can insert overperformer records"
  ON weekly_overperformer_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND group_id = weekly_overperformer_history.group_id
      AND role IN ('group_admin', 'supreme_admin')
    )
  );

-- Policy: Service role can do everything (for API routes)
CREATE POLICY "Service role has full access to overperformer history"
  ON weekly_overperformer_history
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

COMMENT ON TABLE weekly_overperformer_history IS 'Tracks weekly overperformer winners for seasonal leaderboards';
COMMENT ON COLUMN weekly_overperformer_history.season IS 'Season name: Winter (Dec-Feb), Spring (Mar-May), Summer (Jun-Aug), Fall (Sep-Nov)';
COMMENT ON COLUMN weekly_overperformer_history.percentage_over_target IS 'Percentage by which user exceeded their weekly target';
