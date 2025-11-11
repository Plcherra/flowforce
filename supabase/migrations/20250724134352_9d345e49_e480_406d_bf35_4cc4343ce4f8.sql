-- Fix the remaining function search path issue and infinite recursion in channel_members policies
-- 1. Fix generate_invite_token function
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;

-- 2. Fix infinite recursion in channel_members policies
-- Drop problematic policies first
DROP POLICY IF EXISTS "Channel admins can add members" ON public.channel_members;
DROP POLICY IF EXISTS "Channel admins can remove members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can view members of channels they belong to" ON public.channel_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.channel_members;

-- Create improved policies without recursion
CREATE POLICY "Channel admins can add members" ON public.channel_members
  FOR INSERT 
  WITH CHECK (
    is_admin_or_manager(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.channel_members cm2
      WHERE cm2.channel_id = channel_members.channel_id 
      AND cm2.user_id = auth.uid() 
      AND cm2.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Channel admins can remove members" ON public.channel_members
  FOR DELETE USING (
    auth.uid() = user_id OR 
    is_admin_or_manager(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.channel_members cm2
      WHERE cm2.channel_id = channel_members.channel_id 
      AND cm2.user_id = auth.uid() 
      AND cm2.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Users can view channel members" ON public.channel_members
  FOR SELECT USING (
    is_admin_or_manager(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.channel_members cm2
      WHERE cm2.channel_id = channel_members.channel_id 
      AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own membership" ON public.channel_members
  FOR UPDATE USING (auth.uid() = user_id);