-- Phase 07.07: approval-gated AI compliance and workflow suggestions.

create extension if not exists pgcrypto;

create table if not exists public.ai_compliance_workflow_suggestions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  prompt_key text not null default 'compliance_assistant',
  status text not null default 'pending_review',
  suggestion_type text not null,
  priority text not null default 'medium',
  title text not null,
  rationale text not null,
  suggested_action jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  context_generated_at timestamptz,
  approval_required boolean not null default true,
  direct_write_executed boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  review_comments text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_compliance_workflow_suggestions_prompt_key_check
    check (prompt_key = 'compliance_assistant'),
  constraint ai_compliance_workflow_suggestions_status_check
    check (status in ('pending_review', 'approved', 'rejected')),
  constraint ai_compliance_workflow_suggestions_type_check
    check (suggestion_type in (
      'overdue_workflow',
      'failed_checklist_pattern',
      'corrective_task',
      'training_followup',
      'no_action'
    )),
  constraint ai_compliance_workflow_suggestions_priority_check
    check (priority in ('low', 'medium', 'high', 'critical')),
  constraint ai_compliance_workflow_suggestions_approval_required_check
    check (approval_required = true),
  constraint ai_compliance_workflow_suggestions_no_direct_write_check
    check (direct_write_executed = false),
  constraint ai_compliance_workflow_suggestions_action_read_only_check
    check (
      suggested_action = '{}'::jsonb
      or (
        suggested_action->>'writes_allowed' = 'false'
        and suggested_action->>'requires_human_approval' = 'true'
      )
    )
);

create index if not exists ai_compliance_workflow_suggestions_company_created_idx
on public.ai_compliance_workflow_suggestions (company_id, created_at desc);

create index if not exists ai_compliance_workflow_suggestions_company_status_idx
on public.ai_compliance_workflow_suggestions (company_id, status);

drop trigger if exists set_ai_compliance_workflow_suggestions_updated_at on public.ai_compliance_workflow_suggestions;
create trigger set_ai_compliance_workflow_suggestions_updated_at
before update on public.ai_compliance_workflow_suggestions
for each row execute function public.set_updated_at();

alter table public.ai_compliance_workflow_suggestions enable row level security;

drop policy if exists "Company members can read AI compliance workflow suggestions" on public.ai_compliance_workflow_suggestions;
create policy "Company members can read AI compliance workflow suggestions"
on public.ai_compliance_workflow_suggestions
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

grant select on public.ai_compliance_workflow_suggestions to authenticated;

create or replace view public.ai_compliance_workflow_suggestions_latest_v
with (security_invoker = true)
as
select
  suggestion.id,
  suggestion.company_id,
  suggestion.prompt_key,
  suggestion.status,
  suggestion.suggestion_type,
  suggestion.priority,
  suggestion.title,
  suggestion.rationale,
  suggestion.suggested_action,
  suggestion.evidence,
  suggestion.context_generated_at,
  suggestion.approval_required,
  suggestion.direct_write_executed,
  suggestion.approved_by,
  suggestion.approved_at,
  suggestion.rejected_by,
  suggestion.rejected_at,
  suggestion.created_by,
  suggestion.created_at,
  suggestion.updated_at
from public.ai_compliance_workflow_suggestions suggestion
where suggestion.company_id in (select public.current_user_company_ids())
  and suggestion.created_at >= now() - interval '14 days';

grant select on public.ai_compliance_workflow_suggestions_latest_v to authenticated;

create or replace view public.ai_compliance_workflow_assistant_readiness_v
with (security_invoker = true)
as
select
  context_ready.company_id,
  context_ready.ready_for_prompt_contracts,
  prompt_ready.has_compliance_assistant,
  prompt_ready.ready_for_manager_briefing as prompt_contracts_ready,
  count(suggestion.id)::integer as recent_suggestions,
  count(suggestion.id) filter (where suggestion.status = 'pending_review')::integer as pending_review_suggestions,
  bool_and(coalesce(suggestion.approval_required, true)) as all_require_approval,
  bool_and(not coalesce(suggestion.direct_write_executed, false)) as no_direct_writes_executed,
  (
    context_ready.ready_for_prompt_contracts
    and prompt_ready.has_compliance_assistant
    and prompt_ready.ready_for_manager_briefing
    and coalesce(bool_and(coalesce(suggestion.approval_required, true)), true)
    and coalesce(bool_and(not coalesce(suggestion.direct_write_executed, false)), true)
  ) as ready_to_suggest
