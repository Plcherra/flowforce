begin;

create extension if not exists pgtap;

select plan(27);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.audit_log
where company_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);
delete from public.company_invites
where company_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);
delete from public.system_settings
where company_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);
delete from public.company_roles
where company_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);
delete from public.positions
where company_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);
delete from public.company_members
where company_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);
delete from public.profiles
where id in (
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000005'
);
delete from public.companies
where id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);

delete from auth.users
where id in (
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000005'
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
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'staff-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'owner-c@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'profile-only@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('10000000-0000-4000-8000-000000000001', 'Tenant A', 'tenant-a-phase3', '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000002', 'Tenant B', 'tenant-b-phase3', '20000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Owner', 'A', 'owner-a@example.test', 'owner', true),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Staff', 'A', 'staff-a@example.test', 'employee', false),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Owner', 'B', 'owner-b@example.test', 'owner', true),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'Profile', 'Only', 'profile-only@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'owner', now()),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'employee', now()),
  ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'owner', now());

insert into public.company_roles (company_id, name, hierarchy_level, is_system_role, is_active)
values
  ('10000000-0000-4000-8000-000000000001', 'Owner A', 1, true, true),
  ('10000000-0000-4000-8000-000000000002', 'Owner B', 1, true, true);

insert into public.positions (company_id, name, is_active)
values
  ('10000000-0000-4000-8000-000000000001', 'Position A', true),
  ('10000000-0000-4000-8000-000000000002', 'Position B', true);

insert into public.system_settings (company_id)
values
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002')
on conflict (company_id) do nothing;

insert into public.company_invites (company_id, email, invite_token, role, status)
values
  ('10000000-0000-4000-8000-000000000001', 'invite-a@example.test', 'phase3-token-a', 'employee', 'pending'),
  ('10000000-0000-4000-8000-000000000002', 'invite-b@example.test', 'phase3-token-b', 'employee', 'pending');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.companies),
  1::bigint,
  'Tenant A owner only sees their company'
);

select is(
  (select count(*) from public.profiles),
  2::bigint,
  'Tenant A owner sees only profiles in their company'
);

select is(
  (select count(*) from public.company_members),
  2::bigint,
  'Tenant A owner sees only memberships in their company'
);

select is(
  (select count(*) from public.company_roles),
  1::bigint,
  'Tenant A owner sees only roles in their company'
);

select is(
  (select count(*) from public.positions),
  1::bigint,
  'Tenant A owner sees only positions in their company'
);

select is(
  (select count(*) from public.system_settings),
  1::bigint,
  'Tenant A owner sees only settings in their company'
);

select is(
  (select count(*) from public.company_invites),
  1::bigint,
  'Tenant A owner sees only invites in their company'
);

select is(
  (select count(*) from public.companies where id = '10000000-0000-4000-8000-000000000002'),
  0::bigint,
  'Tenant B company is hidden from Tenant A owner'
);

