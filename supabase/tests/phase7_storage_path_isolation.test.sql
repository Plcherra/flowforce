begin;

create extension if not exists pgtap;

select plan(10);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.company_members where company_id in ('14000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000002');
delete from public.profiles where id in ('24000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000002');
delete from public.companies where id in ('14000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000002');
delete from auth.users where id in ('24000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000002');

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
  ('00000000-0000-0000-0000-000000000000', '24000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase7-owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '24000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase7-owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('14000000-0000-4000-8000-000000000001', 'Phase 7 Tenant A', 'phase-7-tenant-a', '24000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', true),
  ('14000000-0000-4000-8000-000000000002', 'Phase 7 Tenant B', 'phase-7-tenant-b', '24000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('24000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', 'Phase', 'Seven A', 'phase7-owner-a@example.test', 'owner', true),
  ('24000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000002', 'Phase', 'Seven B', 'phase7-owner-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('14000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', 'owner', now()),
  ('14000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000002', 'owner', now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '24000000-0000-4000-8000-000000000001', true);

select is(
  public.storage_object_company_id('14000000-0000-4000-8000-000000000001/forms/images/test.png'),
  '14000000-0000-4000-8000-000000000001'::uuid,
  'Storage helper extracts UUID company prefix'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('form-images', '14000000-0000-4000-8000-000000000001/forms/images/test.png', '24000000-0000-4000-8000-000000000001') $$,
  'Tenant A can upload form media under own company prefix'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('message-attachments', '14000000-0000-4000-8000-000000000001/messages/thread-a/test.txt', '24000000-0000-4000-8000-000000000001') $$,
  'Tenant A can upload message attachment under own company prefix'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('operations-reports', '14000000-0000-4000-8000-000000000001/reports/test.pdf', '24000000-0000-4000-8000-000000000001') $$,
  'Tenant A can upload operations report under own company prefix'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('company-updates-media', '14000000-0000-4000-8000-000000000001/drafts/test.png', '24000000-0000-4000-8000-000000000001') $$,
  'Tenant A can upload company update media under own company prefix'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('company-assets', '14000000-0000-4000-8000-000000000001/logo/test.png', '24000000-0000-4000-8000-000000000001') $$,
  'Tenant A can upload company asset under own company prefix'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('form-images', '14000000-0000-4000-8000-000000000002/forms/images/blocked.png', '24000000-0000-4000-8000-000000000001') $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'Tenant A cannot upload form media under Tenant B prefix'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('message-attachments', '24000000-0000-4000-8000-000000000001/thread-a/blocked.txt', '24000000-0000-4000-8000-000000000001') $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'Legacy user-prefixed message attachment paths are rejected'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('attachments', 'employee-reports/blocked.pdf', '24000000-0000-4000-8000-000000000001') $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'Global report attachment paths are rejected'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('company-updates-media', 'drafts/blocked.png', '24000000-0000-4000-8000-000000000001') $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'Global company update media paths are rejected'
);

select * from finish();

rollback;
