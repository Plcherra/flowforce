begin;

create extension if not exists pgtap;

select plan(14);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.audit_log where company_id in (
  '64000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000002'
);
delete from public.workflow_exceptions where company_id in (
  '64000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000002'
);
delete from public.workflow_evidence where company_id in (
  '64000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000002'
);
delete from public.workflow_step_instances where company_id in (
  '64000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000002'
);
delete from public.task_workflow_instances where company_id in (
  '64000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000002'
);
delete from public.workflow_steps where company_id in (
  '64000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000002'
);
delete from public.workflows where company_id in (
  '64000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '64000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '64100000-0000-4000-8000-000000000001',
  '64100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '64000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '64100000-0000-4000-8000-000000000001',
  '64100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '64100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase6-field-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '64100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase6-field-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('64000000-0000-4000-8000-000000000001', 'Phase 6 Field Tenant A', 'phase-6-field-a', '64100000-0000-4000-8000-000000000001', '64100000-0000-4000-8000-000000000001', true),
  ('64000000-0000-4000-8000-000000000002', 'Phase 6 Field Tenant B', 'phase-6-field-b', '64100000-0000-4000-8000-000000000002', '64100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('64100000-0000-4000-8000-000000000001', '64000000-0000-4000-8000-000000000001', 'Field', 'Executor A', 'phase6-field-a@example.test', 'employee', false),
  ('64100000-0000-4000-8000-000000000002', '64000000-0000-4000-8000-000000000002', 'Field', 'Executor B', 'phase6-field-b@example.test', 'employee', false);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('64000000-0000-4000-8000-000000000001', '64100000-0000-4000-8000-000000000001', 'employee', now()),
  ('64000000-0000-4000-8000-000000000002', '64100000-0000-4000-8000-000000000002', 'employee', now());

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
  '64200000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000001',
  'Mobile Opening Checklist',
  'checklist',
  'opening',
  'active',
  true,
  true,
  '64100000-0000-4000-8000-000000000001'
);

insert into public.workflow_steps (
  id,
  company_id,
  workflow_id,
  name,
  step_number,
  step_type,
  required,
  evidence_required,
  exception_policy,
  failure_escalation
)
values
  ('64300000-0000-4000-8000-000000000001', '64000000-0000-4000-8000-000000000001', '64200000-0000-4000-8000-000000000001', 'Record cooler temperature', 1, 'measurement', true, true, '{"severity":"high"}'::jsonb, '{"due_minutes":10}'::jsonb),
  ('64300000-0000-4000-8000-000000000002', '64000000-0000-4000-8000-000000000001', '64200000-0000-4000-8000-000000000001', 'Check front door', 2, 'task', true, false, '{"severity":"warning"}'::jsonb, '{"due_minutes":15}'::jsonb);

insert into public.task_workflow_instances (
  id,
  company_id,
  workflow_id,
  assigned_to,
  status,
  review_status,
  due_at
)
values (
  '64400000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000001',
  '64200000-0000-4000-8000-000000000001',
  '64100000-0000-4000-8000-000000000001',
  'scheduled',
  'pending',
  now() + interval '2 hours'
);

insert into public.workflow_step_instances (
  id,
  company_id,
  workflow_instance_id,
  step_id,
  status,
  evidence_status
)
values
  ('64500000-0000-4000-8000-000000000001', '64000000-0000-4000-8000-000000000001', '64400000-0000-4000-8000-000000000001', '64300000-0000-4000-8000-000000000001', 'pending', 'missing'),
  ('64500000-0000-4000-8000-000000000002', '64000000-0000-4000-8000-000000000001', '64400000-0000-4000-8000-000000000001', '64300000-0000-4000-8000-000000000002', 'pending', 'not_required');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '64100000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.operations_field_execution_queue_v),
  1::bigint,
  'assigned employee sees one field execution run'
);

select is(
  (select count(*) from public.operations_workflow_run_steps_v),
  2::bigint,
  'assigned employee sees workflow run steps'
);

select lives_ok(
  $$ select public.start_workflow_run(
    '64000000-0000-4000-8000-000000000001',
    '64400000-0000-4000-8000-000000000001'
  ) $$,
  'employee can start or resume assigned workflow run'
);

select is(
  (select status from public.task_workflow_instances where id = '64400000-0000-4000-8000-000000000001'),
  'in_progress',
  'workflow run starts in progress'
);

select is(
  (select status from public.workflow_step_instances where id = '64500000-0000-4000-8000-000000000001'),
  'draft',
  'first pending step becomes draft on start'
);

select lives_ok(
  $$ select public.save_workflow_step_draft(
    '64000000-0000-4000-8000-000000000001',
    '64500000-0000-4000-8000-000000000001',
    '{"temperature": 39}'::jsonb,
    'Cooler reading started.'
  ) $$,
  'employee can save a step draft'
);

select is(
  (select evidence_status from public.workflow_step_instances where id = '64500000-0000-4000-8000-000000000001'),
  'partial',
  'draft evidence is marked partial'
);

select throws_ok(
  $$ select public.complete_workflow_step(
    '64000000-0000-4000-8000-000000000001',
    '64500000-0000-4000-8000-000000000001',
    'completed',
    '{}'::jsonb,
    null,
    null
  ) $$,
  '22023',
  null,
  'required evidence cannot be omitted'
);

select lives_ok(
  $$ select public.complete_workflow_step(
    '64000000-0000-4000-8000-000000000001',
    '64500000-0000-4000-8000-000000000001',
    'completed',
    '{"temperature": 39}'::jsonb,
    'Cooler OK',
    null
  ) $$,
  'employee can complete a step with evidence'
);

select is(
  (select count(*) from public.workflow_evidence where step_instance_id = '64500000-0000-4000-8000-000000000001'),
  1::bigint,
  'step completion stores evidence'
);

select lives_ok(
  $$ select public.complete_workflow_step(
    '64000000-0000-4000-8000-000000000001',
    '64500000-0000-4000-8000-000000000002',
    'failed',
    '{"door":"blocked"}'::jsonb,
    'Door could not be opened',
    'Front door key missing'
  ) $$,
  'employee can fail a step with a reason'
);

select is(
  (select count(*) from public.workflow_exceptions where step_instance_id = '64500000-0000-4000-8000-000000000002'),
  1::bigint,
  'failed step creates an exception'
);

select lives_ok(
  $$ select public.complete_workflow_run(
    '64000000-0000-4000-8000-000000000001',
    '64400000-0000-4000-8000-000000000001'
  ) $$,
  'employee can complete run after required steps are handled'
);

select is(
  (select review_status from public.task_workflow_instances where id = '64400000-0000-4000-8000-000000000001'),
  'pending',
  'completed review-required workflow moves to manager review'
);

select * from finish();

rollback;
