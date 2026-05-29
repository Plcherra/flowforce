-- Phase 06.04: field execution UI contract.
-- Staff can start/resume assigned workflow runs, save draft step payloads,
-- complete or fail steps, and complete runs after required evidence is present.

create extension if not exists pgcrypto with schema extensions;

create index if not exists workflow_step_instances_execution_idx
on public.workflow_step_instances (company_id, workflow_instance_id, status);

create index if not exists task_workflow_instances_assigned_execution_idx
on public.task_workflow_instances (company_id, assigned_to, status, due_at);

create or replace view public.operations_field_execution_queue_v
with (security_invoker = true)
as
select
  run.company_id,
  run.id as workflow_instance_id,
  run.workflow_id,
  workflow.name as workflow_name,
  workflow.template_category,
  run.status as run_status,
  run.review_status,
  run.assigned_to,
  run.assigned_role,
  run.location_id,
  run.scheduled_for,
  run.starts_at,
  run.started_at,
  run.due_at,
  run.escalation_at,
  run.current_step_id,
  count(step_run.id)::integer as total_steps,
  count(step_run.id) filter (where step_run.status = 'completed')::integer as completed_steps,
  count(step_run.id) filter (where step_run.status = 'draft')::integer as draft_steps,
  count(step_run.id) filter (where step_run.status = 'failed')::integer as failed_steps,
  count(step_run.id) filter (
    where step_run.evidence_status in ('missing', 'partial')
  )::integer as evidence_needed_steps,
  min(step.step_number) filter (
    where step_run.status not in ('completed', 'failed', 'skipped')
  ) as next_step_number
from public.task_workflow_instances run
left join public.workflows workflow
  on workflow.id::text = run.workflow_id
  and workflow.company_id = run.company_id
left join public.workflow_step_instances step_run
  on step_run.company_id = run.company_id
  and step_run.workflow_instance_id = run.id::text
left join public.workflow_steps step
  on step.company_id = run.company_id
  and step.id::text = step_run.step_id
where run.company_id in (select public.current_user_company_ids())
  and run.status in ('scheduled', 'in_progress', 'draft', 'started')
  and (run.assigned_to is null or run.assigned_to = auth.uid())
group by
  run.company_id,
  run.id,
  run.workflow_id,
  workflow.name,
  workflow.template_category,
  run.status,
  run.review_status,
  run.assigned_to,
  run.assigned_role,
  run.location_id,
  run.scheduled_for,
  run.starts_at,
  run.started_at,
  run.due_at,
  run.escalation_at,
  run.current_step_id;

grant select on public.operations_field_execution_queue_v to authenticated;

create or replace view public.operations_workflow_run_steps_v
with (security_invoker = true)
as
select
  step_run.company_id,
  step_run.id as step_instance_id,
  step_run.workflow_instance_id::uuid as workflow_instance_id,
  step_run.step_id::uuid as step_id,
  step.name as step_name,
  step.description as step_description,
  step.step_number,
  step.step_type,
  step.required,
  step.evidence_required,
  step.evidence_schema,
  step.exception_policy,
  step.failure_escalation,
  step.form_field_id,
  step_run.status as step_status,
  step_run.evidence_status,
  step_run.evidence_payload,
  step_run.notes,
  step_run.failed_reason,
  step_run.exception_status,
  step_run.started_at,
  step_run.completed_at
from public.workflow_step_instances step_run
join public.task_workflow_instances run
  on run.id::text = step_run.workflow_instance_id
  and run.company_id = step_run.company_id
join public.workflow_steps step
  on step.id::text = step_run.step_id
  and step.company_id = step_run.company_id
where step_run.company_id in (select public.current_user_company_ids())
  and (run.assigned_to is null or run.assigned_to = auth.uid());

grant select on public.operations_workflow_run_steps_v to authenticated;

create or replace function public.current_user_can_execute_workflow_run(
  p_company_id uuid,
  p_workflow_instance_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.task_workflow_instances run
    where run.id = p_workflow_instance_id
      and run.company_id = p_company_id
      and run.company_id in (select public.current_user_company_ids())
      and (run.assigned_to is null or run.assigned_to = auth.uid())
  );
