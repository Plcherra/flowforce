-- Phase 8 follow-up: align system_logs with the server logger contract so
-- onboarding/API failures persist useful diagnostics instead of schema errors.

alter table public.system_logs
  add column if not exists level text,
  add column if not exists message text,
  add column if not exists location text,
  add column if not exists request_id text,
  add column if not exists org_id uuid,
  add column if not exists user_id uuid,
  add column if not exists context jsonb not null default '{}'::jsonb,
  add column if not exists stack text,
  add column if not exists tags text[] not null default '{}'::text[];

create index if not exists system_logs_level_created_at_idx
on public.system_logs (level, created_at desc);

create index if not exists system_logs_user_id_created_at_idx
on public.system_logs (user_id, created_at desc);

create index if not exists system_logs_org_id_created_at_idx
on public.system_logs (org_id, created_at desc);
