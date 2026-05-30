-- Phase 07.02: tenant-scoped AI context summaries.

create or replace view public.ai_context_module_summaries_v
with (security_invoker = true)
as
with scoped_companies as (
  select
    company.id as company_id,
    coalesce(company.updated_at, company.created_at, now()) as company_freshness_at
  from public.companies company
  where company.id in (select public.current_user_company_ids())
    and company.deleted_at is null
)
select
  company.company_id,
  'scheduling'::text as module_key,
  jsonb_build_object(
    'scheduled_shifts', coalesce(summary.scheduled_shifts, 0),
    'published_shifts', coalesce(summary.published_shifts, 0),
    'unpublished_shifts', coalesce(summary.unpublished_shifts, 0),
    'unassigned_shifts', coalesce(summary.unassigned_shifts, 0),
    'required_headcount', coalesce(summary.required_headcount, 0),
    'location_count', coalesce(summary.location_count, 0),
    'role_count', coalesce(summary.role_count, 0),
    'earliest_start_at', summary.earliest_start_at,
    'latest_end_at', summary.latest_end_at
  ) as summary,
  coalesce(summary.freshness_at, company.company_freshness_at) as freshness_at,
  jsonb_build_object(
    'raw_pii', 'blocked',
    'cross_tenant_data', 'blocked',
    'free_text', 'aggregated_or_excluded',
    'employee_identifiers', 'counted_only',
    'financial_values', 'aggregated'
  ) as redaction,
  array['companies', 'schedules']::text[] as source_tables
from scoped_companies company
left join lateral (
  select
    count(*)::integer as scheduled_shifts,
    count(*) filter (where coalesce(schedule.is_published, false))::integer as published_shifts,
    count(*) filter (where not coalesce(schedule.is_published, false))::integer as unpublished_shifts,
    count(*) filter (where schedule.user_id is null)::integer as unassigned_shifts,
    coalesce(sum(schedule.required_headcount), 0)::numeric as required_headcount,
    count(distinct nullif(schedule.location, ''))::integer as location_count,
    count(distinct nullif(schedule.role, ''))::integer as role_count,
    min(schedule.start_time) as earliest_start_at,
    max(schedule.end_time) as latest_end_at,
    max(coalesce(schedule.updated_at, schedule.created_at)) as freshness_at
  from public.schedules schedule
  where schedule.company_id = company.company_id
    and schedule.deleted_at is null
    and coalesce(schedule.lifecycle_status, 'active') <> 'deleted'
) summary on true
union all
select
  company.company_id,
  'inventory'::text as module_key,
  jsonb_build_object(
    'total_items', coalesce(summary.total_items, 0),
    'active_items', coalesce(summary.active_items, 0),
    'inactive_items', coalesce(summary.inactive_items, 0),
    'items_with_minimums', coalesce(summary.items_with_minimums, 0),
    'items_with_maximums', coalesce(summary.items_with_maximums, 0),
    'prep_items', coalesce(summary.prep_items, 0),
    'items_with_cost', coalesce(summary.items_with_cost, 0),
    'average_unit_cost', coalesce(summary.average_unit_cost, 0)
  ) as summary,
  coalesce(summary.freshness_at, company.company_freshness_at) as freshness_at,
  jsonb_build_object(
    'raw_pii', 'blocked',
    'cross_tenant_data', 'blocked',
    'free_text', 'excluded',
    'item_names', 'excluded',
    'financial_values', 'aggregated'
  ) as redaction,
  array['companies', 'inv_items']::text[] as source_tables
