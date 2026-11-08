-- Record the realtime publication already applied on the linked database.
-- Messages, channels, membership, and task notifications publish so the
-- floor hears new chat and task alerts without a refresh.

alter publication supabase_realtime add table public.messages; -- pragma: allowlist secret
alter publication supabase_realtime add table public.message_channels; -- pragma: allowlist secret
alter publication supabase_realtime add table public.channel_members; -- pragma: allowlist secret
alter publication supabase_realtime add table public.task_notifications; -- pragma: allowlist secret
