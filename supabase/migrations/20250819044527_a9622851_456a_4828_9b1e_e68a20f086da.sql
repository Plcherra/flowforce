-- Check current policies on channel_members table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'channel_members';

-- Drop ALL existing policies on channel_members to start fresh
DROP POLICY IF EXISTS "Channel admins can add members" ON public.channel_members;
DROP POLICY IF EXISTS "Channel admins can remove members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.channel_members;
DROP POLICY IF EXISTS "Users can view channel members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can view channel members where they are members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can join channels (insert themselves)" ON public.channel_members;
DROP POLICY IF EXISTS "Users can leave channels (delete themselves)" ON public.channel_members;
DROP POLICY IF EXISTS "Channel creators can manage members" ON public.channel_members;

-- Create a simple function to check if user can access channel_members
CREATE OR REPLACE FUNCTION public.can_access_channel_members(channel_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
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

-- Create simple, non-recursive policies for channel_members
CREATE POLICY "Users can view channel members for accessible channels"
ON public.channel_members FOR SELECT
USING (public.can_access_channel_members(channel_id, auth.uid()));

CREATE POLICY "Users can join public channels or channels they created"
ON public.channel_members FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND 
  public.can_access_channel_members(channel_id, auth.uid())
);

CREATE POLICY "Users can leave channels (delete themselves)"
ON public.channel_members FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own membership details"
ON public.channel_members FOR UPDATE
USING (user_id = auth.uid());