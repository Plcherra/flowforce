begin;

create extension if not exists pgtap;

select plan(10);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.company_members where company_id in ('17000000-0000-4000-8000-000000000001', '17000000-0000-4000-8000-000000000002');
delete from public.profiles where id in ('27000000-0000-4000-8000-000000000001', '27000000-0000-4000-8000-000000000002');
delete from public.companies where id in ('17000000-0000-4000-8000-000000000001', '17000000-0000-4000-8000-000000000002');
delete from auth.users where id in ('27000000-0000-4000-8000-000000000001', '27000000-0000-4000-8000-000000000002');

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
  ('00000000-0000-0000-0000-000000000000', '27000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase12-owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '27000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase12-owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('17000000-0000-4000-8000-000000000001', 'Phase 12 Tenant A', 'phase-12-tenant-a', '27000000-0000-4000-8000-000000000001', '27000000-0000-4000-8000-000000000001', true),
  ('17000000-0000-4000-8000-000000000002', 'Phase 12 Tenant B', 'phase-12-tenant-b', '27000000-0000-4000-8000-000000000002', '27000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('27000000-0000-4000-8000-000000000001', '17000000-0000-4000-8000-000000000001', 'Phase', 'Twelve A', 'phase12-owner-a@example.test', 'owner', true),
  ('27000000-0000-4000-8000-000000000002', '17000000-0000-4000-8000-000000000002', 'Phase', 'Twelve B', 'phase12-owner-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('17000000-0000-4000-8000-000000000001', '27000000-0000-4000-8000-000000000001', 'owner', now()),
  ('17000000-0000-4000-8000-000000000002', '27000000-0000-4000-8000-000000000002', 'owner', now());

select has_column('public', 'employee_report', 'attachment', 'Employee report has attachment metadata column');
select is((select public from storage.buckets where id = 'company-updates-media'), false, 'Company update media bucket is private');
select is((select public from storage.buckets where id = 'attachments'), false, 'Employee report attachments bucket is private');
select is((select public from storage.buckets where id = 'company-assets'), true, 'Company assets remain the only public bucket');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '27000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('company-updates-media', '17000000-0000-4000-8000-000000000001/phase12/update.png', '27000000-0000-4000-8000-000000000001') $$,
  'Tenant A can upload private company update media under own company prefix'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('attachments', '17000000-0000-4000-8000-000000000001/phase12/report.pdf', '27000000-0000-4000-8000-000000000001') $$,
  'Tenant A can upload private employee report attachment under own company prefix'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('company-updates-media', '17000000-0000-4000-8000-000000000002/phase12/blocked.png', '27000000-0000-4000-8000-000000000001') $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'Tenant A cannot upload company update media under Tenant B prefix'
);

select is(
  (select count(*)::integer from storage.objects where bucket_id in ('company-updates-media', 'attachments') and name like '17000000-0000-4000-8000-000000000001/phase12/%'),
  2,
  'Tenant A can select own remaining private storage metadata'
);

select is(
  (select count(*)::integer from storage.objects where bucket_id = 'company-updates-media' and name like '17000000-0000-4000-8000-000000000002/phase12/%'),
  0,
  'Tenant A cannot select Tenant B private company update media metadata'
);

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);

select is(
  (select count(*)::integer from storage.objects where bucket_id in ('company-updates-media', 'attachments') and name like '17000000-0000-4000-8000-00000000000%/phase12/%'),
  0,
  'Anonymous users cannot select remaining private storage metadata'
);

select * from finish();

rollback;
