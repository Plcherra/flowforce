-- Phase 07.09: AI observability, budget controls, retry policy, and fallback logging.

create extension if not exists pgcrypto;

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  prompt_key text not null,
  provider text not null default 'openai',
  model text not null,
  status text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  latency_ms integer not null default 0,
  retry_count integer not null default 0,
  timeout_ms integer not null default 15000,
  error_code text,
  error_message text,
  cost_usd numeric(12, 6) not null default 0,
  fallback_used boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ai_usage_events_prompt_key_check
    check (prompt_key in (
      'scheduling_assistant',
      'inventory_assistant',
      'waste_assistant',
      'compliance_assistant',
      'manager_briefing'
    )),
  constraint ai_usage_events_status_check
    check (status in ('succeeded', 'failed', 'timeout', 'budget_blocked', 'fallback')),
  constraint ai_usage_events_non_negative_check
    check (
      input_tokens >= 0
      and output_tokens >= 0
      and total_tokens >= 0
      and latency_ms >= 0
      and retry_count >= 0
      and timeout_ms > 0
      and cost_usd >= 0
    ),
  constraint ai_usage_events_total_tokens_check
    check (total_tokens = input_tokens + output_tokens),
  constraint ai_usage_events_failure_has_context_check
    check (
      status in ('succeeded', 'fallback')
      or error_code is not null
      or error_message is not null
    )
);

create index if not exists ai_usage_events_company_created_idx
on public.ai_usage_events (company_id, created_at desc);

create index if not exists ai_usage_events_company_model_idx
on public.ai_usage_events (company_id, model, created_at desc);

create table if not exists public.ai_budget_controls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  model text not null,
  monthly_token_limit integer not null default 1000000,
  monthly_cost_limit_usd numeric(12, 2) not null default 100,
  alert_threshold_ratio numeric(4, 3) not null default 0.800,
  max_retries integer not null default 2,
  timeout_ms integer not null default 15000,
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_budget_controls_model_unique unique (company_id, model),
  constraint ai_budget_controls_positive_limits_check
    check (
      monthly_token_limit > 0
      and monthly_cost_limit_usd > 0
      and alert_threshold_ratio > 0
      and alert_threshold_ratio <= 1
      and max_retries >= 0
      and max_retries <= 5
      and timeout_ms between 1000 and 120000
    )
);

create index if not exists ai_budget_controls_company_idx
on public.ai_budget_controls (company_id);

drop trigger if exists set_ai_budget_controls_updated_at on public.ai_budget_controls;
create trigger set_ai_budget_controls_updated_at
before update on public.ai_budget_controls
for each row execute function public.set_updated_at();

alter table public.ai_usage_events enable row level security;
alter table public.ai_budget_controls enable row level security;

drop policy if exists "Company members can read AI usage events" on public.ai_usage_events;
create policy "Company members can read AI usage events"
on public.ai_usage_events
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can read AI budget controls" on public.ai_budget_controls;
create policy "Company members can read AI budget controls"
on public.ai_budget_controls
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

grant select on public.ai_usage_events to authenticated;
grant select on public.ai_budget_controls to authenticated;

create or replace view public.ai_usage_events_latest_v
with (security_invoker = true)
as
select
  usage_event.id,
  usage_event.company_id,
  usage_event.prompt_key,
  usage_event.provider,
  usage_event.model,
  usage_event.status,
  usage_event.input_tokens,
  usage_event.output_tokens,
  usage_event.total_tokens,
  usage_event.latency_ms,
  usage_event.retry_count,
  usage_event.timeout_ms,
  usage_event.error_code,
  usage_event.error_message,
  usage_event.cost_usd,
  usage_event.fallback_used,
  usage_event.metadata,
  usage_event.user_id,
  usage_event.created_by,
  usage_event.created_at
from public.ai_usage_events usage_event
where usage_event.company_id in (select public.current_user_company_ids())
  and usage_event.created_at >= date_trunc('month', now());

grant select on public.ai_usage_events_latest_v to authenticated;

create or replace view public.ai_usage_monthly_summary_v
with (security_invoker = true)
as
select
  usage_event.company_id,
  date_trunc('month', usage_event.created_at)::date as usage_month,
  usage_event.model,
  usage_event.prompt_key,
  count(*)::integer as request_count,
  count(*) filter (where usage_event.status = 'succeeded')::integer as succeeded_count,
  count(*) filter (where usage_event.status in ('failed', 'timeout'))::integer as failed_count,
  count(*) filter (where usage_event.status = 'budget_blocked')::integer as budget_blocked_count,
  count(*) filter (where usage_event.fallback_used)::integer as fallback_count,
  coalesce(sum(usage_event.input_tokens), 0)::integer as input_tokens,
  coalesce(sum(usage_event.output_tokens), 0)::integer as output_tokens,
  coalesce(sum(usage_event.total_tokens), 0)::integer as total_tokens,
  coalesce(sum(usage_event.cost_usd), 0)::numeric(12, 6) as cost_usd,
  round(avg(usage_event.latency_ms), 2) as avg_latency_ms,
  max(usage_event.latency_ms) as max_latency_ms,
  max(usage_event.retry_count) as max_retry_count
