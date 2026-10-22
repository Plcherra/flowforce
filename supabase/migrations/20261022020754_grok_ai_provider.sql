-- Record the AI provider on usage events and price Grok models.
-- The function signature stays the same. Provider comes from metadata.provider,
-- or from a grok model id. Monthly token and cost caps are unchanged.
-- Translations stay on OpenAI. gpt-4o-mini remains the fallback price for other models.

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
  normalized_provider text := lower(trim(coalesce(p_metadata->>'provider', '')));
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

  if normalized_provider = '' then
    if normalized_model like 'grok%' then
      normalized_provider := 'xai';
    else
      normalized_provider := 'openai';
    end if;
  elsif normalized_provider not in ('openai', 'xai', 'other') then
    normalized_provider := 'other';
  end if;

  normalized_total_tokens := normalized_input_tokens + normalized_output_tokens;
  if p_cost_usd is not null then
    normalized_cost_usd := p_cost_usd;
  elsif normalized_model like 'grok-4.7%' or normalized_model like 'grok-4.6%' or normalized_model like 'grok-4.5%' then
    if normalized_input_tokens >= 200000 then
      normalized_cost_usd := round((normalized_input_tokens::numeric * 0.000004) + (normalized_output_tokens::numeric * 0.000012), 6);
    else
      normalized_cost_usd := round((normalized_input_tokens::numeric * 0.000002) + (normalized_output_tokens::numeric * 0.000006), 6);
    end if;
  elsif normalized_model like 'grok%' then
    if normalized_input_tokens >= 200000 then
      normalized_cost_usd := round((normalized_input_tokens::numeric * 0.0000025) + (normalized_output_tokens::numeric * 0.000005), 6);
    else
      normalized_cost_usd := round((normalized_input_tokens::numeric * 0.00000125) + (normalized_output_tokens::numeric * 0.0000025), 6);
    end if;
  else
    normalized_cost_usd := round((normalized_input_tokens::numeric * 0.00000015) + (normalized_output_tokens::numeric * 0.00000060), 6);
  end if;

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
    normalized_provider,
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
      'provider', normalized_provider,
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
      'provider', normalized_provider,
      'model', normalized_model,
      'status', event_status,
      'total_tokens', normalized_total_tokens,
      'cost_usd', normalized_cost_usd
    ),
    jsonb_build_object(
      'phase', 'grok-provider',
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
    'provider', normalized_provider,
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

notify pgrst, 'reload schema';
