-- Phase 06.03: recurring operations calendar and workload generation.
-- Active workflow assignments can now produce tenant-scoped daily runs
-- idempotently for a requested date range.

create extension if not exists pgcrypto with schema extensions;

alter table public.task_workflow_instances add column if not exists assignment_id uuid;
alter table public.task_workflow_instances add column if not exists scheduled_for date;
alter table public.task_workflow_instances add column if not exists starts_at timestamptz;
alter table public.task_workflow_instances add column if not exists escalation_at timestamptz;

create index if not exists task_workflow_instances_assignment_id_idx
on public.task_workflow_instances (assignment_id);

create index if not exists task_workflow_instances_scheduled_for_idx
on public.task_workflow_instances (company_id, scheduled_for);

create unique index if not exists task_workflow_instances_recurring_assignment_day_key
on public.task_workflow_instances (company_id, assignment_id, scheduled_for)
where source_type = 'recurring_assignment'
  and assignment_id is not null
  and scheduled_for is not null;

do $$
begin
  alter table public.task_workflow_instances
    add constraint task_workflow_instances_assignment_id_fkey
    foreign key (assignment_id) references public.workflow_assignments(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

create or replace function public.workflow_calendar_due_at(
  p_scheduled_for date,
  p_due_window jsonb
)
returns timestamptz
language sql
stable
as $$
  select (
    p_scheduled_for::timestamp
    + coalesce(nullif(p_due_window ->> 'due_time', '')::time, time '17:00')
  ) at time zone coalesce(nullif(p_due_window ->> 'timezone', ''), 'UTC')
$$;

create or replace function public.workflow_calendar_starts_at(
  p_due_at timestamptz,
  p_due_window jsonb
)
returns timestamptz
language sql
stable
as $$
  select p_due_at - make_interval(
    mins => greatest(coalesce((p_due_window ->> 'start_minutes_before_due')::integer, 60), 0)
  )
$$;

create or replace function public.workflow_calendar_escalation_at(
  p_due_at timestamptz,
  p_escalation_rule jsonb
)
returns timestamptz
language sql
stable
as $$
  select p_due_at + make_interval(
    mins => greatest(coalesce((p_escalation_rule ->> 'overdue_minutes')::integer, 15), 0)
  )
$$;

create or replace function public.generate_recurring_workflow_runs(
  p_company_id uuid,
  p_start_date date default current_date,
  p_end_date date default current_date + 6
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  run_count integer := 0;
  step_run_count integer := 0;
  checked_count integer := 0;
begin
  if p_company_id is null then
    raise exception 'Company scope is required for recurring workflow generation'
      using errcode = '22023';
  end if;

  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to generate workflow runs for this company'
      using errcode = '42501';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'A valid schedule date range is required'
      using errcode = '22023';
  end if;

  if p_end_date - p_start_date > 31 then
    raise exception 'Recurring workflow generation is limited to 32 days'
      using errcode = '22023';
  end if;

  with day_range as (
    select generate_series(p_start_date, p_end_date, interval '1 day')::date as scheduled_for
  ),
  eligible_assignments as (
    select
      assignment.*,
      workflow.review_required
    from public.workflow_assignments assignment
    join public.workflows workflow
      on workflow.id = assignment.workflow_id
      and workflow.company_id = assignment.company_id
    where assignment.company_id = p_company_id
      and assignment.is_active = true
      and workflow.status = 'active'
  ),
  eligible_days as (
    select
      assignment.id as assignment_id,
      assignment.company_id,
      assignment.workflow_id,
      assignment.assignment_type,
      assignment.location_id,
      assignment.role_id,
      assignment.assigned_to,
      assignment.schedule_rule,
      assignment.due_window,
      assignment.escalation_rule,
      assignment.review_required,
      day_range.scheduled_for,
      public.workflow_calendar_due_at(day_range.scheduled_for, assignment.due_window) as due_at
    from eligible_assignments assignment
    cross join day_range
    where coalesce(assignment.schedule_rule ->> 'frequency', 'daily') = 'daily'
      or (
        coalesce(assignment.schedule_rule ->> 'frequency', 'daily') = 'weekly'
        and exists (
          select 1
          from jsonb_array_elements_text(coalesce(assignment.schedule_rule -> 'days_of_week', '[]'::jsonb)) day_value
          where day_value::integer = extract(isodow from day_range.scheduled_for)::integer
        )
      )
  ),
  inserted_runs as (
    insert into public.task_workflow_instances (
      company_id,
      workflow_id,
      assignment_id,
      assigned_to,
      assigned_role,
      location_id,
      status,
      due_at,
      starts_at,
      escalation_at,
      review_status,
      source_type,
      source_id,
      scheduled_for,
      metadata
    )
    select
      eligible.company_id,
      eligible.workflow_id::text,
      eligible.assignment_id,
      eligible.assigned_to,
      case
        when eligible.assignment_type = 'role' and eligible.role_id is not null
          then eligible.role_id::text
        else null
      end,
      eligible.location_id,
      'scheduled',
      eligible.due_at,
      public.workflow_calendar_starts_at(eligible.due_at, eligible.due_window),
      public.workflow_calendar_escalation_at(eligible.due_at, eligible.escalation_rule),
      case when eligible.review_required then 'pending' else 'not_required' end,
      'recurring_assignment',
      eligible.assignment_id,
      eligible.scheduled_for,
      jsonb_build_object(
        'schedule_rule', eligible.schedule_rule,
        'due_window', eligible.due_window,
        'escalation_rule', eligible.escalation_rule
      )
    from eligible_days eligible
    on conflict (company_id, assignment_id, scheduled_for)
      where source_type = 'recurring_assignment'
        and assignment_id is not null
        and scheduled_for is not null
    do nothing
    returning id
  )
  select count(*)::integer into run_count from inserted_runs;

  with relevant_runs as (
    select run.*
    from public.task_workflow_instances run
    where run.company_id = p_company_id
      and run.source_type = 'recurring_assignment'
      and run.scheduled_for between p_start_date and p_end_date
  ),
  inserted_step_runs as (
    insert into public.workflow_step_instances (
      company_id,
      workflow_instance_id,
      step_id,
      status,
      evidence_status
    )
    select
      run.company_id,
      run.id::text,
      step.id::text,
      'pending',
      case when step.evidence_required then 'missing' else 'not_required' end
    from relevant_runs run
    join public.workflow_steps step
      on step.company_id = run.company_id
      and step.workflow_id = run.workflow_id
    where not exists (
      select 1
      from public.workflow_step_instances existing
      where existing.company_id = run.company_id
        and existing.workflow_instance_id = run.id::text
        and existing.step_id = step.id::text
    )
    returning id
  )
  select count(*)::integer into step_run_count from inserted_step_runs;

  select count(*)::integer
  into checked_count
  from public.workflow_assignments assignment
  join public.workflows workflow
    on workflow.id = assignment.workflow_id
    and workflow.company_id = assignment.company_id
  where assignment.company_id = p_company_id
    and assignment.is_active = true
    and workflow.status = 'active';

  return jsonb_build_object(
    'assignments_checked', checked_count,
    'runs_created', run_count,
    'step_runs_created', step_run_count,
    'start_date', p_start_date,
    'end_date', p_end_date
  );
end;
$$;

grant execute on function public.generate_recurring_workflow_runs(uuid, date, date) to authenticated;

create or replace view public.operations_daily_workload_v as
select
  run.company_id,
  run.scheduled_for as workload_date,
  count(*)::integer as total_runs,
  count(*) filter (where run.status = 'scheduled')::integer as scheduled_runs,
  count(*) filter (where run.status in ('in_progress', 'started'))::integer as active_runs,
  count(*) filter (where run.status = 'completed')::integer as completed_runs,
  count(*) filter (where run.due_at < now() and run.status not in ('completed', 'cancelled'))::integer as overdue_runs,
  count(*) filter (where run.review_status = 'pending')::integer as pending_review_runs,
  min(run.starts_at) as first_start_at,
  max(run.due_at) as last_due_at
from public.task_workflow_instances run
where run.source_type = 'recurring_assignment'
  and run.scheduled_for is not null
group by run.company_id, run.scheduled_for;

grant select on public.operations_daily_workload_v to authenticated;