from public.ai_usage_events_latest_v usage_event
group by
  usage_event.company_id,
  date_trunc('month', usage_event.created_at)::date,
  usage_event.model,
  usage_event.prompt_key;

grant select on public.ai_usage_monthly_summary_v to authenticated;

create or replace view public.ai_budget_status_v
with (security_invoker = true)
as
with monthly_model_usage as (
  select
    usage_event.company_id,
    usage_event.model,
    coalesce(sum(usage_event.total_tokens), 0)::integer as used_tokens,
    coalesce(sum(usage_event.cost_usd), 0)::numeric(12, 6) as used_cost_usd,
    count(*) filter (where usage_event.status in ('failed', 'timeout'))::integer as failed_calls,
    count(*) filter (where usage_event.status = 'budget_blocked')::integer as budget_blocked_calls
  from public.ai_usage_events_latest_v usage_event
  group by usage_event.company_id, usage_event.model
)
select
  control.company_id,
  control.model,
  control.monthly_token_limit,
  control.monthly_cost_limit_usd,
  control.alert_threshold_ratio,
  control.max_retries,
  control.timeout_ms,
  control.enabled,
  coalesce(usage.used_tokens, 0) as used_tokens,
  coalesce(usage.used_cost_usd, 0)::numeric(12, 6) as used_cost_usd,
  round(coalesce(usage.used_tokens, 0)::numeric / greatest(control.monthly_token_limit::numeric, 1), 4) as token_usage_ratio,
  round(coalesce(usage.used_cost_usd, 0)::numeric / greatest(control.monthly_cost_limit_usd::numeric, 0.01), 4) as cost_usage_ratio,
  coalesce(usage.failed_calls, 0) as failed_calls,
  coalesce(usage.budget_blocked_calls, 0) as budget_blocked_calls,
  (
    not control.enabled
    or coalesce(usage.used_tokens, 0) >= control.monthly_token_limit
    or coalesce(usage.used_cost_usd, 0) >= control.monthly_cost_limit_usd
  ) as should_block,
  (
    not control.enabled
    or coalesce(usage.used_tokens, 0)::numeric / greatest(control.monthly_token_limit::numeric, 1) >= control.alert_threshold_ratio
    or coalesce(usage.used_cost_usd, 0)::numeric / greatest(control.monthly_cost_limit_usd::numeric, 0.01) >= control.alert_threshold_ratio
  ) as should_alert
from public.ai_budget_controls control
left join monthly_model_usage usage
  on usage.company_id = control.company_id
  and usage.model = control.model
where control.company_id in (select public.current_user_company_ids());

grant select on public.ai_budget_status_v to authenticated;

create or replace view public.ai_usage_admin_dashboard_v
with (security_invoker = true)
as
select
  status.company_id,
  status.model,
  status.used_tokens,
  status.monthly_token_limit,
  status.used_cost_usd,
  status.monthly_cost_limit_usd,
  status.token_usage_ratio,
  status.cost_usage_ratio,
  status.failed_calls,
  status.budget_blocked_calls,
  status.max_retries,
  status.timeout_ms,
  status.should_alert,
  status.should_block,
  coalesce(monthly.request_count, 0) as request_count,
  coalesce(monthly.fallback_count, 0) as fallback_count,
  coalesce(monthly.avg_latency_ms, 0) as avg_latency_ms
from public.ai_budget_status_v status
left join (
  select
    company_id,
    model,
    sum(request_count)::integer as request_count,
    sum(fallback_count)::integer as fallback_count,
    round(avg(avg_latency_ms), 2) as avg_latency_ms
  from public.ai_usage_monthly_summary_v
  group by company_id, model
) monthly
  on monthly.company_id = status.company_id
  and monthly.model = status.model;

grant select on public.ai_usage_admin_dashboard_v to authenticated;

