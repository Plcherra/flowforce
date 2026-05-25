begin;

create extension if not exists pgtap;

select plan(18);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.message_reactions
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.messages
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.channel_members
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.message_channels
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.form_submissions
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.form_fields
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.forms
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.schedule_assignments
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.time_off_requests
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.user_unavailability
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.shift_templates
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.week_templates
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.schedules
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.company_members
where company_id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from public.profiles
where id in (
  '22000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000002'
);
delete from public.companies
where id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002'
);
delete from auth.users
where id in (
  '22000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '22000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase5-owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '22000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase5-owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('12000000-0000-4000-8000-000000000001', 'Phase 5 Tenant A', 'phase-5-tenant-a', '22000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', true),
  ('12000000-0000-4000-8000-000000000002', 'Phase 5 Tenant B', 'phase-5-tenant-b', '22000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('22000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'Phase', 'Five A', 'phase5-owner-a@example.test', 'owner', true),
  ('22000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002', 'Phase', 'Five B', 'phase5-owner-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'owner', now()),
  ('12000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', 'owner', now());

insert into public.message_channels (id, company_id, name, type, created_by)
values
  ('41000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'Tenant A channel', 'team', '22000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002', 'Tenant B channel', 'team', '22000000-0000-4000-8000-000000000002');

insert into public.channel_members (company_id, channel_id, user_id, role)
values
  ('12000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'admin'),
  ('12000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', 'admin');

insert into public.messages (id, company_id, channel_id, sender_id, content)
values
  ('42000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'Message A'),
  ('42000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', 'Message B');

insert into public.message_reactions (company_id, message_id, user_id, emoji)
values
  ('12000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', '+1'),
  ('12000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', '+1');

insert into public.forms (id, company_id, title, created_by, status)
values
  ('43000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'Tenant A form', '22000000-0000-4000-8000-000000000001', 'draft'),
  ('43000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002', 'Tenant B form', '22000000-0000-4000-8000-000000000002', 'draft');

insert into public.form_fields (company_id, form_id, field_order, field_type, label)
values
  ('12000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000001', 1, 'text', 'Field A'),
  ('12000000-0000-4000-8000-000000000002', '43000000-0000-4000-8000-000000000002', 1, 'text', 'Field B');

insert into public.form_submissions (company_id, form_id, submitted_by, submission_data, submitted_at)
values
  ('12000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', '{"answer":"A"}'::jsonb, now()),
  ('12000000-0000-4000-8000-000000000002', '43000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', '{"answer":"B"}'::jsonb, now());

insert into public.schedules (id, company_id, title, start_time, end_time, created_by, is_published)
values
  ('44000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'Tenant A shift', now(), now() + interval '4 hours', '22000000-0000-4000-8000-000000000001', true),
  ('44000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002', 'Tenant B shift', now(), now() + interval '4 hours', '22000000-0000-4000-8000-000000000002', true);

insert into public.schedule_assignments (company_id, schedule_id, user_id, status)
values
  ('12000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'assigned'),
  ('12000000-0000-4000-8000-000000000002', '44000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', 'assigned');

insert into public.shift_templates (company_id, name, created_by)
values
  ('12000000-0000-4000-8000-000000000001', 'Shift Template A', '22000000-0000-4000-8000-000000000001'),
  ('12000000-0000-4000-8000-000000000002', 'Shift Template B', '22000000-0000-4000-8000-000000000002');

insert into public.week_templates (company_id, name, created_by)
values
  ('12000000-0000-4000-8000-000000000001', 'Week Template A', '22000000-0000-4000-8000-000000000001'),
  ('12000000-0000-4000-8000-000000000002', 'Week Template B', '22000000-0000-4000-8000-000000000002');

insert into public.time_off_requests (company_id, user_id, start_date, end_date, type, status)
values
  ('12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', current_date, current_date + 1, 'vacation', 'pending'),
  ('12000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', current_date, current_date + 1, 'vacation', 'pending');

insert into public.user_unavailability (company_id, user_id, start_time, end_time, reason)
values
  ('12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', now(), now() + interval '1 hour', 'A'),
  ('12000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', now(), now() + interval '1 hour', 'B');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '22000000-0000-4000-8000-000000000001', true);

select is((select count(*) from public.message_channels), 1::bigint, 'Tenant A sees only own message channels');
select is((select count(*) from public.channel_members), 1::bigint, 'Tenant A sees only own channel members');
select is((select count(*) from public.messages), 1::bigint, 'Tenant A sees only own messages');
select is((select count(*) from public.message_reactions), 1::bigint, 'Tenant A sees only own message reactions');
select is((select count(*) from public.forms), 1::bigint, 'Tenant A sees only own forms');
select is((select count(*) from public.form_fields), 1::bigint, 'Tenant A sees only own form fields');
select is((select count(*) from public.form_submissions), 1::bigint, 'Tenant A sees only own form submissions');
select is((select count(*) from public.schedules), 1::bigint, 'Tenant A sees only own schedules');
select is((select count(*) from public.schedule_assignments), 1::bigint, 'Tenant A sees only own schedule assignments');
select is((select count(*) from public.shift_templates), 1::bigint, 'Tenant A sees only own shift templates');
select is((select count(*) from public.week_templates), 1::bigint, 'Tenant A sees only own week templates');
select is((select count(*) from public.time_off_requests), 1::bigint, 'Tenant A sees only own time off requests');
select is((select count(*) from public.user_unavailability), 1::bigint, 'Tenant A sees only own user unavailability');

select lives_ok(
  $$ insert into public.messages (channel_id, sender_id, content)
     values ('41000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'Triggered company message') $$,
  'Tenant A can insert own message and inherit company_id from channel'
);

select lives_ok(
  $$ insert into public.form_fields (form_id, field_order, field_type, label)
     values ('43000000-0000-4000-8000-000000000001', 2, 'text', 'Triggered company field') $$,
  'Tenant A can insert own form field and inherit company_id from form'
);

select lives_ok(
  $$ insert into public.schedule_assignments (schedule_id, user_id, status)
     values ('44000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'assigned') $$,
  'Tenant A can insert own schedule assignment and inherit company_id from schedule'
);

select throws_ok(
  $$ insert into public.message_channels (company_id, name, type, created_by)
     values ('12000000-0000-4000-8000-000000000002', 'Blocked channel', 'team', '22000000-0000-4000-8000-000000000001') $$,
  '42501',
  'new row violates row-level security policy for table "message_channels"',
  'Tenant A cannot create a Tenant B channel'
);

select throws_ok(
  $$ insert into public.time_off_requests (user_id, start_date, end_date, type, status)
     values ('22000000-0000-4000-8000-000000000002', current_date, current_date + 1, 'vacation', 'pending') $$,
  '42501',
  'new row violates row-level security policy for table "time_off_requests"',
  'Tenant A cannot create time off for Tenant B user'
);

select * from finish();

rollback;
