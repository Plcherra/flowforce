begin;

truncate table public.forms cascade;
truncate table public.tasks cascade;
truncate table public.goals cascade;
truncate table public.time_off_requests cascade;
truncate table public.schedules cascade;
truncate table public.departments cascade;
truncate table public.profiles cascade;
truncate table public.companies cascade;
truncate table auth.identities cascade;
truncate table auth.users cascade;

-- Fixed identifiers for reproducibility
select
  '11111111-1111-1111-1111-111111111111'::uuid as company_id,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid as admin_id,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid as staff_id
into temporary table temp_ids;

-- Users
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, created_at, updated_at)
select
  admin_id,
  'ops_admin@example.com',
  crypt('Passw0rd!', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  jsonb_build_object('active_company_id', company_id::text, 'company_id', company_id::text, 'first_name', 'Alex', 'last_name', 'Admin'),
  'authenticated',
  now(),
  now()
from temp_ids;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, created_at, updated_at)
select
  staff_id,
  'ops_staff@example.com',
  crypt('Passw0rd!', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  jsonb_build_object('active_company_id', company_id::text, 'company_id', company_id::text, 'first_name', 'Jamie', 'last_name', 'Staff'),
  'authenticated',
  now(),
  now()
from temp_ids;

-- Identities
insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(),
  admin_id,
  jsonb_build_object('sub', admin_id::text, 'email', 'ops_admin@example.com'),
  'email',
  now(),
  now(),
  now()
from temp_ids;

insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(),
  staff_id,
  jsonb_build_object('sub', staff_id::text, 'email', 'ops_staff@example.com'),
  'email',
  now(),
  now(),
  now()
from temp_ids;

-- Company & profiles
insert into public.companies (id, name, created_by, owner_id, timezone, created_at, updated_at)
select company_id, 'Operations Demo Co', admin_id, admin_id, 'UTC', now(), now() from temp_ids;

insert into public.profiles (
  id,
  company_id,
  first_name,
  last_name,
  email,
  role,
  is_company_admin,
  employment_status,
  created_at,
  updated_at
)
select
  admin_id,
  company_id,
  'Alex',
  'Admin',
  'ops_admin@example.com',
  'owner',
  true,
  'active',
  now(),
  now()
from temp_ids;

insert into public.profiles (
  id,
  company_id,
  first_name,
  last_name,
  email,
  role,
  is_company_admin,
  employment_status,
  created_at,
  updated_at
)
select
  staff_id,
  company_id,
  'Jamie',
  'Staff',
  'ops_staff@example.com',
  'staff',
  false,
  'active',
  now(),
  now()
from temp_ids;

-- Department
insert into public.departments (id, company_id, name, type, created_at, updated_at)
select
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  company_id,
  'Front of House',
  'operations',
  now(),
  now()
from temp_ids;

-- Schedule
insert into public.schedules (
  id,
  company_id,
  title,
  role,
  start_time,
  end_time,
  required_headcount,
  created_by,
  created_at,
  updated_at
)
select
  'ssssssss-ssss-ssss-ssss-ssssssssssss',
  company_id,
  'Opening Shift',
  'server',
  date_trunc('hour', now()),
  date_trunc('hour', now()) + interval '8 hours',
  2,
  admin_id,
  now(),
  now()
from temp_ids;

-- Time off request
insert into public.time_off_requests (
  id,
  user_id,
  company_id,
  reason,
  start_date,
  end_date,
  status,
  type,
  created_at,
  updated_at
)
select
  'tttttttt-tttt-tttt-tttt-tttttttttttt',
  staff_id,
  company_id,
  'Family event',
  current_date + interval '7 days',
  current_date + interval '8 days',
  'pending',
  'vacation',
  now(),
  now()
from temp_ids;

-- Goal
insert into public.goals (
  id,
  company_id,
  created_by,
  title,
  description,
  status,
  progress,
  target_completion_date,
  created_at,
  updated_at
)
select
  'gggggggg-gggg-gggg-gggg-gggggggggggg',
  company_id,
  admin_id,
  'Increase CSAT',
  'Raise customer satisfaction by 10%.',
  'active',
  25,
  current_date + interval '30 days',
  now(),
  now()
from temp_ids;

-- Tasks
insert into public.tasks (
  id,
  company_id,
  title,
  status,
  priority,
  created_by,
  assigned_to,
  created_at,
  updated_at
)
select
  'task-draft-0000-0000-0000-000000000001',
  company_id,
  'Draft training outline',
  'todo',
  'medium',
  admin_id,
  admin_id,
  now(),
  now()
from temp_ids;

insert into public.tasks (
  id,
  company_id,
  title,
  status,
  priority,
  created_by,
  assigned_to,
  created_at,
  updated_at
)
select
  'task-active-0000-0000-0000-000000000002',
  company_id,
  'Launch customer survey',
  'in_progress',
  'high',
  admin_id,
  staff_id,
  now(),
  now()
from temp_ids;

-- Form metadata
insert into public.forms (
  id,
  title,
  description,
  status,
  created_by,
  created_at,
  updated_at
)
select
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'Shift Feedback',
  'Collect quick feedback after each shift.',
  'published',
  admin_id,
  now(),
  now()
from temp_ids;

commit;
