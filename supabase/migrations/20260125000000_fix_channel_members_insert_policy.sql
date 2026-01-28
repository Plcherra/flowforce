-- Fix channel_members INSERT policy to allow channel creators to add members
-- The current policy only allows users to add themselves, but channel creation
-- requires adding multiple members including the creator and other users.

-- Drop ALL existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "channel_members_insert_policy" ON public.channel_members;
DROP POLICY IF EXISTS "Users can join channels (insert themselves)" ON public.channel_members;
DROP POLICY IF EXISTS "Users can join public channels or channels they created" ON public.channel_members;
DROP POLICY IF EXISTS "Channel admins can add members" ON public.channel_members;
DROP POLICY IF EXISTS "Channel creators can manage members" ON public.channel_members;

-- Create a comprehensive policy that allows:
-- 1. Users to add themselves to public channels or channels they created
-- 2. Channel creators to add ANY members (including themselves and others) to channels they created
-- 3. Admins/managers to add members to any channel
-- 
-- NOTE: We avoid using can_access_channel_members() here to prevent infinite recursion
-- The function might trigger SELECT policies that check channel_members, causing a loop
CREATE POLICY "channel_members_insert_policy"
ON public.channel_members FOR INSERT
TO authenticated
WITH CHECK (
  -- CRITICAL: Allow channel creators to add ANY members to channels they created
  -- This is needed for channel creation when adding multiple members at once
  -- This must come first to handle the channel creation case
  EXISTS (
    SELECT 1 FROM public.message_channels mc
    WHERE mc.id = channel_id
    AND mc.created_by = auth.uid()
  )
  OR
  -- Allow users to add themselves to public channels or channels they created
  -- Direct check without using can_access_channel_members to avoid recursion
  (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.message_channels mc
      WHERE mc.id = channel_id
      AND (mc.created_by = auth.uid() OR NOT mc.is_private)
    )
  )
  OR
  -- Allow admins/managers/owners to add members to any channel
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager', 'owner')
  )
);
