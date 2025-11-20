-- Add pending_penalties table for user-triggered penalty system
-- This replaces the unreliable cron-based penalty system with user-responsive flow

-- Create the pending_penalties table
CREATE TABLE IF NOT EXISTS pending_penalties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  date DATE NOT NULL, -- Which day they missed their target
  target_points INTEGER NOT NULL,
  actual_points INTEGER NOT NULL,
  penalty_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'disputed', 'waived', 'auto_accepted')),
  reason_category TEXT CHECK (reason_category IN ('sick', 'work', 'family', 'training_rest', 'other')),
  reason_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL, -- created_at + 24 hours
  auto_accepted_at TIMESTAMP WITH TIME ZONE,

  -- Ensure one penalty per user per day
  UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_penalties_user_status
  ON pending_penalties(user_id, status);

CREATE INDEX IF NOT EXISTS idx_pending_penalties_group_date
  ON pending_penalties(group_id, date);

CREATE INDEX IF NOT EXISTS idx_pending_penalties_deadline
  ON pending_penalties(deadline, status)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE pending_penalties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own penalties" ON pending_penalties;
DROP POLICY IF EXISTS "Users can respond to own penalties" ON pending_penalties;
DROP POLICY IF EXISTS "Admins can view group penalties" ON pending_penalties;
DROP POLICY IF EXISTS "Admins can waive penalties" ON pending_penalties;
DROP POLICY IF EXISTS "System can create penalties" ON pending_penalties;

-- Users can view their own penalties
CREATE POLICY "Users can view own penalties" ON pending_penalties
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own pending penalties (respond)
CREATE POLICY "Users can respond to own penalties" ON pending_penalties
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
    AND deadline > NOW()
  );

-- Group admins can view all penalties in their group
CREATE POLICY "Admins can view group penalties" ON pending_penalties
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('group_admin', 'supreme_admin')
    )
  );

-- Admins can update penalties (waive or modify status)
CREATE POLICY "Admins can waive penalties" ON pending_penalties
  FOR UPDATE
  USING (
    group_id IN (
      SELECT group_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('group_admin', 'supreme_admin')
    )
  );

-- System can insert penalties (service role only, for admin check endpoint)
CREATE POLICY "System can create penalties" ON pending_penalties
  FOR INSERT
  WITH CHECK (true);

-- System can update penalties (for auto-accept)
CREATE POLICY "System can update penalties" ON pending_penalties
  FOR UPDATE
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE pending_penalties IS 'Tracks penalties awaiting user response (accept or dispute). Part of user-triggered penalty system.';
COMMENT ON COLUMN pending_penalties.status IS 'pending = awaiting response, accepted = user accepted, disputed = user provided reason, waived = admin waived, auto_accepted = deadline passed';
COMMENT ON COLUMN pending_penalties.deadline IS 'User must respond before this time (24 hours from creation), or penalty auto-accepts';
COMMENT ON COLUMN pending_penalties.reason_category IS 'Category selected when user disputes: sick, work, family, training_rest, other';
COMMENT ON COLUMN pending_penalties.reason_message IS 'Optional message from user explaining why they missed target';
