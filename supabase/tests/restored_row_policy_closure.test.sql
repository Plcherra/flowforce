begin;

create extension if not exists pgtap;

select plan(21);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.user_companies where company_id = 'c22e0000-0000-4000-8000-000000000001';
delete from public.shift_assignments where user_id in (
  'c22e1000-0000-4000-8000-000000000001',
  'c22e1000-0000-4000-8000-000000000002',
  'c22e1000-0000-4000-8000-000000000003'
);
delete from public.workflows where company_id = 'c22e0000-0000-4000-8000-000000000001';
delete from public.departments where company_id = 'c22e0000-0000-4000-8000-000000000001';
delete from public.company_members where company_id = 'c22e0000-0000-4000-8000-000000000001';
delete from public.profiles where id in (
  'c22e1000-0000-4000-8000-000000000001',
  'c22e1000-0000-4000-8000-000000000002',
  'c22e1000-0000-4000-8000-000000000003'
);
delete from public.companies where id = 'c22e0000-0000-4000-8000-000000000001';
delete from auth.users where id in (
  'c22e1000-0000-4000-8000-000000000001',
  'c22e1000-0000-4000-8000-000000000002',
  'c22e1000-0000-4000-8000-000000000003'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
)
values
  ('00000000-0000-0000-0000-000000000000', 'c22e1000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'catchall-staff@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', 'c22e1000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'catchall-manager@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', 'c22e1000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'catchall-coworker@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values (
  'c22e0000-0000-4000-8000-000000000001',
  'Catchall Co',
  'catchall-co',
  'c22e1000-0000-4000-8000-000000000002',
  'c22e1000-0000-4000-8000-000000000002',
  true
);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('c22e1000-0000-4000-8000-000000000001', 'c22e0000-0000-4000-8000-000000000001', 'Catch', 'Staff', 'catchall-staff@example.test', 'staff', false),
  ('c22e1000-0000-4000-8000-000000000002', 'c22e0000-0000-4000-8000-000000000001', 'Catch', 'Manager', 'catchall-manager@example.test', 'manager', true),
  ('c22e1000-0000-4000-8000-000000000003', 'c22e0000-0000-4000-8000-000000000001', 'Catch', 'Coworker', 'catchall-coworker@example.test', 'staff', false);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('c22e0000-0000-4000-8000-000000000001', 'c22e1000-0000-4000-8000-000000000001', 'staff', now()),
  ('c22e0000-0000-4000-8000-000000000001', 'c22e1000-0000-4000-8000-000000000002', 'manager', now()),
  ('c22e0000-0000-4000-8000-000000000001', 'c22e1000-0000-4000-8000-000000000003', 'staff', now());

insert into public.departments (id, company_id, name, type)
values (
  'c22e2000-0000-4000-8000-000000000001',
  'c22e0000-0000-4000-8000-000000000001',
  'Floor',
  'operations'
);

select ok(
  public.product_level_allowed_permissions('manager') ? 'schedule.delete',
  'a manager class can keep an explicit schedule delete grant'
);
select ok(
  not (public.product_level_allowed_permissions('staff') ? 'schedule.delete'),
  'staff cannot keep a schedule delete grant'
);

select is(
  (select count(*) from pg_policies where policyname = 'Authenticated users can manage scoped restored rows'),
  0::bigint,
  'the restored-row catch-all policy is gone'
);

select ok(
  exists (
    select 1
    from pg_proc fn
    join pg_namespace ns on ns.oid = fn.pronamespace
    where ns.nspname = 'public'
      and fn.proname = 'permission_json_state'
      and 'search_path=public' = any (fn.proconfig)
  ),
  'permission_json_state has a fixed search_path'
);

select ok(
  exists (
    select 1
    from pg_proc fn
    join pg_namespace ns on ns.oid = fn.pronamespace
    where ns.nspname = 'public'
      and fn.proname = 'set_task_audience_default'
      and 'search_path=public' = any (fn.proconfig)
  ),
  'set_task_audience_default has a fixed search_path'
);

select ok(
  not has_function_privilege('anon', 'public.current_user_can_manage_ops_issue(uuid, uuid)', 'execute'),
  'anon cannot execute current_user_can_manage_ops_issue'
);
select ok(
  has_function_privilege('authenticated', 'public.current_user_can_manage_ops_issue(uuid, uuid)', 'execute'),
  'authenticated can execute current_user_can_manage_ops_issue'
);
select ok(
  not has_function_privilege('anon', 'public.current_user_can_execute_workflow_run(uuid, uuid)', 'execute'),
  'anon cannot execute current_user_can_execute_workflow_run'
);
select ok(
  has_function_privilege('authenticated', 'public.current_user_can_execute_workflow_run(uuid, uuid)', 'execute'),
  'authenticated can execute current_user_can_execute_workflow_run'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c22e1000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.departments where company_id = 'c22e0000-0000-4000-8000-000000000001'),
  1::bigint,
  'staff can read departments in their company'
);

