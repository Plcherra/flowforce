begin;

create extension if not exists pgtap;

select plan(13);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.audit_log where company_id in (
  '66000000-0000-4000-8000-000000000001',
  '66000000-0000-4000-8000-000000000002'
);
delete from public.ops_issues where company_id in (
  '66000000-0000-4000-8000-000000000001',
  '66000000-0000-4000-8000-000000000002'
);
delete from public.tasks where company_id in (
  '66000000-0000-4000-8000-000000000001',
  '66000000-0000-4000-8000-000000000002'
);
delete from public.workflow_exceptions where company_id in (
  '66000000-0000-4000-8000-000000000001',
  '66000000-0000-4000-8000-000000000002'
);
delete from public.task_workflow_instances where company_id in (
  '66000000-0000-4000-8000-000000000001',
  '66000000-0000-4000-8000-000000000002'
);
delete from public.workflows where company_id in (
  '66000000-0000-4000-8000-000000000001',
  '66000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '66000000-0000-4000-8000-000000000001',
  '66000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '66100000-0000-4000-8000-000000000001',
  '66100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '66000000-0000-4000-8000-000000000001',
  '66000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '66100000-0000-4000-8000-000000000001',
  '66100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '66100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase6-issues-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '66100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase6-issues-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('66000000-0000-4000-8000-000000000001', 'Phase 6 Issues Tenant A', 'phase-6-issues-a', '66100000-0000-4000-8000-000000000001', '66100000-0000-4000-8000-000000000001', true),
  ('66000000-0000-4000-8000-000000000002', 'Phase 6 Issues Tenant B', 'phase-6-issues-b', '66100000-0000-4000-8000-000000000002', '66100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('66100000-0000-4000-8000-000000000001', '66000000-0000-4000-8000-000000000001', 'Issue', 'Owner A', 'phase6-issues-a@example.test', 'manager', true),
  ('66100000-0000-4000-8000-000000000002', '66000000-0000-4000-8000-000000000002', 'Issue', 'Owner B', 'phase6-issues-b@example.test', 'manager', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('66000000-0000-4000-8000-000000000001', '66100000-0000-4000-8000-000000000001', 'admin', now()),
  ('66000000-0000-4000-8000-000000000002', '66100000-0000-4000-8000-000000000002', 'admin', now());

insert into public.workflows (
  id,
  company_id,
  name,
  workflow_kind,
  template_category,
  status,
  created_by
)
values (
  '66200000-0000-4000-8000-000000000001',
  '66000000-0000-4000-8000-000000000001',
  'Food Safety Incident Response',
  'incident_response',
  'safety',
  'active',
  '66100000-0000-4000-8000-000000000001'
);

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
  '66300000-0000-4000-8000-000000000001',
  '66000000-0000-4000-8000-000000000001',
  '66200000-0000-4000-8000-000000000001',
  '66100000-0000-4000-8000-000000000001',
  'in_progress',
  'pending',
  now() - interval '1 hour'
);

insert into public.workflow_exceptions (
  id,
  company_id,
  workflow_instance_id,
  workflow_id,
  severity,
  status,
  title,
  description,
  created_by
)
values (
  '66400000-0000-4000-8000-000000000001',
  '66000000-0000-4000-8000-000000000001',
  '66300000-0000-4000-8000-000000000001',
  '66200000-0000-4000-8000-000000000001',
  'critical',
  'open',
  'Cooler temperature failed',
  'Temperature exceeded safe range.',
  '66100000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '66100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.create_operational_issue(
    '66000000-0000-4000-8000-000000000001',
    'Cooler temperature incident',
    'Temperature exceeded safe range.',
    'food_safety',
    'critical',
    '66100000-0000-4000-8000-000000000001',
    now() - interval '30 minutes',
    '66300000-0000-4000-8000-000000000001',
    '66400000-0000-4000-8000-000000000001',
    'SKU-COOLER-1',
    true,
    '{"source":"workflow_exception"}'::jsonb
  ) $$,
  'manager can create a linked operational issue'
);

select is((select count(*) from public.ops_issues), 1::bigint, 'issue row is created');

select is((select count(*) from public.tasks where source = 'ops_issue'), 1::bigint, 'issue creates follow-up task');

select ok(
  (select linked_ops_issue_id is not null and linked_task_id is not null from public.workflow_exceptions where id = '66400000-0000-4000-8000-000000000001'),
  'workflow exception links to issue and task'
);

select is((select count(*) from public.operations_incident_issue_queue_v), 1::bigint, 'issue queue exposes tenant issue');

select is(
  (select sla_status from public.operations_incident_issue_queue_v limit 1),
  'overdue',
  'issue queue marks overdue SLA'
);

select is(
  (select open_issues from public.operations_issue_reporting_v where issue_type = 'food_safety'),
  1,
  'issue reporting counts open issues'
);

select lives_ok(
  $$ select public.update_operational_issue_status(
    '66000000-0000-4000-8000-000000000001',
    (select id from public.ops_issues limit 1),
    'in_progress',
    null,
    null,
    null
  ) $$,
  'manager can move issue into progress'
);

select is((select status from public.ops_issues limit 1), 'in_progress', 'issue status updates');

select lives_ok(
  $$ select public.update_operational_issue_status(
    '66000000-0000-4000-8000-000000000001',
    (select id from public.ops_issues limit 1),
    'resolved',
    null,
    null,
    'Cooler was pulled from service and food was discarded.'
  ) $$,
  'manager can resolve issue with notes'
);

select ok((select resolved_at is not null from public.ops_issues limit 1), 'resolved issue stores resolved timestamp');

select is((select status from public.tasks where source = 'ops_issue' limit 1), 'completed', 'linked task closes with issue');

select set_config('request.jwt.claim.sub', '66100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.update_operational_issue_status(
    '66000000-0000-4000-8000-000000000001',
    (select id from public.ops_issues limit 1),
    'open',
    null,
    null,
    null
  ) $$,
  '42501',
  null,
  'Tenant B cannot update Tenant A issue'
);

select * from finish();

rollback;
