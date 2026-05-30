begin;

create extension if not exists pgtap;

select plan(17);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.ai_governance_policies where company_id in (
  '7b000000-0000-4000-8000-000000000001',
  '7b000000-0000-4000-8000-000000000002'
);
delete from public.tasks where company_id in (
  '7b000000-0000-4000-8000-000000000001',
  '7b000000-0000-4000-8000-000000000002'
);
delete from public.forms where company_id in (
  '7b000000-0000-4000-8000-000000000001',
  '7b000000-0000-4000-8000-000000000002'
);
delete from public.schedules where company_id in (
  '7b000000-0000-4000-8000-000000000001',
  '7b000000-0000-4000-8000-000000000002'
);
delete from public.inv_items where company_id in (
  '7b000000-0000-4000-8000-000000000001',
  '7b000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '7b000000-0000-4000-8000-000000000001',
  '7b000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '7b100000-0000-4000-8000-000000000001',
  '7b100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '7b000000-0000-4000-8000-000000000001',
  '7b000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '7b100000-0000-4000-8000-000000000001',
  '7b100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '7b100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase7-context-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '7b100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase7-context-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('7b000000-0000-4000-8000-000000000001', 'Phase 7 Context Tenant A', 'phase-7-context-a', '7b100000-0000-4000-8000-000000000001', '7b100000-0000-4000-8000-000000000001', true),
  ('7b000000-0000-4000-8000-000000000002', 'Phase 7 Context Tenant B', 'phase-7-context-b', '7b100000-0000-4000-8000-000000000002', '7b100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, phone, role, employment_status, is_company_admin)
values
  ('7b100000-0000-4000-8000-000000000001', '7b000000-0000-4000-8000-000000000001', 'SensitiveAlpha', 'Owner', 'sensitive-alpha@example.test', '555-0101', 'owner', 'active', true),
  ('7b100000-0000-4000-8000-000000000002', '7b000000-0000-4000-8000-000000000002', 'SensitiveBeta', 'Owner', 'sensitive-beta@example.test', '555-0202', 'owner', 'active', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('7b000000-0000-4000-8000-000000000001', '7b100000-0000-4000-8000-000000000001', 'owner', now()),
  ('7b000000-0000-4000-8000-000000000002', '7b100000-0000-4000-8000-000000000002', 'owner', now());

insert into public.schedules (company_id, title, start_time, end_time, is_published, user_id, role, location, required_headcount)
values
  ('7b000000-0000-4000-8000-000000000001', 'Sensitive schedule title A', now() + interval '1 day', now() + interval '1 day 8 hours', true, '7b100000-0000-4000-8000-000000000001', 'manager', 'Sensitive location A', 2),
  ('7b000000-0000-4000-8000-000000000001', 'Unassigned schedule title A', now() + interval '2 days', now() + interval '2 days 8 hours', false, null, 'staff', 'Sensitive location A', 1),
  ('7b000000-0000-4000-8000-000000000002', 'Sensitive schedule title B', now() + interval '1 day', now() + interval '1 day 8 hours', true, '7b100000-0000-4000-8000-000000000002', 'manager', 'Sensitive location B', 1);

insert into public.tasks (company_id, title, status, priority, due_date, assigned_to)
values
  ('7b000000-0000-4000-8000-000000000001', 'Sensitive task title A', 'open', 'high', current_date - 1, '7b100000-0000-4000-8000-000000000001'),
  ('7b000000-0000-4000-8000-000000000001', 'Completed task title A', 'completed', 'low', current_date, null),
  ('7b000000-0000-4000-8000-000000000002', 'Sensitive task title B', 'open', 'high', current_date - 1, '7b100000-0000-4000-8000-000000000002');

insert into public.forms (company_id, title, status, is_anonymous, end_date, max_submissions, created_by)
values
  ('7b000000-0000-4000-8000-000000000001', 'Sensitive form title A', 'active', true, current_date + 7, 20, '7b100000-0000-4000-8000-000000000001'),
  ('7b000000-0000-4000-8000-000000000002', 'Sensitive form title B', 'active', false, current_date + 7, 20, '7b100000-0000-4000-8000-000000000002');

insert into public.inv_items (company_id, name, sku, is_active, is_prep_item, min_stock_level, max_stock_level, cost_per_unit)
values
  ('7b000000-0000-4000-8000-000000000001', 'Sensitive item A', 'SECRET-A', true, true, 1, 10, 4.25),
  ('7b000000-0000-4000-8000-000000000002', 'Sensitive item B', 'SECRET-B', true, false, 1, 10, 8.50);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '7b100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.install_ai_governance_baseline(
    '7b000000-0000-4000-8000-000000000001'
  ) $$,
  'tenant member can install governance before fetching AI context'
);

select is(
  (select count(*)::integer from public.ai_context_module_summaries_v),
  6,
  'AI context exposes six module summaries for the current tenant'
);

select is(
  (select count(distinct company_id)::integer from public.ai_context_module_summaries_v),
  1,
  'AI context view is scoped to one tenant'
);

select ok((select has_scheduling from public.ai_context_readiness_v), 'AI context includes scheduling summary');
select ok((select has_inventory from public.ai_context_readiness_v), 'AI context includes inventory summary');
select ok((select has_tasks from public.ai_context_readiness_v), 'AI context includes tasks summary');
select ok((select has_forms from public.ai_context_readiness_v), 'AI context includes forms summary');
select ok((select has_employees from public.ai_context_readiness_v), 'AI context includes employee summary');
select ok((select has_cost from public.ai_context_readiness_v), 'AI context includes cost summary');
select ok((select redaction_enforced from public.ai_context_readiness_v), 'AI context redaction is enforced');
select ok((select ready_for_prompt_contracts from public.ai_context_readiness_v), 'AI context is ready for prompt contracts');

select is(
  (
    select (summary->>'total_tasks')::integer
    from public.ai_context_module_summaries_v
    where module_key = 'tasks'
  ),
  2,
  'task summary counts tenant tasks without exposing titles'
);

select lives_ok(
  $$ select public.get_ai_context_snapshot(
    '7b000000-0000-4000-8000-000000000001'
  ) $$,
  'tenant member can fetch structured AI context snapshot'
);

select is(
  (
    select count(*)::integer
    from jsonb_object_keys(public.get_ai_context_snapshot(
      '7b000000-0000-4000-8000-000000000001'
    )->'modules')
  ),
  6,
  'AI context snapshot contains six module objects'
);

select ok(
  (
    select public.get_ai_context_snapshot(
      '7b000000-0000-4000-8000-000000000001'
    )::text !~ 'SensitiveAlpha|sensitive-alpha@example\.test|555-0101|Sensitive task title A|SECRET-A'
  ),
  'AI context snapshot excludes raw PII and raw free-text records'
);

select set_config('request.jwt.claim.sub', '7b100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.get_ai_context_snapshot(
    '7b000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001',
  'Not allowed to fetch AI context for this company',
  'Tenant B cannot fetch Tenant A AI context snapshot'
);

select throws_ok(
  $$ select public.get_ai_context_snapshot(
    '7b000000-0000-4000-8000-000000000002'
  ) $$,
  'P0001',
  'AI governance baseline is required before context fetch',
  'AI context snapshot requires governance baseline for the current tenant'
);

select * from finish();

rollback;
