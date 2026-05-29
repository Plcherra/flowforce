-- Phase 5.07: make scheduled labor cost a tenant-scoped cost-engine input.
-- This keeps payroll/clock data as an import path, while schedule estimates
-- become reportable by shift, date, role, department, and location.

alter table public.labor_entries add column if not exists user_id uuid;
alter table public.labor_entries add column if not exists schedule_id text;
alter table public.labor_entries add column if not exists work_date date;
alter table public.labor_entries add column if not exists clock_in_at timestamptz;
alter table public.labor_entries add column if not exists clock_out_at timestamptz;
alter table public.labor_entries add column if not exists paid_minutes numeric;
alter table public.labor_entries add column if not exists unpaid_break_minutes numeric;
alter table public.labor_entries add column if not exists regular_hours numeric;
alter table public.labor_entries add column if not exists overtime_hours numeric;
alter table public.labor_entries add column if not exists hourly_rate numeric;
alter table public.labor_entries add column if not exists labor_cost numeric;
alter table public.labor_entries add column if not exists source text;
alter table public.labor_entries add column if not exists status text;
alter table public.labor_entries add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.labor_entries entry
set company_id = schedule.company_id
from public.schedules schedule
where entry.company_id is null
  and entry.schedule_id = schedule.id::text
  and schedule.company_id is not null;

update public.labor_entries entry
set company_id = profile.company_id
from public.profiles profile
where entry.company_id is null
  and entry.user_id = profile.id
  and profile.company_id is not null;

create index if not exists labor_entries_company_date_idx
on public.labor_entries (company_id, work_date);

create index if not exists labor_entries_schedule_id_idx
on public.labor_entries (schedule_id);

create index if not exists labor_entries_user_date_idx
on public.labor_entries (user_id, work_date);

create index if not exists schedules_company_start_role_idx
on public.schedules (company_id, start_time, role);

create index if not exists schedules_company_location_start_idx
on public.schedules (company_id, location, start_time);

do $$
begin
  alter table public.labor_entries
    add constraint labor_entries_paid_minutes_nonnegative
    check (paid_minutes is null or paid_minutes >= 0) not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.labor_entries
    add constraint labor_entries_break_minutes_nonnegative
    check (unpaid_break_minutes is null or unpaid_break_minutes >= 0) not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.labor_entries
    add constraint labor_entries_hours_nonnegative
    check (
      (regular_hours is null or regular_hours >= 0)
      and (overtime_hours is null or overtime_hours >= 0)
    ) not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.labor_entries
    add constraint labor_entries_costs_nonnegative
    check (
      (hourly_rate is null or hourly_rate >= 0)
      and (labor_cost is null or labor_cost >= 0)
    ) not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.schedules
    add constraint schedules_labor_inputs_nonnegative
    check (
      (break_minutes is null or break_minutes >= 0)
      and (required_headcount is null or required_headcount >= 0)
      and (hourly_rate is null or hourly_rate >= 0)
    ) not valid;
exception
  when duplicate_object then null;
end
$$;

create or replace function public.set_labor_entry_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.schedule_id is not null then
    select schedule.company_id
    into new.company_id
    from public.schedules schedule
    where schedule.id::text = new.schedule_id
    limit 1;
  end if;

  if new.company_id is null and new.user_id is not null then
    select profile.company_id
    into new.company_id
    from public.profiles profile
    where profile.id = new.user_id
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists set_labor_entry_company_id on public.labor_entries;
create trigger set_labor_entry_company_id
before insert or update on public.labor_entries
for each row execute function public.set_labor_entry_company_id();

grant select, insert, update, delete on public.labor_entries to authenticated;

alter table public.labor_entries enable row level security;

drop policy if exists "Company members can manage labor entries" on public.labor_entries;
create policy "Company members can manage labor entries"
on public.labor_entries
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    user_id is null
    or exists (
      select 1
      from public.profiles profile
      where profile.id = labor_entries.user_id
        and profile.company_id = labor_entries.company_id
    )
  )
);

