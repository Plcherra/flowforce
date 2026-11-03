-- Run history for Operations Hub automations.
-- Authenticated members can read their company's rows.
-- Writes go through the service role. The suggestion guard stops the
-- browser from marking a script active or replacing it after insert.

create table if not exists public.ops_automation_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  suggestion_id uuid not null references public.ops_automation_suggestions (id) on delete cascade,
  actor_id uuid not null,
  status text not null,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ops_automation_runs_status_known
    check (status in ('running', 'succeeded', 'failed', 'rejected'))
);

create index if not exists ops_automation_runs_company_id_idx
  on public.ops_automation_runs (company_id, created_at desc);

create index if not exists ops_automation_runs_suggestion_id_idx
  on public.ops_automation_runs (suggestion_id, created_at desc);

create table if not exists public.ops_automation_run_steps (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  run_id uuid not null references public.ops_automation_runs (id) on delete cascade,
  step_key text not null,
  step_type text not null,
  status text not null,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists ops_automation_run_steps_run_id_idx
  on public.ops_automation_run_steps (run_id, created_at);

alter table public.ops_automation_runs enable row level security;
alter table public.ops_automation_run_steps enable row level security;

revoke all on public.ops_automation_runs from public, anon, authenticated;
revoke all on public.ops_automation_run_steps from public, anon, authenticated;
grant select on public.ops_automation_runs to authenticated;
grant select on public.ops_automation_run_steps to authenticated;
grant all on public.ops_automation_runs to service_role;
grant all on public.ops_automation_run_steps to service_role;

drop policy if exists "Company members can read automation runs" on public.ops_automation_runs;
create policy "Company members can read automation runs"
  on public.ops_automation_runs
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can read automation run steps" on public.ops_automation_run_steps;
create policy "Company members can read automation run steps"
  on public.ops_automation_run_steps
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));

create or replace function public.guard_ops_automation_suggestion_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if jwt_role = '' or jwt_role = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is null then
      new.status := 'pending';
    end if;
    if new.status not in ('pending', 'proposed') then
      raise exception 'automation suggestions must start pending';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status or new.script is distinct from old.script then
    raise exception 'automation status and script are server-owned';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_ops_automation_suggestion_write() from public, anon, authenticated;

drop trigger if exists guard_ops_automation_suggestion_write on public.ops_automation_suggestions;
create trigger guard_ops_automation_suggestion_write
  before insert or update on public.ops_automation_suggestions
  for each row
  execute function public.guard_ops_automation_suggestion_write();
