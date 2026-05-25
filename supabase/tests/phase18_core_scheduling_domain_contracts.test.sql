begin;

create extension if not exists pgtap;

select plan(18);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.audit_log
where company_id in (
  '1b000000-0000-4000-8000-000000000001',
  '1b000000-0000-4000-8000-000000000002'
);
delete from public.event_participants
where company_id in (
  '1b000000-0000-4000-8000-000000000001',
  '1b000000-0000-4000-8000-000000000002'
);
delete from public.event_shift_links
where company_id in (
  '1b000000-0000-4000-8000-000000000001',
  '1b000000-0000-4000-8000-000000000002'
);
delete from public.vendor_visits
where company_id in (
  '1b000000-0000-4000-8000-000000000001',
  '1b000000-0000-4000-8000-000000000002'
);
delete from public.calendar_events
where company_id in (
  '1b000000-0000-4000-8000-000000000001',
  '1b000000-0000-4000-8000-000000000002'
);
delete from public.schedules
where company_id in (
  '1b000000-0000-4000-8000-000000000001',
  '1b000000-0000-4000-8000-000000000002'
);
delete from public.system_settings
where company_id in (
  '1b000000-0000-4000-8000-000000000001',
  '1b000000-0000-4000-8000-000000000002'
);
delete from public.company_members
where company_id in (
  '1b000000-0000-4000-8000-000000000001',
  '1b000000-0000-4000-8000-000000000002'
);
delete from public.profiles
where id in (
  '2b000000-0000-4000-8000-000000000001',
  '2b000000-0000-4000-8000-000000000002'
);
delete from public.companies
where id in (
  '1b000000-0000-4000-8000-000000000001',
  '1b000000-0000-4000-8000-000000000002'
);
delete from auth.users
where id in (
  '2b000000-0000-4000-8000-000000000001',
  '2b000000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '2b000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase18-owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '2b000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase18-owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('1b000000-0000-4000-8000-000000000001', 'Phase 18 Tenant A', 'phase-18-tenant-a', '2b000000-0000-4000-8000-000000000001', '2b000000-0000-4000-8000-000000000001', true),
  ('1b000000-0000-4000-8000-000000000002', 'Phase 18 Tenant B', 'phase-18-tenant-b', '2b000000-0000-4000-8000-000000000002', '2b000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('2b000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001', 'Phase', 'Eighteen A', 'phase18-owner-a@example.test', 'owner', true),
  ('2b000000-0000-4000-8000-000000000002', '1b000000-0000-4000-8000-000000000002', 'Phase', 'Eighteen B', 'phase18-owner-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('1b000000-0000-4000-8000-000000000001', '2b000000-0000-4000-8000-000000000001', 'owner', now()),
  ('1b000000-0000-4000-8000-000000000002', '2b000000-0000-4000-8000-000000000002', 'owner', now());

insert into public.system_settings (company_id)
values
  ('1b000000-0000-4000-8000-000000000001'),
  ('1b000000-0000-4000-8000-000000000002')
on conflict (company_id) do nothing;

insert into public.calendar_events (
  id,
  company_id,
  title,
  description,
  event_type,
  start_time,
  end_time,
  created_by
)
values
  ('5b000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001', 'Tenant A event', 'A event', 'meeting', now(), now() + interval '1 hour', '2b000000-0000-4000-8000-000000000001'),
  ('5b000000-0000-4000-8000-000000000002', '1b000000-0000-4000-8000-000000000002', 'Tenant B event', 'B event', 'meeting', now(), now() + interval '1 hour', '2b000000-0000-4000-8000-000000000002');

insert into public.event_participants (company_id, event_id, profile_id, role, rsvp_status)
values
  ('1b000000-0000-4000-8000-000000000001', '5b000000-0000-4000-8000-000000000001', '2b000000-0000-4000-8000-000000000001', 'owner', 'accepted'),
  ('1b000000-0000-4000-8000-000000000002', '5b000000-0000-4000-8000-000000000002', '2b000000-0000-4000-8000-000000000002', 'owner', 'accepted');

insert into public.schedules (id, company_id, title, start_time, end_time, created_by, is_published)
values
  ('5b100000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001', 'Tenant A shift', now(), now() + interval '4 hours', '2b000000-0000-4000-8000-000000000001', true),
  ('5b100000-0000-4000-8000-000000000002', '1b000000-0000-4000-8000-000000000002', 'Tenant B shift', now(), now() + interval '4 hours', '2b000000-0000-4000-8000-000000000002', true);

insert into public.vendor_visits (id, company_id, vendor_name, service_type, description, start_time, end_time, location)
values
  ('5b200000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000001', 'Tenant A Vendor', 'maintenance', 'A vendor', now(), now() + interval '2 hours', 'A'),
  ('5b200000-0000-4000-8000-000000000002', '1b000000-0000-4000-8000-000000000002', 'Tenant B Vendor', 'maintenance', 'B vendor', now(), now() + interval '2 hours', 'B');

insert into public.audit_log (company_id, actor_id, action, table_name, record_id, new_values)
values
  ('1b000000-0000-4000-8000-000000000001', '2b000000-0000-4000-8000-000000000001', 'phase18.audit', 'companies', '1b000000-0000-4000-8000-000000000001', '{"ok":true}'::jsonb),
  ('1b000000-0000-4000-8000-000000000002', '2b000000-0000-4000-8000-000000000002', 'phase18.audit', 'companies', '1b000000-0000-4000-8000-000000000002', '{"ok":true}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '2b000000-0000-4000-8000-000000000001', true);

select has_view('public', 'calendar_events_full', 'calendar_events_full is a real view');
select has_view('public', 'calendar_unified_view', 'calendar_unified_view is a real view');
select has_view('public', 'vendor_event', 'vendor_event is a real view');
select has_view('public', 'audit_logs', 'audit_logs compatibility view exists');

select is((select count(*) from public.calendar_events_full), 1::bigint, 'Tenant A sees one full calendar event');
select is((select title from public.calendar_events_full), 'Tenant A event', 'Tenant A calendar event is returned by full view');
select is((select jsonb_array_length(participants) from public.calendar_events_full), 1, 'Full calendar view includes event participants');
select is((select count(*) from public.calendar_unified_view), 3::bigint, 'Tenant A unified calendar has event, shift, and vendor visit');
select is((select count(*) from public.calendar_unified_view where event_type = 'vendor'), 1::bigint, 'Unified calendar includes vendor visits');
select is((select count(*) from public.vendor_event), 1::bigint, 'Tenant A sees one vendor event');
select is((select vendor_name from public.vendor_event), 'Tenant A Vendor', 'Tenant A vendor event is returned');
select is((select count(*) from public.audit_logs), 1::bigint, 'Tenant A admin sees one audit log through compatibility view');
select is((select performed_by from public.audit_logs), '2b000000-0000-4000-8000-000000000001'::uuid, 'audit_logs maps performed_by from actor_id');

select lives_ok(
  $$ insert into public.event_participants (event_id, profile_id, role, rsvp_status)
     values ('5b000000-0000-4000-8000-000000000001', '2b000000-0000-4000-8000-000000000001', 'reviewer', 'accepted') $$,
  'Tenant A can insert own event participant and inherit company_id'
);

select is(
  (
    select count(*)
    from public.event_participants
    where event_id = '5b000000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'Tenant A event participant insert is visible after trigger assignment'
);

select throws_ok(
  $$ insert into public.event_participants (event_id, profile_id, role, rsvp_status)
     values ('5b000000-0000-4000-8000-000000000002', '2b000000-0000-4000-8000-000000000001', 'reviewer', 'accepted') $$,
  '42501',
  'new row violates row-level security policy for table "event_participants"',
  'Tenant A cannot attach themselves to Tenant B event'
);

select throws_ok(
  $$ insert into public.company_members (user_id, role)
     values ('2b000000-0000-4000-8000-000000000001', 'owner') $$,
  '42501',
  'new row violates row-level security policy for table "company_members"',
  'Authenticated clients cannot create company_members rows without company_id'
);

reset role;

select throws_ok(
  $$ insert into public.company_members (user_id, role)
     values ('2b000000-0000-4000-8000-000000000001', 'owner') $$,
  '23514',
  'new row for relation "company_members" violates check constraint "company_members_company_id_required"',
  'Database constraint requires company_members.company_id for privileged writes too'
);

select * from finish();

rollback;
