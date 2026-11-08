-- Applied to production as version 20261108151539.
-- Recorded here so the repo matches that history. Do not apply it again.

alter publication supabase_realtime add table public.messages; -- pragma: allowlist secret
alter publication supabase_realtime add table public.message_channels; -- pragma: allowlist secret
alter publication supabase_realtime add table public.channel_members; -- pragma: allowlist secret
alter publication supabase_realtime add table public.task_notifications; -- pragma: allowlist secret
