begin;

create extension if not exists pgtap;

select plan(11);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.company_members where company_id in ('16000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000002');
delete from public.profiles where id in ('26000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000002');
delete from public.companies where id in ('16000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000002');
delete from auth.users where id in ('26000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000002');

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
  ('00000000-0000-0000-0000-000000000000', '26000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase11-owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '26000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase11-owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('16000000-0000-4000-8000-000000000001', 'Phase 11 Tenant A', 'phase-11-tenant-a', '26000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001', true),
  ('16000000-0000-4000-8000-000000000002', 'Phase 11 Tenant B', 'phase-11-tenant-b', '26000000-0000-4000-8000-000000000002', '26000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('26000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'Phase', 'Eleven A', 'phase11-owner-a@example.test', 'owner', true),
  ('26000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000002', 'Phase', 'Eleven B', 'phase11-owner-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('16000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001', 'owner', now()),
  ('16000000-0000-4000-8000-000000000002', '26000000-0000-4000-8000-000000000002', 'owner', now());

select isnt(
  (select public from storage.buckets where id in ('form-audio', 'form-images', 'form-signatures', 'form-uploads', 'form-videos') and public is true limit 1),
  true,
  'No form storage bucket remains public'
);

select is((select public from storage.buckets where id = 'form-audio'), false, 'Form audio bucket is private');
select is((select public from storage.buckets where id = 'form-images'), false, 'Form images bucket is private');
select is((select public from storage.buckets where id = 'form-signatures'), false, 'Form signatures bucket is private');
select is((select public from storage.buckets where id = 'form-uploads'), false, 'Form uploads bucket is private');
select is((select public from storage.buckets where id = 'form-videos'), false, 'Form videos bucket is private');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '26000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('form-images', '16000000-0000-4000-8000-000000000001/forms/images/phase11-a.png', '26000000-0000-4000-8000-000000000001') $$,
  'Tenant A can upload private form image under own company prefix'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('form-images', '16000000-0000-4000-8000-000000000002/forms/images/phase11-b.png', '26000000-0000-4000-8000-000000000001') $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'Tenant A cannot upload private form image under Tenant B prefix'
);

select is(
  (select count(*)::integer from storage.objects where bucket_id = 'form-images' and name like '16000000-0000-4000-8000-000000000001/forms/images/%'),
  1,
  'Tenant A can select own private form object metadata'
);

select is(
  (select count(*)::integer from storage.objects where bucket_id = 'form-images' and name like '16000000-0000-4000-8000-000000000002/forms/images/%'),
  0,
  'Tenant A cannot select Tenant B private form object metadata'
);

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);

select is(
  (select count(*)::integer from storage.objects where bucket_id in ('form-audio', 'form-images', 'form-signatures', 'form-uploads', 'form-videos') and name like '16000000-0000-4000-8000-00000000000%/forms/%'),
  0,
  'Anonymous users cannot select private form object metadata'
);

select * from finish();

rollback;
