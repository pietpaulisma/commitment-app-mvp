-- Create error_logs table for tracking bugs and issues
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  component_name VARCHAR(255),
  url VARCHAR(500),
  user_agent TEXT,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only supreme admins can read error logs
CREATE POLICY "Supreme admins can view all error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'supreme_admin'
    )
  );

-- Policy: Anyone can insert error logs (for reporting bugs)
CREATE POLICY "Anyone can insert error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Supreme admins can update error logs (mark as resolved)
CREATE POLICY "Supreme admins can update error logs"
  ON error_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'supreme_admin'
    )
  );

COMMENT ON TABLE error_logs IS 'Tracks application errors and bugs reported by users';
COMMENT ON COLUMN error_logs.error_type IS 'Type/category of error (e.g., workout_logging, navigation, penalty_system)';
COMMENT ON COLUMN error_logs.metadata IS 'Additional context data in JSON format';
