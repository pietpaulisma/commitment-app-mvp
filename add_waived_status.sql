-- Add 'waived' status to pending_penalties table
-- This allows admins to approve disputes (waive the penalty)

-- First, check what statuses currently exist (run this to see):
-- SELECT DISTINCT status FROM pending_penalties;

-- Drop the existing constraint
ALTER TABLE pending_penalties DROP CONSTRAINT IF EXISTS pending_penalties_status_check;

-- Add the new constraint with 'waived' included
-- Valid statuses: pending, accepted, disputed, rejected, waived, auto_accepted
-- (auto_accepted is for penalties that expired without response)
ALTER TABLE pending_penalties 
ADD CONSTRAINT pending_penalties_status_check 
CHECK (status IN ('pending', 'accepted', 'disputed', 'rejected', 'waived', 'auto_accepted'));

-- Add comment for documentation
COMMENT ON COLUMN pending_penalties.status IS 'Status of the penalty: pending (awaiting response), accepted (user paid), disputed (user contested, awaiting admin), rejected (admin rejected dispute), waived (admin approved dispute), auto_accepted (deadline passed without response)';

