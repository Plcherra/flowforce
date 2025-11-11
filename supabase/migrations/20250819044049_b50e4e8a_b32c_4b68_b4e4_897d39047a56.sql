-- Fix infinite recursion in channel_members RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view channel members for channels they belong to" ON public.channel_members;
DROP POLICY IF EXISTS "Users can manage channel members" ON public.channel_members;
DROP POLICY IF EXISTS "Channel admins can manage members" ON public.channel_members;

-- Create simple, non-recursive policies for channel_members
CREATE POLICY "Users can view channel members where they are members"
ON public.channel_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.channel_members cm2 
    WHERE cm2.channel_id = channel_members.channel_id 
    AND cm2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join channels (insert themselves)"
ON public.channel_members FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave channels (delete themselves)"
ON public.channel_members FOR DELETE
USING (user_id = auth.uid());

-- Channel creators and admins can manage members
CREATE POLICY "Channel creators can manage members"
ON public.channel_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.message_channels mc 
    WHERE mc.id = channel_members.channel_id 
    AND mc.created_by = auth.uid()
  )
);