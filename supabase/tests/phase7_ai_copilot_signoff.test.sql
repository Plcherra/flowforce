begin;

create extension if not exists pgtap;

select plan(19);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.ai_usage_events where company_id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from public.ai_budget_controls where company_id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from public.ai_recommendation_feedback where company_id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from public.ai_scheduling_suggestions where company_id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from public.ai_manager_briefing_runs where company_id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from public.audit_log where company_id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from public.ai_governance_policies where company_id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from public.workflow_exceptions where company_id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from public.tasks where company_id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from public.forms where company_id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from public.schedules where company_id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from public.inv_items where company_id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '8c100000-0000-4000-8000-000000000001',
  '8c100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '8c000000-0000-4000-8000-000000000001',
  '8c000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '8c100000-0000-4000-8000-000000000001',
  '8c100000-0000-4000-8000-000000000002'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
values
  ('00000000-0000-0000-0000-000000000000', '8c100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase7-ai-signoff-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '8c100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase7-ai-signoff-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('8c000000-0000-4000-8000-000000000001', 'Phase 7 AI Signoff Tenant A', 'phase-7-ai-signoff-a', '8c100000-0000-4000-8000-000000000001', '8c100000-0000-4000-8000-000000000001', true),
  ('8c000000-0000-4000-8000-000000000002', 'Phase 7 AI Signoff Tenant B', 'phase-7-ai-signoff-b', '8c100000-0000-4000-8000-000000000002', '8c100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, employment_status, is_company_admin)
values
  ('8c100000-0000-4000-8000-000000000001', '8c000000-0000-4000-8000-000000000001', 'Signoff', 'Owner A', 'phase7-ai-signoff-a@example.test', 'owner', 'active', true),
  ('8c100000-0000-4000-8000-000000000002', '8c000000-0000-4000-8000-000000000002', 'Signoff', 'Owner B', 'phase7-ai-signoff-b@example.test', 'owner', 'active', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('8c000000-0000-4000-8000-000000000001', '8c100000-0000-4000-8000-000000000001', 'owner', now()),
  ('8c000000-0000-4000-8000-000000000002', '8c100000-0000-4000-8000-000000000002', 'owner', now());

insert into public.schedules (
  company_id,
  title,
  start_time,
  end_time,
  is_published,
  user_id,
  role,
  location,
  required_headcount,
  hourly_rate
)
values
  ('8c000000-0000-4000-8000-000000000001', 'Signoff demo coverage gap', now() + interval '1 day', now() + interval '1 day 8 hours', false, null, 'staff', 'Line', 4, 25);

insert into public.tasks (company_id, title, status, priority, due_date, assigned_to)
values
  ('8c000000-0000-4000-8000-000000000001', 'Signoff overdue task', 'open', 'high', current_date - 1, '8c100000-0000-4000-8000-000000000001');

insert into public.forms (company_id, title, status, is_anonymous, end_date, max_submissions, created_by)
values
  ('8c000000-0000-4000-8000-000000000001', 'Signoff active form', 'active', true, current_date + 7, 20, '8c100000-0000-4000-8000-000000000001');

insert into public.inv_items (company_id, name, sku, is_active, is_prep_item, min_stock_level, max_stock_level, cost_per_unit)
values
  ('8c000000-0000-4000-8000-000000000001', 'Signoff inventory item', 'SIGNOFF-A', true, false, null, 10, 4.25);

insert into public.workflow_exceptions (company_id, severity, status, title, description, created_by)
values
  ('8c000000-0000-4000-8000-000000000001', 'critical', 'open', 'Signoff workflow exception', 'Exception body for signoff', '8c100000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '8c100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.install_ai_governance_baseline(
    '8c000000-0000-4000-8000-000000000001'
  ) $$,
  'tenant admin can install governance for the copilot signoff demo'
);

select lives_ok(
  $$ select public.refresh_ai_manager_briefing(
    '8c000000-0000-4000-8000-000000000001'
  ) $$,
  'manager briefing refresh works in the signoff demo'
);

select is(
  (select output #>> '{safety,writes_allowed}' from public.ai_manager_briefing_latest_v),
  'false',
  'manager briefing remains read-only and approval-aware'
);

select lives_ok(
  $$ select public.refresh_ai_scheduling_suggestions(
    '8c000000-0000-4000-8000-000000000001'
  ) $$,
  'scheduling assistant refresh works in the signoff demo'
);

select ok(
  exists (
    select 1
    from public.ai_scheduling_suggestions_latest_v
    where suggestion_type = 'understaffing'
      and approval_required
      and not direct_write_executed
  ),
  'signoff demo creates an approval-gated scheduling suggestion'
);

select lives_ok(
  $$ select public.review_ai_scheduling_suggestion(
    (
      select id
      from public.ai_scheduling_suggestions_latest_v
      where suggestion_type = 'understaffing'
      limit 1
    ),
    'approved',
    'Signoff demo manager approval.'
  ) $$,
  'manager can approve a scheduling suggestion in the signoff demo'
);

select is(
  (
    select direct_write_executed
    from public.ai_scheduling_suggestions_latest_v
    where status = 'approved'
    limit 1
  ),
  false,
  'approved signoff suggestion still does not perform direct writes'
);

select lives_ok(
  $$ select public.record_ai_recommendation_feedback(
    'ai_scheduling_suggestions',
    (
      select id
      from public.ai_scheduling_suggestions_latest_v
      where status = 'approved'
      limit 1
    ),
    'accepted',
    'useful',
    'Signoff demo feedback.'
  ) $$,
  'learning feedback is recorded for the approved suggestion'
);

select is(
  (select count(*)::integer from public.ai_recommendation_feedback_latest_v),
  1,
  'learning feedback is visible to the source tenant only'
);

select lives_ok(
  $$ select public.upsert_ai_budget_control(
    '8c000000-0000-4000-8000-000000000001',
    'gpt-4o-mini',
    1000,
    5,
    2,
    15000,
    true
  ) $$,
  'AI budget controls are configured for the signoff demo'
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claim.sub', '', true);

select lives_ok(
  $$ select public.record_ai_usage_event(
    '8c000000-0000-4000-8000-000000000001',
    'manager_briefing',
    'gpt-4o-mini',
    'succeeded',
    80,
    20,
    450,
    0,
    15000,
    null,
    null,
    0.000024,
    '{"demo":"phase_07_10","user_id":"8c100000-0000-4000-8000-000000000001"}'::jsonb
  ) $$,
  'AI usage telemetry is recorded for the signoff demo'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '8c100000-0000-4000-8000-000000000001', true);

select ok(
  exists (
    select 1
    from public.ai_usage_admin_dashboard_v
    where model = 'gpt-4o-mini'
      and request_count >= 1
      and used_tokens >= 100
  ),
  'AI usage dashboard includes signoff telemetry'
);

select is(
  (
    select count(*)::integer
    from public.audit_log
    where company_id = '8c000000-0000-4000-8000-000000000001'
      and action in (
        'ai.manager_briefing.generated',
        'ai.scheduling_suggestion.created',
        'ai.scheduling_suggestion.approved',
        'ai.recommendation_feedback.recorded',
        'ai.usage_event.recorded',
        'ai.budget_control.updated'
      )
  ),
  6,
  'signoff demo writes the expected AI audit trail'
);

select is(
  (
    select bool_and(not direct_write_executed)
    from public.ai_scheduling_suggestions_latest_v
  ),
  true,
  'no signoff scheduling suggestion performs direct writes'
);

select ok(
  exists (
    select 1
    from public.ai_learning_loop_readiness_v
    where ready_for_learning
  ),
  'learning loop readiness is true after signoff feedback'
);

select ok(
  exists (
    select 1
    from public.ai_observability_readiness_v
    where has_budget_controls
      and token_accounting_valid
  ),
  'observability readiness is true after signoff usage recording'
);

select set_config('request.jwt.claim.sub', '8c100000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.ai_scheduling_suggestions_latest_v),
  0::bigint,
  'Tenant B cannot read Tenant A signoff suggestions'
);

select is(
  (select count(*) from public.ai_recommendation_feedback_latest_v),
  0::bigint,
  'Tenant B cannot read Tenant A signoff feedback'
);

select throws_ok(
  $$ select public.refresh_ai_scheduling_suggestions(
    '8c000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001',
  'Not allowed to refresh scheduling suggestions for this company',
  'Tenant B cannot mutate Tenant A signoff AI suggestions'
);

select * from finish();

rollback;
