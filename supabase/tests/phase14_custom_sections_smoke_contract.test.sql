begin;

create extension if not exists pgtap;

select plan(8);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.custom_section_pages
where section_id in (
  '19000000-0000-4000-8000-000000000001',
  '19000000-0000-4000-8000-000000000002'
);
delete from public.custom_sections
where id in (
  '19000000-0000-4000-8000-000000000001',
  '19000000-0000-4000-8000-000000000002'
);
delete from public.company_members
where company_id in (
  '19000000-0000-4000-8000-000000000001',
  '19000000-0000-4000-8000-000000000002'
);
delete from public.profiles
where id in (
  '29000000-0000-4000-8000-000000000001',
  '29000000-0000-4000-8000-000000000002'
);
delete from public.companies
where id in (
  '19000000-0000-4000-8000-000000000001',
  '19000000-0000-4000-8000-000000000002'
);
delete from auth.users
where id in (
  '29000000-0000-4000-8000-000000000001',
  '29000000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '29000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase14-owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '29000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase14-owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('19000000-0000-4000-8000-000000000001', 'Phase 14 Tenant A', 'phase-14-tenant-a', '29000000-0000-4000-8000-000000000001', '29000000-0000-4000-8000-000000000001', true),
  ('19000000-0000-4000-8000-000000000002', 'Phase 14 Tenant B', 'phase-14-tenant-b', '29000000-0000-4000-8000-000000000002', '29000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('29000000-0000-4000-8000-000000000001', '19000000-0000-4000-8000-000000000001', 'Phase', 'Fourteen A', 'phase14-owner-a@example.test', 'owner', true),
  ('29000000-0000-4000-8000-000000000002', '19000000-0000-4000-8000-000000000002', 'Phase', 'Fourteen B', 'phase14-owner-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('19000000-0000-4000-8000-000000000001', '29000000-0000-4000-8000-000000000001', 'owner', now()),
  ('19000000-0000-4000-8000-000000000002', '29000000-0000-4000-8000-000000000002', 'owner', now());

insert into public.custom_sections (id, company_id, name, path, category, icon, is_active, is_template, created_by, permissions, template_config, sort_order)
values
  ('19000000-0000-4000-8000-000000000001', '19000000-0000-4000-8000-000000000001', 'Tenant A section', '/tenant-a-section', 'ops', 'FileText', true, false, '29000000-0000-4000-8000-000000000001', '[]'::jsonb, '{}'::jsonb, 1),
  ('19000000-0000-4000-8000-000000000002', '19000000-0000-4000-8000-000000000002', 'Tenant B section', '/tenant-b-section', 'ops', 'FileText', true, false, '29000000-0000-4000-8000-000000000002', '[]'::jsonb, '{}'::jsonb, 1);

insert into public.custom_section_pages (section_id, name, title, route, content, permissions, is_active, sort_order)
values
  ('19000000-0000-4000-8000-000000000001', 'Tenant A page', 'Tenant A page', '/tenant-a-section/page', '[]'::jsonb, '[]'::jsonb, true, 1),
  ('19000000-0000-4000-8000-000000000002', 'Tenant B page', 'Tenant B page', '/tenant-b-section/page', '[]'::jsonb, '[]'::jsonb, true, 1);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.custom_section_pages'::regclass
      and conname = 'custom_section_pages_section_id_fkey'
      and contype = 'f'
  ),
  'custom_section_pages has a custom_sections foreign key for PostgREST embedding'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_department_id_fkey'
      and contype = 'f'
  ),
  'profiles has a departments foreign key for employees module embedding'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_position_id_fkey'
      and contype = 'f'
  ),
  'profiles has a positions foreign key for employees module embedding'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '29000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.custom_section_pages),
  1::bigint,
  'Tenant A can read own custom section pages'
);

select is(
  (select count(*) from public.custom_section_pages where section_id = '19000000-0000-4000-8000-000000000002'),
  0::bigint,
  'Tenant A cannot read Tenant B custom section pages'
);

select lives_ok(
  $$ insert into public.custom_section_pages (section_id, name, title, route, content, permissions, is_active, sort_order)
     values ('19000000-0000-4000-8000-000000000001', 'Tenant A page 2', 'Tenant A page 2', '/tenant-a-section/page-2', '[]'::jsonb, '[]'::jsonb, true, 2) $$,
  'Tenant A can insert own custom section page'
);

select throws_ok(
  $$ insert into public.custom_section_pages (section_id, name, title, route, content, permissions, is_active, sort_order)
     values ('19000000-0000-4000-8000-000000000002', 'Blocked page', 'Blocked page', '/tenant-b-section/blocked', '[]'::jsonb, '[]'::jsonb, true, 2) $$,
  '42501',
  'new row violates row-level security policy for table "custom_section_pages"',
  'Tenant A cannot insert Tenant B custom section page'
);

select is(
  (select count(*) from public.custom_sections where id = '19000000-0000-4000-8000-000000000001'),
  1::bigint,
  'Tenant A can still read own custom section parent'
);

select * from finish();

rollback;
