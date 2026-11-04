begin;

create extension if not exists pgtap;

select plan(9);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.task_comments
where task_id in (
  'b11e0000-0000-4000-8000-000000000051',
  'b11e0000-0000-4000-8000-000000000052'
);
delete from public.tasks
where company_id = 'b11e0000-0000-4000-8000-000000000001';
delete from public.company_roles
where company_id = 'b11e0000-0000-4000-8000-000000000001';
delete from public.company_members
where company_id = 'b11e0000-0000-4000-8000-000000000001';
delete from public.departments
where company_id = 'b11e0000-0000-4000-8000-000000000001';
delete from public.profiles
where id in (
  'b11e0000-0000-4000-8000-000000000010',
  'b11e0000-0000-4000-8000-000000000020',
  'b11e0000-0000-4000-8000-000000000030'
);
delete from public.companies
where id = 'b11e0000-0000-4000-8000-000000000001';
delete from auth.users
where id in (
  'b11e0000-0000-4000-8000-000000000010',
  'b11e0000-0000-4000-8000-000000000020',
  'b11e0000-0000-4000-8000-000000000030'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
values
  ('00000000-0000-0000-0000-000000000000', 'b11e0000-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'vis-manager@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', 'b11e0000-0000-4000-8000-000000000020', 'authenticated', 'authenticated', 'vis-cashier@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', 'b11e0000-0000-4000-8000-000000000030', 'authenticated', 'authenticated', 'vis-other@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values (
  'b11e0000-0000-4000-8000-000000000001',
  'Visibility Co',
  'visibility-co',
  'b11e0000-0000-4000-8000-000000000010',
  'b11e0000-0000-4000-8000-000000000010',
  true
);

insert into public.departments (id, company_id, name, type)
values (
  'b11e0000-0000-4000-8000-000000000071',
  'b11e0000-0000-4000-8000-000000000001',
  'Front',
  'operations'
);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin, department_id)
values
  ('b11e0000-0000-4000-8000-000000000010', 'b11e0000-0000-4000-8000-000000000001', 'Vis', 'Manager', 'vis-manager@example.test', 'manager', false, null),
  ('b11e0000-0000-4000-8000-000000000020', 'b11e0000-0000-4000-8000-000000000001', 'Vis', 'Cashier', 'vis-cashier@example.test', 'staff', false, 'b11e0000-0000-4000-8000-000000000071'),
  ('b11e0000-0000-4000-8000-000000000030', 'b11e0000-0000-4000-8000-000000000001', 'Vis', 'Other', 'vis-other@example.test', 'staff', false, null);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('b11e0000-0000-4000-8000-000000000001', 'b11e0000-0000-4000-8000-000000000010', 'manager', now()),
  ('b11e0000-0000-4000-8000-000000000001', 'b11e0000-0000-4000-8000-000000000020', 'staff', now()),
  ('b11e0000-0000-4000-8000-000000000001', 'b11e0000-0000-4000-8000-000000000030', 'staff', now());

insert into public.company_roles (
  id, company_id, name, hierarchy_level, product_level, permissions, is_system_role, is_active
)
values
  (
    'b11e0000-0000-4000-8000-000000000041',
    'b11e0000-0000-4000-8000-000000000001',
    'Manager',
    2,
    'manager',
    '{}'::jsonb,
    true,
    true
  ),
  (
    'b11e0000-0000-4000-8000-000000000042',
    'b11e0000-0000-4000-8000-000000000001',
    'Staff',
    1,
    'staff',
    '{"viewOwnTasks": true}'::jsonb,
    true,
    true
  );

update public.profiles
set role_id = 'b11e0000-0000-4000-8000-000000000041'
where id = 'b11e0000-0000-4000-8000-000000000010';

update public.profiles
set role_id = 'b11e0000-0000-4000-8000-000000000042'
where id in (
  'b11e0000-0000-4000-8000-000000000020',
  'b11e0000-0000-4000-8000-000000000030'
);

insert into public.tasks (
  id, company_id, title, status, created_by, assigned_to, source, view_audience, edit_audience
)
values (
  'b11e0000-0000-4000-8000-000000000051',
  'b11e0000-0000-4000-8000-000000000001',
  'Private cashier task',
  'open',
  'b11e0000-0000-4000-8000-000000000010',
  'b11e0000-0000-4000-8000-000000000020',
  'manual',
  '{"kind":"private"}'::jsonb,
  '{"kind":"private"}'::jsonb
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'b11e0000-0000-4000-8000-000000000030', true);

select is(
  (select count(*) from public.tasks where id = 'b11e0000-0000-4000-8000-000000000051'),
  0::bigint,
  'Another staff member cannot see a private task'
);

select set_config('request.jwt.claim.sub', 'b11e0000-0000-4000-8000-000000000020', true);

select is(
  (select count(*) from public.tasks where id = 'b11e0000-0000-4000-8000-000000000051'),
  1::bigint,
  'The assignee can see a private task'
);

select lives_ok(
  $$ update public.tasks
     set status = 'completed'
     where id = 'b11e0000-0000-4000-8000-000000000051' $$,
  'The assignee can update a private task'
);

select lives_ok(
  $$ insert into public.task_comments (task_id, user_id, comment)
     values (
       'b11e0000-0000-4000-8000-000000000051',
       'b11e0000-0000-4000-8000-000000000020',
       'Done'
     ) $$,
  'The assignee can comment on a private task'
);

select set_config('request.jwt.claim.sub', 'b11e0000-0000-4000-8000-000000000020', true);

select throws_ok(
  $$ update public.tasks
     set view_audience = '{"kind":"company"}'::jsonb
     where id = 'b11e0000-0000-4000-8000-000000000051' $$,
  '42501',
  'Only the task creator can change who can view or edit this task',
  'The assignee cannot widen who can view the task'
);

select set_config('request.jwt.claim.sub', 'b11e0000-0000-4000-8000-000000000030', true);

select throws_ok(
  $$ insert into public.task_comments (task_id, user_id, comment)
     values (
       'b11e0000-0000-4000-8000-000000000051',
       'b11e0000-0000-4000-8000-000000000030',
       'Peek'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "task_comments"',
  'A staff member outside the audience cannot comment'
);

select set_config('request.jwt.claim.sub', 'b11e0000-0000-4000-8000-000000000010', true);

select is(
  (select count(*) from public.tasks where id = 'b11e0000-0000-4000-8000-000000000051'),
  1::bigint,
  'A manager with team-task oversight can see a private task'
);

reset role;
insert into public.tasks (
  id, company_id, title, status, created_by, assigned_to, source, view_audience, edit_audience
)
values (
  'b11e0000-0000-4000-8000-000000000052',
  'b11e0000-0000-4000-8000-000000000001',
  'Front department task',
  'open',
  'b11e0000-0000-4000-8000-000000000010',
  null,
  'manual',
  jsonb_build_object('kind', 'department', 'department_ids', jsonb_build_array('b11e0000-0000-4000-8000-000000000071')),
  '{"kind":"private"}'::jsonb
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'b11e0000-0000-4000-8000-000000000020', true);

select is(
  (select count(*) from public.tasks where id = 'b11e0000-0000-4000-8000-000000000052'),
  1::bigint,
  'A person in the department can see a department task'
);

select set_config('request.jwt.claim.sub', 'b11e0000-0000-4000-8000-000000000030', true);

select is(
  (select count(*) from public.tasks where id = 'b11e0000-0000-4000-8000-000000000052'),
  0::bigint,
  'A person outside the department cannot see that task'
);

select * from finish();

rollback;
