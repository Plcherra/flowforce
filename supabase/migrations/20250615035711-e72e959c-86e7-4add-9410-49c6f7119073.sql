
-- Create message-related tables
CREATE TABLE public.message_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'group', -- 'direct', 'group', 'department'
  department_id UUID REFERENCES public.departments(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.channel_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.message_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'admin', 'moderator', 'member'
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.message_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'file', 'image', 'system'
  attachments JSONB DEFAULT '[]'::jsonb,
  reply_to_id UUID REFERENCES public.messages(id),
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable Row Level Security
ALTER TABLE public.message_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_channels
CREATE POLICY "Users can view channels they are members of" ON public.message_channels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.channel_members 
      WHERE channel_id = message_channels.id 
      AND user_id = auth.uid()
    ) OR 
    public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Users can create channels" ON public.message_channels
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Channel creators and admins can update channels" ON public.message_channels
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Only admins can delete channels" ON public.message_channels
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for channel_members
CREATE POLICY "Users can view members of channels they belong to" ON public.channel_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = channel_members.channel_id 
      AND cm.user_id = auth.uid()
    ) OR 
    public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Channel admins can add members" ON public.channel_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.channel_members 
      WHERE channel_id = channel_members.channel_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    ) OR 
    public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Users can update their own membership" ON public.channel_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Channel admins can remove members" ON public.channel_members
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.channel_members 
      WHERE channel_id = channel_members.channel_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    ) OR 
    public.is_admin_or_manager(auth.uid())
  );

-- RLS Policies for messages
CREATE POLICY "Users can view messages in channels they belong to" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.channel_members 
      WHERE channel_id = messages.channel_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Channel members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.channel_members 
      WHERE channel_id = messages.channel_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON public.messages
  FOR DELETE USING (
    auth.uid() = sender_id OR 
    public.is_admin_or_manager(auth.uid())
  );

-- RLS Policies for message_reactions
CREATE POLICY "Users can view reactions on messages they can see" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.channel_members cm ON cm.channel_id = m.channel_id
      WHERE m.id = message_reactions.message_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add reactions to messages they can see" ON public.message_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.channel_members cm ON cm.channel_id = m.channel_id
      WHERE m.id = message_reactions.message_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove their own reactions" ON public.message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_message_channels_updated_at
  BEFORE UPDATE ON public.message_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_message_channels_department_id ON public.message_channels(department_id);
CREATE INDEX idx_channel_members_channel_id ON public.channel_members(channel_id);
CREATE INDEX idx_channel_members_user_id ON public.channel_members(user_id);
CREATE INDEX idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);

-- Enable realtime for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_channels REPLICA IDENTITY FULL;
ALTER TABLE public.channel_members REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
