-- Company policies replace time_off_policies. Copied time-off rows keep their ids.

create table if not exists public.company_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type text not null check (type in ('time_off', 'availability', 'scheduling_rules')),
  unit text check (unit is null or unit in ('hours', 'days', 'minutes')),
  cap_week numeric,
  cap_month numeric,
  cap_year numeric,
  eligible_weekdays integer[] not null default '{0,1,2,3,4,5,6}',
  notice_days integer not null default 0 check (notice_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_policies_caps_nonnegative check (
    (cap_week is null or cap_week >= 0)
    and (cap_month is null or cap_month >= 0)
    and (cap_year is null or cap_year >= 0)
  ),
  constraint company_policies_weekdays_check check (
    eligible_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::integer[]
  ),
  constraint company_policies_time_off_unit_check check (
    type <> 'time_off' or unit in ('hours', 'days', 'minutes')
  )
);

create table if not exists public.company_policy_assignments (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.company_policies(id) on delete cascade,
  target_type text not null check (target_type in ('user', 'role', 'level', 'store', 'company')),
  target_id text not null,
  constraint company_policy_assignments_unique unique (policy_id, target_type, target_id)
);

create index if not exists company_policies_company_id_idx
  on public.company_policies (company_id);

create index if not exists company_policy_assignments_policy_id_idx
  on public.company_policy_assignments (policy_id);

insert into public.company_policies (
  id,
  company_id,
  name,
  type,
  unit,
  cap_week,
  cap_month,
  cap_year,
  eligible_weekdays,
  notice_days,
  created_at,
  updated_at
)
select
  id,
  company_id,
  name,
  'time_off',
  unit,
  cap_week,
  cap_month,
  cap_year,
  eligible_weekdays,
  notice_days,
  created_at,
  updated_at
from public.time_off_policies
on conflict (id) do nothing;

insert into public.company_policy_assignments (policy_id, target_type, target_id)
select distinct policy.id, 'role', role_id::text
from public.time_off_policies as policy
cross join lateral unnest(policy.applies_to_role_ids) as role_id
on conflict (policy_id, target_type, target_id) do nothing;

insert into public.company_policy_assignments (policy_id, target_type, target_id)
select distinct policy.id, 'user', user_id::text
from public.time_off_policies as policy
cross join lateral unnest(policy.applies_to_user_ids) as user_id
on conflict (policy_id, target_type, target_id) do nothing;

insert into public.company_policy_assignments (policy_id, target_type, target_id)
select policy.id, 'company', policy.company_id::text
from public.time_off_policies as policy
where coalesce(cardinality(policy.applies_to_role_ids), 0) = 0
  and coalesce(cardinality(policy.applies_to_user_ids), 0) = 0
on conflict (policy_id, target_type, target_id) do nothing;

do $$
declare
  source_count bigint;
  copied_count bigint;
begin
  select count(*) into source_count from public.time_off_policies;
  select count(*) into copied_count
  from public.company_policies as copied
  where copied.id in (select source.id from public.time_off_policies as source);
  if source_count is distinct from copied_count then
    raise exception
      'company_policies copy count % does not match time_off_policies %',
      copied_count,
      source_count;
  end if;
end $$;

alter table public.time_off_requests
  drop constraint if exists time_off_requests_policy_id_fkey;

alter table public.time_off_requests
  add constraint time_off_requests_policy_id_fkey
  foreign key (policy_id) references public.company_policies(id) on delete set null;

drop table public.time_off_policies;

alter table public.company_policies enable row level security;
alter table public.company_policy_assignments enable row level security;

grant select, insert, update, delete on table public.company_policies to authenticated;
grant select, insert, update, delete on table public.company_policy_assignments to authenticated;

drop policy if exists "Company members can read company policies" on public.company_policies;
create policy "Company members can read company policies"
on public.company_policies
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Managers can write company policies" on public.company_policies;
create policy "Managers can write company policies"
on public.company_policies
for all
to authenticated
using (public.can_manage_org_availability(company_id))
with check (public.can_manage_org_availability(company_id));

drop policy if exists "Company members can read policy assignments" on public.company_policy_assignments;
create policy "Company members can read policy assignments"
on public.company_policy_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.company_policies as policy
    where policy.id = company_policy_assignments.policy_id
      and policy.company_id in (select public.current_user_company_ids())
  )
);

drop policy if exists "Managers can write policy assignments" on public.company_policy_assignments;
create policy "Managers can write policy assignments"
on public.company_policy_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.company_policies as policy
    where policy.id = company_policy_assignments.policy_id
      and public.can_manage_org_availability(policy.company_id)
  )
)
with check (
  exists (
    select 1
    from public.company_policies as policy
    where policy.id = company_policy_assignments.policy_id
      and public.can_manage_org_availability(policy.company_id)
  )
);
