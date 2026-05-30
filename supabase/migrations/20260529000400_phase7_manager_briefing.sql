-- Phase 07.04: read-only AI manager briefing runs.

create extension if not exists pgcrypto;

create table if not exists public.ai_manager_briefing_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  briefing_date date not null default current_date,
  prompt_key text not null default 'manager_briefing',
  status text not null default 'generated',
  context_generated_at timestamptz,
  output jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  fallback_reason text,
  generated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_manager_briefing_runs_prompt_key_check
    check (prompt_key = 'manager_briefing'),
  constraint ai_manager_briefing_runs_status_check
    check (status in ('generated', 'fallback')),
  constraint ai_manager_briefing_runs_output_read_only_check
    check (
      output = '{}'::jsonb
      or (
        output->>'prompt_key' = 'manager_briefing'
        and output #>> '{safety,writes_allowed}' = 'false'
        and output #>> '{safety,requires_human_approval}' = 'true'
      )
    )
);

create index if not exists ai_manager_briefing_runs_company_created_idx
on public.ai_manager_briefing_runs (company_id, created_at desc);

create index if not exists ai_manager_briefing_runs_company_date_idx
on public.ai_manager_briefing_runs (company_id, briefing_date desc);

drop trigger if exists set_ai_manager_briefing_runs_updated_at on public.ai_manager_briefing_runs;
create trigger set_ai_manager_briefing_runs_updated_at
before update on public.ai_manager_briefing_runs
for each row execute function public.set_updated_at();

alter table public.ai_manager_briefing_runs enable row level security;

drop policy if exists "Company members can read AI manager briefing runs" on public.ai_manager_briefing_runs;
create policy "Company members can read AI manager briefing runs"
on public.ai_manager_briefing_runs
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

grant select on public.ai_manager_briefing_runs to authenticated;

create or replace view public.ai_manager_briefing_latest_v
with (security_invoker = true)
as
select distinct on (run.company_id)
  run.id,
  run.company_id,
  run.briefing_date,
  run.prompt_key,
  run.status,
  run.context_generated_at,
  run.output,
  run.evidence,
  run.fallback_reason,
  run.generated_by,
  run.created_at,
  run.updated_at
from public.ai_manager_briefing_runs run
where run.company_id in (select public.current_user_company_ids())
order by run.company_id, run.created_at desc;

grant select on public.ai_manager_briefing_latest_v to authenticated;

create or replace view public.ai_manager_briefing_readiness_v
with (security_invoker = true)
as
select
  context_ready.company_id,
  context_ready.ready_for_prompt_contracts,
  prompt_ready.ready_for_manager_briefing,
  coalesce(latest.prompt_key = 'manager_briefing', false) as has_manager_briefing_run,
  latest.created_at as latest_briefing_at,
  (
    context_ready.ready_for_prompt_contracts
    and prompt_ready.ready_for_manager_briefing
  ) as ready_to_refresh
from public.ai_context_readiness_v context_ready
cross join public.ai_prompt_contract_readiness_v prompt_ready
left join public.ai_manager_briefing_latest_v latest
  on latest.company_id = context_ready.company_id;

grant select on public.ai_manager_briefing_readiness_v to authenticated;