from public.ai_context_readiness_v context_ready
cross join public.ai_prompt_contract_readiness_v prompt_ready
left join public.ai_compliance_workflow_suggestions_latest_v suggestion
  on suggestion.company_id = context_ready.company_id
group by
  context_ready.company_id,
  context_ready.ready_for_prompt_contracts,
  prompt_ready.has_compliance_assistant,
  prompt_ready.ready_for_manager_briefing;

grant select on public.ai_compliance_workflow_assistant_readiness_v to authenticated;

create or replace function public.refresh_ai_compliance_workflow_suggestions(
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
  tasks_summary jsonb;
  forms_summary jsonb;
  overdue_tasks integer := 0;
  high_priority_tasks integer := 0;
  expiring_forms_soon integer := 0;
  overdue_runs integer := 0;
  exception_runs integer := 0;
  critical_exception_runs integer := 0;
  repeat_failure_runs integer := 0;
  failed_steps integer := 0;
  training_followup_count integer := 0;
  evidence_payload jsonb;
  inserted_count integer := 0;
  suggestion_record record;
begin
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to refresh compliance workflow suggestions for this company';
  end if;

  if not coalesce((select ready_for_manager_briefing from public.ai_prompt_contract_readiness_v), false) then
    raise exception 'AI prompt contracts are required before compliance workflow suggestions';
  end if;

  context_snapshot := public.get_ai_context_snapshot(p_company_id);
  context_generated_at := nullif(context_snapshot->>'generated_at', '')::timestamptz;
  tasks_summary := context_snapshot #> '{modules,tasks,summary}';
  forms_summary := context_snapshot #> '{modules,forms,summary}';
  overdue_tasks := coalesce((tasks_summary->>'overdue_tasks')::integer, 0);
  high_priority_tasks := coalesce((tasks_summary->>'high_priority_tasks')::integer, 0);
  expiring_forms_soon := coalesce((forms_summary->>'expiring_forms_soon')::integer, 0);

  select
    coalesce(summary.overdue_runs, 0),
    coalesce(summary.exception_runs, 0),
    coalesce(summary.critical_exception_runs, 0),
    coalesce(summary.repeat_failure_runs, 0),
    coalesce(summary.failed_steps, 0)
  into
    overdue_runs,
    exception_runs,
    critical_exception_runs,
    repeat_failure_runs,
    failed_steps
  from public.operations_execution_quality_summary_v summary
  where summary.company_id = p_company_id;

  select count(*)::integer
  into training_followup_count
  from public.operations_execution_quality_coaching_v coaching
  where coaching.company_id = p_company_id
    and coaching.coaching_signal in ('repeat_failure', 'exception_rate', 'overdue', 'training_followup')
    and coaching.coaching_priority in ('high', 'medium');

  overdue_runs := coalesce(overdue_runs, 0);
  exception_runs := coalesce(exception_runs, 0);
  critical_exception_runs := coalesce(critical_exception_runs, 0);
  repeat_failure_runs := coalesce(repeat_failure_runs, 0);
  failed_steps := coalesce(failed_steps, 0);
  training_followup_count := coalesce(training_followup_count, 0);

  evidence_payload := jsonb_build_array(
    jsonb_build_object(
      'module', 'operations',
      'metric', 'overdue_runs',
      'value', overdue_runs,
      'route', '/app/operations',
      'freshness_at', context_generated_at
    ),
    jsonb_build_object(
      'module', 'operations',
      'metric', 'failed_steps',
      'value', failed_steps,
      'route', '/app/operations',
      'freshness_at', context_generated_at
    ),
    jsonb_build_object(
      'module', 'tasks',
      'metric', 'overdue_tasks',
      'value', overdue_tasks,
      'route', '/app/tasks',
      'freshness_at', context_snapshot #>> '{modules,tasks,freshness_at}'
    ),
    jsonb_build_object(
      'module', 'forms',
      'metric', 'expiring_forms_soon',
      'value', expiring_forms_soon,
      'route', '/app/forms',
      'freshness_at', context_snapshot #>> '{modules,forms,freshness_at}'
    ),
    jsonb_build_object(
      'module', 'employees',
      'metric', 'training_followup_count',
      'value', training_followup_count,
      'route', '/app/learning-center',
      'freshness_at', context_snapshot #>> '{modules,employees,freshness_at}'
    )
  );

  for suggestion_record in
    select *
    from (
      select
        'overdue_workflow'::text as suggestion_type,
        case when overdue_runs >= 3 then 'high' else 'medium' end as priority,
        'Review overdue workflow discipline'::text as title,
        overdue_runs::text || ' workflow run' || case when overdue_runs = 1 then '' else 's' end || ' are overdue in the execution quality window.' as rationale,
        'create_task'::text as suggested_action_type
      where overdue_runs > 0
      union all
      select
        'failed_checklist_pattern',
        case when critical_exception_runs > 0 or repeat_failure_runs > 0 then 'high' else 'medium' end,
        'Review failed checklist pattern',
        (exception_runs + failed_steps)::text || ' workflow exception or failed-step signal' || case when exception_runs + failed_steps = 1 then '' else 's' end || ' need pattern review.',
        'request_review'
      where exception_runs > 0 or failed_steps > 0 or repeat_failure_runs > 0
      union all
      select
        'corrective_task',
        case when critical_exception_runs > 0 then 'critical' else 'medium' end,
        'Draft corrective task review',
        'Critical exceptions, pending review, or high-priority task pressure indicate a corrective task may be needed.',
        'create_task'
      where critical_exception_runs > 0 or high_priority_tasks > 0 or expiring_forms_soon > 0
      union all
      select
        'training_followup',
        case when repeat_failure_runs > 0 then 'high' else 'medium' end,
        'Draft training follow-up',
        training_followup_count::text || ' coaching signal' || case when training_followup_count = 1 then '' else 's' end || ' indicate targeted training follow-up may help execution quality.',
        'draft_training_followup'
      where training_followup_count > 0
    ) suggestions
  loop
    insert into public.ai_compliance_workflow_suggestions (
      company_id,
      prompt_key,
      status,
      suggestion_type,
      priority,
      title,
      rationale,
      suggested_action,
      evidence,
      context_generated_at,
      approval_required,
      direct_write_executed,
      created_by
    )
    values (
      p_company_id,
      'compliance_assistant',
      'pending_review',
      suggestion_record.suggestion_type,
      suggestion_record.priority,
      suggestion_record.title,
      suggestion_record.rationale,
      jsonb_build_object(
        'suggested_action_type', suggestion_record.suggested_action_type,
        'requires_human_approval', true,
        'writes_allowed', false,
        'task_write_allowed', false,
        'training_assignment_write_allowed', false,
        'workflow_exception_write_allowed', false,
        'workflow_review_write_allowed', false,
        'rows_written', 0
      ),
      evidence_payload,
      context_generated_at,
      true,
      false,
      auth.uid()
    );

    inserted_count := inserted_count + 1;
  end loop;

  if inserted_count = 0 then
    insert into public.ai_compliance_workflow_suggestions (
      company_id,
      prompt_key,
      status,
      suggestion_type,
      priority,
      title,
      rationale,
      suggested_action,
      evidence,
      context_generated_at,
      approval_required,
      direct_write_executed,
      created_by
    )
    values (
      p_company_id,
      'compliance_assistant',
      'pending_review',
      'no_action',
      'low',
      'No compliance workflow action needed',
      'No immediate overdue workflow, failed checklist, corrective task, or training follow-up risk was detected.',
      jsonb_build_object(
        'suggested_action_type', 'request_review',
        'requires_human_approval', true,
        'writes_allowed', false,
        'task_write_allowed', false,
        'training_assignment_write_allowed', false,
        'workflow_exception_write_allowed', false,
        'workflow_review_write_allowed', false,
        'rows_written', 0
      ),
      evidence_payload,
      context_generated_at,
      true,
      false,
      auth.uid()
    );

    inserted_count := 1;
  end if;

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
    'ai.compliance_workflow_suggestion.created',
    'ai_compliance_workflow_suggestions',
    p_company_id::text,
    '{}'::jsonb,
    jsonb_build_object(
      'prompt_key', 'compliance_assistant',
      'suggestions_created', inserted_count
    ),
    jsonb_build_object(
      'phase', '07.07',
      'approval_required', true,
      'writes_allowed', false,
      'direct_write_executed', false
    )
  );

  return jsonb_build_object(
    'company_id', p_company_id,
    'prompt_key', 'compliance_assistant',
    'suggestions_created', inserted_count,
    'approval_required', true,
    'writes_allowed', false,
    'direct_write_executed', false
  );
