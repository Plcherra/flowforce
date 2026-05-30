begin;

create extension if not exists pgtap;

select plan(12);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.ai_manager_briefing_runs where company_id in (
  '7d000000-0000-4000-8000-000000000001',
  '7d000000-0000-4000-8000-000000000002'
);
delete from public.audit_log where company_id in (
  '7d000000-0000-4000-8000-000000000001',
  '7d000000-0000-4000-8000-000000000002'
);
delete from public.ai_governance_policies where company_id in (
  '7d000000-0000-4000-8000-000000000001',
  '7d000000-0000-4000-8000-000000000002'
);
delete from public.workflow_exceptions where company_id in (
  '7d000000-0000-4000-8000-000000000001',
  '7d000000-0000-4000-8000-000000000002'
);
delete from public.tasks where company_id in (
  '7d000000-0000-4000-8000-000000000001',
  '7d000000-0000-4000-8000-000000000002'
);
delete from public.forms where company_id in (
  '7d000000-0000-4000-8000-000000000001',
  '7d000000-0000-4000-8000-000000000002'
);
delete from public.schedules where company_id in (
  '7d000000-0000-4000-8000-000000000001',
  '7d000000-0000-4000-8000-000000000002'
);
delete from public.inv_items where company_id in (
  '7d000000-0000-4000-8000-000000000001',
  '7d000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '7d000000-0000-4000-8000-000000000001',
  '7d000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '7d100000-0000-4000-8000-000000000001',
  '7d100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '7d000000-0000-4000-8000-000000000001',
  '7d000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '7d100000-0000-4000-8000-000000000001',
  '7d100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '7d100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase7-briefing-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '7d100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase7-briefing-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('7d000000-0000-4000-8000-000000000001', 'Phase 7 Briefing Tenant A', 'phase-7-briefing-a', '7d100000-0000-4000-8000-000000000001', '7d100000-0000-4000-8000-000000000001', true),
  ('7d000000-0000-4000-8000-000000000002', 'Phase 7 Briefing Tenant B', 'phase-7-briefing-b', '7d100000-0000-4000-8000-000000000002', '7d100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, employment_status, is_company_admin)
values
  ('7d100000-0000-4000-8000-000000000001', '7d000000-0000-4000-8000-000000000001', 'Briefing', 'Owner A', 'phase7-briefing-a@example.test', 'owner', 'active', true),
  ('7d100000-0000-4000-8000-000000000002', '7d000000-0000-4000-8000-000000000002', 'Briefing', 'Owner B', 'phase7-briefing-b@example.test', 'owner', 'active', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('7d000000-0000-4000-8000-000000000001', '7d100000-0000-4000-8000-000000000001', 'owner', now()),
  ('7d000000-0000-4000-8000-000000000002', '7d100000-0000-4000-8000-000000000002', 'owner', now());

insert into public.schedules (company_id, title, start_time, end_time, is_published, user_id, role, location, required_headcount)
values
  ('7d000000-0000-4000-8000-000000000001', 'Briefing shift A', now() + interval '1 day', now() + interval '1 day 8 hours', false, null, 'staff', 'Line', 2);

insert into public.tasks (company_id, title, status, priority, due_date, assigned_to)
values
  ('7d000000-0000-4000-8000-000000000001', 'Briefing task A', 'open', 'high', current_date - 1, '7d100000-0000-4000-8000-000000000001');

insert into public.forms (company_id, title, status, is_anonymous, end_date, max_submissions, created_by)
values
  ('7d000000-0000-4000-8000-000000000001', 'Briefing form A', 'active', true, current_date + 7, 20, '7d100000-0000-4000-8000-000000000001');

insert into public.inv_items (company_id, name, sku, is_active, is_prep_item, min_stock_level, max_stock_level, cost_per_unit)
values
  ('7d000000-0000-4000-8000-000000000001', 'Briefing item A', 'BRIEF-A', true, false, null, 10, 4.25);

insert into public.workflow_exceptions (company_id, severity, status, title, description, created_by)
values
  ('7d000000-0000-4000-8000-000000000001', 'critical', 'open', 'Sensitive workflow exception title', 'Sensitive exception body', '7d100000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '7d100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.install_ai_governance_baseline(
    '7d000000-0000-4000-8000-000000000001'
  ) $$,
  'tenant member can install governance before manager briefing'
);

select lives_ok(
  $$ select public.refresh_ai_manager_briefing(
    '7d000000-0000-4000-8000-000000000001'
  ) $$,
  'tenant member can refresh the manager briefing'
);

select is(
  (select count(*)::integer from public.ai_manager_briefing_latest_v),
  1,
  'manager briefing latest view exposes the current tenant run'
);

select is(
  (select output->>'prompt_key' from public.ai_manager_briefing_latest_v),
  'manager_briefing',
  'manager briefing output uses the manager briefing prompt'
);

select is(
  (select output #>> '{safety,writes_allowed}' from public.ai_manager_briefing_latest_v),
  'false',
  'manager briefing output is read-only'
);

select is(
  (select output #>> '{safety,requires_human_approval}' from public.ai_manager_briefing_latest_v),
  'true',
  'manager briefing output still requires human approval'
);

select ok(
  (
    select evidence::text like '%/app/enhanced-scheduling%'
      and evidence::text like '%/app/operations%'
      and evidence::text like '%/app/tasks%'
    from public.ai_manager_briefing_latest_v
  ),
  'manager briefing includes evidence links'
);

select ok(
  (
    select output::text !~ 'Sensitive workflow exception title|Sensitive exception body|phase7-briefing-a@example\.test'
    from public.ai_manager_briefing_latest_v
  ),
  'manager briefing does not expose raw workflow text or PII'
);

select is(
  (
    select count(*)::integer
    from public.audit_log
    where action = 'ai.manager_briefing.generated'
      and company_id = '7d000000-0000-4000-8000-000000000001'
  ),
  1,
  'manager briefing refresh writes an audit log entry'
);

select ok(
  (select ready_to_refresh from public.ai_manager_briefing_readiness_v),
  'manager briefing readiness is true for governed tenant'
);

select set_config('request.jwt.claim.sub', '7d100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.refresh_ai_manager_briefing(
    '7d000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001',
  'Not allowed to refresh manager briefing for this company',
  'Tenant B cannot refresh Tenant A manager briefing'
);

select throws_ok(
  $$ select public.refresh_ai_manager_briefing(
    '7d000000-0000-4000-8000-000000000002'
  ) $$,
  'P0001',
  'AI governance baseline is required before context fetch',
  'manager briefing requires governance before refresh'
);

select * from finish();

rollback;
