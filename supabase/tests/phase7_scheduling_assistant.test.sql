begin;

create extension if not exists pgtap;

select plan(14);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.ai_scheduling_suggestions where company_id in (
  '7e000000-0000-4000-8000-000000000001',
  '7e000000-0000-4000-8000-000000000002'
);
delete from public.audit_log where company_id in (
  '7e000000-0000-4000-8000-000000000001',
  '7e000000-0000-4000-8000-000000000002'
);
delete from public.ai_governance_policies where company_id in (
  '7e000000-0000-4000-8000-000000000001',
  '7e000000-0000-4000-8000-000000000002'
);
delete from public.schedules where company_id in (
  '7e000000-0000-4000-8000-000000000001',
  '7e000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '7e000000-0000-4000-8000-000000000001',
  '7e000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '7e100000-0000-4000-8000-000000000001',
  '7e100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '7e000000-0000-4000-8000-000000000001',
  '7e000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '7e100000-0000-4000-8000-000000000001',
  '7e100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '7e100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase7-schedule-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '7e100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase7-schedule-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('7e000000-0000-4000-8000-000000000001', 'Phase 7 Scheduling Tenant A', 'phase-7-scheduling-a', '7e100000-0000-4000-8000-000000000001', '7e100000-0000-4000-8000-000000000001', true),
  ('7e000000-0000-4000-8000-000000000002', 'Phase 7 Scheduling Tenant B', 'phase-7-scheduling-b', '7e100000-0000-4000-8000-000000000002', '7e100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, employment_status, is_company_admin)
values
  ('7e100000-0000-4000-8000-000000000001', '7e000000-0000-4000-8000-000000000001', 'Schedule', 'Owner A', 'phase7-schedule-a@example.test', 'owner', 'active', true),
  ('7e100000-0000-4000-8000-000000000002', '7e000000-0000-4000-8000-000000000002', 'Schedule', 'Owner B', 'phase7-schedule-b@example.test', 'owner', 'active', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('7e000000-0000-4000-8000-000000000001', '7e100000-0000-4000-8000-000000000001', 'owner', now()),
  ('7e000000-0000-4000-8000-000000000002', '7e100000-0000-4000-8000-000000000002', 'owner', now());

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
  ('7e000000-0000-4000-8000-000000000001', 'Sensitive schedule title A', now() + interval '1 day', now() + interval '1 day 8 hours', false, null, 'staff', 'Line', 4, 25);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '7e100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.install_ai_governance_baseline(
    '7e000000-0000-4000-8000-000000000001'
  ) $$,
  'tenant member can install governance before scheduling suggestions'
);

select lives_ok(
  $$ select public.refresh_ai_scheduling_suggestions(
    '7e000000-0000-4000-8000-000000000001'
  ) $$,
  'tenant member can refresh scheduling suggestions'
);

select ok(
  (select count(*)::integer >= 2 from public.ai_scheduling_suggestions_latest_v),
  'scheduling assistant creates multiple suggestions from coverage signals'
);

select ok(
  exists (
    select 1
    from public.ai_scheduling_suggestions_latest_v
    where suggestion_type = 'coverage_gap'
  ),
  'scheduling assistant detects coverage gaps'
);

select ok(
  exists (
    select 1
    from public.ai_scheduling_suggestions_latest_v
    where suggestion_type = 'understaffing'
  ),
  'scheduling assistant detects understaffing'
);

select is(
  (
    select bool_and(status = 'pending_review')
    from public.ai_scheduling_suggestions_latest_v
  ),
  true,
  'scheduling suggestions are pending manager review'
);

select is(
  (
    select bool_and(approval_required and not direct_write_executed)
    from public.ai_scheduling_suggestions_latest_v
  ),
  true,
  'scheduling suggestions do not execute direct writes'
);

select ok(
  (
    select bool_and(evidence::text like '%/app/enhanced-scheduling%')
    from public.ai_scheduling_suggestions_latest_v
  ),
  'scheduling suggestions include scheduling evidence links'
);

select ok(
  (
    select bool_and(suggested_action->>'writes_allowed' = 'false')
    from public.ai_scheduling_suggestions_latest_v
  ),
  'scheduling suggested actions are read-only until approval'
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
    'Manager reviewed coverage.'
  ) $$,
  'manager can approve scheduling suggestion without publishing schedules'
);

select is(
  (
    select direct_write_executed
    from public.ai_scheduling_suggestions_latest_v
    where status = 'approved'
    limit 1
  ),
  false,
  'approved scheduling suggestion still does not write schedules'
);

select is(
  (
    select count(*)::integer
    from public.audit_log
    where company_id = '7e000000-0000-4000-8000-000000000001'
      and action in ('ai.scheduling_suggestion.created', 'ai.scheduling_suggestion.approved')
  ),
  2,
  'scheduling suggestion refresh and approval are audited'
);

select set_config('request.jwt.claim.sub', '7e100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.refresh_ai_scheduling_suggestions(
    '7e000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001',
  'Not allowed to refresh scheduling suggestions for this company',
  'Tenant B cannot refresh Tenant A scheduling suggestions'
);

select throws_ok(
  $$ select public.refresh_ai_scheduling_suggestions(
    '7e000000-0000-4000-8000-000000000002'
  ) $$,
  'P0001',
  'AI governance baseline is required before context fetch',
  'scheduling suggestions require governance before refresh'
);

select * from finish();

rollback;
