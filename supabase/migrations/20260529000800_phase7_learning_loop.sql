-- Phase 07.08: tenant-scoped AI recommendation learning loop.

create extension if not exists pgcrypto;

create table if not exists public.ai_recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source_table text not null,
  source_id uuid not null,
  prompt_key text not null,
  suggestion_type text not null,
  outcome text not null,
  reason_code text not null,
  reviewer_notes text,
  feedback_scope text not null default 'tenant',
  learning_fingerprint text not null,
  source_status text,
  source_priority text,
  source_title text,
  source_context_generated_at timestamptz,
  no_cross_tenant_training boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_recommendation_feedback_source_table_check
    check (source_table in (
      'ai_scheduling_suggestions',
      'ai_inventory_waste_suggestions',
      'ai_compliance_workflow_suggestions'
    )),
  constraint ai_recommendation_feedback_prompt_key_check
    check (prompt_key in (
      'scheduling_assistant',
      'inventory_assistant',
      'waste_assistant',
      'compliance_assistant'
    )),
  constraint ai_recommendation_feedback_outcome_check
    check (outcome in ('accepted', 'rejected')),
  constraint ai_recommendation_feedback_reason_code_check
    check (reason_code in (
      'useful',
      'wrong_context',
      'duplicate',
      'unsafe',
      'low_confidence',
      'not_relevant',
      'better_manual_action',
      'policy_blocked',
      'stale_data',
      'other'
    )),
  constraint ai_recommendation_feedback_scope_check
    check (feedback_scope = 'tenant'),
  constraint ai_recommendation_feedback_no_cross_tenant_check
    check (no_cross_tenant_training = true),
  constraint ai_recommendation_feedback_fingerprint_check
    check (learning_fingerprint like company_id::text || ':%'),
  constraint ai_recommendation_feedback_source_unique
    unique (company_id, source_table, source_id)
);

create index if not exists ai_recommendation_feedback_company_created_idx
on public.ai_recommendation_feedback (company_id, created_at desc);

create index if not exists ai_recommendation_feedback_company_prompt_idx
on public.ai_recommendation_feedback (company_id, prompt_key, suggestion_type);

drop trigger if exists set_ai_recommendation_feedback_updated_at on public.ai_recommendation_feedback;
create trigger set_ai_recommendation_feedback_updated_at
before update on public.ai_recommendation_feedback
for each row execute function public.set_updated_at();

alter table public.ai_recommendation_feedback enable row level security;

drop policy if exists "Company members can read AI recommendation feedback" on public.ai_recommendation_feedback;
create policy "Company members can read AI recommendation feedback"
on public.ai_recommendation_feedback
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

grant select on public.ai_recommendation_feedback to authenticated;

create or replace view public.ai_recommendation_feedback_latest_v
with (security_invoker = true)
as
select
  feedback.id,
  feedback.company_id,
  feedback.source_table,
  feedback.source_id,
  feedback.prompt_key,
  feedback.suggestion_type,
  feedback.outcome,
  feedback.reason_code,
  feedback.reviewer_notes,
  feedback.feedback_scope,
  feedback.learning_fingerprint,
  feedback.source_status,
  feedback.source_priority,
  feedback.source_title,
  feedback.source_context_generated_at,
  feedback.no_cross_tenant_training,
  feedback.created_by,
  feedback.created_at,
  feedback.updated_at
from public.ai_recommendation_feedback feedback
where feedback.company_id in (select public.current_user_company_ids());

grant select on public.ai_recommendation_feedback_latest_v to authenticated;

create or replace view public.ai_learning_loop_summary_v
with (security_invoker = true)
as
with base as (
  select *
  from public.ai_recommendation_feedback_latest_v
),
reason_counts as (
  select
    company_id,
    prompt_key,
    suggestion_type,
    reason_code,
    count(*)::integer as reason_count
  from base
  group by company_id, prompt_key, suggestion_type, reason_code
),
reason_payload as (
  select
    company_id,
    prompt_key,
    suggestion_type,
    jsonb_object_agg(reason_code, reason_count order by reason_code) as reason_counts
  from reason_counts
  group by company_id, prompt_key, suggestion_type
)
select
  base.company_id,
  base.prompt_key,
  base.suggestion_type,
  count(*)::integer as total_feedback,
  count(*) filter (where base.outcome = 'accepted')::integer as accepted_count,
  count(*) filter (where base.outcome = 'rejected')::integer as rejected_count,
  round(
    count(*) filter (where base.outcome = 'accepted')::numeric
    / greatest(count(*)::numeric, 1),
    4
  ) as acceptance_rate,
  reason_payload.reason_counts,
  bool_and(base.feedback_scope = 'tenant') as tenant_scoped,
  bool_and(base.no_cross_tenant_training) as no_cross_tenant_training
from base
left join reason_payload
  on reason_payload.company_id = base.company_id
  and reason_payload.prompt_key = base.prompt_key
  and reason_payload.suggestion_type = base.suggestion_type
