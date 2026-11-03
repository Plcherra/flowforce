begin;

create extension if not exists pgtap;

select plan(4);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.ops_issues where company_id in (
  '7b000000-0000-4000-8000-000000000001',
  '7b000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '7b000000-0000-4000-8000-000000000001',
  '7b000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '7b100000-0000-4000-8000-000000000001',
  '7b100000-0000-4000-8000-000000000002',
  '7b100000-0000-4000-8000-000000000003'
);
delete from public.companies where id in (
  '7b000000-0000-4000-8000-000000000001',
  '7b000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '7b100000-0000-4000-8000-000000000001',
  '7b100000-0000-4000-8000-000000000002',
  '7b100000-0000-4000-8000-000000000003'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
)
values
  ('00000000-0000-0000-0000-000000000000', '7b100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'ops-hub-staff@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '7b100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'ops-hub-manager@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '7b100000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'ops-hub-other@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('7b000000-0000-4000-8000-000000000001', 'Ops Hub A', 'ops-hub-a', '7b100000-0000-4000-8000-000000000002', '7b100000-0000-4000-8000-000000000002', true),
  ('7b000000-0000-4000-8000-000000000002', 'Ops Hub B', 'ops-hub-b', '7b100000-0000-4000-8000-000000000003', '7b100000-0000-4000-8000-000000000003', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('7b100000-0000-4000-8000-000000000001', '7b000000-0000-4000-8000-000000000001', 'Ops', 'Staff', 'ops-hub-staff@example.test', 'staff', false),
  ('7b100000-0000-4000-8000-000000000002', '7b000000-0000-4000-8000-000000000001', 'Ops', 'Manager', 'ops-hub-manager@example.test', 'manager', true),
  ('7b100000-0000-4000-8000-000000000003', '7b000000-0000-4000-8000-000000000002', 'Ops', 'Other', 'ops-hub-other@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('7b000000-0000-4000-8000-000000000001', '7b100000-0000-4000-8000-000000000001', 'staff', now()),
  ('7b000000-0000-4000-8000-000000000001', '7b100000-0000-4000-8000-000000000002', 'manager', now()),
  ('7b000000-0000-4000-8000-000000000002', '7b100000-0000-4000-8000-000000000003', 'owner', now());

insert into public.ops_issues (id, company_id, title, severity, status)
values (
  '7b200000-0000-4000-8000-000000000001',
  '7b000000-0000-4000-8000-000000000001',
  'Hub issue',
  'warning',
  'open'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '7b100000-0000-4000-8000-000000000001', true);

select ok(
  not public.current_user_has_permission('7b000000-0000-4000-8000-000000000001', 'editTasks'),
  'staff cannot edit tasks'
);
select ok(
  public.current_user_has_permission('7b000000-0000-4000-8000-000000000001', 'viewOwnTasks'),
  'staff can view their own tasks'
);
select throws_ok(
  $$ select public.update_operational_issue_status(
    '7b000000-0000-4000-8000-000000000001',
    '7b200000-0000-4000-8000-000000000001',
    'acknowledged'
  ) $$,
  '42501',
  'Not allowed to update this issue',
  'staff cannot update an operational issue'
);

select set_config('request.jwt.claim.sub', '7b100000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$ select public.update_operational_issue_status(
    '7b000000-0000-4000-8000-000000000001',
    '7b200000-0000-4000-8000-000000000001',
    'acknowledged'
  ) $$,
  'a manager can update an operational issue'
);

select * from finish();
rollback;
