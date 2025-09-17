-- Add reply support to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reply_to_user_name TEXT,
ADD COLUMN IF NOT EXISTS reply_to_content TEXT,
ADD COLUMN IF NOT EXISTS reply_to_type TEXT CHECK (reply_to_type IN ('text', 'image', 'workout'));

-- Create index for better performance when querying replies
CREATE INDEX IF NOT EXISTS chat_messages_reply_to_message_id_idx ON chat_messages(reply_to_message_id);

-- Update any existing messages to have null values for reply fields (safe operation)
UPDATE chat_messages SET 
  reply_to_message_id = NULL,
  reply_to_user_name = NULL,
  reply_to_content = NULL,
  reply_to_type = NULL
WHERE reply_to_message_id IS NULL;