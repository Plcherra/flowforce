begin;

create extension if not exists pgtap;

select plan(13);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.analytics_cache where cache_key like 'phase13-%';
delete from public.section_templates where name like 'Phase 13%';
delete from public.staff_availability
where user_id in (
  '28000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000002'
);
delete from public.departments
where company_id in (
  '18000000-0000-4000-8000-000000000001',
  '18000000-0000-4000-8000-000000000002'
);
delete from public.company_members
where company_id in (
  '18000000-0000-4000-8000-000000000001',
  '18000000-0000-4000-8000-000000000002'
);
delete from public.profiles
where id in (
  '28000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000002'
);
delete from public.companies
where id in (
  '18000000-0000-4000-8000-000000000001',
  '18000000-0000-4000-8000-000000000002'
);
delete from auth.users
where id in (
  '28000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '28000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase13-owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '28000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase13-owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('18000000-0000-4000-8000-000000000001', 'Phase 13 Tenant A', 'phase-13-tenant-a', '28000000-0000-4000-8000-000000000001', '28000000-0000-4000-8000-000000000001', true),
  ('18000000-0000-4000-8000-000000000002', 'Phase 13 Tenant B', 'phase-13-tenant-b', '28000000-0000-4000-8000-000000000002', '28000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('28000000-0000-4000-8000-000000000001', '18000000-0000-4000-8000-000000000001', 'Phase', 'Thirteen A', 'phase13-owner-a@example.test', 'owner', true),
  ('28000000-0000-4000-8000-000000000002', '18000000-0000-4000-8000-000000000002', 'Phase', 'Thirteen B', 'phase13-owner-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('18000000-0000-4000-8000-000000000001', '28000000-0000-4000-8000-000000000001', 'owner', now()),
  ('18000000-0000-4000-8000-000000000002', '28000000-0000-4000-8000-000000000002', 'owner', now());

insert into public.departments (company_id, name, type)
values
  ('18000000-0000-4000-8000-000000000001', 'Phase 13 Department A', 'operations'),
  ('18000000-0000-4000-8000-000000000002', 'Phase 13 Department B', 'operations');

insert into public.staff_availability (user_id, day_of_week, start_time, end_time)
values
  ('28000000-0000-4000-8000-000000000001', 1, now(), now() + interval '8 hours'),
  ('28000000-0000-4000-8000-000000000002', 1, now(), now() + interval '8 hours');

insert into public.section_templates (name, category, is_public, created_by)
values ('Phase 13 Global Template', 'ops', true, '28000000-0000-4000-8000-000000000001');

insert into public.analytics_cache (cache_key, data, expires_at)
values ('phase13-cache', '{"visible":false}'::jsonb, now() + interval '1 hour');

select is(
  (select count(*) from pg_catalog.pg_tables where schemaname = 'public' and rowsecurity = false),
  0::bigint,
  'Every public table has RLS enabled after restore containment'
);

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);

select throws_ok(
  $$ select count(*) from public.departments $$,
  '42501',
  'permission denied for table departments',
  'Anon cannot read restored tenant tables'
);

select throws_ok(
  $$ select count(*) from public.section_templates $$,
  '42501',
  'permission denied for table section_templates',
  'Anon cannot read global restored reference tables'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '28000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.departments),
  1::bigint,
  'Tenant A can read own restored company rows'
);

select is(
  (select count(*) from public.departments where company_id = '18000000-0000-4000-8000-000000000002'),
  0::bigint,
  'Tenant A cannot read Tenant B restored company rows'
);

select lives_ok(
  $$ insert into public.departments (company_id, name, type)
     values ('18000000-0000-4000-8000-000000000001', 'Phase 13 Department A2', 'operations') $$,
  'Tenant A can insert own restored company rows'
);

select throws_ok(
  $$ insert into public.departments (company_id, name, type)
     values ('18000000-0000-4000-8000-000000000002', 'Blocked Phase 13 Department', 'operations') $$,
  '42501',
  'new row violates row-level security policy for table "departments"',
  'Tenant A cannot insert Tenant B restored company rows'
);

select is(
  (select count(*) from public.staff_availability),
  1::bigint,
  'Tenant A can read restored user-owned rows for same-company users'
);

select is(
  (select count(*) from public.staff_availability where user_id = '28000000-0000-4000-8000-000000000002'),
  0::bigint,
  'Tenant A cannot read restored user-owned rows from another company'
);

select is(
  (select count(*) from public.section_templates where name = 'Phase 13 Global Template'),
  1::bigint,
  'Authenticated users can read restored global reference rows'
);

select throws_ok(
  $$ insert into public.section_templates (name, category, is_public)
     values ('Phase 13 Forbidden Template', 'ops', true) $$,
  '42501',
  'permission denied for table section_templates',
  'Authenticated users cannot write restored global reference rows'
);

select throws_ok(
  $$ select count(*) from public.analytics_cache $$,
  '42501',
  'permission denied for table analytics_cache',
  'Authenticated users cannot read blocked restored internal tables'
);

select throws_ok(
  $$ insert into public.analytics_cache (cache_key, data)
     values ('phase13-forbidden-cache', '{}'::jsonb) $$,
  '42501',
  'permission denied for table analytics_cache',
  'Authenticated users cannot write blocked restored internal tables'
);

select * from finish();

rollback;
