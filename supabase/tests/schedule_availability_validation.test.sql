begin;

create extension if not exists pgtap;

select plan(7);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.schedule_assignments
where schedule_id in (
  select id::text from public.schedules
  where company_id = '1d000000-0000-4000-8000-000000000001'
);
delete from public.schedules where company_id = '1d000000-0000-4000-8000-000000000001';
delete from public.time_off_requests where user_id = '2d000000-0000-4000-8000-000000000002';
delete from public.staff_availability where company_id = '1d000000-0000-4000-8000-000000000001';
delete from public.company_members where company_id = '1d000000-0000-4000-8000-000000000001';
delete from public.profiles where id in ('2d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000002');
delete from public.companies where id = '1d000000-0000-4000-8000-000000000001';
delete from auth.users where id in ('2d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000002');

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
  ('00000000-0000-0000-0000-000000000000', '2d000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase2-avail-manager@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '2d000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase2-avail-staff@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('1d000000-0000-4000-8000-000000000001', 'Phase 2 Availability Tenant', 'phase-2-availability', '2d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, status, is_active)
values
  ('2d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000001', 'Phase2', 'Manager', 'phase2-avail-manager@example.test', 'manager', 'active', true),
  ('2d000000-0000-4000-8000-000000000002', '1d000000-0000-4000-8000-000000000001', 'Phase2', 'Staff', 'phase2-avail-staff@example.test', 'staff', 'active', true);

insert into public.company_members (company_id, user_id, role, status)
values
  ('1d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', 'manager', 'active'),
  ('1d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000002', 'staff', 'active');

insert into public.staff_availability (
  company_id,
  user_id,
  day_of_week,
  start_time,
  end_time,
  week_start_date,
  is_preferred
)
values (
  '1d000000-0000-4000-8000-000000000001',
  '2d000000-0000-4000-8000-000000000002',
  1,
  '06:00',
  '13:30',
  '2026-07-06',
  true
);

insert into public.schedules (
  id,
  company_id,
  title,
  role,
  start_time,
  end_time,
  location,
  required_headcount,
  is_published
)
values
  (
    '3d000000-0000-4000-8000-000000000001',
    '1d000000-0000-4000-8000-000000000001',
    'In-window shift',
    'staff',
    '2026-07-07T09:00:00+00',
    '2026-07-07T13:00:00+00',
    'Main',
    1,
    false
  ),
  (
    '3d000000-0000-4000-8000-000000000002',
    '1d000000-0000-4000-8000-000000000001',
    'Out-of-window shift',
    'staff',
    '2026-07-07T09:00:00+00',
    '2026-07-07T15:00:00+00',
    'Main',
    1,
    false
  ),
  (
    '3d000000-0000-4000-8000-000000000003',
    '1d000000-0000-4000-8000-000000000001',
    'Pending PTO shift',
    'staff',
    '2026-07-07T10:00:00+00',
    '2026-07-07T12:00:00+00',
    'Main',
    1,
    false
  );

insert into public.time_off_requests (
  user_id,
  start_date,
  end_date,
  status,
  type,
  reason
)
values (
  '2d000000-0000-4000-8000-000000000002',
  '2026-07-07',
  '2026-07-07',
  'pending',
  'pto',
  'Pending day off'
);

select set_config('request.jwt.claim.sub', '2d000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (private.evaluate_schedule_assignment(
    '2d000000-0000-4000-8000-000000000002',
    '2026-07-07T09:00:00+00'::timestamptz,
    '2026-07-07T13:00:00+00'::timestamptz
  ) ->> 'allowed')::boolean,
  true,
  'Partial availability allows in-window shift'
);

select is(
  (private.evaluate_schedule_assignment(
    '2d000000-0000-4000-8000-000000000002',
    '2026-07-07T09:00:00+00'::timestamptz,
    '2026-07-07T15:00:00+00'::timestamptz
  ) ->> 'allowed')::boolean,
  false,
  'Partial availability blocks shift ending after window'
);

select is(
  (private.evaluate_schedule_assignment(
    '2d000000-0000-4000-8000-000000000002',
    '2026-07-08T09:00:00+00'::timestamptz,
    '2026-07-08T13:00:00+00'::timestamptz
  ) ->> 'allowed')::boolean,
  false,
  'No preference rows blocks assignment (Off day)'
);

select is(
  (public.assign_schedule_with_validation(
    '3d000000-0000-4000-8000-000000000001',
    '2d000000-0000-4000-8000-000000000002',
    'assigned',
    '2d000000-0000-4000-8000-000000000001'
  ) ->> 'success')::boolean,
  true,
  'Assign RPC succeeds for in-window shift'
);

select is(
  (public.assign_schedule_with_validation(
    '3d000000-0000-4000-8000-000000000002',
    '2d000000-0000-4000-8000-000000000002',
    'assigned',
    '2d000000-0000-4000-8000-000000000001'
  ) ->> 'success')::boolean,
  false,
  'Assign RPC blocks out-of-window shift'
);

select is(
  (public.assign_schedule_with_validation(
    '3d000000-0000-4000-8000-000000000003',
    '2d000000-0000-4000-8000-000000000002',
    'assigned',
    '2d000000-0000-4000-8000-000000000001'
  ) ->> 'severity'),
  'warning',
  'Pending PTO allows assign with warning severity'
);

select is(
  (public.publish_schedules_week_with_validation(
    '1d000000-0000-4000-8000-000000000001',
    '2026-07-06T00:00:00+00'::timestamptz,
    '2026-07-13T00:00:00+00'::timestamptz,
    true
  ) ->> 'success')::boolean,
  true,
  'Publish week succeeds when assignments are valid'
);

select * from finish();
rollback;