end;
$$;

grant execute on function public.refresh_ai_compliance_workflow_suggestions(uuid) to authenticated;

create or replace function public.review_ai_compliance_workflow_suggestion(
  p_suggestion_id uuid,
  p_decision text,
  p_comments text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  suggestion_record public.ai_compliance_workflow_suggestions%rowtype;
  normalized_decision text := lower(trim(coalesce(p_decision, '')));
begin
  if p_suggestion_id is null then
    raise exception 'suggestion_id is required';
  end if;

  if normalized_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected';
  end if;

  select *
  into suggestion_record
  from public.ai_compliance_workflow_suggestions suggestion
  where suggestion.id = p_suggestion_id;

  if suggestion_record.id is null then
    raise exception 'Compliance workflow suggestion not found';
  end if;

  if suggestion_record.company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to review compliance workflow suggestion for this company';
  end if;

  if not public.current_user_is_company_admin(suggestion_record.company_id) then
    raise exception 'Manager approval is required to review compliance workflow suggestion';
  end if;

  update public.ai_compliance_workflow_suggestions
  set
    status = normalized_decision,
    approved_by = case when normalized_decision = 'approved' then auth.uid() else approved_by end,
    approved_at = case when normalized_decision = 'approved' then now() else approved_at end,
    rejected_by = case when normalized_decision = 'rejected' then auth.uid() else rejected_by end,
    rejected_at = case when normalized_decision = 'rejected' then now() else rejected_at end,
    review_comments = nullif(trim(coalesce(p_comments, '')), ''),
    direct_write_executed = false,
    updated_at = now()
  where id = p_suggestion_id;

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
    suggestion_record.company_id,
    auth.uid(),
    case
      when normalized_decision = 'approved' then 'ai.compliance_workflow_suggestion.approved'
      else 'ai.compliance_workflow_suggestion.rejected'
    end,
    'ai_compliance_workflow_suggestions',
    p_suggestion_id::text,
    jsonb_build_object('status', suggestion_record.status),
    jsonb_build_object(
      'status', normalized_decision,
      'direct_write_executed', false,
      'rows_written', 0
    ),
    jsonb_build_object(
      'phase', '07.07',
      'approval_required', true,
      'writes_allowed', false,
      'comments_present', nullif(trim(coalesce(p_comments, '')), '') is not null
    )
  );

  return jsonb_build_object(
    'suggestion_id', p_suggestion_id,
    'company_id', suggestion_record.company_id,
    'decision', normalized_decision,
    'approval_required', true,
    'writes_allowed', false,
    'direct_write_executed', false,
    'rows_written', 0
  );
end;
$$;

grant execute on function public.review_ai_compliance_workflow_suggestion(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
