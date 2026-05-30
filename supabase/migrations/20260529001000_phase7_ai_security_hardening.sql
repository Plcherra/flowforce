-- Phase 07 hardening: close client-side AI governance and telemetry mutation paths.

drop policy if exists "Company members can manage AI governance policies" on public.ai_governance_policies;
drop policy if exists "Company members can read AI governance policies" on public.ai_governance_policies;

create policy "Company members can read AI governance policies"
on public.ai_governance_policies
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

revoke insert, update, delete on public.ai_governance_policies from authenticated;
grant select on public.ai_governance_policies to authenticated;

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
  request_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
  inserted_or_updated integer := 0;
begin
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if request_role <> 'service_role' then
    if p_company_id not in (select public.current_user_company_ids()) then
      raise exception 'Not allowed to install AI governance for this company';
    end if;

    if not public.current_user_is_company_admin(p_company_id) then
      raise exception 'Company admin permission is required to install AI governance';
    end if;
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
      '{"phase":"07.01","writes_allowed":false,"mutation_path":"admin_rpc"}'::jsonb,
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
      '{"phase":"07.01","writes_allowed":false,"mutation_path":"admin_rpc"}'::jsonb,
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
      '{"phase":"07.01","writes_allowed":"approval_required","mutation_path":"admin_rpc"}'::jsonb,
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
      '{"phase":"07.01","writes_allowed":"preapproved_low_risk_only","mutation_path":"admin_rpc"}'::jsonb,
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
    actor_id,
    'ai.governance.updated',
    'ai_governance_policies',
    p_company_id::text,
    '{}'::jsonb,
    jsonb_build_object(
      'policies_ready', (
        select count(*)
        from public.ai_governance_policies policy
        where policy.company_id = p_company_id
          and policy.status = 'active'
      ),
      'mutation_path', case when request_role = 'service_role' then 'service_role' else 'admin_rpc' end
    ),
    jsonb_build_object(
      'phase', '07.hardening',
      'admin_required', request_role <> 'service_role'
    )
  );

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
    'inserted_or_updated', inserted_or_updated,
    'mutation_path', case when request_role = 'service_role' then 'service_role' else 'admin_rpc' end
  );
end;
$$;

grant execute on function public.install_ai_governance_baseline(uuid) to authenticated, service_role;

revoke all on function public.record_ai_usage_event(uuid, text, text, text, integer, integer, integer, integer, integer, text, text, numeric, jsonb) from public;
revoke execute on function public.record_ai_usage_event(uuid, text, text, text, integer, integer, integer, integer, integer, text, text, numeric, jsonb) from anon, authenticated;

