-- Fix remaining RLS policies for confirmed existing tables
-- Focus on tables we know exist with confirmed column structures

-- Update departments policies
DROP POLICY IF EXISTS "Company members can view departments" ON public.departments;
CREATE POLICY "Company members can view departments" ON public.departments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = (select auth.uid()) 
    AND profiles.company_id IS NOT NULL
  )
);

-- Update profiles policies
DROP POLICY IF EXISTS "Profile management policy" ON public.profiles;
CREATE POLICY "Profile management policy" ON public.profiles
FOR ALL USING (
  (id = (select auth.uid())) OR 
  is_company_admin((select auth.uid()))
);

DROP POLICY IF EXISTS "Profile update policy" ON public.profiles;
CREATE POLICY "Profile update policy" ON public.profiles
FOR UPDATE USING (
  (id = (select auth.uid())) OR 
  is_company_admin((select auth.uid()))
);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "update own profile" ON public.profiles;
CREATE POLICY "update own profile" ON public.profiles
FOR UPDATE USING (id = (select auth.uid()));

-- Update user_roles policies
DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;
CREATE POLICY "Admins manage all roles" ON public.user_roles
FOR ALL USING (has_role((select auth.uid()), 'admin'::user_role));

DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
CREATE POLICY "Users can insert own roles" ON public.user_roles
FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (user_id = (select auth.uid()));

-- Update company_settings policies
DROP POLICY IF EXISTS "settings: read where member" ON public.company_settings;
CREATE POLICY "settings: read where member" ON public.company_settings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM company_members m 
    WHERE m.company_id = company_settings.company_id 
    AND m.user_id = (select auth.uid())
  )
);

-- Update channel_members policies
DROP POLICY IF EXISTS "Users can update their own membership details" ON public.channel_members;
CREATE POLICY "Users can update their own membership details" ON public.channel_members
FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view channel members for accessible channels" ON public.channel_members;
CREATE POLICY "Users can view channel members for accessible channels" ON public.channel_members
FOR SELECT USING (can_access_channel_members(channel_id, (select auth.uid())));

DROP POLICY IF EXISTS "channel_members_delete_policy" ON public.channel_members;
CREATE POLICY "channel_members_delete_policy" ON public.channel_members
FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "channel_members_insert_policy" ON public.channel_members;
CREATE POLICY "channel_members_insert_policy" ON public.channel_members
FOR INSERT WITH CHECK (
  (user_id = (select auth.uid())) AND 
  can_access_channel_members(channel_id, (select auth.uid()))
);

DROP POLICY IF EXISTS "channel_members_select_policy" ON public.channel_members;
CREATE POLICY "channel_members_select_policy" ON public.channel_members
FOR SELECT USING (can_access_channel_members(channel_id, (select auth.uid())));

DROP POLICY IF EXISTS "channel_members_update_policy" ON public.channel_members;
CREATE POLICY "channel_members_update_policy" ON public.channel_members
FOR UPDATE USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- Update messages policies
DROP POLICY IF EXISTS "Channel members can send messages" ON public.messages;
CREATE POLICY "Channel members can send messages" ON public.messages
FOR INSERT WITH CHECK (
  ((select auth.uid()) = sender_id) AND 
  (EXISTS (
    SELECT 1 FROM channel_members 
    WHERE channel_members.channel_id = messages.channel_id 
    AND channel_members.user_id = (select auth.uid())
  ))
);

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages" ON public.messages
FOR DELETE USING (
  ((select auth.uid()) = sender_id) OR 
  is_admin_or_manager((select auth.uid()))
);

DROP POLICY IF EXISTS "Users can view messages in channels they belong to" ON public.messages;
CREATE POLICY "Users can view messages in channels they belong to" ON public.messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM channel_members 
    WHERE channel_members.channel_id = messages.channel_id 
    AND channel_members.user_id = (select auth.uid())
  )
);

-- Update message_reactions policies
DROP POLICY IF EXISTS "Users can add reactions to messages they can see" ON public.message_reactions;
CREATE POLICY "Users can add reactions to messages they can see" ON public.message_reactions
FOR INSERT WITH CHECK (
  ((select auth.uid()) = user_id) AND 
  (EXISTS (
    SELECT 1 FROM (messages m JOIN channel_members cm ON cm.channel_id = m.channel_id) 
    WHERE m.id = message_reactions.message_id 
    AND cm.user_id = (select auth.uid())
  ))
);

DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.message_reactions;
CREATE POLICY "Users can remove their own reactions" ON public.message_reactions
FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view reactions on messages they can see" ON public.message_reactions;
CREATE POLICY "Users can view reactions on messages they can see" ON public.message_reactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM (messages m JOIN channel_members cm ON cm.channel_id = m.channel_id) 
    WHERE m.id = message_reactions.message_id 
    AND cm.user_id = (select auth.uid())
  )
);