$$;

revoke all on function public.current_user_can_execute_workflow_run(uuid, uuid) from public;
grant execute on function public.current_user_can_execute_workflow_run(uuid, uuid) to authenticated, service_role;

create or replace function public.start_workflow_run(
  p_company_id uuid,
  p_workflow_instance_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  first_step_id uuid;
begin
  if not public.current_user_can_execute_workflow_run(p_company_id, p_workflow_instance_id) then
    raise exception 'Not allowed to execute this workflow run'
      using errcode = '42501';
  end if;

  select step_run.id
  into first_step_id
  from public.workflow_step_instances step_run
  join public.workflow_steps step
    on step.id::text = step_run.step_id
    and step.company_id = step_run.company_id
  where step_run.company_id = p_company_id
    and step_run.workflow_instance_id = p_workflow_instance_id::text
    and step_run.status not in ('completed', 'failed', 'skipped')
  order by step.step_number asc
  limit 1;

  update public.task_workflow_instances
  set
    status = case when status = 'completed' then status else 'in_progress' end,
    started_at = coalesce(started_at, now()),
    current_step_id = coalesce(first_step_id::text, current_step_id),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'last_resumed_at', now(),
      'last_resumed_by', auth.uid()
    )
  where company_id = p_company_id
    and id = p_workflow_instance_id;

  if first_step_id is not null then
    update public.workflow_step_instances
    set
      status = case when status = 'pending' then 'draft' else status end,
      started_at = coalesce(started_at, now())
    where id = first_step_id
      and company_id = p_company_id;
  end if;

  return jsonb_build_object(
    'workflow_instance_id', p_workflow_instance_id,
    'current_step_id', first_step_id,
    'status', 'in_progress'
  );
end;
$$;

grant execute on function public.start_workflow_run(uuid, uuid) to authenticated;

