begin;

-- Core FlowForce demo tenant for fresh resets.
-- This seed intentionally creates a stable login/workspace first. Feature demo
-- records should be added per module after the restored feature schema matures.

insert into auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  role,
  aud,
  created_at,
  updated_at
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'demo.owner@flowforce.local',
  crypt('FlowForceDemo123!', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  jsonb_build_object(
    'active_company_id',
    '11111111-1111-4111-8111-111111111111',
    'company_id',
    '11111111-1111-4111-8111-111111111111',
    'first_name',
    'Demo',
    'last_name',
    'Owner'
  ),
  'authenticated',
  'authenticated',
  now(),
  now()
)
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  role = excluded.role,
  aud = excluded.aud,
  updated_at = now();

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  jsonb_build_object(
    'sub',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'email',
    'demo.owner@flowforce.local'
  ),
  'email',
  'demo.owner@flowforce.local',
  now(),
  now(),
  now()
)
on conflict (provider, provider_id) do update
set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  last_sign_in_at = excluded.last_sign_in_at,
  updated_at = now();

insert into public.companies (
  id,
  name,
  slug,
  website,
  phone,
  industry,
  size,
  description,
  registration_complete,
  created_by,
  owner_id,
  timezone,
  created_at,
  updated_at
)
values (
  '11111111-1111-4111-8111-111111111111',
  'FlowForce Demo Company',
  'flowforce-demo-company',
  'https://flowforce.local',
  '+1 555 0100',
  'professional-services',
  '1-10',
  'Demo tenant for local FlowForce validation.',
  true,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'America/New_York',
  now(),
  now()
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  website = excluded.website,
  phone = excluded.phone,
  industry = excluded.industry,
  size = excluded.size,
  description = excluded.description,
  registration_complete = excluded.registration_complete,
  created_by = excluded.created_by,
  owner_id = excluded.owner_id,
  timezone = excluded.timezone,
  updated_at = now();

insert into public.profiles (
  id,
  company_id,
  first_name,
  last_name,
  email,
  role,
  phone,
  is_company_admin,
  employment_status,
  created_at,
  updated_at
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'Demo',
  'Owner',
  'demo.owner@flowforce.local',
  'owner',
  '+1 555 0101',
  true,
  'active',
  now(),
  now()
)
on conflict (id) do update
set
  company_id = excluded.company_id,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  email = excluded.email,
  role = excluded.role,
  phone = excluded.phone,
  is_company_admin = excluded.is_company_admin,
  employment_status = excluded.employment_status,
  updated_at = now();

commit;
