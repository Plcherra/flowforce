-- Phase 07.06: approval-gated AI inventory and waste suggestions.

create extension if not exists pgcrypto;

create table if not exists public.ai_inventory_waste_suggestions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  prompt_key text not null,
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
  constraint ai_inventory_waste_suggestions_prompt_key_check
    check (prompt_key in ('inventory_assistant', 'waste_assistant')),
  constraint ai_inventory_waste_suggestions_status_check
    check (status in ('pending_review', 'approved', 'rejected')),
  constraint ai_inventory_waste_suggestions_type_check
    check (suggestion_type in (
      'stockout_risk',
      'reorder_review',
      'waste_outlier',
      'prep_adjustment',
      'purchasing_adjustment',
      'no_action'
    )),
  constraint ai_inventory_waste_suggestions_priority_check
    check (priority in ('low', 'medium', 'high', 'critical')),
  constraint ai_inventory_waste_suggestions_approval_required_check
    check (approval_required = true),
  constraint ai_inventory_waste_suggestions_no_direct_write_check
    check (direct_write_executed = false),
  constraint ai_inventory_waste_suggestions_action_read_only_check
    check (
      suggested_action = '{}'::jsonb
      or (
        suggested_action->>'writes_allowed' = 'false'
        and suggested_action->>'requires_human_approval' = 'true'
      )
    )
);

create index if not exists ai_inventory_waste_suggestions_company_created_idx
on public.ai_inventory_waste_suggestions (company_id, created_at desc);

create index if not exists ai_inventory_waste_suggestions_company_status_idx
on public.ai_inventory_waste_suggestions (company_id, status);

create index if not exists ai_inventory_waste_suggestions_company_prompt_idx
on public.ai_inventory_waste_suggestions (company_id, prompt_key);

drop trigger if exists set_ai_inventory_waste_suggestions_updated_at on public.ai_inventory_waste_suggestions;
create trigger set_ai_inventory_waste_suggestions_updated_at
before update on public.ai_inventory_waste_suggestions
for each row execute function public.set_updated_at();

alter table public.ai_inventory_waste_suggestions enable row level security;

drop policy if exists "Company members can read AI inventory waste suggestions" on public.ai_inventory_waste_suggestions;
create policy "Company members can read AI inventory waste suggestions"
on public.ai_inventory_waste_suggestions
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

grant select on public.ai_inventory_waste_suggestions to authenticated;

create or replace view public.ai_inventory_waste_suggestions_latest_v
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
from public.ai_inventory_waste_suggestions suggestion
where suggestion.company_id in (select public.current_user_company_ids())
  and suggestion.created_at >= now() - interval '14 days';

grant select on public.ai_inventory_waste_suggestions_latest_v to authenticated;

create or replace view public.ai_inventory_waste_assistant_readiness_v
with (security_invoker = true)
as
select
  context_ready.company_id,
  context_ready.ready_for_prompt_contracts,
  prompt_ready.has_inventory_assistant,
  prompt_ready.has_waste_assistant,
  prompt_ready.ready_for_manager_briefing as prompt_contracts_ready,
  count(suggestion.id)::integer as recent_suggestions,
  count(suggestion.id) filter (where suggestion.status = 'pending_review')::integer as pending_review_suggestions,
  bool_and(coalesce(suggestion.approval_required, true)) as all_require_approval,
  bool_and(not coalesce(suggestion.direct_write_executed, false)) as no_direct_writes_executed,
  (
    context_ready.ready_for_prompt_contracts
    and prompt_ready.has_inventory_assistant
    and prompt_ready.has_waste_assistant
    and prompt_ready.ready_for_manager_briefing
    and coalesce(bool_and(coalesce(suggestion.approval_required, true)), true)
    and coalesce(bool_and(not coalesce(suggestion.direct_write_executed, false)), true)
  ) as ready_to_suggest
from public.ai_context_readiness_v context_ready
cross join public.ai_prompt_contract_readiness_v prompt_ready
left join public.ai_inventory_waste_suggestions_latest_v suggestion
  on suggestion.company_id = context_ready.company_id
group by
  context_ready.company_id,
  context_ready.ready_for_prompt_contracts,
  prompt_ready.has_inventory_assistant,
  prompt_ready.has_waste_assistant,
  prompt_ready.ready_for_manager_briefing;