create or replace view public.ai_observability_readiness_v
with (security_invoker = true)
as
select
  member.company_id,
  count(distinct budget.model)::integer as configured_models,
  count(usage_event.id)::integer as usage_events,
  count(usage_event.id) filter (where usage_event.status in ('failed', 'timeout', 'budget_blocked', 'fallback'))::integer as degraded_events,
  coalesce(bool_and(usage_event.total_tokens = usage_event.input_tokens + usage_event.output_tokens), true) as token_accounting_valid,
  coalesce(bool_and(usage_event.timeout_ms > 0 and usage_event.retry_count >= 0), true) as retry_timeout_recorded,
  coalesce(bool_or(budget.id is not null), false) as has_budget_controls,
  coalesce(bool_and(budget.monthly_token_limit > 0 and budget.monthly_cost_limit_usd > 0), true) as budget_limits_valid
from public.company_members member
left join public.ai_budget_controls budget
  on budget.company_id = member.company_id
left join public.ai_usage_events usage_event
  on usage_event.company_id = member.company_id
  and usage_event.created_at >= date_trunc('month', now())
where member.user_id = auth.uid()
group by member.company_id;

grant select on public.ai_observability_readiness_v to authenticated;

create or replace function public.upsert_ai_budget_control(
  p_company_id uuid,
  p_model text,
  p_monthly_token_limit integer,
  p_monthly_cost_limit_usd numeric,
  p_max_retries integer default 2,
  p_timeout_ms integer default 15000,
  p_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_model text := lower(trim(coalesce(p_model, '')));
  budget_id uuid;
begin
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if normalized_model = '' then
    raise exception 'model is required';
  end if;

  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to manage AI budget controls for this company';
  end if;

  if not public.current_user_is_company_admin(p_company_id) then
    raise exception 'Company admin permission is required to manage AI budget controls';
  end if;

  insert into public.ai_budget_controls (
    company_id,
    model,
    monthly_token_limit,
    monthly_cost_limit_usd,
    max_retries,
    timeout_ms,
    enabled,
    created_by,
    updated_by
  )
  values (
    p_company_id,
    normalized_model,
    p_monthly_token_limit,
    p_monthly_cost_limit_usd,
    coalesce(p_max_retries, 2),
    coalesce(p_timeout_ms, 15000),
    coalesce(p_enabled, true),
    auth.uid(),
    auth.uid()
  )
  on conflict (company_id, model)
  do update set
    monthly_token_limit = excluded.monthly_token_limit,
    monthly_cost_limit_usd = excluded.monthly_cost_limit_usd,
    max_retries = excluded.max_retries,
    timeout_ms = excluded.timeout_ms,
    enabled = excluded.enabled,
    updated_by = auth.uid(),
    updated_at = now()
  returning id into budget_id;

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
    'ai.budget_control.updated',
    'ai_budget_controls',
    budget_id::text,
    '{}'::jsonb,
    jsonb_build_object(
      'model', normalized_model,
      'monthly_token_limit', p_monthly_token_limit,
      'monthly_cost_limit_usd', p_monthly_cost_limit_usd,
      'max_retries', coalesce(p_max_retries, 2),
      'timeout_ms', coalesce(p_timeout_ms, 15000),
      'enabled', coalesce(p_enabled, true)
    ),
    jsonb_build_object('phase', '07.09')
  );

  return jsonb_build_object(
    'budget_control_id', budget_id,
    'company_id', p_company_id,
    'model', normalized_model,
    'monthly_token_limit', p_monthly_token_limit,
    'monthly_cost_limit_usd', p_monthly_cost_limit_usd,
    'max_retries', coalesce(p_max_retries, 2),
    'timeout_ms', coalesce(p_timeout_ms, 15000),
    'enabled', coalesce(p_enabled, true)
  );
end;
$$;

grant execute on function public.upsert_ai_budget_control(uuid, text, integer, numeric, integer, integer, boolean) to authenticated;

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
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to record AI usage for this company';
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
      auth.uid(),
      auth.uid()
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
      'safe_fallback_required', event_status in ('fallback', 'budget_blocked', 'failed', 'timeout')
    ),
    auth.uid(),
    auth.uid()
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
    auth.uid(),
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
      'phase', '07.09',
      'retry_count', greatest(coalesce(p_retry_count, budget_record.max_retries), 0),
      'timeout_ms', greatest(coalesce(p_timeout_ms, budget_record.timeout_ms), 1),
      'safe_fallback_required', event_status in ('fallback', 'budget_blocked', 'failed', 'timeout')
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
    'timeout_ms', greatest(coalesce(p_timeout_ms, budget_record.timeout_ms), 1)
  );
end;
$$;

grant execute on function public.record_ai_usage_event(uuid, text, text, text, integer, integer, integer, integer, integer, text, text, numeric, jsonb) to authenticated;

notify pgrst, 'reload schema';
