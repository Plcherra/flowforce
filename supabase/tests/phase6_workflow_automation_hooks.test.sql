begin;

create extension if not exists pgtap;

select plan(12);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.audit_log where company_id in (
  '68000000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000002'
);
delete from public.workflow_automation_runs where company_id in (
  '68000000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000002'
);
delete from public.task_notifications where company_id in (
  '68000000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000002'
);
delete from public.ops_issues where company_id in (
  '68000000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000002'
);
delete from public.tasks where company_id in (
  '68000000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000002'
);
delete from public.workflow_exceptions where company_id in (
  '68000000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000002'
);
delete from public.workflow_step_instances where company_id in (
  '68000000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000002'
);
delete from public.task_workflow_instances where company_id in (
  '68000000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000002'
);
delete from public.workflow_steps where company_id in (
  '68000000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000002'
);
delete from public.workflows where company_id in (
  '68000000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '68000000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '68100000-0000-4000-8000-000000000001',
  '68100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '68000000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '68100000-0000-4000-8000-000000000001',
  '68100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '68100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase6-hooks-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '68100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase6-hooks-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('68000000-0000-4000-8000-000000000001', 'Phase 6 Hooks Tenant A', 'phase-6-hooks-a', '68100000-0000-4000-8000-000000000001', '68100000-0000-4000-8000-000000000001', true),
  ('68000000-0000-4000-8000-000000000002', 'Phase 6 Hooks Tenant B', 'phase-6-hooks-b', '68100000-0000-4000-8000-000000000002', '68100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('68100000-0000-4000-8000-000000000001', '68000000-0000-4000-8000-000000000001', 'Hook', 'Manager A', 'phase6-hooks-a@example.test', 'manager', true),
  ('68100000-0000-4000-8000-000000000002', '68000000-0000-4000-8000-000000000002', 'Hook', 'Manager B', 'phase6-hooks-b@example.test', 'manager', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('68000000-0000-4000-8000-000000000001', '68100000-0000-4000-8000-000000000001', 'admin', now()),
  ('68000000-0000-4000-8000-000000000002', '68100000-0000-4000-8000-000000000002', 'admin', now());

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
  '68200000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000001',
  'Inventory Count Exception Workflow',
  'inventory_count',
  'inventory_count',
  'active',
  '68100000-0000-4000-8000-000000000001'
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
values (
  '68300000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000001',
  '68200000-0000-4000-8000-000000000001',
  'Reconcile count variance',
  1,
  'inventory_count',
  true,
  true,
  '{"severity":"critical"}'::jsonb,
  '{"due_minutes":30}'::jsonb
);

insert into public.task_workflow_instances (
  id,
  company_id,
  workflow_id,
  assigned_to,
  status,
  review_status,
  due_at,
  source_type,
  metadata
)
values (
  '68400000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000001',
  '68200000-0000-4000-8000-000000000001',
  '68100000-0000-4000-8000-000000000001',
  'in_progress',
  'pending',
  now() - interval '2 hours',
  'inventory_count',
  '{"inventory_item_id":"sku-variance-1"}'::jsonb
);

insert into public.workflow_step_instances (
  id,
  company_id,
  workflow_instance_id,
  step_id,
  status,
  evidence_status
)
values (
  '68500000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000001',
  '68400000-0000-4000-8000-000000000001',
  '68300000-0000-4000-8000-000000000001',
  'failed',
  'rejected'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '68100000-0000-4000-8000-000000000001', true);

insert into public.workflow_exceptions (
  id,
  company_id,
  workflow_instance_id,
  step_instance_id,
  workflow_id,
  step_id,
  severity,
  status,
  title,
  description,
  owner_id,
  due_at,
  created_by
)
values (
  '68600000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000001',
  '68400000-0000-4000-8000-000000000001',
  '68500000-0000-4000-8000-000000000001',
  '68200000-0000-4000-8000-000000000001',
  '68300000-0000-4000-8000-000000000001',
  'critical',
  'open',
  'Count variance failed',
  'Variance exceeded manager threshold.',
  '68100000-0000-4000-8000-000000000001',
  now() - interval '1 hour',
  '68100000-0000-4000-8000-000000000001'
);

select is(
  (select count(*) from public.workflow_automation_runs where hook_type = 'failed_step_task'),
  1::bigint,
  'failed step exception creates an automation run'
);

select is(
  (select source from public.tasks where source = 'workflow_automation' limit 1),
  'workflow_automation',
  'failed step automation creates follow-up task'
);

select ok(
  (select linked_task_id is not null from public.workflow_exceptions where id = '68600000-0000-4000-8000-000000000001'),
  'workflow exception links to automation task'
);

select is(
  (select count(*) from public.ops_issues where issue_type = 'inventory_review'),
  1::bigint,
  'inventory workflow exception creates review issue'
);

select ok(
  (select linked_ops_issue_id is not null from public.workflow_exceptions where id = '68600000-0000-4000-8000-000000000001'),
  'workflow exception links to inventory review issue'
);

select is(
  (select count(*) from public.audit_log where action like 'workflow.automation.%'),
  2::bigint,
  'automation actions are audited'
);

select lives_ok(
  $$ select public.run_workflow_exception_automation(
    '68000000-0000-4000-8000-000000000001',
    '68600000-0000-4000-8000-000000000001'
  ) $$,
  'manual exception automation rerun is idempotent'
);

select is(
  (select count(*) from public.workflow_automation_runs),
  2::bigint,
  'rerun does not duplicate failed-step or inventory hooks'
);

select is(
  (select (public.run_overdue_critical_workflow_notifications('68000000-0000-4000-8000-000000000001') ->> 'created_count')::integer),
  1,
  'overdue critical workflow creates notification hook'
);

select is(
  (select count(*) from public.task_notifications where type = 'workflow_overdue_critical'),
  1::bigint,
  'overdue critical hook creates one task notification'
);

select is(
  (select (public.run_overdue_critical_workflow_notifications('68000000-0000-4000-8000-000000000001') ->> 'skipped_count')::integer),
  1,
  'overdue critical workflow notification is idempotent'
);

select set_config('request.jwt.claim.sub', '68100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.run_overdue_critical_workflow_notifications(
    '68000000-0000-4000-8000-000000000001'
  ) $$,
  '42501',
  null,
  'Tenant B cannot run Tenant A workflow automation hooks'
);

select * from finish();

rollback;
