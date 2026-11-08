begin;

create extension if not exists pgtap;

select plan(16);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.task_activities
where company_id in (
  'c11e0000-0000-4000-8000-000000000001',
  'c11e0000-0000-4000-8000-000000000002'
);
delete from public.task_notifications
where company_id in (
  'c11e0000-0000-4000-8000-000000000001',
  'c11e0000-0000-4000-8000-000000000002'
);
delete from public.schedule_assignments
where company_id in (
  'c11e0000-0000-4000-8000-000000000001',
  'c11e0000-0000-4000-8000-000000000002'
);
delete from public.schedules
where company_id in (
  'c11e0000-0000-4000-8000-000000000001',
  'c11e0000-0000-4000-8000-000000000002'
);
delete from public.tasks
where company_id in (
  'c11e0000-0000-4000-8000-000000000001',
  'c11e0000-0000-4000-8000-000000000002'
);
delete from public.company_members
where user_id = 'c11e0000-0000-4000-8000-000000000010';
update public.profiles
set role_id = null
where id = 'c11e0000-0000-4000-8000-000000000010';
delete from public.company_roles
where company_id in (
  'c11e0000-0000-4000-8000-000000000001',
  'c11e0000-0000-4000-8000-000000000002'
);
delete from public.profiles
where id = 'c11e0000-0000-4000-8000-000000000010';
delete from public.companies
where id in (
  'c11e0000-0000-4000-8000-000000000001',
  'c11e0000-0000-4000-8000-000000000002'
);
delete from auth.users
where id = 'c11e0000-0000-4000-8000-000000000010';

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
values (
  '00000000-0000-0000-0000-000000000000',
  'c11e0000-0000-4000-8000-000000000010',
  'authenticated',
  'authenticated',
  'multi-company@example.test',
  crypt('password', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false
);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  (
    'c11e0000-0000-4000-8000-000000000001',
    'Home Co',
    'review-home-co',
    'c11e0000-0000-4000-8000-000000000010',
    'c11e0000-0000-4000-8000-000000000010',
    true
  ),
  (
    'c11e0000-0000-4000-8000-000000000002',
    'Other Co',
    'review-other-co',
    'c11e0000-0000-4000-8000-000000000010',
    'c11e0000-0000-4000-8000-000000000010',
    true
  );

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values (
  'c11e0000-0000-4000-8000-000000000010',
  'c11e0000-0000-4000-8000-000000000001',
  'Multi',
  'Company',
  'multi-company@example.test',
  'staff',
  false
);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('c11e0000-0000-4000-8000-000000000001', 'c11e0000-0000-4000-8000-000000000010', 'staff', now()),
  ('c11e0000-0000-4000-8000-000000000002', 'c11e0000-0000-4000-8000-000000000010', 'manager', now());

insert into public.company_roles (
  id, company_id, name, hierarchy_level, product_level, permissions, is_system_role, is_active
)
values
  (
    'c11e0000-0000-4000-8000-000000000041',
    'c11e0000-0000-4000-8000-000000000001',
    'Staff',
    1,
    'staff',
    '{}'::jsonb,
    true,
    true
  ),
  (
    'c11e0000-0000-4000-8000-000000000040',
    'c11e0000-0000-4000-8000-000000000001',
    'Owner',
    4,
    'owner',
    '{}'::jsonb,
    true,
    true
  ),
  (
    'c11e0000-0000-4000-8000-000000000141',
    'c11e0000-0000-4000-8000-000000000002',
    'Staff',
    1,
    'staff',
    '{}'::jsonb,
    true,
    true
  ),
  (
    'c11e0000-0000-4000-8000-000000000142',
    'c11e0000-0000-4000-8000-000000000002',
    'Manager',
    2,
    'manager',
    '{}'::jsonb,
    true,
    true
  ),
  (
    'c11e0000-0000-4000-8000-000000000140',
    'c11e0000-0000-4000-8000-000000000002',
    'Owner',
    4,
    'owner',
    '{}'::jsonb,
    true,
    true
  );

update public.profiles
set role_id = 'c11e0000-0000-4000-8000-000000000041'
where id = 'c11e0000-0000-4000-8000-000000000010';

insert into public.tasks (
  id, company_id, title, status, created_by, assigned_to, source
)
values
  (
    'c11e0000-0000-4000-8000-000000000051',
    'c11e0000-0000-4000-8000-000000000001',
    'Home task',
    'open',
    'c11e0000-0000-4000-8000-000000000010',
    'c11e0000-0000-4000-8000-000000000010',
    'manual'
  ),
  (
    'c11e0000-0000-4000-8000-000000000052',
    'c11e0000-0000-4000-8000-000000000002',
    'Other task',
    'open',
    'c11e0000-0000-4000-8000-000000000010',
    'c11e0000-0000-4000-8000-000000000010',
    'manual'
  );

insert into public.schedules (
  id, company_id, title, start_time, end_time, created_by, is_published
)
values (
  'c11e0000-0000-4000-8000-000000000061',
  'c11e0000-0000-4000-8000-000000000002',
  'Other shift',
  now(),
  now() + interval '4 hours',
  'c11e0000-0000-4000-8000-000000000010',
  false
);

insert into public.schedule_assignments (id, company_id, schedule_id, user_id, status)
values (
  'c11e0000-0000-4000-8000-000000000062',
  'c11e0000-0000-4000-8000-000000000002',
  'c11e0000-0000-4000-8000-000000000061',
  'c11e0000-0000-4000-8000-000000000010',
  'assigned'
);

select set_config('request.jwt.claim.sub', 'c11e0000-0000-4000-8000-000000000010', true);

select is(
  public.task_audience_includes(
    jsonb_build_object(
      'kind', 'role',
      'role_ids', jsonb_build_array('c11e0000-0000-4000-8000-000000000142')
    ),
    'c11e0000-0000-4000-8000-000000000002',
    'c11e0000-0000-4000-8000-000000000099',
    null,
    true
  ),
  true,
  'Role audience uses the membership class when the profile is for another company'
);

select is(
  public.task_audience_includes(
    jsonb_build_object(
      'kind', 'role',
      'role_ids', jsonb_build_array('c11e0000-0000-4000-8000-000000000141')
    ),
    'c11e0000-0000-4000-8000-000000000002',
    'c11e0000-0000-4000-8000-000000000099',
    null,
    true
  ),
  false,
  'Home staff profile does not match another company staff audience'
);

update public.company_roles
set permissions = '{"schedule.delete": false}'::jsonb
where id = 'c11e0000-0000-4000-8000-000000000142';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c11e0000-0000-4000-8000-000000000010', true);

select is(
  public.current_user_has_permission(
    'c11e0000-0000-4000-8000-000000000002',
    'editTasks'
  ),
  true,
  'Manager membership keeps task edit when the home profile is staff'
);

select is(
  public.current_user_has_permission(
    'c11e0000-0000-4000-8000-000000000002',
    'managePayments'
  ),
  false,
  'Manager membership does not inherit an owner key'
);

select is(
  public.current_user_has_permission(
    'c11e0000-0000-4000-8000-000000000001',
    'editTasks'
  ),
  false,
  'Home company still uses the staff profile class'
);

with deleted as (
  delete from public.schedule_assignments
  where id = 'c11e0000-0000-4000-8000-000000000062'
  returning 1
)
select is(
  (select count(*) from deleted),
  1::bigint,
  'Schedule assign can remove a shift assignment without schedule.delete'
);

with deleted as (
  delete from public.schedules
  where id = 'c11e0000-0000-4000-8000-000000000061'
  returning 1
)
select is(
  (select count(*) from deleted),
  0::bigint,
  'Schedule editor still cannot delete the shift itself'
);

select throws_ok(
  $$ insert into public.task_activities (company_id, task_id, user_id, action_type, description)
     values (
       'c11e0000-0000-4000-8000-000000000002',
       'c11e0000-0000-4000-8000-000000000051',
       'c11e0000-0000-4000-8000-000000000010',
       'note',
       'Cross tenant activity'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "task_activities"',
  'Activity insert rejects a task from another company'
);

select lives_ok(
  $$ insert into public.task_activities (
       id, company_id, task_id, user_id, action_type, description
     )
     values (
       'c11e0000-0000-4000-8000-000000000071',
       'c11e0000-0000-4000-8000-000000000002',
       'c11e0000-0000-4000-8000-000000000052',
       'c11e0000-0000-4000-8000-000000000010',
       'note',
       'Same tenant activity'
     ) $$,
  'Activity insert accepts a task from the same company'
);

select throws_ok(
  $$ update public.task_activities
     set task_id = 'c11e0000-0000-4000-8000-000000000051'
     where id = 'c11e0000-0000-4000-8000-000000000071' $$,
  '42501',
  'new row violates row-level security policy for table "task_activities"',
  'Activity update rejects moving onto another company task'
);

select throws_ok(
  $$ insert into public.task_notifications (
       company_id, task_id, user_id, title, message, type
     )
     values (
       'c11e0000-0000-4000-8000-000000000002',
       'c11e0000-0000-4000-8000-000000000051',
       'c11e0000-0000-4000-8000-000000000010',
       'Cross',
       'Cross tenant notification',
       'note'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "task_notifications"',
  'Notification insert rejects a task from another company'
);

select lives_ok(
  $$ insert into public.task_notifications (
       id, company_id, task_id, user_id, title, message, type
     )
     values (
       'c11e0000-0000-4000-8000-000000000081',
       'c11e0000-0000-4000-8000-000000000002',
       'c11e0000-0000-4000-8000-000000000052',
       'c11e0000-0000-4000-8000-000000000010',
       'Same',
       'Same tenant notification',
       'note'
     ) $$,
  'Notification insert accepts a task from the same company'
);

select throws_ok(
  $$ update public.task_notifications
     set task_id = 'c11e0000-0000-4000-8000-000000000051'
     where id = 'c11e0000-0000-4000-8000-000000000081' $$,
  '42501',
  'new row violates row-level security policy for table "task_notifications"',
  'Notification update rejects moving onto another company task'
);

reset role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claim.sub', '', true);
update public.profiles
set role = 'owner',
    role_id = 'c11e0000-0000-4000-8000-000000000040'
where id = 'c11e0000-0000-4000-8000-000000000010';
update public.company_members
set role = 'staff'
where company_id = 'c11e0000-0000-4000-8000-000000000002'
  and user_id = 'c11e0000-0000-4000-8000-000000000010';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c11e0000-0000-4000-8000-000000000010', true);

select is(
  public.current_user_has_permission(
    'c11e0000-0000-4000-8000-000000000002',
    'managePayments'
  ),
  false,
  'Staff membership does not inherit the home owner class'
);

select is(
  public.current_user_has_permission(
    'c11e0000-0000-4000-8000-000000000002',
    'editTasks'
  ),
  false,
  'Staff membership stays staff when the home profile is owner'
);

select is(
  public.current_user_has_permission(
    'c11e0000-0000-4000-8000-000000000001',
    'managePayments'
  ),
  true,
  'Home company still uses the owner profile class'
);

select * from finish();

rollback;
