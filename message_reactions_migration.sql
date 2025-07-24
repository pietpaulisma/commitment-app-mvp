-- Create message_reactions table for emoji reactions on chat messages
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for message_reactions
CREATE POLICY "Users can view reactions in their group" ON message_reactions
FOR SELECT USING (
  message_id IN (
    SELECT id FROM chat_messages 
    WHERE group_id IN (
      SELECT group_id FROM profiles WHERE id = auth.uid() AND group_id IS NOT NULL
    )
  )
);

CREATE POLICY "Users can add reactions to messages in their group" ON message_reactions
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  message_id IN (
    SELECT id FROM chat_messages 
    WHERE group_id IN (
      SELECT group_id FROM profiles WHERE id = auth.uid() AND group_id IS NOT NULL
    )
  )
);

CREATE POLICY "Users can remove their own reactions" ON message_reactions
FOR DELETE USING (
  user_id = auth.uid()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_emoji ON message_reactions(emoji);

-- Create chat-images storage bucket (run this separately in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'Chat Images', true);

-- Create storage policies for chat-images bucket
-- CREATE POLICY "Users can view chat images" ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');
-- CREATE POLICY "Users can upload chat images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-images' AND auth.uid() IS NOT NULL);
-- CREATE POLICY "Users can delete their own chat images" ON storage.objects FOR DELETE USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);
