-- Add penalty tracking columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_penalty_owed DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_penalty_check DATE;

-- Create penalty_logs table for audit trail
CREATE TABLE IF NOT EXISTS penalty_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  penalty_amount DECIMAL(10,2) NOT NULL,
  target_points INTEGER NOT NULL,
  actual_points INTEGER NOT NULL,
  penalty_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up RLS policies for penalty_logs
ALTER TABLE penalty_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own penalty logs
CREATE POLICY "Users can view own penalty logs" ON penalty_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Group admins can view penalty logs for their group members
CREATE POLICY "Group admins can view group penalty logs" ON penalty_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
        AND p.group_id = penalty_logs.group_id 
        AND p.role IN ('group_admin', 'supreme_admin')
    )
  );

-- Only system (service role) can insert penalty logs
CREATE POLICY "System can insert penalty logs" ON penalty_logs
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- Supreme admins can view all penalty logs
CREATE POLICY "Supreme admins can view all penalty logs" ON penalty_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'supreme_admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS penalty_logs_user_id_idx ON penalty_logs(user_id);
CREATE INDEX IF NOT EXISTS penalty_logs_group_id_idx ON penalty_logs(group_id);
CREATE INDEX IF NOT EXISTS penalty_logs_penalty_date_idx ON penalty_logs(penalty_date);
CREATE INDEX IF NOT EXISTS profiles_last_penalty_check_idx ON profiles(last_penalty_check);

-- Update existing profiles to have 0 penalty owed if NULL
UPDATE profiles SET total_penalty_owed = 0 WHERE total_penalty_owed IS NULL;