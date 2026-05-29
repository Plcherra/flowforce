-- Phase 06.02: SOP/checklist builder contract.
-- A single tenant-scoped RPC creates the form schema, workflow template,
-- workflow steps, and first assignment rule for executable routines.

create or replace function public.create_sop_checklist_template(
  p_company_id uuid,
  p_template jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  workflow_id uuid;
  form_id uuid;
  assignment_id uuid;
  step_item jsonb;
  field_id uuid;
  step_index integer := 0;
  template_name text;
  template_description text;
  template_category text;
  template_kind text;
begin
  if p_company_id is null or p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Company scope is required for SOP checklist templates'
      using errcode = '42501';
  end if;

  template_name := nullif(trim(coalesce(p_template ->> 'name', '')), '');
  if template_name is null then
    raise exception 'Template name is required'
      using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_template -> 'steps', '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_template -> 'steps', '[]'::jsonb)) = 0
  then
    raise exception 'At least one checklist step is required'
      using errcode = '22023';
  end if;

  template_description := nullif(trim(coalesce(p_template ->> 'description', '')), '');
  template_category := coalesce(nullif(trim(p_template ->> 'template_category'), ''), 'custom');
  template_kind := coalesce(nullif(trim(p_template ->> 'workflow_kind'), ''), 'checklist');

  insert into public.forms (
    company_id,
    title,
    description,
    status,
    created_by,
    settings
  )
  values (
    p_company_id,
    template_name,
    template_description,
    'published',
    auth.uid(),
    jsonb_build_object(
      'source', 'sop_checklist_builder',
      'template_category', template_category,
      'workflow_kind', template_kind,
      'requires_review', coalesce((p_template ->> 'review_required')::boolean, false)
    )
  )
  returning id into form_id;

  insert into public.workflows (
    company_id,
    name,
    description,
    workflow_kind,
    template_category,
    status,
    is_template,
    source_form_id,
    review_required,
    location_id,
    role_id,
    compliance_pack,
    retention_policy,
    audit_config,
    created_by
  )
  values (
    p_company_id,
    template_name,
    template_description,
    template_kind,
    template_category,
    'active',
    true,
    form_id,
    coalesce((p_template ->> 'review_required')::boolean, false),
    case
      when (p_template ->> 'location_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (p_template ->> 'location_id')::uuid
      else null
    end,
    case
      when (p_template ->> 'role_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (p_template ->> 'role_id')::uuid
      else null
    end,
    nullif(trim(coalesce(p_template ->> 'compliance_pack', '')), ''),
    coalesce(p_template -> 'retention_policy', '{}'::jsonb),
    jsonb_build_object('builder', 'sop_checklist_builder', 'version', '2026-05-28'),
    auth.uid()
  )
  returning id into workflow_id;

  for step_item in
    select value
    from jsonb_array_elements(p_template -> 'steps')
  loop
    step_index := step_index + 1;

    insert into public.form_fields (
      company_id,
      form_id,
      label,
      description,
      field_type,
      field_order,
      is_required,
      options,
      validation_rules,
      media_config,
      rating_config,
      scan_config
    )
    values (
      p_company_id,
      form_id,
      coalesce(nullif(trim(step_item ->> 'label'), ''), 'Checklist step ' || step_index),
      nullif(trim(coalesce(step_item ->> 'description', '')), ''),
      coalesce(nullif(trim(step_item ->> 'field_type'), ''), 'yes_no'),
      step_index,
      coalesce((step_item ->> 'required')::boolean, true),
      coalesce(step_item -> 'options', '[]'::jsonb),
      coalesce(step_item -> 'validation_rules', '{}'::jsonb),
      coalesce(step_item -> 'media_config', '{}'::jsonb),
      coalesce(step_item -> 'rating_config', '{}'::jsonb),
      coalesce(step_item -> 'scan_config', '{}'::jsonb)
    )
    returning id into field_id;

    insert into public.workflow_steps (
      company_id,
      workflow_id,
      form_field_id,
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
    values (
      p_company_id,
      workflow_id::text,
      field_id,
      coalesce(nullif(trim(step_item ->> 'label'), ''), 'Checklist step ' || step_index),
      nullif(trim(coalesce(step_item ->> 'description', '')), ''),
      step_index,
      coalesce(nullif(trim(step_item ->> 'step_type'), ''), 'check'),
      coalesce((step_item ->> 'required')::boolean, true),
      coalesce((step_item ->> 'evidence_required')::boolean, false),
      coalesce(step_item -> 'evidence_schema', '{}'::jsonb),
      coalesce(step_item -> 'failure_escalation', '{}'::jsonb),
      coalesce(step_item -> 'exception_policy', '{}'::jsonb)
    );
  end loop;

  insert into public.workflow_assignments (
    company_id,
    workflow_id,
    assignment_type,
    location_id,
    role_id,
    assigned_to,
    schedule_rule,
    due_window,
    escalation_rule,
    created_by
  )
  values (
    p_company_id,
    workflow_id,
    coalesce(nullif(trim(p_template ->> 'assignment_type'), ''), 'role'),
    case
      when (p_template ->> 'location_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (p_template ->> 'location_id')::uuid
      else null
    end,
    case
      when (p_template ->> 'role_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (p_template ->> 'role_id')::uuid
      else null
    end,
    case
      when (p_template ->> 'assigned_to') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (p_template ->> 'assigned_to')::uuid
      else null
    end,
    coalesce(p_template -> 'schedule_rule', '{}'::jsonb),
    coalesce(p_template -> 'due_window', '{}'::jsonb),
    coalesce(p_template -> 'escalation_rule', '{}'::jsonb),
    auth.uid()
  )
  returning id into assignment_id;

  return jsonb_build_object(
    'workflow_id', workflow_id,
    'form_id', form_id,
    'assignment_id', assignment_id,
    'step_count', step_index
  );
end;
$$;

grant execute on function public.create_sop_checklist_template(uuid, jsonb) to authenticated;

create or replace view public.sop_checklist_builder_templates_v
with (security_invoker = true)
as
select
  workflow.company_id,
  workflow.id as workflow_id,
  workflow.source_form_id as form_id,
  workflow.name,
  workflow.description,
  workflow.workflow_kind,
  workflow.template_category,
  workflow.review_required,
  workflow.status,
  workflow.created_at,
  count(distinct step.id)::integer as step_count,
  count(distinct assignment.id)::integer as assignment_count,
  count(distinct step.id) filter (where coalesce(step.evidence_required, false))::integer as evidence_step_count
from public.workflows workflow
left join public.workflow_steps step
  on step.workflow_id::text = workflow.id::text
  and step.company_id = workflow.company_id
left join public.workflow_assignments assignment
  on assignment.workflow_id = workflow.id
  and assignment.company_id = workflow.company_id
where workflow.is_template is true
  and workflow.workflow_kind in ('checklist', 'sop', 'inspection', 'inventory_count')
group by
  workflow.company_id,
  workflow.id,
  workflow.source_form_id,
  workflow.name,
  workflow.description,
  workflow.workflow_kind,
  workflow.template_category,
  workflow.review_required,
  workflow.status,
  workflow.created_at;

grant select on public.sop_checklist_builder_templates_v to authenticated;

notify pgrst, 'reload schema';
