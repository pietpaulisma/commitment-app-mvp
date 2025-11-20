-- Add Flex Rest Day feature to profiles table
-- This allows users to "earn" a rest day by doing 2x points the day before

-- Add column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS flex_rest_day_enabled BOOLEAN DEFAULT false;

-- Add comment explaining the feature
COMMENT ON COLUMN profiles.flex_rest_day_enabled IS
'When enabled, user can skip penalty on their rest day if they earned 2x their daily target the day before (typically Monday before Tuesday rest day)';

-- No RLS policy changes needed - column follows existing profile RLS policies