create or replace function public.refresh_ai_manager_briefing(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  context_snapshot jsonb;
  context_generated_at timestamptz;
  scheduling_summary jsonb;
  inventory_summary jsonb;
  tasks_summary jsonb;
  forms_summary jsonb;
  employees_summary jsonb;
  cost_summary jsonb;
  unassigned_shifts integer := 0;
  overdue_tasks integer := 0;
  expiring_forms integer := 0;
  active_items integer := 0;
  items_with_minimums integer := 0;
  active_employees integer := 0;
  scheduled_shifts integer := 0;
  total_operating_cost numeric := 0;
  waste_cost numeric := 0;
  open_workflow_exceptions integer := 0;
  critical_workflow_exceptions integer := 0;
  risk_count integer := 0;
  output_payload jsonb;
  evidence_payload jsonb;
  run_id uuid;
  run_status text := 'generated';
begin
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to refresh manager briefing for this company';
  end if;

  if not coalesce((select ready_for_manager_briefing from public.ai_prompt_contract_readiness_v), false) then
    raise exception 'AI prompt contracts are required before manager briefing refresh';
  end if;

  context_snapshot := public.get_ai_context_snapshot(p_company_id);
  context_generated_at := nullif(context_snapshot->>'generated_at', '')::timestamptz;

  scheduling_summary := context_snapshot #> '{modules,scheduling,summary}';
  inventory_summary := context_snapshot #> '{modules,inventory,summary}';
  tasks_summary := context_snapshot #> '{modules,tasks,summary}';
  forms_summary := context_snapshot #> '{modules,forms,summary}';
  employees_summary := context_snapshot #> '{modules,employees,summary}';
  cost_summary := context_snapshot #> '{modules,cost,summary}';

  unassigned_shifts := coalesce((scheduling_summary->>'unassigned_shifts')::integer, 0);
  scheduled_shifts := coalesce((scheduling_summary->>'scheduled_shifts')::integer, 0);
  overdue_tasks := coalesce((tasks_summary->>'overdue_tasks')::integer, 0);
  expiring_forms := coalesce((forms_summary->>'expiring_forms_soon')::integer, 0);
  active_items := coalesce((inventory_summary->>'active_items')::integer, 0);
  items_with_minimums := coalesce((inventory_summary->>'items_with_minimums')::integer, 0);
  active_employees := coalesce((employees_summary->>'active_employees')::integer, 0);
  total_operating_cost := coalesce((cost_summary->>'total_operating_cost')::numeric, 0);
  waste_cost := coalesce((cost_summary->>'waste_cost')::numeric, 0);

  select
    count(*)::integer,
    count(*) filter (where severity in ('critical', 'high'))::integer
  into open_workflow_exceptions, critical_workflow_exceptions
  from public.workflow_exceptions exception
  where exception.company_id = p_company_id
    and exception.status in ('open', 'acknowledged', 'in_progress');

  risk_count :=
    case when unassigned_shifts > 0 then 1 else 0 end
    + case when overdue_tasks > 0 then 1 else 0 end
    + case when open_workflow_exceptions > 0 then 1 else 0 end
    + case when expiring_forms > 0 then 1 else 0 end
    + case when scheduled_shifts > 0 and active_employees = 0 then 1 else 0 end
    + case when active_items > 0 and items_with_minimums = 0 then 1 else 0 end
    + case when total_operating_cost > 0 and waste_cost / total_operating_cost >= 0.1 then 1 else 0 end;

  evidence_payload := jsonb_build_array(
    jsonb_build_object(
      'label', 'Open schedule coverage',
      'module', 'scheduling',
      'metric', 'unassigned_shifts',
      'value', unassigned_shifts,
      'route', '/app/enhanced-scheduling',
      'freshness_at', context_snapshot #>> '{modules,scheduling,freshness_at}'
    ),
    jsonb_build_object(
      'label', 'Inventory setup risk',
      'module', 'inventory',
      'metric', 'items_with_minimums',
      'value', items_with_minimums,
      'route', '/app/inventory',
      'freshness_at', context_snapshot #>> '{modules,inventory,freshness_at}'
    ),
    jsonb_build_object(
      'label', 'Overdue tasks',
      'module', 'tasks',
      'metric', 'overdue_tasks',
      'value', overdue_tasks,
      'route', '/app/tasks',
      'freshness_at', context_snapshot #>> '{modules,tasks,freshness_at}'
    ),
    jsonb_build_object(
      'label', 'Workflow exceptions',
      'module', 'operations',
      'metric', 'open_workflow_exceptions',
      'value', open_workflow_exceptions,
      'route', '/app/operations',
      'freshness_at', now()
    ),
    jsonb_build_object(
      'label', 'Forms needing attention',
      'module', 'forms',
      'metric', 'expiring_forms_soon',
      'value', expiring_forms,
      'route', '/app/forms',
      'freshness_at', context_snapshot #>> '{modules,forms,freshness_at}'
    ),
    jsonb_build_object(
      'label', 'Operating cost signal',
      'module', 'cost',
      'metric', 'total_operating_cost',
      'value', total_operating_cost,
      'route', '/app/reports',
      'freshness_at', context_snapshot #>> '{modules,cost,freshness_at}'
    )
  );

  output_payload := jsonb_build_object(
    'contract_version', '2026-05-29',
    'prompt_key', 'manager_briefing',
    'generated_at', now(),
    'status', case when risk_count > 0 then 'ok' else 'no_action' end,
    'summary', case
      when risk_count > 0 then risk_count::text || ' operational risk' || case when risk_count = 1 then '' else 's' end || ' need manager attention today.'
      else 'No immediate operational risks were detected from the current tenant context.'
    end,
    'confidence', case when risk_count > 0 then 0.78 else 0.64 end,
    'evidence', evidence_payload,
    'recommendations', (
      select coalesce(jsonb_agg(recommendation), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'title', 'Review schedule coverage',
          'rationale', unassigned_shifts::text || ' scheduled shift' || case when unassigned_shifts = 1 then '' else 's' end || ' need coverage.',
          'priority', case when unassigned_shifts >= 3 then 'high' else 'medium' end,
          'suggested_action_type', 'request_review',
          'requires_human_approval', true
        ) as recommendation
        where unassigned_shifts > 0
        union all
        select jsonb_build_object(
          'title', 'Review overdue tasks',
          'rationale', overdue_tasks::text || ' overdue task' || case when overdue_tasks = 1 then '' else 's' end || ' need follow-up.',
          'priority', case when overdue_tasks >= 5 then 'high' else 'medium' end,
          'suggested_action_type', 'request_review',
          'requires_human_approval', true
        )
        where overdue_tasks > 0
        union all
        select jsonb_build_object(
          'title', 'Review workflow exceptions',
          'rationale', open_workflow_exceptions::text || ' workflow exception' || case when open_workflow_exceptions = 1 then '' else 's' end || ' are open.',
          'priority', case when critical_workflow_exceptions > 0 then 'critical' else 'medium' end,
          'suggested_action_type', 'request_review',
          'requires_human_approval', true
        )
        where open_workflow_exceptions > 0
      ) recommendations
    ),
    'safety', jsonb_build_object(
      'requires_human_approval', true,
      'writes_allowed', false,
      'blocked_data_classes_observed', '[]'::jsonb
    ),
    'briefing_sections', jsonb_build_array(
      jsonb_build_object(
        'heading', 'Today',
        'bullets', case
          when risk_count > 0 then (
            select jsonb_agg(bullet)
            from (
              select unassigned_shifts::text || ' shift coverage gap' as bullet where unassigned_shifts > 0
              union all select overdue_tasks::text || ' overdue task follow-up' where overdue_tasks > 0
              union all select open_workflow_exceptions::text || ' workflow exception review' where open_workflow_exceptions > 0
              union all select expiring_forms::text || ' form/compliance reminder' where expiring_forms > 0
            ) bullets
          )
          else jsonb_build_array('No immediate risk surfaced from staffing, inventory, tasks, workflows, forms, employee, or cost summaries.')
        end
      ),
      jsonb_build_object(
        'heading', 'Evidence',
        'bullets', jsonb_build_array(
          'Schedule: /app/enhanced-scheduling',
          'Inventory: /app/inventory',
          'Tasks: /app/tasks',
          'Operations: /app/operations',
          'Cost: /app/reports'
        )
      )
    ),
    'top_risks', (
      select coalesce(jsonb_agg(risk), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'risk', unassigned_shifts::text || ' scheduled shift' || case when unassigned_shifts = 1 then '' else 's' end || ' still need coverage.',
          'priority', case when unassigned_shifts >= 3 then 'high' else 'medium' end,
          'owner_hint', 'scheduler'
        ) as risk
        where unassigned_shifts > 0
        union all
        select jsonb_build_object(
          'risk', overdue_tasks::text || ' overdue task' || case when overdue_tasks = 1 then '' else 's' end || ' need manager follow-up.',
          'priority', case when overdue_tasks >= 5 then 'high' else 'medium' end,
          'owner_hint', 'manager'
        )
        where overdue_tasks > 0
        union all
        select jsonb_build_object(
          'risk', open_workflow_exceptions::text || ' workflow exception' || case when open_workflow_exceptions = 1 then '' else 's' end || ' are open.',
          'priority', case when critical_workflow_exceptions > 0 then 'critical' else 'medium' end,
          'owner_hint', 'compliance'
        )
        where open_workflow_exceptions > 0
      ) risks
    ),
    'next_actions', (
      select coalesce(jsonb_agg(action), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'title', 'Review today''s operational risks',
          'rationale', 'Open the linked evidence routes and decide whether a human-approved task is needed.',
          'priority', case when risk_count >= 3 then 'high' when risk_count > 0 then 'medium' else 'low' end,
          'suggested_action_type', 'request_review',
          'requires_human_approval', true
        ) as action
        where risk_count > 0
      ) actions
    )
  );

  insert into public.ai_manager_briefing_runs (
    company_id,
    briefing_date,
    prompt_key,
    status,
    context_generated_at,
    output,
    evidence,
    fallback_reason,
    generated_by
  )
  values (
    p_company_id,
    current_date,
    'manager_briefing',
    run_status,
    context_generated_at,
    output_payload,
    evidence_payload,
    null,
    auth.uid()
  )
  returning id into run_id;

  insert into public.audit_log (
    company_id,
    actor_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    metadata
  )
  values (
    p_company_id,
    auth.uid(),
    'ai.manager_briefing.generated',
    'ai_manager_briefing_runs',
    run_id::text,
    '{}'::jsonb,
    jsonb_build_object(
      'briefing_run_id', run_id,
      'prompt_key', 'manager_briefing',
      'status', run_status,
      'risk_count', risk_count
    ),
    jsonb_build_object(
      'phase', '07.04',
      'read_only', true,
      'writes_allowed', false,
      'evidence_links', jsonb_array_length(evidence_payload)
    )
  );

  return jsonb_build_object(
    'briefing_run_id', run_id,
    'company_id', p_company_id,
    'briefing_date', current_date,
    'prompt_key', 'manager_briefing',
    'status', run_status,
    'context_generated_at', context_generated_at,
    'output', output_payload,
    'evidence', evidence_payload,
    'writes_allowed', false
  );
end;
$$;

grant execute on function public.refresh_ai_manager_briefing(uuid) to authenticated;

notify pgrst, 'reload schema';
