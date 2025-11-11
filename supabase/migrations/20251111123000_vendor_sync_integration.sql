-- Extend vendor visits to support external vendor sync webhooks
alter table if exists public.vendor_visits
  add column if not exists integration_webhook text,
  add column if not exists sync_status text not null default 'pending'
    check (sync_status in ('pending','sent','failed'));

-- Capture sync attempts for observability and retries
create table if not exists public.vendor_sync_logs (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.vendor_visits(id) on delete cascade,
  integration_type text,
  integration_webhook text,
  payload jsonb,
  response_status int,
  response_body text,
  status text not null default 'pending' check (status in ('pending','success','failed')),
  error_message text,
  demo_mode boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists vendor_sync_logs_visit_id_idx on public.vendor_sync_logs (visit_id);

alter table public.vendor_sync_logs enable row level security;

create policy if not exists "vendor_sync_logs_service_role_manage" on public.vendor_sync_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
