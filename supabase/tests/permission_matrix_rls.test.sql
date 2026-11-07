begin;

create extension if not exists pgtap;

select plan(24);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.role_permissions
where role_id in (
  'a11e0000-0000-4000-8000-000000000041',
  'a11e0000-0000-4000-8000-000000000042'
);
delete from public.user_roles
where user_id in (
  'a11e0000-0000-4000-8000-000000000010',
  'a11e0000-0000-4000-8000-000000000020',
  'a11e0000-0000-4000-8000-000000000030'
);
delete from public.user_permissions
where user_id in (
  'a11e0000-0000-4000-8000-000000000020',
  'a11e0000-0000-4000-8000-000000000030'
);
delete from public.tasks
where company_id = 'a11e0000-0000-4000-8000-000000000001';
delete from public.schedules
where company_id = 'a11e0000-0000-4000-8000-000000000001';
delete from public.payments
where company_id = 'a11e0000-0000-4000-8000-000000000001';
delete from public.company_roles
where company_id = 'a11e0000-0000-4000-8000-000000000001';
delete from public.company_members
where company_id = 'a11e0000-0000-4000-8000-000000000001';
delete from public.profiles
where id in (
  'a11e0000-0000-4000-8000-000000000010',
  'a11e0000-0000-4000-8000-000000000020',
  'a11e0000-0000-4000-8000-000000000030'
);
delete from public.companies
where id = 'a11e0000-0000-4000-8000-000000000001';
delete from auth.users
where id in (
  'a11e0000-0000-4000-8000-000000000010',
  'a11e0000-0000-4000-8000-000000000020',
  'a11e0000-0000-4000-8000-000000000030'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
values
  ('00000000-0000-0000-0000-000000000000', 'a11e0000-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'perm-owner@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', 'a11e0000-0000-4000-8000-000000000020', 'authenticated', 'authenticated', 'perm-manager@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', 'a11e0000-0000-4000-8000-000000000030', 'authenticated', 'authenticated', 'perm-staff@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values (
  'a11e0000-0000-4000-8000-000000000001',
  'Permission Matrix Co',
  'permission-matrix-co',
  'a11e0000-0000-4000-8000-000000000010',
  'a11e0000-0000-4000-8000-000000000010',
  true
);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('a11e0000-0000-4000-8000-000000000010', 'a11e0000-0000-4000-8000-000000000001', 'Perm', 'Owner', 'perm-owner@example.test', 'owner', true),
  ('a11e0000-0000-4000-8000-000000000020', 'a11e0000-0000-4000-8000-000000000001', 'Perm', 'Manager', 'perm-manager@example.test', 'manager', false),
  ('a11e0000-0000-4000-8000-000000000030', 'a11e0000-0000-4000-8000-000000000001', 'Perm', 'Staff', 'perm-staff@example.test', 'staff', false);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000010', 'owner', now()),
  ('a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000020', 'manager', now()),
  ('a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000030', 'staff', now());

insert into public.company_roles (
  id, company_id, name, hierarchy_level, product_level, permissions, is_system_role, is_active
)
values
  (
    'a11e0000-0000-4000-8000-000000000041',
    'a11e0000-0000-4000-8000-000000000001',
    'Staff',
    1,
    'staff',
    '{"viewOwnTasks": true}'::jsonb,
    true,
    true
  ),
  (
    'a11e0000-0000-4000-8000-000000000042',
    'a11e0000-0000-4000-8000-000000000001',
    'Manager',
    2,
    'manager',
    '{"schedule.delete": false}'::jsonb,
    true,
    true
  );

update public.profiles
set role_id = 'a11e0000-0000-4000-8000-000000000041'
where id = 'a11e0000-0000-4000-8000-000000000030';

update public.profiles
set role_id = 'a11e0000-0000-4000-8000-000000000042'
where id = 'a11e0000-0000-4000-8000-000000000020';

select is(
  public.product_role_default_allows('manager', 'schedule.delete'),
  true,
  'managers can delete shifts unless the class pack turns it off'
);

-- Poisoned rows must not grant access. These tables were member-writable.
insert into public.user_roles (user_id, role)
values ('a11e0000-0000-4000-8000-000000000030', 'owner');

insert into public.role_permissions (role_id, permission_key, permission_value)
values ('a11e0000-0000-4000-8000-000000000041', 'editTasks', true);

insert into public.tasks (
  id, company_id, title, status, created_by, assigned_to, source
)
values (
  'a11e0000-0000-4000-8000-000000000051',
  'a11e0000-0000-4000-8000-000000000001',
  'Staff own task',
  'open',
  'a11e0000-0000-4000-8000-000000000030',
  'a11e0000-0000-4000-8000-000000000030',
  'manual'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a11e0000-0000-4000-8000-000000000030', true);

select is(
  (select count(*) from public.tasks where id = 'a11e0000-0000-4000-8000-000000000051'),
  1::bigint,
  'Staff can read a company task'
);

select throws_ok(
  $$ insert into public.tasks (company_id, title, status, created_by, assigned_to, source)
     values (
       'a11e0000-0000-4000-8000-000000000001',
       'Staff creates for someone else',
       'open',
       'a11e0000-0000-4000-8000-000000000030',
       'a11e0000-0000-4000-8000-000000000020',
       'manual'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "tasks"',
  'Staff cannot create a task for someone else'
);

select throws_ok(
  $$ insert into public.tasks (company_id, title, status, created_by, assigned_to, source)
     values (
       'a11e0000-0000-4000-8000-000000000001',
       'Staff creates for self',
       'open',
       'a11e0000-0000-4000-8000-000000000030',
       'a11e0000-0000-4000-8000-000000000030',
       'manual'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "tasks"',
  'Staff cannot create a task without a create key'
);

select lives_ok(
  $$ update public.tasks
     set status = 'completed'
     where id = 'a11e0000-0000-4000-8000-000000000051' $$,
  'Assignee can update their own task'
);

select is(
  (select status from public.tasks where id = 'a11e0000-0000-4000-8000-000000000051'),
  'completed',
  'Own-task update is stored'
);

delete from public.tasks where id = 'a11e0000-0000-4000-8000-000000000051';

select is(
  (select count(*) from public.tasks where id = 'a11e0000-0000-4000-8000-000000000051'),
  1::bigint,
  'Staff delete is ignored'
);

select throws_ok(
  $$ insert into public.user_roles (user_id, role)
     values ('a11e0000-0000-4000-8000-000000000030', 'admin') $$,
  '42501',
  'new row violates row-level security policy for table "user_roles"',
  'Staff cannot assign themselves a role'
);

select throws_ok(
  $$ insert into public.role_permissions (role_id, permission_key, permission_value)
     values ('a11e0000-0000-4000-8000-000000000041', 'managePayments', true) $$,
  '42501',
  'new row violates row-level security policy for table "role_permissions"',
  'Staff cannot edit role permissions'
);

select throws_ok(
  $$ insert into public.schedules (company_id, title, start_time, end_time, created_by, is_published)
     values (
       'a11e0000-0000-4000-8000-000000000001',
       'Staff shift',
       now(),
       now() + interval '4 hours',
       'a11e0000-0000-4000-8000-000000000030',
       false
     ) $$,
  '42501',
  'new row violates row-level security policy for table "schedules"',
  'Staff cannot create a schedule'
);

select set_config('request.jwt.claim.sub', 'a11e0000-0000-4000-8000-000000000020', true);

select lives_ok(
  $$ insert into public.tasks (company_id, title, status, created_by, assigned_to, source)
     values (
       'a11e0000-0000-4000-8000-000000000001',
       'Manager task for staff',
       'open',
       'a11e0000-0000-4000-8000-000000000020',
       'a11e0000-0000-4000-8000-000000000030',
       'manual'
     ) $$,
  'Manager can create a task for someone else from the class default'
);

select lives_ok(
  $$ insert into public.tasks (company_id, title, status, created_by, assigned_to, source)
     values (
       'a11e0000-0000-4000-8000-000000000001',
       'List issue',
       'open',
       'a11e0000-0000-4000-8000-000000000020',
       'a11e0000-0000-4000-8000-000000000030',
       'form'
     ) $$,
  'Manager can insert a form-sourced list or checklist task'
);

select lives_ok(
  $$ insert into public.schedules (company_id, title, start_time, end_time, created_by, is_published)
     values (
       'a11e0000-0000-4000-8000-000000000001',
       'Manager shift',
       now(),
       now() + interval '4 hours',
       'a11e0000-0000-4000-8000-000000000020',
       false
     ) $$,
  'Manager can create a schedule'
);

select throws_ok(
  $$ insert into public.payments (company_id, amount, created_by, recipient_name, description, status, currency)
     values (
       'a11e0000-0000-4000-8000-000000000001',
       10,
       'a11e0000-0000-4000-8000-000000000020',
       'Vendor',
       'Manager payment',
       'pending',
       'USD'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "payments"',
  'Manager cannot create a payment'
);

with deleted as (
  delete from public.schedules
  where company_id = 'a11e0000-0000-4000-8000-000000000001'
    and title = 'Manager shift'
  returning 1
)
select is(
  (select count(*) from deleted),
  0::bigint,
  'Manager cannot delete a schedule without schedule.delete'
);

select set_config('request.jwt.claim.sub', 'a11e0000-0000-4000-8000-000000000010', true);

select lives_ok(
  $$ insert into public.tasks (company_id, title, status, created_by, source)
     values (
       'a11e0000-0000-4000-8000-000000000001',
       'Owner task without a class row',
       'open',
       'a11e0000-0000-4000-8000-000000000010',
       'manual'
     ) $$,
  'Owner membership can create a task when no owner class row exists'
);

select lives_ok(
  $$ insert into public.user_roles (user_id, role)
     values ('a11e0000-0000-4000-8000-000000000030', 'staff') $$,
  'Owner admin can assign a user role'
);

select lives_ok(
  $$ insert into public.payments (company_id, amount, created_by, recipient_name, description, status, currency)
     values (
       'a11e0000-0000-4000-8000-000000000001',
       12,
       'a11e0000-0000-4000-8000-000000000010',
       'Vendor',
       'Owner payment',
       'pending',
       'USD'
     ) $$,
  'Owner can create a payment'
);

reset role;
insert into public.user_permissions (user_id, permission_key, permission_value)
values (
  'a11e0000-0000-4000-8000-000000000030',
  'tasks.custom.create_self',
  'allow'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a11e0000-0000-4000-8000-000000000030', true);

select lives_ok(
  $$ insert into public.tasks (company_id, title, status, created_by, assigned_to, source)
     values (
       'a11e0000-0000-4000-8000-000000000001',
       'Staff self task from allow override',
       'open',
       'a11e0000-0000-4000-8000-000000000030',
       'a11e0000-0000-4000-8000-000000000030',
       'manual'
     ) $$,
  'Allow override lets staff create a task for themselves'
);

reset role;
update public.company_roles
set permissions = jsonb_build_object(
  'editTasks', false,
  'tasks.custom.create_self', false,
  'tasks.custom.create_others', false,
  'tasks.shift.create_self', false,
  'tasks.shift.create_others', false,
  'tasks.checklist.create_self', false,
  'tasks.checklist.create_others', false,
  'tasks.list_issues.act', false
)
where id = 'a11e0000-0000-4000-8000-000000000042';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a11e0000-0000-4000-8000-000000000020', true);

select throws_ok(
  $$ insert into public.tasks (company_id, title, status, created_by, assigned_to, source)
     values (
       'a11e0000-0000-4000-8000-000000000001',
       'Blocked by explicit false',
       'open',
       'a11e0000-0000-4000-8000-000000000020',
       'a11e0000-0000-4000-8000-000000000030',
       'manual'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "tasks"',
  'Explicit false in the class pack beats the product default'
);

delete from public.tasks where id = 'a11e0000-0000-4000-8000-000000000051';

select is(
  (select count(*) from public.tasks where id = 'a11e0000-0000-4000-8000-000000000051'),
  0::bigint,
  'Manager can still delete a task when edit is turned off'
);

reset role;
set local role service_role;

select lives_ok(
  $$ insert into public.tasks (company_id, title, status, created_by, source)
     values (
       'a11e0000-0000-4000-8000-000000000001',
       'Service role task',
       'open',
       'a11e0000-0000-4000-8000-000000000010',
       'auto'
     ) $$,
  'Service role inserts are not blocked by the permission policies'
);

reset role;
insert into public.company_roles (
  id, company_id, name, hierarchy_level, product_level, permissions, is_system_role, is_active
)
values (
  'a11e0000-0000-4000-8000-000000000040',
  'a11e0000-0000-4000-8000-000000000001',
  'Owner',
  4,
  'owner',
  '{"admin": true, "owner": true, "editTasks": false}'::jsonb,
  true,
  true
);
update public.profiles
set role_id = 'a11e0000-0000-4000-8000-000000000040'
where id = 'a11e0000-0000-4000-8000-000000000010';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a11e0000-0000-4000-8000-000000000010', true);

select is(
  public.current_user_has_permission(
    'a11e0000-0000-4000-8000-000000000001',
    'schedule.delete'
  ),
  true,
  'Owner class with a sparse pack still has keys the pack does not mention'
);

select is(
  public.current_user_has_permission(
    'a11e0000-0000-4000-8000-000000000001',
    'editTasks'
  ),
  false,
  'Explicit false on an owner class beats the owner wildcard'
);

select * from finish();

rollback;
