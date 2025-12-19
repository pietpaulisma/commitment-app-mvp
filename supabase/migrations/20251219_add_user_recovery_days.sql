-- Migration: Add user_recovery_days table
-- This replaces the fixed Friday recovery day system with a user-chosen recovery day
-- Each user can use one recovery day per week (any day except Monday)

-- Create the user_recovery_days table
CREATE TABLE IF NOT EXISTS user_recovery_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,  -- Monday of the week
  used_date DATE NOT NULL,        -- The day they used it
  recovery_minutes INTEGER DEFAULT 0, -- Progress tracking (target: 15 min)
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_recovery_days_user_id ON user_recovery_days(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recovery_days_week_start ON user_recovery_days(week_start_date);
CREATE INDEX IF NOT EXISTS idx_user_recovery_days_used_date ON user_recovery_days(used_date);

-- Enable RLS
ALTER TABLE user_recovery_days ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own recovery days
CREATE POLICY "Users can view own recovery days"
  ON user_recovery_days
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own recovery days
CREATE POLICY "Users can insert own recovery days"
  ON user_recovery_days
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own recovery days
CREATE POLICY "Users can update own recovery days"
  ON user_recovery_days
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Group members can view each other's recovery days (for squad status display)
CREATE POLICY "Group members can view recovery days"
  ON user_recovery_days
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.group_id = p2.group_id
      WHERE p1.id = auth.uid() AND p2.id = user_recovery_days.user_id
    )
  );

-- Add comment explaining the table
COMMENT ON TABLE user_recovery_days IS 'Tracks user-chosen recovery days. Each user can use one recovery day per week (resets Monday). On recovery day, user must complete 15 minutes of recovery exercise.';
