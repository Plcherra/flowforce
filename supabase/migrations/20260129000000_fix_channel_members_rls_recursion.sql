-- Fix infinite recursion in channel_members RLS policies
-- The issue occurs when INSERT policies use can_access_channel_members() which
-- may trigger SELECT policies that check channel_members, creating a recursion loop.
--
-- Solution: Use direct checks against message_channels.created_by instead of
-- can_access_channel_members() in INSERT policies to avoid recursion.

-- Drop ALL existing channel_members policies to start fresh
DROP POLICY IF EXISTS "channel_members_insert_policy" ON public.channel_members;
DROP POLICY IF EXISTS "channel_members_select_policy" ON public.channel_members;
DROP POLICY IF EXISTS "channel_members_update_policy" ON public.channel_members;
DROP POLICY IF EXISTS "channel_members_delete_policy" ON public.channel_members;
DROP POLICY IF EXISTS "Users can view channel members for accessible channels" ON public.channel_members;
DROP POLICY IF EXISTS "Users can join channels (insert themselves)" ON public.channel_members;
DROP POLICY IF EXISTS "Users can join public channels or channels they created" ON public.channel_members;
DROP POLICY IF EXISTS "Channel admins can add members" ON public.channel_members;
DROP POLICY IF EXISTS "Channel creators can manage members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can update their own membership details" ON public.channel_members;
DROP POLICY IF EXISTS "Users can view channel members where they are members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can leave channels (delete themselves)" ON public.channel_members;

-- Create non-recursive SELECT policy
-- Users can view channel members if:
-- 1. They are channel creators
-- 2. Channel is public
-- 3. They are admins/managers/owners
-- NOTE: We do NOT check if user is a member via channel_members to avoid recursion
CREATE POLICY "channel_members_select_policy"
ON public.channel_members FOR SELECT
TO authenticated
USING (
  -- Channel creators can always see members of their channels
  EXISTS (
    SELECT 1 FROM public.message_channels mc
    WHERE mc.id = channel_members.channel_id
    AND mc.created_by = auth.uid()
  )
  OR
  -- Public channels are visible to all authenticated users
  EXISTS (
    SELECT 1 FROM public.message_channels mc
    WHERE mc.id = channel_members.channel_id
    AND NOT mc.is_private
  )
  OR
  -- Admins/managers/owners can see all channel members
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager', 'owner', 'company_admin')
  )
);

-- Create non-recursive INSERT policy
-- CRITICAL: Do NOT use can_access_channel_members() here to prevent recursion
-- Channel creators can add ANY members (needed for channel creation)
-- Users can add themselves to public channels or channels they created
CREATE POLICY "channel_members_insert_policy"
ON public.channel_members FOR INSERT
TO authenticated
WITH CHECK (
  -- CRITICAL: Channel creators can add ANY members to channels they created
  -- This must be first to handle channel creation case
  EXISTS (
    SELECT 1 FROM public.message_channels mc
    WHERE mc.id = channel_id
    AND mc.created_by = auth.uid()
  )
  OR
  -- Users can add themselves to public channels or channels they created
  (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.message_channels mc
      WHERE mc.id = channel_id
      AND (mc.created_by = auth.uid() OR NOT mc.is_private)
    )
  )
  OR
  -- Admins/managers/owners can add members to any channel
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager', 'owner', 'company_admin')
  )
);

-- Update policy: Users can update their own membership
CREATE POLICY "channel_members_update_policy"
ON public.channel_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Delete policy: Users can delete their own membership, channel creators can delete any member
CREATE POLICY "channel_members_delete_policy"
ON public.channel_members FOR DELETE
TO authenticated
USING (
  -- Users can delete their own membership
  user_id = auth.uid()
  OR
  -- Channel creators can delete any member from their channels
  EXISTS (
    SELECT 1 FROM public.message_channels mc
    WHERE mc.id = channel_id
    AND mc.created_by = auth.uid()
  )
  OR
  -- Admins/managers/owners can delete any member
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager', 'owner', 'company_admin')
  )
);
