-- Centralized logging table for server/client telemetry
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('debug', 'info', 'warn', 'error')),
  message text not null,
  location text,
  request_id text,
  org_id uuid,
  user_id uuid,
  context jsonb not null default '{}'::jsonb,
  stack text,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

alter table public.system_logs enable row level security;

drop policy if exists "Admins can view system logs" on public.system_logs;
create policy "Admins can view system logs" on public.system_logs
  for select using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'owner')
    )
  );

create index if not exists idx_system_logs_created_at on public.system_logs(created_at);
create index if not exists idx_system_logs_level on public.system_logs(level);
create index if not exists idx_system_logs_org_id on public.system_logs(org_id);
create index if not exists idx_system_logs_request_id on public.system_logs(request_id);