select throws_ok(
  $$ select public.assert_company_membership('10000000-0000-4000-8000-000000000002'::uuid) $$,
  '42501',
  'User is not a member of this company',
  'Tenant A owner cannot assert membership in Tenant B'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000005', true);

select is(
  (select count(*) from public.current_user_company_ids()),
  0::bigint,
  'profiles.company_id alone does not grant tenant membership'
);

select is(
  (select count(*) from public.companies),
  0::bigint,
  'profiles.company_id alone does not expose a tenant company'
);

select is(
  public.current_user_is_company_admin('10000000-0000-4000-8000-000000000002'::uuid),
  false,
  'profiles admin flags alone do not grant tenant admin rights'
);

select throws_ok(
  $$ select public.assert_company_membership('10000000-0000-4000-8000-000000000002'::uuid) $$,
  '42501',
  'User is not a member of this company',
  'Profile-only user cannot assert membership through profile shortcut'
);

select throws_ok(
  $$ update public.profiles
     set is_company_admin = false
     where id = '20000000-0000-4000-8000-000000000005' $$,
  '42501',
  'Profile tenant and role fields require company admin access',
  'Profile-only user cannot mutate protected tenant or role fields'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);

create temporary table phase3_update_result (updated_count bigint) on commit drop;

with updated as (
  update public.companies
  set name = 'Tenant A Updated By Staff'
  where id = '10000000-0000-4000-8000-000000000001'
  returning 1
)
insert into phase3_update_result
select count(*) from updated;

select is(
  (select updated_count from phase3_update_result),
  0::bigint,
  'Tenant A non-admin cannot update company row'
);

select is(
  (select name from public.companies where id = '10000000-0000-4000-8000-000000000001'),
  'Tenant A',
  'Company name remains unchanged after non-admin update attempt'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000004', true);

select lives_ok(
  $$ select public.create_company_with_setup(
    '{"name":"Phase 3 Created Co","enabled_sections":[],"template_config":{},"owner_profile":{"first_name":"Owner","last_name":"C","email":"owner-c@example.test","phone":"+15555550104"}}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '20000000-0000-4000-8000-000000000004'::uuid
  ) $$,
  'Authenticated user can create company setup for themselves'
);

select is(
  (
    select public.create_company_with_setup(
      '{"name":"Phase 3 Retry Co","enabled_sections":["dashboard"],"template_config":{"retry":true},"owner_profile":{"first_name":"Owner","last_name":"C Updated","email":"owner-c@example.test","phone":"+15555550105"}}'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '20000000-0000-4000-8000-000000000004'::uuid
    )
  ),
  (
    select company_id
    from public.profiles
    where id = '20000000-0000-4000-8000-000000000004'
  ),
  'Company setup retry returns the existing company id'
);

select is(
  (
    select name
    from public.companies c
    join public.profiles p on p.company_id = c.id
    where p.id = '20000000-0000-4000-8000-000000000004'
  ),
  'Phase 3 Retry Co',
  'Company setup retry repairs company payload through the RPC'
);

select is(
  (
    select first_name || ' ' || last_name || ' ' || coalesce(phone, '')
    from public.profiles
    where id = '20000000-0000-4000-8000-000000000004'
  ),
  'Owner C Updated +15555550105',
  'Company setup retry repairs owner profile payload through the RPC'
);

select is(
  (
    select count(*)
    from public.company_members
    where user_id = '20000000-0000-4000-8000-000000000004'
  ),
  1::bigint,
  'Company setup retry keeps a single membership row'
);

select ok(
  exists (
    select 1
    from public.system_settings ss
    join public.profiles p on p.company_id = ss.company_id
    where p.id = '20000000-0000-4000-8000-000000000004'
  ),
  'Company setup creates system settings baseline'
);

select ok(
  (
    select count(*)
    from public.company_roles cr
    join public.profiles p on p.company_id = cr.company_id
    where p.id = '20000000-0000-4000-8000-000000000004'
  ) >= 4,
  'Company setup creates default roles baseline'
);

select throws_ok(
  $$ select public.create_company_with_setup(
    '{"name":"Bad Actor Co"}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '20000000-0000-4000-8000-000000000005'::uuid
  ) $$,
  '42501',
  'owner_user_id must match the authenticated user',
  'Authenticated user cannot create setup for a different owner id'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000005', true);

create temporary table phase3_profile_shortcut_setup_result (company_id uuid) on commit drop;

insert into phase3_profile_shortcut_setup_result
select public.create_company_with_setup(
  '{"name":"Profile Shortcut Hardening Co","enabled_sections":[],"template_config":{},"owner_profile":{"first_name":"Profile","last_name":"Only","email":"profile-only@example.test"}}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '20000000-0000-4000-8000-000000000005'::uuid
);

select isnt(
  (select company_id from phase3_profile_shortcut_setup_result),
  '10000000-0000-4000-8000-000000000002'::uuid,
  'Company setup does not reuse a profile shortcut owned by another tenant'
);

select is(
  (
    select count(*)
    from public.company_members
    where user_id = '20000000-0000-4000-8000-000000000005'
      and company_id = '10000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'Company setup does not grant membership to the foreign profile shortcut company'
);

select ok(
  exists (
    select 1
    from public.company_members cm
    join phase3_profile_shortcut_setup_result result
      on result.company_id = cm.company_id
    where cm.user_id = '20000000-0000-4000-8000-000000000005'
  ),
  'Company setup creates membership on the hardened owner company'
);

select * from finish();

rollback;
