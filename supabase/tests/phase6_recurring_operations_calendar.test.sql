begin;

create extension if not exists pgtap;

select plan(12);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.workflow_step_instances where company_id in (
  '63000000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000002'
);
delete from public.task_workflow_instances where company_id in (
  '63000000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000002'
);
delete from public.workflow_assignments where company_id in (
  '63000000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000002'
);
delete from public.workflow_steps where company_id in (
  '63000000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000002'
);
delete from public.workflows where company_id in (
  '63000000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '63000000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '63100000-0000-4000-8000-000000000001',
  '63100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '63000000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '63100000-0000-4000-8000-000000000001',
  '63100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '63100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase6-calendar-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '63100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase6-calendar-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('63000000-0000-4000-8000-000000000001', 'Phase 6 Calendar Tenant A', 'phase-6-calendar-a', '63100000-0000-4000-8000-000000000001', '63100000-0000-4000-8000-000000000001', true),
  ('63000000-0000-4000-8000-000000000002', 'Phase 6 Calendar Tenant B', 'phase-6-calendar-b', '63100000-0000-4000-8000-000000000002', '63100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('63100000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000001', 'Calendar', 'Owner A', 'phase6-calendar-a@example.test', 'owner', true),
  ('63100000-0000-4000-8000-000000000002', '63000000-0000-4000-8000-000000000002', 'Calendar', 'Owner B', 'phase6-calendar-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('63000000-0000-4000-8000-000000000001', '63100000-0000-4000-8000-000000000001', 'owner', now()),
  ('63000000-0000-4000-8000-000000000002', '63100000-0000-4000-8000-000000000002', 'owner', now());

insert into public.workflows (
  id,
  company_id,
  name,
  workflow_kind,
  template_category,
  status,
  is_template,
  review_required,
  created_by
)
values (
  '63200000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000001',
  'Recurring Opening Checklist',
  'checklist',
  'opening',
  'active',
  true,
  true,
  '63100000-0000-4000-8000-000000000001'
);

insert into public.workflow_steps (
  id,
  company_id,
  workflow_id,
  name,
  step_number,
  step_type,
  required,
  evidence_required
)
values
  ('63300000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000001', '63200000-0000-4000-8000-000000000001', 'Unlock store', 1, 'task', true, false),
  ('63300000-0000-4000-8000-000000000002', '63000000-0000-4000-8000-000000000001', '63200000-0000-4000-8000-000000000001', 'Record opening photo', 2, 'photo', true, true);

insert into public.workflow_assignments (
  id,
  company_id,
  workflow_id,
  assignment_type,
  assigned_to,
  schedule_rule,
  due_window,
  escalation_rule,
  created_by
)
values (
  '63400000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000001',
  '63200000-0000-4000-8000-000000000001',
  'person',
  '63100000-0000-4000-8000-000000000001',
  '{"frequency":"daily","timezone":"UTC"}'::jsonb,
  '{"due_time":"09:00","timezone":"UTC","start_minutes_before_due":45}'::jsonb,
  '{"overdue_minutes":20}'::jsonb,
  '63100000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '63100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.generate_recurring_workflow_runs(
    '63000000-0000-4000-8000-000000000001',
    '2026-05-28'::date,
    '2026-05-30'::date
  ) $$,
  'Tenant A can generate recurring workflow runs'
);

select is(
  (select count(*) from public.task_workflow_instances),
  3::bigint,
  'three daily workflow runs are generated'
);

select is(
  (select count(*) from public.workflow_step_instances),
  6::bigint,
  'step runs are generated for each recurring workflow run'
);

select is(
  (select count(*) from public.task_workflow_instances where review_status = 'pending'),
  3::bigint,
  'review required workflows generate pending review runs'
);

select is(
  (
    select count(*)
    from public.task_workflow_instances
    where starts_at = due_at - interval '45 minutes'
      and escalation_at = due_at + interval '20 minutes'
  ),
  3::bigint,
  'start and escalation windows are calculated from assignment rules'
);

select lives_ok(
  $$ select public.generate_recurring_workflow_runs(
    '63000000-0000-4000-8000-000000000001',
    '2026-05-28'::date,
    '2026-05-30'::date
  ) $$,
  'Recurring generation can be safely retried'
);

select is(
  (select count(*) from public.task_workflow_instances),
  3::bigint,
  'retry does not create duplicate workflow runs'
);

select is(
  (select count(*) from public.workflow_step_instances),
  6::bigint,
  'retry does not create duplicate step runs'
);

select is(
  (select total_runs from public.operations_daily_workload_v where workload_date = '2026-05-28'::date),
  1::integer,
  'daily workload view exposes generated runs'
);

select is(
  (select pending_review_runs from public.operations_daily_workload_v where workload_date = '2026-05-28'::date),
  1::integer,
  'daily workload view exposes pending reviews'
);

select throws_ok(
  $$ select public.generate_recurring_workflow_runs(
    '63000000-0000-4000-8000-000000000002',
    '2026-05-28'::date,
    '2026-05-30'::date
  ) $$,
  '42501',
  null,
  'Tenant A cannot generate recurring runs for Tenant B'
);

select throws_ok(
  $$ select public.generate_recurring_workflow_runs(
    '63000000-0000-4000-8000-000000000001',
    '2026-05-30'::date,
    '2026-05-28'::date
  ) $$,
  '22023',
  null,
  'calendar generation rejects invalid date ranges'
);

select * from finish();

rollback;