group by
  base.company_id,
  base.prompt_key,
  base.suggestion_type,
  reason_payload.reason_counts;

grant select on public.ai_learning_loop_summary_v to authenticated;

create or replace view public.ai_learning_loop_readiness_v
with (security_invoker = true)
as
select
  member.company_id,
  count(feedback.id)::integer as feedback_records,
  count(feedback.id) filter (where feedback.outcome = 'accepted')::integer as accepted_feedback,
  count(feedback.id) filter (where feedback.outcome = 'rejected')::integer as rejected_feedback,
  count(distinct feedback.reason_code)::integer as reason_code_count,
  coalesce(bool_and(feedback.feedback_scope = 'tenant'), true) as tenant_scoped,
  coalesce(bool_and(feedback.no_cross_tenant_training), true) as no_cross_tenant_training,
  coalesce(bool_and(feedback.learning_fingerprint like feedback.company_id::text || ':%'), true) as fingerprints_scoped,
  coalesce(bool_and(feedback.feedback_scope = 'tenant'), true)
    and coalesce(bool_and(feedback.no_cross_tenant_training), true)
    and coalesce(bool_and(feedback.learning_fingerprint like feedback.company_id::text || ':%'), true)
    as ready_for_learning
from public.company_members member
left join public.ai_recommendation_feedback feedback
  on feedback.company_id = member.company_id
where member.user_id = auth.uid()
group by member.company_id;

grant select on public.ai_learning_loop_readiness_v to authenticated;

create or replace function public.record_ai_recommendation_feedback(
  p_source_table text,
  p_source_id uuid,
  p_outcome text,
  p_reason_code text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_source_table text := lower(trim(coalesce(p_source_table, '')));
  normalized_outcome text := lower(trim(coalesce(p_outcome, '')));
  normalized_reason_code text := lower(replace(replace(trim(coalesce(p_reason_code, '')), '-', '_'), ' ', '_'));
  source_company_id uuid;
  source_prompt_key text;
  source_suggestion_type text;
  source_status text;
  source_priority text;
  source_title text;
  source_context_generated_at timestamptz;
  feedback_id uuid;
  fingerprint text;
begin
  if p_source_id is null then
    raise exception 'source_id is required';
  end if;

  if normalized_source_table not in (
    'ai_scheduling_suggestions',
    'ai_inventory_waste_suggestions',
    'ai_compliance_workflow_suggestions'
  ) then
    raise exception 'Unsupported AI recommendation source table';
  end if;

  if normalized_outcome not in ('accepted', 'rejected') then
    raise exception 'outcome must be accepted or rejected';
  end if;

  if normalized_reason_code not in (
    'useful',
    'wrong_context',
    'duplicate',
    'unsafe',
    'low_confidence',
    'not_relevant',
    'better_manual_action',
    'policy_blocked',
    'stale_data',
    'other'
  ) then
    raise exception 'Unsupported AI learning reason code';
  end if;

  if normalized_source_table = 'ai_scheduling_suggestions' then
    select
      suggestion.company_id,
      suggestion.prompt_key,
      suggestion.suggestion_type,
      suggestion.status,
      suggestion.priority,
      suggestion.title,
      suggestion.context_generated_at
    into
      source_company_id,
      source_prompt_key,
      source_suggestion_type,
      source_status,
      source_priority,
      source_title,
      source_context_generated_at
    from public.ai_scheduling_suggestions suggestion
    where suggestion.id = p_source_id;
  elsif normalized_source_table = 'ai_inventory_waste_suggestions' then
    select
      suggestion.company_id,
      suggestion.prompt_key,
      suggestion.suggestion_type,
      suggestion.status,
      suggestion.priority,
      suggestion.title,
      suggestion.context_generated_at
    into
      source_company_id,
      source_prompt_key,
      source_suggestion_type,
      source_status,
      source_priority,
      source_title,
      source_context_generated_at
    from public.ai_inventory_waste_suggestions suggestion
    where suggestion.id = p_source_id;
  elsif normalized_source_table = 'ai_compliance_workflow_suggestions' then
    select
      suggestion.company_id,
      suggestion.prompt_key,
      suggestion.suggestion_type,
      suggestion.status,
      suggestion.priority,
      suggestion.title,
      suggestion.context_generated_at
    into
      source_company_id,
      source_prompt_key,
      source_suggestion_type,
      source_status,
      source_priority,
      source_title,
      source_context_generated_at
    from public.ai_compliance_workflow_suggestions suggestion
    where suggestion.id = p_source_id;
  end if;

  if source_company_id is null then
    raise exception 'AI recommendation source not found';
  end if;

  if source_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to record AI learning feedback for this company';
  end if;

  if not public.current_user_is_company_admin(source_company_id) then
    raise exception 'Manager permission is required to record AI learning feedback';
  end if;

  if normalized_outcome = 'accepted' and source_status <> 'approved' then
    raise exception 'Accepted AI learning feedback requires an approved source suggestion';
  end if;

  if normalized_outcome = 'rejected' and source_status <> 'rejected' then
    raise exception 'Rejected AI learning feedback requires a rejected source suggestion';
  end if;

  fingerprint := concat_ws(
    ':',
    source_company_id::text,
    normalized_source_table,
    p_source_id::text,
    source_prompt_key,
    source_suggestion_type
  );

  insert into public.ai_recommendation_feedback (
    company_id,
    source_table,
    source_id,
    prompt_key,
    suggestion_type,
    outcome,
    reason_code,
    reviewer_notes,
    feedback_scope,
    learning_fingerprint,
    source_status,
    source_priority,
    source_title,
    source_context_generated_at,
    no_cross_tenant_training,
    created_by
  )
  values (
    source_company_id,
    normalized_source_table,
    p_source_id,
    source_prompt_key,
    source_suggestion_type,
    normalized_outcome,
    normalized_reason_code,
    nullif(left(trim(coalesce(p_notes, '')), 600), ''),
    'tenant',
    fingerprint,
    source_status,
    source_priority,
    source_title,
    source_context_generated_at,
    true,
    auth.uid()
  )
  on conflict (company_id, source_table, source_id)
  do update set
    outcome = excluded.outcome,
    reason_code = excluded.reason_code,
    reviewer_notes = excluded.reviewer_notes,
    source_status = excluded.source_status,
    source_priority = excluded.source_priority,
    source_title = excluded.source_title,
    source_context_generated_at = excluded.source_context_generated_at,
    feedback_scope = 'tenant',
    no_cross_tenant_training = true,
    updated_at = now()
  returning id into feedback_id;

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
    source_company_id,
    auth.uid(),
    'ai.recommendation_feedback.recorded',
    'ai_recommendation_feedback',
    feedback_id::text,
    '{}'::jsonb,
    jsonb_build_object(
      'source_table', normalized_source_table,
      'source_id', p_source_id,
      'prompt_key', source_prompt_key,
      'suggestion_type', source_suggestion_type,
      'outcome', normalized_outcome,
      'reason_code', normalized_reason_code,
      'feedback_scope', 'tenant',
      'no_cross_tenant_training', true
    ),
    jsonb_build_object(
      'phase', '07.08',
      'learning_fingerprint', fingerprint,
      'notes_present', nullif(trim(coalesce(p_notes, '')), '') is not null
    )
  );

  return jsonb_build_object(
    'feedback_id', feedback_id,
    'company_id', source_company_id,
    'source_table', normalized_source_table,
    'source_id', p_source_id,
    'prompt_key', source_prompt_key,
    'suggestion_type', source_suggestion_type,
    'outcome', normalized_outcome,
    'reason_code', normalized_reason_code,
    'feedback_scope', 'tenant',
    'no_cross_tenant_training', true
  );
