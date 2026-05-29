-- Phase 06.09: analytics for execution quality.
-- Workflow execution history becomes measurable across completion, overdue,
-- exception, repeat-failure, department, role, training, and coaching signals.

create extension if not exists pgcrypto with schema extensions;

create or replace view public.operations_execution_quality_daily_v
with (security_invoker = true)
as
with exception_stats as (
  select
    exception.company_id,
    exception.workflow_instance_id,
    count(exception.id)::integer as exception_count,
    count(exception.id) filter (where exception.severity = 'critical')::integer as critical_exception_count,
    count(exception.id) filter (
      where exception.step_id is not null
        and exists (
          select 1
          from public.workflow_exceptions prior_exception
          where prior_exception.company_id = exception.company_id
            and prior_exception.step_id = exception.step_id
            and prior_exception.id <> exception.id
            and prior_exception.created_at < exception.created_at
            and prior_exception.created_at >= exception.created_at - interval '30 days'
        )
    )::integer as repeat_failure_count
  from public.workflow_exceptions exception
  group by exception.company_id, exception.workflow_instance_id
),
step_stats as (
  select
    step_run.company_id,
    step_run.workflow_instance_id::uuid as workflow_instance_id,
    count(step_run.id) filter (where step_run.status = 'failed')::integer as failed_step_count,
    count(step_run.id) filter (where step_run.status = 'completed')::integer as completed_step_count,
    count(step_run.id)::integer as total_step_count
  from public.workflow_step_instances step_run
  where step_run.workflow_instance_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  group by step_run.company_id, step_run.workflow_instance_id::uuid
),
run_quality as (
  select
    run.company_id,
    coalesce(run.completed_at::date, run.due_at::date, run.created_at::date) as metric_date,
    run.id as workflow_instance_id,
    workflow.id as workflow_id,
    workflow.name as workflow_name,
    workflow.workflow_kind,
    workflow.template_category,
    run.location_id,
    profile.department_id,
    coalesce(run.assigned_role, profile.role, 'unassigned') as assigned_role,
    run.assigned_to,
    run.status,
    run.review_status,
    run.due_at,
    coalesce(exception_stats.exception_count, 0) as exception_count,
    coalesce(exception_stats.critical_exception_count, 0) as critical_exception_count,
    coalesce(exception_stats.repeat_failure_count, 0) as repeat_failure_count,
    coalesce(step_stats.failed_step_count, 0) as failed_step_count,
    coalesce(step_stats.completed_step_count, 0) as completed_step_count,
    coalesce(step_stats.total_step_count, 0) as total_step_count
  from public.task_workflow_instances run
  left join public.workflows workflow
    on workflow.company_id = run.company_id
    and workflow.id::text = run.workflow_id
  left join public.profiles profile
    on profile.id = run.assigned_to
    and profile.company_id = run.company_id
  left join exception_stats
    on exception_stats.company_id = run.company_id
    and exception_stats.workflow_instance_id = run.id
  left join step_stats
    on step_stats.company_id = run.company_id
    and step_stats.workflow_instance_id = run.id
  where run.company_id in (select public.current_user_company_ids())
)
select
  company_id,
  metric_date,
  location_id,
  department_id,
  assigned_role,
  workflow_kind,
  template_category,
  count(workflow_instance_id)::integer as total_runs,
  count(workflow_instance_id) filter (where status = 'completed')::integer as completed_runs,
  count(workflow_instance_id) filter (
    where coalesce(status, 'scheduled') <> 'completed'
      and due_at is not null
      and due_at < now()
  )::integer as overdue_runs,
  count(workflow_instance_id) filter (where review_status = 'pending')::integer as pending_review_runs,
  count(workflow_instance_id) filter (where exception_count > 0)::integer as exception_runs,
  count(workflow_instance_id) filter (where critical_exception_count > 0)::integer as critical_exception_runs,
  count(workflow_instance_id) filter (where repeat_failure_count > 0)::integer as repeat_failure_runs,
  sum(failed_step_count)::integer as failed_steps,
  sum(completed_step_count)::integer as completed_steps,
  sum(total_step_count)::integer as total_steps,
  round(
    100 * count(workflow_instance_id) filter (where status = 'completed')::numeric
      / nullif(count(workflow_instance_id), 0),
    1
  ) as completion_rate,
  round(
    100 * count(workflow_instance_id) filter (
      where coalesce(status, 'scheduled') <> 'completed'
        and due_at is not null
        and due_at < now()
    )::numeric / nullif(count(workflow_instance_id), 0),
    1
  ) as overdue_rate,
  round(
    100 * count(workflow_instance_id) filter (where exception_count > 0)::numeric
      / nullif(count(workflow_instance_id), 0),
    1
  ) as exception_rate,
  greatest(
    0,
    100
      - count(workflow_instance_id) filter (
          where coalesce(status, 'scheduled') <> 'completed'
            and due_at is not null
            and due_at < now()
        ) * 12
      - count(workflow_instance_id) filter (where exception_count > 0) * 10
      - count(workflow_instance_id) filter (where critical_exception_count > 0) * 8
      - count(workflow_instance_id) filter (where repeat_failure_count > 0) * 7
      - count(workflow_instance_id) filter (where review_status = 'pending') * 3
  )::integer as execution_quality_score
