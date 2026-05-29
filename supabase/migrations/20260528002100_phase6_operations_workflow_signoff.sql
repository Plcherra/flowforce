-- Phase 06.10: operations workflow signoff.
-- Adds an idempotent demo workflow installer and readiness view so the
-- operations workflow system can be smoke-tested as a complete product loop.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.install_operations_workflow_demo(
  p_company_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  demo_user_id uuid;
  demo_specs jsonb;
  spec jsonb;
  step_item jsonb;
  target_workflow_id uuid;
  target_assignment_id uuid;
  step_index integer;
  generated_result jsonb;
  opening_run_id uuid;
  cleaning_run_id uuid;
  food_safety_run_id uuid;
  failed_step_instance_id uuid;
  failed_step_id uuid;
  exception_id uuid;
begin
  if p_company_id is null then
    raise exception 'Company scope is required for operations workflow demo'
      using errcode = '22023';
  end if;

  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to install operations workflow demo for this company'
      using errcode = '42501';
  end if;

  select profile.id
  into demo_user_id
  from public.profiles profile
  where profile.company_id = p_company_id
    and profile.id = auth.uid()
  limit 1;

  if demo_user_id is null then
    select member.user_id
    into demo_user_id
    from public.company_members member
    where member.company_id = p_company_id
    order by
      case member.role
        when 'owner' then 0
        when 'admin' then 1
        when 'manager' then 2
        else 3
      end,
      member.added_at nulls last
    limit 1;
  end if;

  if demo_user_id is null then
    raise exception 'A demo user or member is required for operations workflow demo'
      using errcode = '22023';
  end if;

  demo_specs := jsonb_build_array(
    jsonb_build_object(
      'demo_key', 'opening_checklist',
      'name', 'Demo Opening Checklist',
      'description', 'Open the location with station, safety, and manager-ready checks.',
      'workflow_kind', 'checklist',
      'template_category', 'opening',
      'review_required', false,
      'due_time', '08:00',
      'steps', jsonb_build_array(
        jsonb_build_object('name', 'Unlock and inspect entrance', 'step_type', 'check', 'evidence_required', false),
        jsonb_build_object('name', 'Record cooler temperature', 'step_type', 'measurement', 'evidence_required', true),
        jsonb_build_object('name', 'Confirm prep stations are ready', 'step_type', 'check', 'evidence_required', true)
      )
    ),
    jsonb_build_object(
      'demo_key', 'closing_checklist',
      'name', 'Demo Closing Checklist',
      'description', 'Close the location with cash, equipment, and manager signoff checks.',
      'workflow_kind', 'checklist',
      'template_category', 'closing',
      'review_required', true,
      'due_time', '22:00',
      'steps', jsonb_build_array(
        jsonb_build_object('name', 'Close registers and record variance', 'step_type', 'measurement', 'evidence_required', true),
        jsonb_build_object('name', 'Shut down line equipment', 'step_type', 'check', 'evidence_required', false),
        jsonb_build_object('name', 'Capture manager signoff', 'step_type', 'signature', 'evidence_required', true)
      )
    ),
    jsonb_build_object(
      'demo_key', 'cleaning_routine',
      'name', 'Demo Cleaning Routine',
      'description', 'Show repeatable sanitation work with review-ready evidence.',
      'workflow_kind', 'sop',
      'template_category', 'cleaning',
      'review_required', true,
      'due_time', '15:00',
      'steps', jsonb_build_array(
        jsonb_build_object('name', 'Sanitize prep surfaces', 'step_type', 'check', 'evidence_required', true),
        jsonb_build_object('name', 'Restock handwash stations', 'step_type', 'check', 'evidence_required', false)
      )
    ),
    jsonb_build_object(
      'demo_key', 'food_safety_check',
      'name', 'Demo Food Safety Check',
      'description', 'Create a visible failed step, manager queue item, and automation hook.',
      'workflow_kind', 'inspection',
      'template_category', 'food_safety',
      'compliance_pack', 'food_safety',
      'review_required', true,
      'due_time', '10:30',
      'steps', jsonb_build_array(
        jsonb_build_object('name', 'Record hot-hold temperature', 'step_type', 'temperature', 'evidence_required', true),
        jsonb_build_object('name', 'Inspect date labels', 'step_type', 'check', 'evidence_required', true),
        jsonb_build_object('name', 'Document corrective action', 'step_type', 'note', 'evidence_required', true)
      )
    )
  );

  for spec in
    select value
    from jsonb_array_elements(demo_specs)
  loop
    select workflow.id
    into target_workflow_id
    from public.workflows workflow
    where workflow.company_id = p_company_id
      and workflow.audit_config ->> 'demo_key' = spec ->> 'demo_key'
    limit 1;

    if target_workflow_id is null then
      insert into public.workflows (
        company_id,
        name,
        description,
        workflow_kind,
        template_category,
        compliance_pack,
        status,
        is_template,
        review_required,
        retention_policy,
        audit_config,
        created_by
      )
      values (
        p_company_id,
        spec ->> 'name',
        spec ->> 'description',
        spec ->> 'workflow_kind',
        spec ->> 'template_category',
        nullif(spec ->> 'compliance_pack', ''),
        'active',
        true,
        coalesce((spec ->> 'review_required')::boolean, false),
        jsonb_build_object('demo_retention', true, 'record_source', 'sample'),
        jsonb_build_object(
          'source', 'operations_workflow_signoff',
          'demo_key', spec ->> 'demo_key',
          'record_source', 'sample'
        ),
        demo_user_id
      )
      returning id into target_workflow_id;
    else
      update public.workflows
      set
        name = spec ->> 'name',
        description = spec ->> 'description',
        status = 'active',
        is_template = true,
        review_required = coalesce((spec ->> 'review_required')::boolean, false),
        audit_config = coalesce(audit_config, '{}'::jsonb) || jsonb_build_object(
          'source', 'operations_workflow_signoff',
          'demo_key', spec ->> 'demo_key',
          'record_source', 'sample'
        )
      where public.workflows.id = target_workflow_id
        and company_id = p_company_id;
    end if;

    step_index := 0;
    for step_item in
      select value
      from jsonb_array_elements(spec -> 'steps')
    loop
      step_index := step_index + 1;

      insert into public.workflow_steps (
        company_id,
        workflow_id,
        name,
        description,
        step_number,
        step_type,
        required,
        evidence_required,
        evidence_schema,
        failure_escalation,
        exception_policy
      )
      select
        p_company_id,
        target_workflow_id::text,
        step_item ->> 'name',
        'Demo workflow signoff step',
        step_index,
        step_item ->> 'step_type',
        true,
        coalesce((step_item ->> 'evidence_required')::boolean, false),
        jsonb_build_object('record_source', 'sample'),
        jsonb_build_object('overdue_minutes', 15, 'create_task', true),
        jsonb_build_object('severity', case when spec ->> 'demo_key' = 'food_safety_check' then 'critical' else 'warning' end)
      where not exists (
        select 1
        from public.workflow_steps existing_step
        where existing_step.company_id = p_company_id
          and existing_step.workflow_id = target_workflow_id::text
          and existing_step.name = step_item ->> 'name'
      );
    end loop;

    select assignment.id
    into target_assignment_id
    from public.workflow_assignments assignment
    where assignment.company_id = p_company_id
      and assignment.workflow_id = target_workflow_id
      and assignment.schedule_rule ->> 'demo_key' = spec ->> 'demo_key'
    limit 1;

    if target_assignment_id is null then
      insert into public.workflow_assignments (
        company_id,
        workflow_id,
        assignment_type,
        assigned_to,
        schedule_rule,
        due_window,
        escalation_rule,
        is_active,
        created_by
      )
      values (
        p_company_id,
        target_workflow_id,
        'person',
        demo_user_id,
        jsonb_build_object(
          'frequency', 'daily',
          'demo_key', spec ->> 'demo_key',
          'record_source', 'sample'
        ),
        jsonb_build_object(
          'due_time', spec ->> 'due_time',
          'timezone', 'UTC',
          'start_minutes_before_due', 60
        ),
        jsonb_build_object('overdue_minutes', 15, 'notify_manager', true),
        true,
        demo_user_id
      )
      returning id into target_assignment_id;
    else
      update public.workflow_assignments
      set
        assigned_to = demo_user_id,
        is_active = true,
        schedule_rule = coalesce(schedule_rule, '{}'::jsonb) || jsonb_build_object(
          'frequency', 'daily',
          'demo_key', spec ->> 'demo_key',
          'record_source', 'sample'
        )
      where public.workflow_assignments.id = target_assignment_id
        and company_id = p_company_id;
    end if;
  end loop;

  generated_result := public.generate_recurring_workflow_runs(
    p_company_id,
    current_date,
    current_date
  );

  update public.task_workflow_instances run
  set metadata = coalesce(run.metadata, '{}'::jsonb) || jsonb_build_object(
    'source', 'operations_workflow_signoff',
    'record_source', 'sample'
  )
  from public.workflows workflow
  where workflow.company_id = run.company_id
    and workflow.id::text = run.workflow_id
    and workflow.audit_config ->> 'source' = 'operations_workflow_signoff'
    and run.company_id = p_company_id
    and run.scheduled_for = current_date;

  select run.id
  into opening_run_id
  from public.task_workflow_instances run
  join public.workflows workflow
    on workflow.id::text = run.workflow_id
    and workflow.company_id = run.company_id
  where run.company_id = p_company_id
    and run.scheduled_for = current_date
    and workflow.audit_config ->> 'demo_key' = 'opening_checklist'
  limit 1;

  select run.id
  into cleaning_run_id
  from public.task_workflow_instances run
  join public.workflows workflow
    on workflow.id::text = run.workflow_id
    and workflow.company_id = run.company_id
  where run.company_id = p_company_id
    and run.scheduled_for = current_date
    and workflow.audit_config ->> 'demo_key' = 'cleaning_routine'
  limit 1;

  select run.id
  into food_safety_run_id
  from public.task_workflow_instances run
  join public.workflows workflow
    on workflow.id::text = run.workflow_id
    and workflow.company_id = run.company_id
  where run.company_id = p_company_id
    and run.scheduled_for = current_date
    and workflow.audit_config ->> 'demo_key' = 'food_safety_check'
  limit 1;

  if opening_run_id is not null then
    update public.task_workflow_instances
    set
      status = 'completed',
      started_at = now() - interval '5 hours',
      completed_at = now() - interval '4 hours',
      review_status = 'approved'
    where id = opening_run_id
      and company_id = p_company_id;

    update public.workflow_step_instances
    set
      status = 'completed',
      evidence_status = case when evidence_status = 'missing' then 'complete' else evidence_status end,
      started_at = now() - interval '5 hours',
      completed_at = now() - interval '4 hours'
    where company_id = p_company_id
      and workflow_instance_id = opening_run_id::text;

    insert into public.workflow_reviews (
      company_id,
      workflow_instance_id,
      review_status,
      reviewer_id,
      decision,
      comments,
      reviewed_at
    )
    select
      p_company_id,
      opening_run_id,
      'approved',
      demo_user_id,
      'approved',
      'Demo opening checklist reviewed and approved.',
      now() - interval '4 hours'
    where not exists (
      select 1
      from public.workflow_reviews existing_review
      where existing_review.company_id = p_company_id
        and existing_review.workflow_instance_id = opening_run_id
        and existing_review.decision = 'approved'
    );
  end if;

  if cleaning_run_id is not null then
    update public.task_workflow_instances
    set
      status = 'completed',
      started_at = now() - interval '2 hours',
      completed_at = now() - interval '90 minutes',
      review_status = 'pending'
    where id = cleaning_run_id
      and company_id = p_company_id;

    update public.workflow_step_instances
    set
      status = 'completed',
      evidence_status = case when evidence_status = 'missing' then 'complete' else evidence_status end,
      started_at = now() - interval '2 hours',
      completed_at = now() - interval '90 minutes'
    where company_id = p_company_id
      and workflow_instance_id = cleaning_run_id::text;
  end if;

  if food_safety_run_id is not null then
    update public.task_workflow_instances
    set
      status = 'in_progress',
      started_at = now() - interval '1 hour',
      due_at = now() - interval '30 minutes',
      escalation_at = now() - interval '15 minutes',
      review_status = 'pending'
    where id = food_safety_run_id
      and company_id = p_company_id;

    select
      step_run.id,
      step_run.step_id::uuid
    into failed_step_instance_id, failed_step_id
    from public.workflow_step_instances step_run
    join public.workflow_steps step
      on step.id::text = step_run.step_id
      and step.company_id = step_run.company_id
    where step_run.company_id = p_company_id
      and step_run.workflow_instance_id = food_safety_run_id::text
    order by step.step_number
    limit 1;

    if failed_step_instance_id is not null then
      update public.workflow_step_instances
      set
        status = 'failed',
        evidence_status = 'rejected',
        exception_status = 'open',
        failed_reason = 'Demo hot-hold temperature was below threshold.',
        started_at = now() - interval '1 hour'
      where id = failed_step_instance_id
        and company_id = p_company_id;

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
      select
        p_company_id,
        food_safety_run_id,
        failed_step_instance_id,
        (select workflow_id::uuid from public.task_workflow_instances where id = food_safety_run_id),
        failed_step_id,
        'critical',
        'open',
        'Demo food safety temperature exception',
        'Hot-hold temperature was below the demo threshold and created follow-up work.',
        demo_user_id,
        now() + interval '30 minutes',
        demo_user_id
      where not exists (
        select 1
        from public.workflow_exceptions existing_exception
        where existing_exception.company_id = p_company_id
          and existing_exception.workflow_instance_id = food_safety_run_id
          and existing_exception.title = 'Demo food safety temperature exception'
      )
      returning id into exception_id;
    end if;
  end if;

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
  select
    step_run.company_id,
    step_run.workflow_instance_id::uuid,
    step_run.id,
    run.workflow_id::uuid,
    step_run.step_id::uuid,
    'demo_workflow_result',
    jsonb_build_object(
      'source', 'operations_workflow_signoff',
      'record_source', 'sample',
      'status', step_run.status,
      'evidence_status', step_run.evidence_status
    ),
    demo_user_id,
    current_date + 30
  from public.workflow_step_instances step_run
  join public.task_workflow_instances run
    on run.id::text = step_run.workflow_instance_id
    and run.company_id = step_run.company_id
  join public.workflows workflow
    on workflow.id::text = run.workflow_id
    and workflow.company_id = run.company_id
  where step_run.company_id = p_company_id
    and run.scheduled_for = current_date
    and workflow.audit_config ->> 'source' = 'operations_workflow_signoff'
    and step_run.status in ('completed', 'failed')
    and not exists (
      select 1
      from public.workflow_evidence existing_evidence
      where existing_evidence.company_id = step_run.company_id
        and existing_evidence.step_instance_id = step_run.id
        and existing_evidence.evidence_type = 'demo_workflow_result'
    );

  return jsonb_build_object(
    'company_id', p_company_id,
    'demo_user_id', demo_user_id,
    'workflows_ready', (
      select count(*)::integer
      from public.workflows workflow
      where workflow.company_id = p_company_id
        and workflow.audit_config ->> 'source' = 'operations_workflow_signoff'
    ),
    'runs_ready', (
      select count(*)::integer
      from public.task_workflow_instances run
      join public.workflows workflow
        on workflow.id::text = run.workflow_id
        and workflow.company_id = run.company_id
      where run.company_id = p_company_id
        and run.scheduled_for = current_date
        and workflow.audit_config ->> 'source' = 'operations_workflow_signoff'
    ),
    'generated', generated_result,
    'exception_id', exception_id
  );
end;
$$;

grant execute on function public.install_operations_workflow_demo(uuid) to authenticated;

create or replace view public.operations_workflow_demo_readiness_v
with (security_invoker = true)
as
with demo_workflows as (
  select workflow.*
  from public.workflows workflow
  where workflow.company_id in (select public.current_user_company_ids())
    and workflow.audit_config ->> 'source' = 'operations_workflow_signoff'
),
demo_runs as (
  select run.*
  from public.task_workflow_instances run
  join demo_workflows workflow
    on workflow.id::text = run.workflow_id
    and workflow.company_id = run.company_id
),
demo_exceptions as (
  select exception.*
  from public.workflow_exceptions exception
  join demo_runs run
    on run.id = exception.workflow_instance_id
    and run.company_id = exception.company_id
),
demo_automation as (
  select automation.*
  from public.workflow_automation_runs automation
  join demo_exceptions exception
    on exception.id = automation.workflow_exception_id
    and exception.company_id = automation.company_id
)
select
  company.company_id,
  count(distinct workflow.id)::integer as demo_workflows,
  count(distinct step.id)::integer as demo_steps,
  count(distinct assignment.id)::integer as demo_assignments,
  count(distinct run.id)::integer as demo_runs,
  count(distinct run.id) filter (where run.status = 'completed')::integer as completed_runs,
  count(distinct run.id) filter (where run.review_status = 'pending')::integer as pending_review_runs,
  count(distinct exception.id)::integer as open_exceptions,
  count(distinct automation.id)::integer as automation_runs,
  coalesce(max(summary.execution_quality_score), 0)::integer as execution_quality_score,
  '/app/operations'::text as desktop_demo_route,
  '/app/operations'::text as mobile_demo_route,
  (
    count(distinct workflow.id) >= 4
    and count(distinct run.id) >= 4
    and count(distinct exception.id) >= 1
  ) as ready_for_demo
from (
  select distinct company_id
  from demo_workflows
) company
left join demo_workflows workflow
  on workflow.company_id = company.company_id
left join public.workflow_steps step
  on step.company_id = workflow.company_id
  and step.workflow_id = workflow.id::text
left join public.workflow_assignments assignment
  on assignment.company_id = workflow.company_id
  and assignment.workflow_id = workflow.id
left join demo_runs run
  on run.company_id = workflow.company_id
  and run.workflow_id = workflow.id::text
left join demo_exceptions exception
  on exception.company_id = run.company_id
  and exception.workflow_instance_id = run.id
  and exception.status <> 'resolved'
left join demo_automation automation
  on automation.company_id = exception.company_id
  and automation.workflow_exception_id = exception.id
left join public.operations_execution_quality_summary_v summary
  on summary.company_id = company.company_id
group by company.company_id;

grant select on public.operations_workflow_demo_readiness_v to authenticated;

notify pgrst, 'reload schema';