from scoped_companies company
left join lateral (
  select
    count(*)::integer as total_items,
    count(*) filter (where coalesce(item.is_active, true))::integer as active_items,
    count(*) filter (where not coalesce(item.is_active, true))::integer as inactive_items,
    count(*) filter (where item.min_stock_level is not null)::integer as items_with_minimums,
    count(*) filter (where item.max_stock_level is not null)::integer as items_with_maximums,
    count(*) filter (where coalesce(item.is_prep_item, false))::integer as prep_items,
    count(*) filter (where item.cost_per_unit is not null)::integer as items_with_cost,
    coalesce(round(avg(item.cost_per_unit), 2), 0)::numeric as average_unit_cost,
    max(coalesce(item.updated_at, item.created_at)) as freshness_at
  from public.inv_items item
  where item.company_id = company.company_id
    and item.deleted_at is null
    and coalesce(item.lifecycle_status, 'active') <> 'deleted'
) summary on true
union all
select
  company.company_id,
  'tasks'::text as module_key,
  jsonb_build_object(
    'total_tasks', coalesce(summary.total_tasks, 0),
    'open_tasks', coalesce(summary.open_tasks, 0),
    'completed_tasks', coalesce(summary.completed_tasks, 0),
    'overdue_tasks', coalesce(summary.overdue_tasks, 0),
    'high_priority_tasks', coalesce(summary.high_priority_tasks, 0),
    'assigned_tasks', coalesce(summary.assigned_tasks, 0),
    'unassigned_tasks', coalesce(summary.unassigned_tasks, 0)
  ) as summary,
  coalesce(summary.freshness_at, company.company_freshness_at) as freshness_at,
  jsonb_build_object(
    'raw_pii', 'blocked',
    'cross_tenant_data', 'blocked',
    'free_text', 'excluded',
    'task_titles', 'excluded',
    'employee_identifiers', 'counted_only'
  ) as redaction,
  array['companies', 'tasks']::text[] as source_tables
from scoped_companies company
left join lateral (
  select
    count(*)::integer as total_tasks,
    count(*) filter (
      where coalesce(task.status, 'open') not in ('done', 'completed', 'closed')
        and task.completed_at is null
    )::integer as open_tasks,
    count(*) filter (
      where coalesce(task.status, '') in ('done', 'completed', 'closed')
        or task.completed_at is not null
    )::integer as completed_tasks,
    count(*) filter (
      where task.due_date < current_date
        and task.completed_at is null
        and coalesce(task.status, 'open') not in ('done', 'completed', 'closed')
    )::integer as overdue_tasks,
    count(*) filter (where coalesce(task.priority, '') in ('high', 'urgent', 'critical'))::integer as high_priority_tasks,
    count(*) filter (where task.assigned_to is not null)::integer as assigned_tasks,
    count(*) filter (where task.assigned_to is null)::integer as unassigned_tasks,
    max(coalesce(task.updated_at, task.created_at)) as freshness_at
  from public.tasks task
  where task.company_id = company.company_id
    and task.deleted_at is null
    and coalesce(task.lifecycle_status, 'active') <> 'deleted'
) summary on true
union all
select
  company.company_id,
  'forms'::text as module_key,
  jsonb_build_object(
    'total_forms', coalesce(summary.total_forms, 0),
    'active_forms', coalesce(summary.active_forms, 0),
    'draft_forms', coalesce(summary.draft_forms, 0),
    'anonymous_forms', coalesce(summary.anonymous_forms, 0),
    'expiring_forms_soon', coalesce(summary.expiring_forms_soon, 0),
    'forms_with_submission_limits', coalesce(summary.forms_with_submission_limits, 0)
  ) as summary,
  coalesce(summary.freshness_at, company.company_freshness_at) as freshness_at,
  jsonb_build_object(
    'raw_pii', 'blocked',
    'cross_tenant_data', 'blocked',
    'free_text', 'excluded',
    'form_titles', 'excluded',
    'submission_payloads', 'excluded'
  ) as redaction,
  array['companies', 'forms']::text[] as source_tables
