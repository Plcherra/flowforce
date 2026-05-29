begin;

create extension if not exists pgtap;

select plan(13);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.audit_log where company_id in (
  '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000002'
);
delete from public.workflow_automation_runs where company_id in (
  '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000002'
);
delete from public.task_notifications where company_id in (
  '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000002'
);
delete from public.ops_issues where company_id in (
  '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000002'
);
delete from public.tasks where company_id in (
  '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000002'
);
delete from public.training_assignments where company_id in (
  '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000002'
);
delete from public.workflow_exceptions where company_id in (
  '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000002'
);
delete from public.workflow_step_instances where company_id in (
  '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000002'
);
delete from public.task_workflow_instances where company_id in (
  '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000002'
);
delete from public.workflow_steps where company_id in (
  '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000002'
);
delete from public.workflows where company_id in (
  '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '69100000-0000-4000-8000-000000000001',
  '69100000-0000-4000-8000-000000000002'
);
delete from public.departments where id in (
  '69220000-0000-4000-8000-000000000001',
  '69220000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '69000000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '69100000-0000-4000-8000-000000000001',
  '69100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '69100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase6-quality-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '69100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase6-quality-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('69000000-0000-4000-8000-000000000001', 'Phase 6 Quality Tenant A', 'phase-6-quality-a', '69100000-0000-4000-8000-000000000001', '69100000-0000-4000-8000-000000000001', true),
  ('69000000-0000-4000-8000-000000000002', 'Phase 6 Quality Tenant B', 'phase-6-quality-b', '69100000-0000-4000-8000-000000000002', '69100000-0000-4000-8000-000000000002', true);

insert into public.departments (id, company_id, name, type)
values
  ('69220000-0000-4000-8000-000000000001', '69000000-0000-4000-8000-000000000001', 'Kitchen', 'operations'),
  ('69220000-0000-4000-8000-000000000002', '69000000-0000-4000-8000-000000000002', 'Front', 'operations');

insert into public.profiles (
  id,
  company_id,
  first_name,
  last_name,
  email,
  role,
  department_id,
  is_company_admin
)
values
  ('69100000-0000-4000-8000-000000000001', '69000000-0000-4000-8000-000000000001', 'Quality', 'Lead A', 'phase6-quality-a@example.test', 'employee', '69220000-0000-4000-8000-000000000001', true),
  ('69100000-0000-4000-8000-000000000002', '69000000-0000-4000-8000-000000000002', 'Quality', 'Lead B', 'phase6-quality-b@example.test', 'employee', '69220000-0000-4000-8000-000000000002', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('69000000-0000-4000-8000-000000000001', '69100000-0000-4000-8000-000000000001', 'admin', now()),
  ('69000000-0000-4000-8000-000000000002', '69100000-0000-4000-8000-000000000002', 'admin', now());

insert into public.workflows (
  id,
  company_id,
  name,
  workflow_kind,
  template_category,
  location_id,
  status,
  created_by
)
values (
  '69200000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000001',
  'Opening Quality Checklist',
  'checklist',
  'opening',
  '69210000-0000-4000-8000-000000000001',
  'active',
  '69100000-0000-4000-8000-000000000001'
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
values (
  '69400000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000001',
  '69200000-0000-4000-8000-000000000001',
  'Verify station setup',
  1,
  'checklist',
  true,
  true
);

insert into public.task_workflow_instances (
  id,
  company_id,
  workflow_id,
  assigned_to,
  assigned_role,
  location_id,
  status,
  review_status,
  due_at,
  completed_at,
  source_type
)
values
  ('69300000-0000-4000-8000-000000000001', '69000000-0000-4000-8000-000000000001', '69200000-0000-4000-8000-000000000001', '69100000-0000-4000-8000-000000000001', 'employee', '69210000-0000-4000-8000-000000000001', 'completed', 'approved', now() - interval '3 hours', now() - interval '2 hours', 'manual'),
  ('69300000-0000-4000-8000-000000000002', '69000000-0000-4000-8000-000000000001', '69200000-0000-4000-8000-000000000001', '69100000-0000-4000-8000-000000000001', 'employee', '69210000-0000-4000-8000-000000000001', 'in_progress', 'pending', now() - interval '2 hours', null, 'manual'),
  ('69300000-0000-4000-8000-000000000003', '69000000-0000-4000-8000-000000000001', '69200000-0000-4000-8000-000000000001', '69100000-0000-4000-8000-000000000001', 'employee', '69210000-0000-4000-8000-000000000001', 'in_progress', 'pending', now() - interval '1 hour', null, 'manual');

insert into public.workflow_step_instances (
  id,
  company_id,
  workflow_instance_id,
  step_id,
  status,
  evidence_status
)
values
  ('69500000-0000-4000-8000-000000000001', '69000000-0000-4000-8000-000000000001', '69300000-0000-4000-8000-000000000001', '69400000-0000-4000-8000-000000000001', 'completed', 'complete'),
  ('69500000-0000-4000-8000-000000000002', '69000000-0000-4000-8000-000000000001', '69300000-0000-4000-8000-000000000002', '69400000-0000-4000-8000-000000000001', 'failed', 'rejected'),
  ('69500000-0000-4000-8000-000000000003', '69000000-0000-4000-8000-000000000001', '69300000-0000-4000-8000-000000000003', '69400000-0000-4000-8000-000000000001', 'failed', 'rejected');

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
  created_by,
  created_at
)
values
  ('69600000-0000-4000-8000-000000000001', '69000000-0000-4000-8000-000000000001', '69300000-0000-4000-8000-000000000002', '69500000-0000-4000-8000-000000000002', '69200000-0000-4000-8000-000000000001', '69400000-0000-4000-8000-000000000001', 'critical', 'open', 'Setup failed', 'Station setup was incomplete.', '69100000-0000-4000-8000-000000000001', now() - interval '1 hour', '69100000-0000-4000-8000-000000000001', now() - interval '2 days'),
  ('69600000-0000-4000-8000-000000000002', '69000000-0000-4000-8000-000000000001', '69300000-0000-4000-8000-000000000003', '69500000-0000-4000-8000-000000000003', '69200000-0000-4000-8000-000000000001', '69400000-0000-4000-8000-000000000001', 'critical', 'open', 'Setup failed again', 'Station setup failed again.', '69100000-0000-4000-8000-000000000001', now() - interval '30 minutes', '69100000-0000-4000-8000-000000000001', now() - interval '1 day');

insert into public.training_assignments (
  id,
  company_id,
  employee_id,
  module_id,
  assigned_by,
  status,
  due_date
)
values (
  '69700000-0000-4000-8000-000000000001',
  '69000000-0000-4000-8000-000000000001',
  '69100000-0000-4000-8000-000000000001',
  'station-setup',
  '69100000-0000-4000-8000-000000000001',
  'assigned',
  current_date + 7
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '69100000-0000-4000-8000-000000000001', true);

select ok(
  (select count(*) > 0 from public.operations_execution_quality_daily_v),
  'execution quality daily view tracks tenant workflow history'
);

select is(
  (select total_runs from public.operations_execution_quality_summary_v),
  3,
  'summary counts the three workflow runs'
);

select is(
  (select completed_runs from public.operations_execution_quality_summary_v),
  1,
  'summary counts the completed workflow run'
);

select is(
  (select overdue_runs from public.operations_execution_quality_summary_v),
  2,
  'summary counts overdue incomplete workflow runs'
);

select is(
  (select exception_runs from public.operations_execution_quality_summary_v),
  2,
  'summary counts workflow runs with exceptions'
);

select is(
  (select critical_exception_runs from public.operations_execution_quality_summary_v),
  2,
  'summary counts critical exception runs'
);

select is(
  (select repeat_failure_runs from public.operations_execution_quality_summary_v),
  1,
  'summary detects the repeat failure pattern'
);

select is(
  (select failed_steps from public.operations_execution_quality_summary_v),
  2,
  'summary counts failed workflow steps'
);

select is(
  (select department_id from public.operations_execution_quality_daily_v limit 1),
  '69220000-0000-4000-8000-000000000001'::uuid,
  'daily trend keeps department context'
);

select is(
  (select assigned_role from public.operations_execution_quality_daily_v limit 1),
  'employee',
  'daily trend keeps role context'
);

select is(
  (select coaching_signal from public.operations_execution_quality_coaching_v),
  'repeat_failure',
  'coaching view recommends repeat-failure coaching'
);

select is(
  (select open_training_assignments from public.operations_execution_quality_coaching_v),
  1,
  'coaching view connects open training assignments'
);

select set_config('request.jwt.claim.sub', '69100000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.operations_execution_quality_summary_v where company_id = '69000000-0000-4000-8000-000000000001'),
  0::bigint,
  'Tenant B cannot see Tenant A execution quality analytics'
);

select * from finish();

rollback;
