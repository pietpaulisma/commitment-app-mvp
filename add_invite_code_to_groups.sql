-- Add invite_code column to groups table for simple group sharing
-- Run this SQL directly in your Supabase SQL editor

-- 1. Add invite_code column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- 2. Create function to generate random invite codes
CREATE OR REPLACE FUNCTION generate_simple_invite_code() RETURNS TEXT AS $$
BEGIN
  -- Generate 8-character alphanumeric code
  RETURN upper(substring(md5(random()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- 3. Auto-generate invite codes for existing groups that don't have one
DO $$
DECLARE
  group_record RECORD;
  new_code TEXT;
BEGIN
  FOR group_record IN SELECT id FROM groups WHERE invite_code IS NULL LOOP
    -- Generate unique invite code
    LOOP
      new_code := generate_simple_invite_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM groups WHERE invite_code = new_code);
    END LOOP;
    
    -- Update the group with the new code
    UPDATE groups SET invite_code = new_code WHERE id = group_record.id;
    
    RAISE NOTICE 'Generated invite code % for group %', new_code, group_record.id;
  END LOOP;
END $$;

-- 4. Create trigger to auto-generate invite codes for new groups
CREATE OR REPLACE FUNCTION auto_generate_invite_code() RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
BEGIN
  IF NEW.invite_code IS NULL THEN
    -- Generate unique invite code
    LOOP
      new_code := generate_simple_invite_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM groups WHERE invite_code = new_code);
    END LOOP;
    
    NEW.invite_code := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for new groups
DROP TRIGGER IF EXISTS trigger_auto_generate_invite_code ON groups;
CREATE TRIGGER trigger_auto_generate_invite_code
  BEFORE INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_invite_code();

-- 6. Add comment for documentation
COMMENT ON COLUMN groups.invite_code IS 'Unique 8-character invite code for joining the group';

SELECT 'Simple invite code system added to groups table!' as status;