create or replace function public.record_ai_usage_event(
  p_company_id uuid,
  p_prompt_key text,
  p_model text,
  p_status text,
  p_input_tokens integer default 0,
  p_output_tokens integer default 0,
  p_latency_ms integer default 0,
  p_retry_count integer default 0,
  p_timeout_ms integer default 15000,
  p_error_code text default null,
  p_error_message text default null,
  p_cost_usd numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_prompt_key text := lower(trim(coalesce(p_prompt_key, '')));
  normalized_model text := lower(trim(coalesce(p_model, '')));
  normalized_status text := lower(trim(coalesce(p_status, '')));
  request_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
  metadata_user_id text := nullif(coalesce(p_metadata->>'user_id', ''), '');
  actor_id uuid := auth.uid();
  budget_record record;
  current_used_tokens integer := 0;
  current_used_cost numeric := 0;
  normalized_input_tokens integer := greatest(coalesce(p_input_tokens, 0), 0);
  normalized_output_tokens integer := greatest(coalesce(p_output_tokens, 0), 0);
  normalized_total_tokens integer := 0;
  normalized_cost_usd numeric := 0;
  should_block boolean := false;
  event_status text;
  event_id uuid;
begin
  if request_role <> 'service_role' then
    raise exception 'AI usage telemetry must be recorded by a trusted server context';
  end if;

  if actor_id is null and metadata_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    actor_id := metadata_user_id::uuid;
  end if;

  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if normalized_prompt_key not in (
    'scheduling_assistant',
    'inventory_assistant',
    'waste_assistant',
    'compliance_assistant',
    'manager_briefing'
  ) then
    raise exception 'Unsupported AI prompt key';
  end if;

  if normalized_model = '' then
    raise exception 'model is required';
  end if;

  if normalized_status not in ('succeeded', 'failed', 'timeout', 'budget_blocked', 'fallback') then
    raise exception 'Unsupported AI usage status';
  end if;

  normalized_total_tokens := normalized_input_tokens + normalized_output_tokens;
  normalized_cost_usd := coalesce(
    p_cost_usd,
    round((normalized_input_tokens::numeric * 0.00000015) + (normalized_output_tokens::numeric * 0.00000060), 6)
  );

  select *
  into budget_record
  from public.ai_budget_controls budget
  where budget.company_id = p_company_id
    and budget.model = normalized_model;

  if budget_record.id is null then
    insert into public.ai_budget_controls (
      company_id,
      model,
      created_by,
      updated_by
    )
    values (
      p_company_id,
      normalized_model,
      actor_id,
      actor_id
    )
    returning * into budget_record;
  end if;

  select
    coalesce(sum(usage_event.total_tokens), 0)::integer,
    coalesce(sum(usage_event.cost_usd), 0)::numeric
  into current_used_tokens, current_used_cost
  from public.ai_usage_events usage_event
  where usage_event.company_id = p_company_id
    and usage_event.model = normalized_model
    and usage_event.created_at >= date_trunc('month', now());

  should_block := (
    not budget_record.enabled
    or current_used_tokens + normalized_total_tokens > budget_record.monthly_token_limit
    or current_used_cost + normalized_cost_usd > budget_record.monthly_cost_limit_usd
  );

  event_status := case
    when should_block and normalized_status = 'succeeded' then 'budget_blocked'
    else normalized_status
  end;

  insert into public.ai_usage_events (
    company_id,
    prompt_key,
    provider,
    model,
    status,
    input_tokens,
    output_tokens,
    total_tokens,
    latency_ms,
    retry_count,
    timeout_ms,
    error_code,
    error_message,
    cost_usd,
    fallback_used,
    metadata,
    user_id,
    created_by
  )
  values (
    p_company_id,
    normalized_prompt_key,
    'openai',
    normalized_model,
    event_status,
    normalized_input_tokens,
    normalized_output_tokens,
    normalized_total_tokens,
    greatest(coalesce(p_latency_ms, 0), 0),
    greatest(coalesce(p_retry_count, budget_record.max_retries), 0),
    greatest(coalesce(p_timeout_ms, budget_record.timeout_ms), 1),
    case
      when event_status = 'budget_blocked' then coalesce(nullif(trim(coalesce(p_error_code, '')), ''), 'budget_exceeded')
      else nullif(trim(coalesce(p_error_code, '')), '')
    end,
    case
      when event_status = 'budget_blocked' then coalesce(nullif(left(trim(coalesce(p_error_message, '')), 500), ''), 'AI budget limit reached; safe fallback returned.')
      else nullif(left(trim(coalesce(p_error_message, '')), 500), '')
    end,
    normalized_cost_usd,
    event_status in ('fallback', 'budget_blocked', 'failed', 'timeout'),
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'budget_evaluated', true,
      'safe_fallback_required', event_status in ('fallback', 'budget_blocked', 'failed', 'timeout'),
      'trusted_server_context', true
    ),
    actor_id,
    actor_id
  )
  returning id into event_id;

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
    actor_id,
    case
      when event_status in ('failed', 'timeout', 'budget_blocked', 'fallback') then 'ai.usage_event.degraded'
      else 'ai.usage_event.recorded'
    end,
    'ai_usage_events',
    event_id::text,
    '{}'::jsonb,
    jsonb_build_object(
      'prompt_key', normalized_prompt_key,
      'model', normalized_model,
      'status', event_status,
      'total_tokens', normalized_total_tokens,
      'cost_usd', normalized_cost_usd
    ),
    jsonb_build_object(
      'phase', '07.hardening',
      'retry_count', greatest(coalesce(p_retry_count, budget_record.max_retries), 0),
      'timeout_ms', greatest(coalesce(p_timeout_ms, budget_record.timeout_ms), 1),
      'safe_fallback_required', event_status in ('fallback', 'budget_blocked', 'failed', 'timeout'),
      'trusted_server_context', true
    )
  );

  return jsonb_build_object(
    'usage_event_id', event_id,
    'company_id', p_company_id,
    'prompt_key', normalized_prompt_key,
    'model', normalized_model,
    'status', event_status,
    'total_tokens', normalized_total_tokens,
    'cost_usd', normalized_cost_usd,
    'should_block', event_status = 'budget_blocked',
    'safe_fallback_required', event_status in ('fallback', 'budget_blocked', 'failed', 'timeout'),
    'retry_count', greatest(coalesce(p_retry_count, budget_record.max_retries), 0),
    'timeout_ms', greatest(coalesce(p_timeout_ms, budget_record.timeout_ms), 1),
    'trusted_server_context', true
  );
end;
$$;

grant execute on function public.record_ai_usage_event(uuid, text, text, text, integer, integer, integer, integer, integer, text, text, numeric, jsonb) to service_role;

notify pgrst, 'reload schema';