from run_quality
group by
  company_id,
  metric_date,
  location_id,
  department_id,
  assigned_role,
  workflow_kind,
  template_category;

grant select on public.operations_execution_quality_daily_v to authenticated;

create or replace view public.operations_execution_quality_summary_v
with (security_invoker = true)
as
select
  company_id,
  coalesce(sum(total_runs), 0)::integer as total_runs,
  coalesce(sum(completed_runs), 0)::integer as completed_runs,
  coalesce(sum(overdue_runs), 0)::integer as overdue_runs,
  coalesce(sum(pending_review_runs), 0)::integer as pending_review_runs,
  coalesce(sum(exception_runs), 0)::integer as exception_runs,
  coalesce(sum(critical_exception_runs), 0)::integer as critical_exception_runs,
  coalesce(sum(repeat_failure_runs), 0)::integer as repeat_failure_runs,
  coalesce(sum(failed_steps), 0)::integer as failed_steps,
  round(100 * sum(completed_runs)::numeric / nullif(sum(total_runs), 0), 1) as completion_rate,
  round(100 * sum(overdue_runs)::numeric / nullif(sum(total_runs), 0), 1) as overdue_rate,
  round(100 * sum(exception_runs)::numeric / nullif(sum(total_runs), 0), 1) as exception_rate,
  round(avg(execution_quality_score))::integer as execution_quality_score
from public.operations_execution_quality_daily_v
where metric_date >= current_date - 30
group by company_id;

grant select on public.operations_execution_quality_summary_v to authenticated;

