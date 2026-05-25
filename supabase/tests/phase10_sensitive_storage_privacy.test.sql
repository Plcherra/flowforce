begin;

create extension if not exists pgtap;

select plan(7);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.company_members where company_id in ('15000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002');
delete from public.profiles where id in ('25000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000002');
delete from public.companies where id in ('15000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002');
delete from auth.users where id in ('25000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000002');

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
  ('00000000-0000-0000-0000-000000000000', '25000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase10-owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '25000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase10-owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('15000000-0000-4000-8000-000000000001', 'Phase 10 Tenant A', 'phase-10-tenant-a', '25000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001', true),
  ('15000000-0000-4000-8000-000000000002', 'Phase 10 Tenant B', 'phase-10-tenant-b', '25000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('25000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000001', 'Phase', 'Ten A', 'phase10-owner-a@example.test', 'owner', true),
  ('25000000-0000-4000-8000-000000000002', '15000000-0000-4000-8000-000000000002', 'Phase', 'Ten B', 'phase10-owner-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('15000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001', 'owner', now()),
  ('15000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000002', 'owner', now());

insert into storage.objects (bucket_id, name, owner_id)
values
  ('message-attachments', '15000000-0000-4000-8000-000000000001/phase10/message-a.txt', '25000000-0000-4000-8000-000000000001'),
  ('message-attachments', '15000000-0000-4000-8000-000000000002/phase10/message-b.txt', '25000000-0000-4000-8000-000000000002'),
  ('operations-reports', '15000000-0000-4000-8000-000000000001/phase10/report-a.pdf', '25000000-0000-4000-8000-000000000001'),
  ('operations-reports', '15000000-0000-4000-8000-000000000002/phase10/report-b.pdf', '25000000-0000-4000-8000-000000000002');

select is(
  (select public from storage.buckets where id = 'message-attachments'),
  false,
  'Message attachments bucket is private'
);

select is(
  (select public from storage.buckets where id = 'operations-reports'),
  false,
  'Operations reports bucket is private'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '25000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::integer from storage.objects where bucket_id = 'message-attachments' and name like '15000000-0000-4000-8000-000000000001/phase10/%'),
  1,
  'Tenant A can select own private message attachment metadata'
);

select is(
  (select count(*)::integer from storage.objects where bucket_id = 'message-attachments' and name like '15000000-0000-4000-8000-000000000002/phase10/%'),
  0,
  'Tenant A cannot select Tenant B private message attachment metadata'
);

select is(
  (select count(*)::integer from storage.objects where bucket_id = 'operations-reports' and name like '15000000-0000-4000-8000-000000000001/phase10/%'),
  1,
  'Tenant A can select own private operations report metadata'
);

select is(
  (select count(*)::integer from storage.objects where bucket_id = 'operations-reports' and name like '15000000-0000-4000-8000-000000000002/phase10/%'),
  0,
  'Tenant A cannot select Tenant B private operations report metadata'
);

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);

select is(
  (select count(*)::integer from storage.objects where bucket_id in ('message-attachments', 'operations-reports') and name like '15000000-0000-4000-8000-00000000000%/phase10/%'),
  0,
  'Anonymous users cannot select private sensitive object metadata'
);

select * from finish();

rollback;