select throws_ok(
  $$ insert into public.departments (company_id, name, type)
     values ('c22e0000-0000-4000-8000-000000000001', 'Blocked', 'operations') $$,
  '42501',
  'new row violates row-level security policy for table "departments"',
  'staff cannot create a department'
);

select throws_ok(
  $$ insert into public.workflows (company_id, name)
     values ('c22e0000-0000-4000-8000-000000000001', 'Blocked flow') $$,
  '42501',
  'new row violates row-level security policy for table "workflows"',
  'staff cannot create a workflow'
);

select throws_ok(
  $$ insert into public.shift_assignments (user_id, status)
     values ('c22e1000-0000-4000-8000-000000000001', 'assigned') $$,
  '42501',
  'new row violates row-level security policy for table "shift_assignments"',
  'staff cannot write a shift assignment'
);

select throws_ok(
  $$ insert into public.user_companies (company_id, user_id, role)
     values ('c22e0000-0000-4000-8000-000000000001', 'c22e1000-0000-4000-8000-000000000003', 'owner') $$,
  '42501',
  'new row violates row-level security policy for table "user_companies"',
  'staff cannot link someone else to the company'
);

select lives_ok(
  $$ insert into public.user_companies (company_id, user_id, role)
     values ('c22e0000-0000-4000-8000-000000000001', 'c22e1000-0000-4000-8000-000000000001', 'staff') $$,
  'staff can link their own user to a company they belong to'
);

select is(
  (select count(*) from public.user_companies where user_id = 'c22e1000-0000-4000-8000-000000000001'),
  1::bigint,
  'staff can read their own company links'
);

select set_config('request.jwt.claim.sub', 'c22e1000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ insert into public.departments (company_id, name, type)
     values ('c22e0000-0000-4000-8000-000000000001', 'Kitchen', 'operations') $$,
  'a manager can create a department'
);

select lives_ok(
  $$ insert into public.workflows (company_id, name)
     values ('c22e0000-0000-4000-8000-000000000001', 'Open') $$,
  'a manager can create a workflow'
);

select lives_ok(
  $$ insert into public.shift_assignments (user_id, status)
     values ('c22e1000-0000-4000-8000-000000000001', 'assigned'),
            ('c22e1000-0000-4000-8000-000000000003', 'assigned') $$,
  'a manager can assign shifts'
);

select set_config('request.jwt.claim.sub', 'c22e1000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.shift_assignments where user_id = 'c22e1000-0000-4000-8000-000000000001'),
  1::bigint,
  'staff can read their own shift assignment'
);

select is(
  (select count(*) from public.shift_assignments where user_id = 'c22e1000-0000-4000-8000-000000000003'),
  0::bigint,
  'staff cannot read a coworker shift assignment'
);

select * from finish();
rollback;