create or replace function public.save_workflow_step_draft(
  p_company_id uuid,
  p_step_instance_id uuid,
  p_evidence_payload jsonb default '{}'::jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  step_record record;
begin
  select
    step_run.*,
    run.id as run_id,
    step.evidence_required
  into step_record
  from public.workflow_step_instances step_run
  join public.task_workflow_instances run
    on run.id::text = step_run.workflow_instance_id
    and run.company_id = step_run.company_id
  join public.workflow_steps step
    on step.id::text = step_run.step_id
    and step.company_id = step_run.company_id
  where step_run.id = p_step_instance_id
    and step_run.company_id = p_company_id;

  if not found or not public.current_user_can_execute_workflow_run(p_company_id, step_record.run_id) then
    raise exception 'Not allowed to save this workflow step'
      using errcode = '42501';
  end if;

  update public.task_workflow_instances
  set
    status = case when status = 'completed' then status else 'in_progress' end,
    started_at = coalesce(started_at, now()),
    current_step_id = p_step_instance_id::text
  where id = step_record.run_id
    and company_id = p_company_id;

  update public.workflow_step_instances
  set
    status = 'draft',
    started_at = coalesce(started_at, now()),
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    evidence_payload = coalesce(p_evidence_payload, '{}'::jsonb),
    evidence_status = case
      when not coalesce(step_record.evidence_required, false) then 'not_required'
      when coalesce(p_evidence_payload, '{}'::jsonb) = '{}'::jsonb then 'missing'
      else 'partial'
    end
  where id = p_step_instance_id
    and company_id = p_company_id;

  return jsonb_build_object(
    'step_instance_id', p_step_instance_id,
    'workflow_instance_id', step_record.run_id,
    'status', 'draft'
  );
end;
$$;

grant execute on function public.save_workflow_step_draft(uuid, uuid, jsonb, text) to authenticated;

create or replace function public.complete_workflow_step(
  p_company_id uuid,
  p_step_instance_id uuid,
  p_step_status text default 'completed',
  p_evidence_payload jsonb default '{}'::jsonb,
  p_notes text default null,
  p_failed_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  step_record record;
  next_step_id uuid;
  exception_id uuid;
  evidence_id uuid;
  normalized_status text := coalesce(nullif(trim(p_step_status), ''), 'completed');
  normalized_payload jsonb := coalesce(p_evidence_payload, '{}'::jsonb);
begin
  if normalized_status not in ('completed', 'failed') then
    raise exception 'Step status must be completed or failed'
      using errcode = '22023';
  end if;

  select
    step_run.*,
    run.id as run_id,
    run.workflow_id as run_workflow_id,
    step.id as workflow_step_id,
    step.name as step_name,
    step.step_type,
    step.evidence_required,
    step.exception_policy,
    step.failure_escalation
  into step_record
  from public.workflow_step_instances step_run
  join public.task_workflow_instances run
    on run.id::text = step_run.workflow_instance_id
    and run.company_id = step_run.company_id
  join public.workflow_steps step
    on step.id::text = step_run.step_id
    and step.company_id = step_run.company_id
  where step_run.id = p_step_instance_id
    and step_run.company_id = p_company_id;

  if not found or not public.current_user_can_execute_workflow_run(p_company_id, step_record.run_id) then
    raise exception 'Not allowed to complete this workflow step'
      using errcode = '42501';
  end if;

  if normalized_status = 'completed'
    and coalesce(step_record.evidence_required, false)
    and normalized_payload = '{}'::jsonb
  then
    raise exception 'Required evidence is missing for this workflow step'
      using errcode = '22023';
  end if;

  if normalized_status = 'failed'
    and nullif(trim(coalesce(p_failed_reason, '')), '') is null
  then
    raise exception 'Failed workflow steps require a reason'
      using errcode = '22023';
  end if;

  update public.workflow_step_instances
  set
    status = normalized_status,
    started_at = coalesce(started_at, now()),
    completed_at = now(),
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    failed_reason = case
      when normalized_status = 'failed' then nullif(trim(coalesce(p_failed_reason, '')), '')
      else null
    end,
    evidence_payload = normalized_payload,
    evidence_status = case
      when not coalesce(step_record.evidence_required, false) then 'not_required'
      when normalized_status = 'failed' then 'rejected'
      else 'complete'
    end,
    exception_status = case
      when normalized_status = 'failed' then 'open'
      else 'none'
    end
  where id = p_step_instance_id
    and company_id = p_company_id;

  if normalized_payload <> '{}'::jsonb then
    insert into public.workflow_evidence (
      company_id,
      workflow_instance_id,
      step_instance_id,
      workflow_id,
      step_id,
      evidence_type,
      value,
      captured_by,
      retention_until
    )
    values (
      p_company_id,
      step_record.run_id,
      p_step_instance_id,
      step_record.run_workflow_id::uuid,
      step_record.workflow_step_id,
      coalesce(step_record.step_type, 'field_payload'),
      normalized_payload,
      auth.uid(),
      current_date + 365
    )
    returning id into evidence_id;
  end if;

  if normalized_status = 'failed' then
    insert into public.workflow_exceptions (
      company_id,
      workflow_instance_id,
      step_instance_id,
      workflow_id,
      step_id,
      severity,
      status,
      title,
      description,
      owner_id,
      due_at,
      created_by
    )
    values (
      p_company_id,
      step_record.run_id,
      p_step_instance_id,
      step_record.run_workflow_id::uuid,
      step_record.workflow_step_id,
      coalesce(step_record.exception_policy ->> 'severity', 'warning'),
      'open',
      step_record.step_name || ' failed',
      nullif(trim(coalesce(p_failed_reason, '')), ''),
      auth.uid(),
      now() + make_interval(
        mins => greatest(coalesce((step_record.failure_escalation ->> 'due_minutes')::integer, 30), 0)
      ),
      auth.uid()
    )
    returning id into exception_id;
  end if;

  select pending_step.id
  into next_step_id
  from public.workflow_step_instances pending_step
  join public.workflow_steps step
    on step.id::text = pending_step.step_id
    and step.company_id = pending_step.company_id
  where pending_step.company_id = p_company_id
    and pending_step.workflow_instance_id = step_record.run_id::text
    and pending_step.status not in ('completed', 'failed', 'skipped')
  order by step.step_number asc
  limit 1;

  update public.task_workflow_instances
  set
    status = 'in_progress',
    current_step_id = next_step_id::text,
    exception_count = (
      select count(*)::integer
      from public.workflow_exceptions exception
      where exception.company_id = p_company_id
        and exception.workflow_instance_id = step_record.run_id
        and exception.status <> 'resolved'
    )
  where id = step_record.run_id
    and company_id = p_company_id;

  return jsonb_build_object(
    'step_instance_id', p_step_instance_id,
    'workflow_instance_id', step_record.run_id,
    'status', normalized_status,
    'next_step_id', next_step_id,
    'evidence_id', evidence_id,
    'exception_id', exception_id
  );
end;
$$;

grant execute on function public.complete_workflow_step(uuid, uuid, text, jsonb, text, text) to authenticated;

create or replace function public.complete_workflow_run(
  p_company_id uuid,
  p_workflow_instance_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  incomplete_count integer := 0;
  missing_evidence_count integer := 0;
  review_status_value text := 'not_required';
begin
  if not public.current_user_can_execute_workflow_run(p_company_id, p_workflow_instance_id) then
    raise exception 'Not allowed to complete this workflow run'
      using errcode = '42501';
  end if;

  select count(*)::integer
  into incomplete_count
  from public.workflow_step_instances step_run
  join public.workflow_steps step
    on step.id::text = step_run.step_id
    and step.company_id = step_run.company_id
  where step_run.company_id = p_company_id
    and step_run.workflow_instance_id = p_workflow_instance_id::text
    and coalesce(step.required, true)
    and step_run.status not in ('completed', 'failed', 'skipped');

  if incomplete_count > 0 then
    raise exception 'Required workflow steps are still incomplete'
      using errcode = '22023';
  end if;

  select count(*)::integer
  into missing_evidence_count
  from public.workflow_step_instances step_run
  join public.workflow_steps step
    on step.id::text = step_run.step_id
    and step.company_id = step_run.company_id
  where step_run.company_id = p_company_id
    and step_run.workflow_instance_id = p_workflow_instance_id::text
    and coalesce(step.evidence_required, false)
    and step_run.status = 'completed'
    and step_run.evidence_status <> 'complete';

  if missing_evidence_count > 0 then
    raise exception 'Required workflow evidence is still missing'
      using errcode = '22023';
  end if;

  select case when coalesce(workflow.review_required, false) then 'pending' else 'not_required' end
  into review_status_value
  from public.task_workflow_instances run
  left join public.workflows workflow
    on workflow.id::text = run.workflow_id
    and workflow.company_id = run.company_id
  where run.id = p_workflow_instance_id
    and run.company_id = p_company_id;

  update public.task_workflow_instances
  set
    status = 'completed',
    completed_at = now(),
    current_step_id = null,
    review_status = coalesce(review_status_value, 'not_required'),
    exception_count = (
      select count(*)::integer
      from public.workflow_exceptions exception
      where exception.company_id = p_company_id
        and exception.workflow_instance_id = p_workflow_instance_id
        and exception.status <> 'resolved'
    )
  where id = p_workflow_instance_id
    and company_id = p_company_id;

  insert into public.audit_log (
    company_id,
    actor_id,
    action,
    table_name,
    record_id,
    new_values,
    metadata
  )
  values (
    p_company_id,
    auth.uid(),
    'workflow.run.completed',
    'task_workflow_instances',
    p_workflow_instance_id::text,
    jsonb_build_object('review_status', coalesce(review_status_value, 'not_required')),
    jsonb_build_object('source', 'field_execution')
  );

  return jsonb_build_object(
    'workflow_instance_id', p_workflow_instance_id,
    'status', 'completed',
    'review_status', coalesce(review_status_value, 'not_required')
  );
end;
$$;

grant execute on function public.complete_workflow_run(uuid, uuid) to authenticated;