create or replace view public.cost_schedule_labor_v
with (security_invoker = true)
as
with assignment_counts as (
  select
    assignment.schedule_id,
    count(*) filter (
      where coalesce(lower(assignment.status), 'assigned') not in (
        'cancelled',
        'canceled',
        'declined',
        'removed'
      )
    )::numeric as assigned_headcount
  from public.schedule_assignments assignment
  group by assignment.schedule_id
),
schedule_labor as (
  select
    schedule.id as schedule_id,
    schedule.company_id,
    schedule.start_time,
    schedule.end_time,
    schedule.start_time::date as shift_date,
    schedule.location,
    schedule.role,
    schedule.position_id,
    position.department_id,
    schedule.status,
    schedule.is_published,
    greatest(coalesce(schedule.break_minutes, 0), 0)::numeric as break_minutes,
    greatest(
      coalesce(
        nullif(schedule.required_headcount, 0),
        nullif(assignment_counts.assigned_headcount, 0),
        case when schedule.user_id is not null then 1::numeric else null::numeric end,
        1::numeric
      ),
      1::numeric
    ) as planned_headcount,
    case
      when schedule.hourly_rate is not null and schedule.hourly_rate > 0
        then schedule.hourly_rate
      when schedule.requirements->>'hourly_rate' ~ '^[0-9]+(\.[0-9]+)?$'
        then (schedule.requirements->>'hourly_rate')::numeric
      when schedule.requirements->>'estimated_hourly_rate' ~ '^[0-9]+(\.[0-9]+)?$'
        then (schedule.requirements->>'estimated_hourly_rate')::numeric
      when schedule.requirements->>'labor_rate' ~ '^[0-9]+(\.[0-9]+)?$'
        then (schedule.requirements->>'labor_rate')::numeric
      when schedule.requirements->>'estimated_labor_rate' ~ '^[0-9]+(\.[0-9]+)?$'
        then (schedule.requirements->>'estimated_labor_rate')::numeric
      when schedule.requirements->>'pay_rate' ~ '^[0-9]+(\.[0-9]+)?$'
        then (schedule.requirements->>'pay_rate')::numeric
      else null::numeric
    end as hourly_rate_estimate,
    case
      when schedule.hourly_rate is not null and schedule.hourly_rate > 0
        then 'schedule'
      when schedule.requirements->>'hourly_rate' ~ '^[0-9]+(\.[0-9]+)?$'
        or schedule.requirements->>'estimated_hourly_rate' ~ '^[0-9]+(\.[0-9]+)?$'
        or schedule.requirements->>'labor_rate' ~ '^[0-9]+(\.[0-9]+)?$'
        or schedule.requirements->>'estimated_labor_rate' ~ '^[0-9]+(\.[0-9]+)?$'
        or schedule.requirements->>'pay_rate' ~ '^[0-9]+(\.[0-9]+)?$'
        then 'requirements'
      else 'missing'
    end as hourly_rate_source
  from public.schedules schedule
  left join assignment_counts on assignment_counts.schedule_id = schedule.id::text
  left join public.positions position
    on position.id::text = schedule.position_id
    and position.company_id = schedule.company_id
  where schedule.company_id is not null
)
select
  schedule_labor.schedule_id,
  schedule_labor.company_id,
  schedule_labor.start_time,
  schedule_labor.end_time,
  schedule_labor.shift_date,
  schedule_labor.location,
  schedule_labor.role,
  schedule_labor.position_id,
  schedule_labor.department_id,
  schedule_labor.status,
  schedule_labor.is_published,
  schedule_labor.break_minutes,
  schedule_labor.planned_headcount,
  schedule_labor.hourly_rate_estimate,
  schedule_labor.hourly_rate_source,
  greatest(
    extract(epoch from (schedule_labor.end_time - schedule_labor.start_time)) / 3600,
    0
  )::numeric as gross_shift_hours,
  greatest(
    (
      extract(epoch from (schedule_labor.end_time - schedule_labor.start_time)) / 3600
    ) - (schedule_labor.break_minutes / 60),
    0
  )::numeric as net_shift_hours,
  (
    greatest(
      (
        extract(epoch from (schedule_labor.end_time - schedule_labor.start_time)) / 3600
      ) - (schedule_labor.break_minutes / 60),
      0
    ) * schedule_labor.planned_headcount
  )::numeric as planned_labor_hours,
  case
    when schedule_labor.hourly_rate_estimate is null then null::numeric
    else (
      greatest(
        (
          extract(epoch from (schedule_labor.end_time - schedule_labor.start_time)) / 3600
        ) - (schedule_labor.break_minutes / 60),
        0
      ) * schedule_labor.planned_headcount * schedule_labor.hourly_rate_estimate
    )::numeric
  end as planned_labor_cost,
  case
    when schedule_labor.start_time is null or schedule_labor.end_time is null
      then 'missing_time'
    when schedule_labor.hourly_rate_estimate is null
      then 'missing_rate'
    else 'complete'
  end as cost_basis_status
from schedule_labor;

grant select on public.cost_schedule_labor_v to authenticated;

create or replace view public.cost_schedule_labor_breakdown_v
with (security_invoker = true)
as
select
  company_id,
  shift_date,
  location,
  role,
  position_id,
  department_id,
  count(*)::integer as scheduled_shifts,
  sum(planned_headcount)::numeric as planned_headcount,
  sum(net_shift_hours)::numeric as net_shift_hours,
  sum(planned_labor_hours)::numeric as planned_labor_hours,
  sum(coalesce(planned_labor_cost, 0))::numeric as planned_labor_cost,
  count(*) filter (where cost_basis_status <> 'complete')::integer as missing_cost_basis_shifts
from public.cost_schedule_labor_v
group by company_id, shift_date, location, role, position_id, department_id;

grant select on public.cost_schedule_labor_breakdown_v to authenticated;

create or replace function public.get_schedule_labor_cost(
  p_company_id uuid default null,
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  schedule_id uuid,
  company_id uuid,
  start_time timestamptz,
  end_time timestamptz,
  shift_date date,
  location text,
  role text,
  position_id text,
  department_id uuid,
  status text,
  is_published boolean,
  planned_headcount numeric,
  net_shift_hours numeric,
  planned_labor_hours numeric,
  hourly_rate_estimate numeric,
  hourly_rate_source text,
  planned_labor_cost numeric,
  cost_basis_status text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    labor.schedule_id,
    labor.company_id,
    labor.start_time,
    labor.end_time,
    labor.shift_date,
    labor.location,
    labor.role,
    labor.position_id,
    labor.department_id,
    labor.status,
    labor.is_published,
    labor.planned_headcount,
    labor.net_shift_hours,
    labor.planned_labor_hours,
    labor.hourly_rate_estimate,
    labor.hourly_rate_source,
    labor.planned_labor_cost,
    labor.cost_basis_status
  from public.cost_schedule_labor_v labor
  where labor.company_id in (select public.current_user_company_ids())
    and (p_company_id is null or labor.company_id = p_company_id)
    and (p_start_date is null or labor.shift_date >= p_start_date)
    and (p_end_date is null or labor.shift_date <= p_end_date)
  order by labor.start_time;
$$;

grant execute on function public.get_schedule_labor_cost(uuid, date, date) to authenticated;

notify pgrst, 'reload schema';
