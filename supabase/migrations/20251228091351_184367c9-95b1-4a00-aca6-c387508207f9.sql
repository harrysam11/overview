-- Add length constraints to messages table
ALTER TABLE public.messages
ADD CONSTRAINT messages_content_length CHECK (char_length(content) <= 5000);

-- Add length constraints to group_messages table
ALTER TABLE public.group_messages
ADD CONSTRAINT group_messages_content_length CHECK (char_length(content) <= 5000);