end;
$$;

grant execute on function public.record_ai_recommendation_feedback(text, uuid, text, text, text) to authenticated;

create or replace function public.get_ai_learning_adjustment(
  p_company_id uuid,
  p_prompt_key text,
  p_suggestion_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  summary_record record;
  top_rejection_reason text := null;
  recommendation text := 'neutral';
  confidence_adjustment numeric := 0;
begin
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to read AI learning adjustments for this company';
  end if;

  select *
  into summary_record
  from public.ai_learning_loop_summary_v summary
  where summary.company_id = p_company_id
    and summary.prompt_key = p_prompt_key
    and summary.suggestion_type = p_suggestion_type;

  if summary_record.company_id is null then
    return jsonb_build_object(
      'company_id', p_company_id,
      'prompt_key', p_prompt_key,
      'suggestion_type', p_suggestion_type,
      'recommendation', 'neutral',
      'confidence_adjustment', 0,
      'feedback_scope', 'tenant',
      'no_cross_tenant_training', true,
      'reason', 'no_feedback'
    );
  end if;

  select key
  into top_rejection_reason
  from jsonb_each_text(coalesce(summary_record.reason_counts, '{}'::jsonb))
  where key <> 'useful'
  order by value::integer desc, key
  limit 1;

  if summary_record.rejected_count >= 3 and summary_record.acceptance_rate <= 0.25 then
    recommendation := 'deprioritize';
    confidence_adjustment := -0.15;
  elsif summary_record.accepted_count >= 3 and summary_record.acceptance_rate >= 0.75 then
    recommendation := 'boost';
    confidence_adjustment := 0.10;
  end if;

  return jsonb_build_object(
    'company_id', p_company_id,
    'prompt_key', p_prompt_key,
    'suggestion_type', p_suggestion_type,
    'total_feedback', summary_record.total_feedback,
    'accepted_count', summary_record.accepted_count,
    'rejected_count', summary_record.rejected_count,
    'acceptance_rate', summary_record.acceptance_rate,
    'top_rejection_reason', top_rejection_reason,
    'recommendation', recommendation,
    'confidence_adjustment', confidence_adjustment,
    'feedback_scope', 'tenant',
    'no_cross_tenant_training', true
  );
end;
$$;

grant execute on function public.get_ai_learning_adjustment(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
