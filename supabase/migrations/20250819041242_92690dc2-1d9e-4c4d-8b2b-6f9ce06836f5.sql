-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', false);

-- Create RLS policies for message attachments bucket
CREATE POLICY "Users can upload attachments to channels they belong to"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view attachments in channels they belong to"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND (
    -- Allow access if user is in the channel
    EXISTS (
      SELECT 1 
      FROM public.messages m
      JOIN public.channel_members cm ON cm.channel_id = m.channel_id
      WHERE m.id::text = (storage.foldername(name))[2]
      AND cm.user_id = auth.uid()
    )
    OR 
    -- Allow access to own uploads
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'message-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'department', 'role', 'specific')),
  target_ids JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for announcements
CREATE POLICY "Company admins can manage announcements"
ON public.announcements
FOR ALL
USING (
  company_id = get_user_company_id() 
  AND (created_by = auth.uid() OR is_company_admin())
);

CREATE POLICY "Users can view published announcements for their company"
ON public.announcements
FOR SELECT
USING (
  company_id = get_user_company_id() 
  AND is_published = true
  AND (expires_at IS NULL OR expires_at > now())
);

-- Create announcement reads table to track who has read announcements
CREATE TABLE public.announcement_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS on announcement reads
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for announcement reads
CREATE POLICY "Users can manage their own announcement reads"
ON public.announcement_reads
FOR ALL
USING (user_id = auth.uid());

-- Add updated_at trigger for announcements
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add full-text search index for messages
CREATE INDEX IF NOT EXISTS messages_content_search_idx 
ON public.messages 
USING gin(to_tsvector('english', content));

-- Add full-text search index for message channels
CREATE INDEX IF NOT EXISTS channels_name_search_idx 
ON public.message_channels 
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));