create or replace view public.operations_execution_quality_coaching_v
with (security_invoker = true)
as
with training_stats as (
  select
    company_id,
    employee_id,
    count(id) filter (where coalesce(status, 'assigned') <> 'completed')::integer as open_training_assignments
  from public.training_assignments
  where company_id in (select public.current_user_company_ids())
    and employee_id is not null
  group by company_id, employee_id
),
person_quality as (
  select
    run.company_id,
    run.assigned_to as user_id,
    profile.first_name,
    profile.last_name,
    profile.email,
    profile.department_id,
    coalesce(run.assigned_role, profile.role, 'unassigned') as role_name,
    count(distinct run.id)::integer as total_runs,
    count(distinct run.id) filter (where run.status = 'completed')::integer as completed_runs,
    count(distinct run.id) filter (
      where coalesce(run.status, 'scheduled') <> 'completed'
        and run.due_at is not null
        and run.due_at < now()
    )::integer as overdue_runs,
    count(distinct exception.workflow_instance_id) filter (where exception.id is not null)::integer as exception_runs,
    count(distinct exception.workflow_instance_id) filter (
      where exception.step_id is not null
        and exists (
          select 1
          from public.workflow_exceptions prior_exception
          where prior_exception.company_id = exception.company_id
            and prior_exception.step_id = exception.step_id
            and prior_exception.id <> exception.id
            and prior_exception.created_at < exception.created_at
            and prior_exception.created_at >= exception.created_at - interval '30 days'
        )
    )::integer as repeat_failure_runs,
    count(distinct step_run.id) filter (where step_run.status = 'failed')::integer as failed_steps,
    coalesce(training_stats.open_training_assignments, 0) as open_training_assignments
  from public.task_workflow_instances run
  left join public.profiles profile
    on profile.id = run.assigned_to
    and profile.company_id = run.company_id
  left join public.workflow_exceptions exception
    on exception.company_id = run.company_id
    and exception.workflow_instance_id = run.id
  left join public.workflow_step_instances step_run
    on step_run.company_id = run.company_id
    and step_run.workflow_instance_id = run.id::text
  left join training_stats
    on training_stats.company_id = run.company_id
    and training_stats.employee_id = run.assigned_to
  where run.company_id in (select public.current_user_company_ids())
    and run.assigned_to is not null
    and coalesce(run.completed_at::date, run.due_at::date, run.created_at::date) >= current_date - 30
  group by
    run.company_id,
    run.assigned_to,
    profile.first_name,
    profile.last_name,
    profile.email,
    profile.department_id,
    coalesce(run.assigned_role, profile.role, 'unassigned'),
    coalesce(training_stats.open_training_assignments, 0)
)
select
  company_id,
  user_id,
  nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '') as employee_name,
  email,
  department_id,
  role_name,
  total_runs,
  completed_runs,
  overdue_runs,
  exception_runs,
  repeat_failure_runs,
  failed_steps,
  open_training_assignments,
  round(100 * completed_runs::numeric / nullif(total_runs, 0), 1) as completion_rate,
  round(100 * overdue_runs::numeric / nullif(total_runs, 0), 1) as overdue_rate,
  round(100 * exception_runs::numeric / nullif(total_runs, 0), 1) as exception_rate,
  greatest(
    0,
    100
      - overdue_runs * 12
      - exception_runs * 10
      - repeat_failure_runs * 7
      - failed_steps * 2
  )::integer as execution_quality_score,
  case
    when repeat_failure_runs > 0 then 'repeat_failure'
    when exception_runs > 0 then 'exception_rate'
    when overdue_runs > 0 then 'overdue'
    when open_training_assignments > 0 then 'training_followup'
    else 'recognition'
  end as coaching_signal,
  case
    when repeat_failure_runs > 0 then 'Review repeated failed steps and assign targeted retraining.'
    when exception_runs > 0 then 'Coach on exception prevention and evidence quality.'
    when overdue_runs > 0 then 'Review workload timing and due-window expectations.'
    when open_training_assignments > 0 then 'Close open training assignments tied to workflow execution.'
    else 'Recognize consistent execution quality.'
  end as coaching_recommendation,
  case
    when repeat_failure_runs > 0 or exception_runs >= 2 or overdue_runs >= 2 then 'high'
    when exception_runs > 0 or overdue_runs > 0 or open_training_assignments > 0 then 'medium'
    else 'low'
  end as coaching_priority,
  jsonb_build_object(
    'performance_signal', case
      when repeat_failure_runs > 0 or exception_runs > 0 or overdue_runs > 0 then 'needs_coaching'
      else 'positive_trend'
    end,
    'training_signal', case
      when repeat_failure_runs > 0 or failed_steps > 0 then 'recommended'
      when open_training_assignments > 0 then 'pending'
      else 'none'
    end
  ) as performance_training_context
from person_quality
where total_runs > 0;

grant select on public.operations_execution_quality_coaching_v to authenticated;

notify pgrst, 'reload schema';
