-- Force drop ALL existing policies with CASCADE
DROP POLICY IF EXISTS "Channel admins can add members" ON public.channel_members CASCADE;
DROP POLICY IF EXISTS "Channel admins can remove members" ON public.channel_members CASCADE;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.channel_members CASCADE;
DROP POLICY IF EXISTS "Users can view channel members" ON public.channel_members CASCADE;
DROP POLICY IF EXISTS "Users can view channel members where they are members" ON public.channel_members CASCADE;
DROP POLICY IF EXISTS "Users can join channels (insert themselves)" ON public.channel_members CASCADE;
DROP POLICY IF EXISTS "Users can leave channels (delete themselves)" ON public.channel_members CASCADE;
DROP POLICY IF EXISTS "Channel creators can manage members" ON public.channel_members CASCADE;

-- Fix the security warning by setting search_path on the function
CREATE OR REPLACE FUNCTION public.can_access_channel_members(channel_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.message_channels mc 
    WHERE mc.id = channel_id 
    AND (mc.created_by = user_id OR NOT mc.is_private)
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = user_id 
    AND p.role IN ('admin', 'manager', 'owner')
  );
$$;

-- Disable RLS temporarily to clear any cache
ALTER TABLE public.channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- Create completely new, simple policies
CREATE POLICY "channel_members_select_policy"
ON public.channel_members FOR SELECT
TO authenticated
USING (public.can_access_channel_members(channel_id, auth.uid()));

CREATE POLICY "channel_members_insert_policy"
ON public.channel_members FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND 
  public.can_access_channel_members(channel_id, auth.uid())
);

CREATE POLICY "channel_members_update_policy"
ON public.channel_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "channel_members_delete_policy"
ON public.channel_members FOR DELETE
TO authenticated
USING (user_id = auth.uid());