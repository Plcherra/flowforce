begin;

create extension if not exists pgtap;

select plan(12);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.audit_log where company_id in (
  '65000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000002'
);
delete from public.workflow_reviews where company_id in (
  '65000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000002'
);
delete from public.workflow_exceptions where company_id in (
  '65000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000002'
);
delete from public.task_workflow_instances where company_id in (
  '65000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000002'
);
delete from public.workflows where company_id in (
  '65000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '65000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '65100000-0000-4000-8000-000000000001',
  '65100000-0000-4000-8000-000000000002',
  '65100000-0000-4000-8000-000000000003'
);
delete from public.companies where id in (
  '65000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '65100000-0000-4000-8000-000000000001',
  '65100000-0000-4000-8000-000000000002',
  '65100000-0000-4000-8000-000000000003'
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
  ('00000000-0000-0000-0000-000000000000', '65100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase6-review-manager@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '65100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase6-review-employee@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '65100000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'phase6-review-other@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('65000000-0000-4000-8000-000000000001', 'Phase 6 Review Tenant A', 'phase-6-review-a', '65100000-0000-4000-8000-000000000001', '65100000-0000-4000-8000-000000000001', true),
  ('65000000-0000-4000-8000-000000000002', 'Phase 6 Review Tenant B', 'phase-6-review-b', '65100000-0000-4000-8000-000000000003', '65100000-0000-4000-8000-000000000003', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('65100000-0000-4000-8000-000000000001', '65000000-0000-4000-8000-000000000001', 'Review', 'Manager A', 'phase6-review-manager@example.test', 'manager', false),
  ('65100000-0000-4000-8000-000000000002', '65000000-0000-4000-8000-000000000001', 'Review', 'Employee A', 'phase6-review-employee@example.test', 'employee', false),
  ('65100000-0000-4000-8000-000000000003', '65000000-0000-4000-8000-000000000002', 'Review', 'Owner B', 'phase6-review-other@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('65000000-0000-4000-8000-000000000001', '65100000-0000-4000-8000-000000000001', 'manager', now()),
  ('65000000-0000-4000-8000-000000000001', '65100000-0000-4000-8000-000000000002', 'employee', now()),
  ('65000000-0000-4000-8000-000000000002', '65100000-0000-4000-8000-000000000003', 'owner', now());

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
  '65200000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000001',
  'Reviewable Closing Checklist',
  'checklist',
  'closing',
  'active',
  true,
  true,
  '65100000-0000-4000-8000-000000000001'
);

insert into public.task_workflow_instances (
  id,
  company_id,
  workflow_id,
  status,
  review_status,
  due_at,
  completed_at
)
values (
  '65300000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000001',
  '65200000-0000-4000-8000-000000000001',
  'completed',
  'pending',
  now() - interval '1 hour',
  now()
);

insert into public.workflow_exceptions (
  id,
  company_id,
  workflow_instance_id,
  workflow_id,
  title,
  severity,
  status,
  created_by
)
values (
  '65400000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000001',
  '65300000-0000-4000-8000-000000000001',
  '65200000-0000-4000-8000-000000000001',
  'Safe close photo missing',
  'critical',
  'open',
  '65100000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '65100000-0000-4000-8000-000000000001', true);

select ok(
  public.current_user_can_review_workflows('65000000-0000-4000-8000-000000000001'),
  'manager role can review workflow runs'
);

select is(
  (select count(*) from public.operations_manager_review_queue_v),
  1::bigint,
  'manager sees one workflow run in review queue'
);

select is(
  (select review_priority from public.operations_manager_review_queue_v limit 1),
  'critical',
  'review queue prioritizes severe exceptions'
);

select lives_ok(
  $$ select public.review_workflow_run(
    '65000000-0000-4000-8000-000000000001',
    '65300000-0000-4000-8000-000000000001',
    'needs_changes',
    'Missing closing evidence.'
  ) $$,
  'manager can send a workflow run back for changes'
);

select is(
  (select review_status from public.task_workflow_instances where id = '65300000-0000-4000-8000-000000000001'),
  'needs_changes',
  'workflow run review status is updated'
);

select is(
  (select count(*) from public.workflow_reviews where workflow_instance_id = '65300000-0000-4000-8000-000000000001'),
  1::bigint,
  'workflow review decision record is inserted'
);

reset role;
select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  (select action from public.audit_log where record_id = '65300000-0000-4000-8000-000000000001'),
  'workflow.review.needs_changes',
  'workflow review action is audited'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '65100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.review_workflow_run(
    '65000000-0000-4000-8000-000000000001',
    '65300000-0000-4000-8000-000000000001',
    'approved',
    'Reviewed after correction.'
  ) $$,
  'manager can approve a workflow run'
);

select is(
  (select count(*) from public.operations_manager_review_queue_v),
  0::bigint,
  'approved workflow run leaves review queue'
);

select throws_ok(
  $$ select public.review_workflow_run(
    '65000000-0000-4000-8000-000000000001',
    '65300000-0000-4000-8000-000000000001',
    'maybe',
    null
  ) $$,
  '22023',
  null,
  'review action rejects invalid statuses'
);

select set_config('request.jwt.claim.sub', '65100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.review_workflow_run(
    '65000000-0000-4000-8000-000000000001',
    '65300000-0000-4000-8000-000000000001',
    'approved',
    null
  ) $$,
  '42501',
  null,
  'employee role cannot review workflow runs'
);

select set_config('request.jwt.claim.sub', '65100000-0000-4000-8000-000000000003', true);

select throws_ok(
  $$ select public.review_workflow_run(
    '65000000-0000-4000-8000-000000000001',
    '65300000-0000-4000-8000-000000000001',
    'approved',
    null
  ) $$,
  '42501',
  null,
  'other tenant owner cannot review Tenant A workflow runs'
);

select * from finish();

rollback;
