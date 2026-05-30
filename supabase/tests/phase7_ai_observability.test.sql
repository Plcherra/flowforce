begin;

create extension if not exists pgtap;

select plan(18);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.ai_usage_events where company_id in (
  '8b000000-0000-4000-8000-000000000001',
  '8b000000-0000-4000-8000-000000000002'
);
delete from public.ai_budget_controls where company_id in (
  '8b000000-0000-4000-8000-000000000001',
  '8b000000-0000-4000-8000-000000000002'
);
delete from public.audit_log where company_id in (
  '8b000000-0000-4000-8000-000000000001',
  '8b000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '8b000000-0000-4000-8000-000000000001',
  '8b000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '8b100000-0000-4000-8000-000000000001',
  '8b100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '8b000000-0000-4000-8000-000000000001',
  '8b000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '8b100000-0000-4000-8000-000000000001',
  '8b100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '8b100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase7-ai-observe-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '8b100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase7-ai-observe-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('8b000000-0000-4000-8000-000000000001', 'Phase 7 AI Observability Tenant A', 'phase-7-ai-observe-a', '8b100000-0000-4000-8000-000000000001', '8b100000-0000-4000-8000-000000000001', true),
  ('8b000000-0000-4000-8000-000000000002', 'Phase 7 AI Observability Tenant B', 'phase-7-ai-observe-b', '8b100000-0000-4000-8000-000000000002', '8b100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, employment_status, is_company_admin)
values
  ('8b100000-0000-4000-8000-000000000001', '8b000000-0000-4000-8000-000000000001', 'Observe', 'Owner A', 'phase7-ai-observe-a@example.test', 'owner', 'active', true),
  ('8b100000-0000-4000-8000-000000000002', '8b000000-0000-4000-8000-000000000002', 'Observe', 'Owner B', 'phase7-ai-observe-b@example.test', 'owner', 'active', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('8b000000-0000-4000-8000-000000000001', '8b100000-0000-4000-8000-000000000001', 'owner', now()),
  ('8b000000-0000-4000-8000-000000000002', '8b100000-0000-4000-8000-000000000002', 'owner', now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '8b100000-0000-4000-8000-000000000001', true);

select has_table('public', 'ai_usage_events', 'AI usage events table exists');
select has_table('public', 'ai_budget_controls', 'AI budget controls table exists');

select lives_ok(
  $$ select public.upsert_ai_budget_control(
    '8b000000-0000-4000-8000-000000000001',
    'gpt-4o-mini',
    1000,
    5,
    2,
    15000,
    true
  ) $$,
  'tenant admin can configure AI budget controls'
);

select throws_ok(
  $$ select public.record_ai_usage_event(
    '8b000000-0000-4000-8000-000000000001',
    'manager_briefing',
    'gpt-4o-mini',
    'succeeded',
    1,
    1,
    1,
    0,
    15000,
    null,
    null,
    0,
    '{}'::jsonb
  ) $$,
  '42501',
  'permission denied for function record_ai_usage_event',
  'authenticated tenant members cannot directly record AI usage telemetry'
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claim.sub', '', true);

select lives_ok(
  $$ select public.record_ai_usage_event(
    '8b000000-0000-4000-8000-000000000001',
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
    '{"surface":"manager_briefing","user_id":"8b100000-0000-4000-8000-000000000001"}'::jsonb
  ) $$,
  'trusted server context can record successful AI usage'
);

select lives_ok(
  $$ select public.record_ai_usage_event(
    '8b000000-0000-4000-8000-000000000001',
    'manager_briefing',
    'gpt-4o-mini',
    'timeout',
    10,
    0,
    15000,
    2,
    15000,
    'provider_timeout',
    'Provider timed out and fallback was returned.',
    0,
    '{"surface":"manager_briefing","user_id":"8b100000-0000-4000-8000-000000000001"}'::jsonb
  ) $$,
  'trusted server context can record degraded AI usage'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '8b100000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.ai_usage_events_latest_v),
  2::bigint,
  'usage ledger records successful and degraded events'
);

select is(
  (select total_tokens from public.ai_usage_events_latest_v where status = 'succeeded'),
  100,
  'usage ledger records token totals'
);

select is(
  (select fallback_used from public.ai_usage_events_latest_v where status = 'timeout'),
  true,
  'degraded usage records fallback behavior'
);

select lives_ok(
  $$ select public.upsert_ai_budget_control(
    '8b000000-0000-4000-8000-000000000001',
    'gpt-4o-mini',
    120,
    5,
    1,
    10000,
    true
  ) $$,
  'tenant admin can tighten AI budget controls'
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claim.sub', '', true);

select is(
  (public.record_ai_usage_event(
    '8b000000-0000-4000-8000-000000000001',
    'scheduling_assistant',
    'gpt-4o-mini',
    'succeeded',
    40,
    10,
    300,
    1,
    10000,
    null,
    null,
    0.000012,
    '{"user_id":"8b100000-0000-4000-8000-000000000001"}'::jsonb
  )->>'status'),
  'budget_blocked',
  'usage recording blocks calls that exceed budget'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '8b100000-0000-4000-8000-000000000001', true);

select ok(
  exists (
    select 1
    from public.ai_budget_status_v
    where model = 'gpt-4o-mini'
      and should_block
  ),
  'budget status reports blocking state'
);

select ok(
  exists (
    select 1
    from public.ai_usage_admin_dashboard_v
    where model = 'gpt-4o-mini'
      and request_count >= 3
      and fallback_count >= 2
  ),
  'admin dashboard exposes requests and fallback counts'
);

select ok(
  exists (
    select 1
    from public.ai_observability_readiness_v
    where has_budget_controls
      and token_accounting_valid
      and retry_timeout_recorded
  ),
  'observability readiness confirms budget and retry telemetry'
);

select is(
  (select count(*) from public.audit_log where action in ('ai.usage_event.recorded', 'ai.usage_event.degraded') and company_id = '8b000000-0000-4000-8000-000000000001'),
  3::bigint,
  'usage event recording writes audit records'
);

select is(
  (select count(*) from public.audit_log where action = 'ai.budget_control.updated' and company_id = '8b000000-0000-4000-8000-000000000001'),
  2::bigint,
  'budget control changes are audited'
);

select set_config('request.jwt.claim.sub', '8b100000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.ai_usage_events_latest_v),
  0::bigint,
  'Tenant B cannot read Tenant A AI usage'
);

select throws_ok(
  $$ select public.upsert_ai_budget_control(
    '8b000000-0000-4000-8000-000000000001',
    'gpt-4o-mini',
    1000,
    5,
    2,
    15000,
    true
  ) $$,
  'P0001',
  'Not allowed to manage AI budget controls for this company',
  'Tenant B cannot manage Tenant A AI budgets'
);

select * from finish();

rollback;