from scoped_companies company
left join lateral (
  select
    count(*)::integer as total_forms,
    count(*) filter (where coalesce(form.status, 'active') = 'active')::integer as active_forms,
    count(*) filter (where coalesce(form.status, '') = 'draft')::integer as draft_forms,
    count(*) filter (where coalesce(form.is_anonymous, false))::integer as anonymous_forms,
    count(*) filter (where form.end_date between current_date and current_date + 14)::integer as expiring_forms_soon,
    count(*) filter (where form.max_submissions is not null)::integer as forms_with_submission_limits,
    max(coalesce(form.updated_at, form.created_at)) as freshness_at
  from public.forms form
  where form.company_id = company.company_id
    and form.deleted_at is null
    and coalesce(form.lifecycle_status, 'active') <> 'deleted'
) summary on true
union all
select
  company.company_id,
  'employees'::text as module_key,
  jsonb_build_object(
    'total_profiles', coalesce(summary.total_profiles, 0),
    'active_employees', coalesce(summary.active_employees, 0),
    'managers', coalesce(summary.managers, 0),
    'admins', coalesce(summary.admins, 0),
    'staff', coalesce(summary.staff, 0),
    'on_leave', coalesce(summary.on_leave, 0),
    'terminated', coalesce(summary.terminated, 0),
    'departments_count', coalesce(summary.departments_count, 0),
    'positions_count', coalesce(summary.positions_count, 0)
  ) as summary,
  coalesce(summary.freshness_at, company.company_freshness_at) as freshness_at,
  jsonb_build_object(
    'raw_pii', 'blocked',
    'cross_tenant_data', 'blocked',
    'names', 'excluded',
    'emails', 'excluded',
    'phones', 'excluded',
    'addresses', 'excluded',
    'employee_identifiers', 'counted_only'
  ) as redaction,
  array['companies', 'profiles']::text[] as source_tables
from scoped_companies company
left join lateral (
  select
    count(*)::integer as total_profiles,
    count(*) filter (where profile.employment_status = 'active')::integer as active_employees,
    count(*) filter (where profile.role in ('manager', 'supervisor'))::integer as managers,
    count(*) filter (
      where profile.role in ('owner', 'administrator', 'admin', 'company_admin')
        or profile.is_company_admin
    )::integer as admins,
    count(*) filter (where profile.role in ('employee', 'staff'))::integer as staff,
    count(*) filter (where profile.employment_status = 'on_leave')::integer as on_leave,
    count(*) filter (where profile.employment_status = 'terminated')::integer as terminated,
    count(distinct profile.department_id)::integer as departments_count,
    count(distinct profile.position_id)::integer as positions_count,
    max(coalesce(profile.updated_at, profile.created_at)) as freshness_at
  from public.profiles profile
  where profile.company_id = company.company_id
    and profile.deleted_at is null
    and coalesce(profile.lifecycle_status, 'active') <> 'deleted'
) summary on true
union all
select
  company.company_id,
  'cost'::text as module_key,
  jsonb_build_object(
    'window_days', 30,
    'summary_days', coalesce(summary.summary_days, 0),
    'scheduled_shifts', coalesce(summary.scheduled_shifts, 0),
    'labor_cost', coalesce(summary.labor_cost, 0),
    'production_cost', coalesce(summary.production_cost, 0),
    'waste_cost', coalesce(summary.waste_cost, 0),
    'purchasing_cost', coalesce(summary.purchasing_cost, 0),
    'expense_cost', coalesce(summary.expense_cost, 0),
    'payment_cost', coalesce(summary.payment_cost, 0),
    'total_operating_cost', coalesce(summary.total_operating_cost, 0),
    'shortage_item_count', coalesce(summary.shortage_item_count, 0),
    'overstock_item_count', coalesce(summary.overstock_item_count, 0),
    'inventory_signals', coalesce(summary.inventory_signals, '{}'::jsonb)
  ) as summary,
  coalesce(summary.freshness_at, company.company_freshness_at) as freshness_at,
  jsonb_build_object(
    'raw_pii', 'blocked',
    'cross_tenant_data', 'blocked',
    'payroll_detail', 'blocked',
    'financial_values', 'aggregated',
    'location_names', 'excluded'
  ) as redaction,
  array['companies', 'cost_day_location_summary_v']::text[] as source_tables
