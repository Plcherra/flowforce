-- Phase 07.01: tenant-safe AI governance baseline.

create extension if not exists pgcrypto;

create table if not exists public.ai_governance_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  policy_key text not null,
  action_level text not null,
  status text not null default 'active',
  required_permissions text[] not null default '{}'::text[],
  allowed_modules text[] not null default '{}'::text[],
  allowed_data_classes text[] not null default '{}'::text[],
  blocked_data_classes text[] not null default '{}'::text[],
  requires_human_approval boolean not null default true,
  allows_background_automation boolean not null default false,
  audit_event text not null,
  retention text not null default 'extended',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_governance_policies_company_policy_key unique (company_id, policy_key),
  constraint ai_governance_policies_action_level_known
    check (action_level in ('read_only_insight', 'suggested_action', 'approved_action', 'automated_action')),
  constraint ai_governance_policies_status_known
    check (status in ('draft', 'active', 'paused', 'retired')),
  constraint ai_governance_policies_retention_known
    check (retention in ('standard', 'extended'))
);

create index if not exists ai_governance_policies_company_id_idx
on public.ai_governance_policies (company_id);

create index if not exists ai_governance_policies_action_level_idx
on public.ai_governance_policies (action_level);

drop trigger if exists set_ai_governance_policies_updated_at on public.ai_governance_policies;
create trigger set_ai_governance_policies_updated_at
before update on public.ai_governance_policies
for each row execute function public.set_updated_at();

alter table public.ai_governance_policies enable row level security;

drop policy if exists "Company members can manage AI governance policies" on public.ai_governance_policies;
create policy "Company members can manage AI governance policies"
on public.ai_governance_policies
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

grant select, insert, update, delete on public.ai_governance_policies to authenticated;

create or replace function public.install_ai_governance_baseline(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  inserted_or_updated integer := 0;
begin
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to install AI governance for this company';
  end if;

  insert into public.ai_governance_policies (
    company_id,
    policy_key,
    action_level,
    status,
    required_permissions,
    allowed_modules,
    allowed_data_classes,
    blocked_data_classes,
    requires_human_approval,
    allows_background_automation,
    audit_event,
    retention,
    metadata,
    created_by
  )
  values
    (
      p_company_id,
      'read_only_insight',
      'read_only_insight',
      'active',
      array['viewAIInsights', 'ai.insights.view'],
      array['operations', 'inventory', 'scheduling', 'tasks', 'forms', 'costing'],
      array[
        'tenant_operational_summary',
        'aggregated_financial_metrics',
        'workflow_exception_metadata',
        'schedule_coverage_metadata',
        'inventory_cost_metrics'
      ],
      array['raw_pii', 'payroll_detail', 'secret_material', 'cross_tenant_data'],
      false,
      false,
      'ai.insight.generated',
      'standard',
      '{"phase":"07.01","writes_allowed":false}'::jsonb,
      actor_id
    ),
    (
      p_company_id,
      'suggested_action',
      'suggested_action',
      'active',
      array['viewAIInsights', 'ai.actions.suggest'],
      array['operations', 'inventory', 'scheduling', 'tasks', 'forms', 'costing'],
      array[
        'tenant_operational_summary',
        'workflow_exception_metadata',
        'schedule_coverage_metadata',
        'inventory_cost_metrics',
        'employee_profile_minimum'
      ],
      array['raw_pii', 'payroll_detail', 'secret_material', 'cross_tenant_data'],
      true,
      false,
      'ai.suggestion.created',
      'extended',
      '{"phase":"07.01","writes_allowed":false}'::jsonb,
      actor_id
    ),
    (
      p_company_id,
      'approved_action',
      'approved_action',
      'active',
      array['ai.actions.approve'],
      array['operations', 'inventory', 'scheduling', 'tasks', 'forms'],
      array[
        'tenant_operational_summary',
        'workflow_exception_metadata',
        'schedule_coverage_metadata',
        'inventory_cost_metrics',
        'employee_profile_minimum'
      ],
      array['raw_pii', 'payroll_detail', 'secret_material', 'cross_tenant_data'],
      true,
      false,
      'ai.action.approved',
      'extended',
      '{"phase":"07.01","writes_allowed":"approval_required"}'::jsonb,
      actor_id
    ),
    (
      p_company_id,
      'automated_action',
      'automated_action',
      'active',
      array['ai.actions.automate', 'ai.governance.manage'],
      array['operations', 'tasks', 'notifications'],
      array[
        'tenant_operational_summary',
        'workflow_exception_metadata',
        'schedule_coverage_metadata'
      ],
      array['raw_pii', 'payroll_detail', 'secret_material', 'cross_tenant_data'],
      true,
      true,
      'ai.automation.executed',
      'extended',
      '{"phase":"07.01","writes_allowed":"preapproved_low_risk_only"}'::jsonb,
      actor_id
    )
  on conflict (company_id, policy_key)
  do update set
    action_level = excluded.action_level,
    status = 'active',
    required_permissions = excluded.required_permissions,
    allowed_modules = excluded.allowed_modules,
    allowed_data_classes = excluded.allowed_data_classes,
    blocked_data_classes = excluded.blocked_data_classes,
    requires_human_approval = excluded.requires_human_approval,
    allows_background_automation = excluded.allows_background_automation,
    audit_event = excluded.audit_event,
    retention = excluded.retention,
    metadata = excluded.metadata,
    updated_at = now();

  get diagnostics inserted_or_updated = row_count;

  return jsonb_build_object(
    'company_id', p_company_id,
    'policies_ready', (
      select count(*)
      from public.ai_governance_policies policy
      where policy.company_id = p_company_id
        and policy.status = 'active'
    ),
    'action_levels', array[
      'read_only_insight',
      'suggested_action',
      'approved_action',
      'automated_action'
    ],
    'inserted_or_updated', inserted_or_updated
  );
end;
$$;

grant execute on function public.install_ai_governance_baseline(uuid) to authenticated;

create or replace view public.ai_governance_readiness_v
with (security_invoker = true)
as
select
  policy.company_id,
  count(*)::integer as governance_policies,
  bool_or(policy.action_level = 'read_only_insight' and policy.status = 'active') as has_read_only_insight,
  bool_or(policy.action_level = 'suggested_action' and policy.status = 'active') as has_suggested_action,
  bool_or(policy.action_level = 'approved_action' and policy.status = 'active') as has_approved_action,
  bool_or(policy.action_level = 'automated_action' and policy.status = 'active') as has_automated_action,
  bool_and(
    policy.blocked_data_classes @> array[
      'raw_pii',
      'payroll_detail',
      'secret_material',
      'cross_tenant_data'
    ]::text[]
  ) as blocks_sensitive_data,
  bool_and(policy.audit_event like 'ai.%') as has_audit_events,
  (
    count(*) >= 4
    and bool_or(policy.action_level = 'read_only_insight' and policy.status = 'active')
    and bool_or(policy.action_level = 'suggested_action' and policy.status = 'active')
    and bool_or(policy.action_level = 'approved_action' and policy.status = 'active')
    and bool_or(policy.action_level = 'automated_action' and policy.status = 'active')
    and bool_and(
      policy.blocked_data_classes @> array[
        'raw_pii',
        'payroll_detail',
        'secret_material',
        'cross_tenant_data'
      ]::text[]
    )
    and bool_and(policy.audit_event like 'ai.%')
  ) as ready_for_ai_phase_two
from public.ai_governance_policies policy
where policy.company_id in (select public.current_user_company_ids())
group by policy.company_id;

grant select on public.ai_governance_readiness_v to authenticated;

notify pgrst, 'reload schema';
