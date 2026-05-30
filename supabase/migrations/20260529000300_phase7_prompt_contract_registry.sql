-- Phase 07.03: global AI prompt contract registry.

create or replace view public.ai_prompt_contracts_v
as
select *
from (
  values
    (
      'scheduling_assistant'::text,
      'Scheduling Assistant'::text,
      'Detect staffing risk and draft schedule-change suggestions.'::text,
      array['scheduling', 'employees', 'cost', 'tasks']::text[],
      'suggested_action'::text,
      '2026-05-29'::text,
      true,
      true,
      false,
      'Return no-action scheduling fallback and require manager review.'::text,
      array['raw_pii', 'payroll_detail', 'secret_material', 'cross_tenant_data']::text[]
    ),
    (
      'inventory_assistant',
      'Inventory Assistant',
      'Detect stock risk and draft reorder or prep adjustments.',
      array['inventory', 'cost', 'tasks']::text[],
      'suggested_action',
      '2026-05-29',
      true,
      true,
      false,
      'Return no-action inventory fallback and require manager review.',
      array['raw_pii', 'payroll_detail', 'secret_material', 'cross_tenant_data']::text[]
    ),
    (
      'waste_assistant',
      'Waste Assistant',
      'Detect waste outliers and suggest cost-control follow-ups.',
      array['inventory', 'cost', 'tasks']::text[],
      'suggested_action',
      '2026-05-29',
      true,
      true,
      false,
      'Return no-action waste fallback and require manager review.',
      array['raw_pii', 'payroll_detail', 'secret_material', 'cross_tenant_data']::text[]
    ),
    (
      'compliance_assistant',
      'Compliance Assistant',
      'Detect workflow/compliance gaps and suggest corrective tasks.',
      array['tasks', 'forms', 'employees']::text[],
      'suggested_action',
      '2026-05-29',
      true,
      true,
      false,
      'Return no-action compliance fallback and require manager review.',
      array['raw_pii', 'payroll_detail', 'secret_material', 'cross_tenant_data']::text[]
    ),
    (
      'manager_briefing',
      'Manager Briefing',
      'Summarize today''s operational risks and next best actions.',
      array['scheduling', 'inventory', 'tasks', 'forms', 'employees', 'cost']::text[],
      'read_only_insight',
      '2026-05-29',
      true,
      true,
      false,
      'Return a read-only briefing fallback with no recommendations.',
      array['raw_pii', 'payroll_detail', 'secret_material', 'cross_tenant_data']::text[]
    )
) as prompt_contracts (
  prompt_key,
  label,
  purpose,
  required_context_modules,
  action_level,
  output_schema_version,
  requires_json_output,
  requires_schema_validation,
  writes_allowed,
  fallback_behavior,
  blocked_data_classes
);

grant select on public.ai_prompt_contracts_v to authenticated;

create or replace view public.ai_prompt_contract_readiness_v
as
select
  count(*)::integer as prompt_contracts,
  bool_or(prompt_key = 'scheduling_assistant') as has_scheduling_assistant,
  bool_or(prompt_key = 'inventory_assistant') as has_inventory_assistant,
  bool_or(prompt_key = 'waste_assistant') as has_waste_assistant,
  bool_or(prompt_key = 'compliance_assistant') as has_compliance_assistant,
  bool_or(prompt_key = 'manager_briefing') as has_manager_briefing,
  bool_and(requires_json_output) as all_require_json_output,
  bool_and(requires_schema_validation) as all_require_schema_validation,
  bool_and(not writes_allowed) as all_block_direct_writes,
  bool_and(length(fallback_behavior) > 0) as all_have_fallback_behavior,
  bool_and(
    blocked_data_classes @> array[
      'raw_pii',
      'payroll_detail',
      'secret_material',
      'cross_tenant_data'
    ]::text[]
  ) as all_block_sensitive_data,
  (
    count(*) = 5
    and bool_or(prompt_key = 'scheduling_assistant')
    and bool_or(prompt_key = 'inventory_assistant')
    and bool_or(prompt_key = 'waste_assistant')
    and bool_or(prompt_key = 'compliance_assistant')
    and bool_or(prompt_key = 'manager_briefing')
    and bool_and(requires_json_output)
    and bool_and(requires_schema_validation)
    and bool_and(not writes_allowed)
    and bool_and(length(fallback_behavior) > 0)
    and bool_and(
      blocked_data_classes @> array[
        'raw_pii',
        'payroll_detail',
        'secret_material',
        'cross_tenant_data'
      ]::text[]
    )
  ) as ready_for_manager_briefing
from public.ai_prompt_contracts_v;

grant select on public.ai_prompt_contract_readiness_v to authenticated;

notify pgrst, 'reload schema';
