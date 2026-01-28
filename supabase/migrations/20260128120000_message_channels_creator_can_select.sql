-- Allow channel creators to SELECT the channel they created.
-- Without this, INSERT ... RETURNING fails because the SELECT policy only allows
-- users who are in channel_members, and the creator is added after the channel row exists.

DROP POLICY IF EXISTS "Users can view channels they are members of" ON public.message_channels;

CREATE POLICY "Users can view channels they are members of or created"
ON public.message_channels FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM public.channel_members cm
    WHERE cm.channel_id = message_channels.id
    AND cm.user_id = (SELECT auth.uid())
  ))
  OR ((SELECT auth.uid()) = created_by)
  OR public.is_admin_or_manager((SELECT auth.uid()))
);
