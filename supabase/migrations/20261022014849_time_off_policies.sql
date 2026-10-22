-- One time-off policy can carry week, month, and year caps, eligible weekdays, notice, and who it applies to.

create table if not exists public.time_off_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  unit text not null check (unit in ('hours', 'days', 'minutes')),
  cap_week numeric,
  cap_month numeric,
  cap_year numeric,
  eligible_weekdays integer[] not null default '{0,1,2,3,4,5,6}',
  notice_days integer not null default 0 check (notice_days >= 0),
  applies_to_role_ids uuid[] not null default '{}',
  applies_to_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_off_policies_caps_nonnegative check (
    (cap_week is null or cap_week >= 0)
    and (cap_month is null or cap_month >= 0)
    and (cap_year is null or cap_year >= 0)
  )
);

create index if not exists time_off_policies_company_id_idx
  on public.time_off_policies (company_id);

alter table public.time_off_requests
  add column if not exists policy_id uuid references public.time_off_policies(id) on delete set null;

create index if not exists time_off_requests_policy_id_idx
  on public.time_off_requests (policy_id);

alter table public.time_off_policies enable row level security;

grant select, insert, update, delete on table public.time_off_policies to authenticated;

drop policy if exists "Company members can read time off policies" on public.time_off_policies;
create policy "Company members can read time off policies"
on public.time_off_policies
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Managers can write time off policies" on public.time_off_policies;
create policy "Managers can write time off policies"
on public.time_off_policies
for all
to authenticated
using (public.can_manage_org_availability(company_id))
with check (public.can_manage_org_availability(company_id));
