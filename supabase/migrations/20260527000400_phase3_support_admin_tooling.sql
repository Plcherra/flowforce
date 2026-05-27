-- Phase 03.08: support and admin tooling contract.
-- Adds an audited support-run ledger for service-protected diagnostics/repairs.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.support_tool_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  request_id text not null,
  tool text not null,
  action text not null,
  status text not null default 'started',
  dry_run boolean not null default true,
  actor_label text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tool_runs_status_check
    check (status in ('started', 'succeeded', 'failed', 'blocked')),
  constraint support_tool_runs_action_check
    check (action in ('tenant_diagnostics', 'repair_onboarding_baseline'))
);

create index if not exists support_tool_runs_company_id_idx
on public.support_tool_runs (company_id);

create index if not exists support_tool_runs_request_id_idx
on public.support_tool_runs (request_id);

create index if not exists support_tool_runs_status_idx
on public.support_tool_runs (company_id, status);

drop trigger if exists set_support_tool_runs_updated_at on public.support_tool_runs;
create trigger set_support_tool_runs_updated_at
before update on public.support_tool_runs
for each row execute function public.set_updated_at();

grant select on public.support_tool_runs to authenticated;

alter table public.support_tool_runs enable row level security;

drop policy if exists "Company admins can read support tool runs" on public.support_tool_runs;
create policy "Company admins can read support tool runs"
on public.support_tool_runs
for select
to authenticated
using (company_id is not null and public.current_user_is_company_admin(company_id));