grant select on public.ai_inventory_waste_assistant_readiness_v to authenticated;

create or replace function public.refresh_ai_inventory_waste_suggestions(
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
  inventory_summary jsonb;
  cost_summary jsonb;
  active_items integer := 0;
  items_with_minimums integer := 0;
  prep_items integer := 0;
  shortage_item_count integer := 0;
  overstock_item_count integer := 0;
  waste_cost numeric := 0;
  total_operating_cost numeric := 0;
  purchasing_cost numeric := 0;
  evidence_payload jsonb;
  inserted_count integer := 0;
  suggestion_record record;
begin
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to refresh inventory and waste suggestions for this company';
  end if;

  if not coalesce((select ready_for_manager_briefing from public.ai_prompt_contract_readiness_v), false) then
    raise exception 'AI prompt contracts are required before inventory and waste suggestions';
  end if;

  context_snapshot := public.get_ai_context_snapshot(p_company_id);
  context_generated_at := nullif(context_snapshot->>'generated_at', '')::timestamptz;

  inventory_summary := context_snapshot #> '{modules,inventory,summary}';
  cost_summary := context_snapshot #> '{modules,cost,summary}';

  active_items := coalesce((inventory_summary->>'active_items')::integer, 0);
  items_with_minimums := coalesce((inventory_summary->>'items_with_minimums')::integer, 0);
  prep_items := coalesce((inventory_summary->>'prep_items')::integer, 0);
  shortage_item_count := coalesce((cost_summary->>'shortage_item_count')::integer, 0);
  overstock_item_count := coalesce((cost_summary->>'overstock_item_count')::integer, 0);
  waste_cost := coalesce((cost_summary->>'waste_cost')::numeric, 0);
  total_operating_cost := coalesce((cost_summary->>'total_operating_cost')::numeric, 0);
  purchasing_cost := coalesce((cost_summary->>'purchasing_cost')::numeric, 0);

  evidence_payload := jsonb_build_array(
    jsonb_build_object(
      'module', 'inventory',
      'metric', 'active_items',
      'value', active_items,
      'route', '/app/inventory',
      'freshness_at', context_snapshot #>> '{modules,inventory,freshness_at}'
    ),
    jsonb_build_object(
      'module', 'inventory',
      'metric', 'items_with_minimums',
      'value', items_with_minimums,
      'route', '/app/inventory',
      'freshness_at', context_snapshot #>> '{modules,inventory,freshness_at}'
    ),
    jsonb_build_object(
      'module', 'cost',
      'metric', 'shortage_item_count',
      'value', shortage_item_count,
      'route', '/app/inventory/reports',
      'freshness_at', context_snapshot #>> '{modules,cost,freshness_at}'
    ),
    jsonb_build_object(
      'module', 'cost',
      'metric', 'waste_cost',
      'value', waste_cost,
      'route', '/app/inventory/reports',
      'freshness_at', context_snapshot #>> '{modules,cost,freshness_at}'
    ),
    jsonb_build_object(
      'module', 'cost',
      'metric', 'purchasing_cost',
      'value', purchasing_cost,
      'route', '/app/inventory/purchasing',
      'freshness_at', context_snapshot #>> '{modules,cost,freshness_at}'
    )
  );

  for suggestion_record in
    select *
    from (
      select
        'inventory_assistant'::text as prompt_key,
        'stockout_risk'::text as suggestion_type,
        case when shortage_item_count >= 3 then 'high' else 'medium' end as priority,
        'Review repeated stockout risk'::text as title,
        shortage_item_count::text || ' inventory item' || case when shortage_item_count = 1 then '' else 's' end || ' show shortage or stockout signals in the cost context.' as rationale,
        'draft_purchase_adjustment'::text as suggested_action_type
      where shortage_item_count > 0
      union all
      select
        'inventory_assistant',
        'reorder_review',
        case when active_items - items_with_minimums >= 5 then 'high' else 'medium' end,
        'Review reorder thresholds',
        (active_items - items_with_minimums)::text || ' active inventory item' || case when active_items - items_with_minimums = 1 then '' else 's' end || ' do not have minimum stock thresholds.',
        'draft_purchase_adjustment'
      where active_items > 0 and items_with_minimums < active_items
      union all
      select
        'waste_assistant',
        'waste_outlier',
        case when total_operating_cost > 0 and waste_cost / total_operating_cost >= 0.2 then 'high' else 'medium' end,
        'Review waste outlier',
        'Recent waste cost is high enough to require manager review.',
        'request_review'
      where waste_cost > 0 and (total_operating_cost = 0 or waste_cost / greatest(total_operating_cost, 1) >= 0.1)
      union all
      select
        'waste_assistant',
        'prep_adjustment',
        'medium',
        'Review prep adjustment',
        'Prep items and waste cost are both present, so prep quantity or timing may need review.',
        'request_review'
      where prep_items > 0 and waste_cost > 0
      union all
      select
        'inventory_assistant',
        'purchasing_adjustment',
        'medium',
        'Review purchasing adjustment',
        overstock_item_count::text || ' inventory item' || case when overstock_item_count = 1 then '' else 's' end || ' show overstock while purchasing cost is present.',
        'draft_purchase_adjustment'
      where purchasing_cost > 0 and overstock_item_count > 0
    ) suggestions
  loop
    insert into public.ai_inventory_waste_suggestions (
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
      suggestion_record.prompt_key,
      'pending_review',
      suggestion_record.suggestion_type,
      suggestion_record.priority,
      suggestion_record.title,
      suggestion_record.rationale,
      jsonb_build_object(
        'suggested_action_type', suggestion_record.suggested_action_type,
        'requires_human_approval', true,
        'writes_allowed', false,
        'purchase_order_write_allowed', false,
        'prep_plan_write_allowed', false,
        'inventory_adjustment_write_allowed', false,
        'waste_record_write_allowed', false,
        'inventory_rows_written', 0
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
    insert into public.ai_inventory_waste_suggestions (
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
      'inventory_assistant',
      'pending_review',
      'no_action',
      'low',
      'No inventory or waste action needed',
      'No immediate stockout, reorder, waste, prep, or purchasing risk was detected.',
      jsonb_build_object(
        'suggested_action_type', 'request_review',
        'requires_human_approval', true,
        'writes_allowed', false,
        'purchase_order_write_allowed', false,
        'prep_plan_write_allowed', false,
        'inventory_adjustment_write_allowed', false,
        'waste_record_write_allowed', false,
        'inventory_rows_written', 0
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
    'ai.inventory_waste_suggestion.created',
    'ai_inventory_waste_suggestions',
    p_company_id::text,
    '{}'::jsonb,
    jsonb_build_object(
      'prompt_keys', jsonb_build_array('inventory_assistant', 'waste_assistant'),
      'suggestions_created', inserted_count
    ),
    jsonb_build_object(
      'phase', '07.06',
      'approval_required', true,
      'writes_allowed', false,
      'direct_write_executed', false
    )
  );

  return jsonb_build_object(
    'company_id', p_company_id,
    'prompt_keys', jsonb_build_array('inventory_assistant', 'waste_assistant'),
    'suggestions_created', inserted_count,
    'approval_required', true,
    'writes_allowed', false,
    'direct_write_executed', false
  );
end;
$$;

grant execute on function public.refresh_ai_inventory_waste_suggestions(uuid) to authenticated;

create or replace function public.review_ai_inventory_waste_suggestion(
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
  suggestion_record public.ai_inventory_waste_suggestions%rowtype;
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
  from public.ai_inventory_waste_suggestions suggestion
  where suggestion.id = p_suggestion_id;

  if suggestion_record.id is null then
    raise exception 'Inventory and waste suggestion not found';
  end if;

  if suggestion_record.company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to review inventory and waste suggestion for this company';
  end if;

  if not public.current_user_is_company_admin(suggestion_record.company_id) then
    raise exception 'Manager approval is required to review inventory and waste suggestion';
  end if;

  update public.ai_inventory_waste_suggestions
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
      when normalized_decision = 'approved' then 'ai.inventory_waste_suggestion.approved'
      else 'ai.inventory_waste_suggestion.rejected'
    end,
    'ai_inventory_waste_suggestions',
    p_suggestion_id::text,
    jsonb_build_object('status', suggestion_record.status),
    jsonb_build_object(
      'status', normalized_decision,
      'direct_write_executed', false,
      'inventory_rows_written', 0
    ),
    jsonb_build_object(
      'phase', '07.06',
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
    'inventory_rows_written', 0
  );
end;
$$;

grant execute on function public.review_ai_inventory_waste_suggestion(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