from scoped_companies company
left join lateral (
  select
    count(distinct cost.summary_date)::integer as summary_days,
    coalesce(sum(cost.scheduled_shifts), 0)::integer as scheduled_shifts,
    coalesce(round(sum(cost.labor_cost), 2), 0)::numeric as labor_cost,
    coalesce(round(sum(cost.production_cost), 2), 0)::numeric as production_cost,
    coalesce(round(sum(cost.waste_cost), 2), 0)::numeric as waste_cost,
    coalesce(round(sum(cost.purchasing_cost), 2), 0)::numeric as purchasing_cost,
    coalesce(round(sum(cost.expense_cost), 2), 0)::numeric as expense_cost,
    coalesce(round(sum(cost.payment_cost), 2), 0)::numeric as payment_cost,
    coalesce(round(sum(cost.total_operating_cost), 2), 0)::numeric as total_operating_cost,
    coalesce(sum(cost.shortage_item_count), 0)::integer as shortage_item_count,
    coalesce(sum(cost.overstock_item_count), 0)::integer as overstock_item_count,
    (
      select coalesce(jsonb_object_agg(signal_counts.inventory_signal, signal_counts.signal_count), '{}'::jsonb)
      from (
        select
          coalesce(cost_signal.inventory_signal, 'unknown') as inventory_signal,
          count(*)::integer as signal_count
        from public.cost_day_location_summary_v cost_signal
        where cost_signal.company_id = company.company_id
          and cost_signal.summary_date >= current_date - 30
        group by coalesce(cost_signal.inventory_signal, 'unknown')
      ) signal_counts
    ) as inventory_signals,
    max(cost.summary_date)::timestamptz as freshness_at
  from public.cost_day_location_summary_v cost
  where cost.company_id = company.company_id
    and cost.summary_date >= current_date - 30
) summary on true;

grant select on public.ai_context_module_summaries_v to authenticated;

create or replace view public.ai_context_readiness_v
with (security_invoker = true)
as
select
  summary.company_id,
  count(*)::integer as module_count,
  bool_or(summary.module_key = 'scheduling') as has_scheduling,
  bool_or(summary.module_key = 'inventory') as has_inventory,
  bool_or(summary.module_key = 'tasks') as has_tasks,
  bool_or(summary.module_key = 'forms') as has_forms,
  bool_or(summary.module_key = 'employees') as has_employees,
  bool_or(summary.module_key = 'cost') as has_cost,
  bool_and(summary.freshness_at is not null) as all_modules_freshness_declared,
  bool_and(
    summary.redaction->>'raw_pii' = 'blocked'
    and summary.redaction->>'cross_tenant_data' = 'blocked'
  ) as redaction_enforced,
  (
    count(*) = 6
    and bool_or(summary.module_key = 'scheduling')
    and bool_or(summary.module_key = 'inventory')
    and bool_or(summary.module_key = 'tasks')
    and bool_or(summary.module_key = 'forms')
    and bool_or(summary.module_key = 'employees')
    and bool_or(summary.module_key = 'cost')
    and bool_and(summary.freshness_at is not null)
    and bool_and(
      summary.redaction->>'raw_pii' = 'blocked'
      and summary.redaction->>'cross_tenant_data' = 'blocked'
    )
  ) as ready_for_prompt_contracts
from public.ai_context_module_summaries_v summary
group by summary.company_id;

grant select on public.ai_context_readiness_v to authenticated;

create or replace function public.get_ai_context_snapshot(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  governance_ready boolean := false;
  context_ready boolean := false;
  snapshot jsonb;
begin
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to fetch AI context for this company';
  end if;

  select readiness.ready_for_ai_phase_two
  into governance_ready
  from public.ai_governance_readiness_v readiness
  where readiness.company_id = p_company_id;

  if not coalesce(governance_ready, false) then
    raise exception 'AI governance baseline is required before context fetch';
  end if;

  select readiness.ready_for_prompt_contracts
  into context_ready
  from public.ai_context_readiness_v readiness
  where readiness.company_id = p_company_id;

  if not coalesce(context_ready, false) then
    raise exception 'AI context is not ready for this company';
  end if;

  select jsonb_build_object(
    'company_id', p_company_id,
    'generated_at', now(),
    'module_count', count(*)::integer,
    'redaction', jsonb_build_object(
      'raw_pii', 'blocked',
      'cross_tenant_data', 'blocked',
      'secret_material', 'blocked',
      'payroll_detail', 'blocked',
      'free_text', 'excluded_or_aggregated'
    ),
    'modules', jsonb_object_agg(
      summary.module_key,
      jsonb_build_object(
        'summary', summary.summary,
        'freshness_at', summary.freshness_at,
        'redaction', summary.redaction,
        'source_tables', summary.source_tables
      )
      order by summary.module_key
    )
  )
  into snapshot
  from public.ai_context_module_summaries_v summary
  where summary.company_id = p_company_id;

  return snapshot;
end;
$$;

grant execute on function public.get_ai_context_snapshot(uuid) to authenticated;

notify pgrst, 'reload schema';
