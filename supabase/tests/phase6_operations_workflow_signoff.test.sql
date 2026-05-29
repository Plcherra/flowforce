begin;

create extension if not exists pgtap;

select plan(13);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.audit_log where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.workflow_automation_runs where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.task_notifications where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.ops_issues where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.tasks where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.workflow_reviews where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.workflow_evidence where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.workflow_exceptions where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.workflow_step_instances where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.task_workflow_instances where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.workflow_assignments where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.workflow_steps where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.workflows where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '6a100000-0000-4000-8000-000000000001',
  '6a100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '6a000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '6a100000-0000-4000-8000-000000000001',
  '6a100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '6a100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase6-signoff-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '6a100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase6-signoff-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('6a000000-0000-4000-8000-000000000001', 'Phase 6 Signoff Tenant A', 'phase-6-signoff-a', '6a100000-0000-4000-8000-000000000001', '6a100000-0000-4000-8000-000000000001', true),
  ('6a000000-0000-4000-8000-000000000002', 'Phase 6 Signoff Tenant B', 'phase-6-signoff-b', '6a100000-0000-4000-8000-000000000002', '6a100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('6a100000-0000-4000-8000-000000000001', '6a000000-0000-4000-8000-000000000001', 'Signoff', 'Owner A', 'phase6-signoff-a@example.test', 'owner', true),
  ('6a100000-0000-4000-8000-000000000002', '6a000000-0000-4000-8000-000000000002', 'Signoff', 'Owner B', 'phase6-signoff-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('6a000000-0000-4000-8000-000000000001', '6a100000-0000-4000-8000-000000000001', 'owner', now()),
  ('6a000000-0000-4000-8000-000000000002', '6a100000-0000-4000-8000-000000000002', 'owner', now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '6a100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.install_operations_workflow_demo(
    '6a000000-0000-4000-8000-000000000001'
  ) $$,
  'tenant member can install the operations workflow demo'
);

select is(
  (select demo_workflows from public.operations_workflow_demo_readiness_v),
  4,
  'readiness view counts the four signed-off demo workflows'
);

select is(
  (select demo_assignments from public.operations_workflow_demo_readiness_v),
  4,
  'readiness view counts one assignment per demo workflow'
);

select is(
  (select demo_runs from public.operations_workflow_demo_readiness_v),
  4,
  'readiness view counts same-day workflow runs'
);

select ok(
  (select demo_steps >= 10 from public.operations_workflow_demo_readiness_v),
  'demo workflows include executable steps'
);

select ok(
  (select completed_runs >= 2 from public.operations_workflow_demo_readiness_v),
  'demo includes completed workflow runs'
);

select ok(
  (select pending_review_runs >= 1 from public.operations_workflow_demo_readiness_v),
  'demo includes a manager review queue item'
);

select ok(
  (select open_exceptions >= 1 from public.operations_workflow_demo_readiness_v),
  'demo includes a failed-step exception'
);

select ok(
  (select automation_runs >= 1 from public.operations_workflow_demo_readiness_v),
  'demo failed step creates automation follow-up'
);

select ok(
  (select ready_for_demo from public.operations_workflow_demo_readiness_v),
  'readiness view marks the operations workflow demo ready'
);

select lives_ok(
  $$ select public.install_operations_workflow_demo(
    '6a000000-0000-4000-8000-000000000001'
  ) $$,
  'operations workflow demo installer is idempotent'
);

select is(
  (
    select count(*)
    from public.workflows
    where company_id = '6a000000-0000-4000-8000-000000000001'
      and audit_config ->> 'source' = 'operations_workflow_signoff'
  ),
  4::bigint,
  'rerunning the demo installer does not duplicate workflows'
);

select set_config('request.jwt.claim.sub', '6a100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.install_operations_workflow_demo(
    '6a000000-0000-4000-8000-000000000001'
  ) $$,
  '42501',
  null,
  'Tenant B cannot install Tenant A operations workflow demo'
);

select * from finish();

rollback;
