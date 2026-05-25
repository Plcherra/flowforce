begin;

create extension if not exists pgtap;

select plan(24);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.staff_performance where user_id in ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000002');
delete from public.employee_report where employee_id in ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000002');
delete from public.employee_badge where employee_id in ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000002');
delete from public.skill_matrix where employee_id in ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000002');
delete from public.shift_swaps where company_id in ('1a000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000002');
delete from public.schedules where company_id in ('1a000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000002');
delete from public.company_members where company_id in ('1a000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000002');
delete from public.profiles where id in ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000002');
delete from public.companies where id in ('1a000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000002');
delete from auth.users where id in ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000002');

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.company_updates'::regclass and conname = 'company_updates_author_id_fkey' and contype = 'f'),
  'company_updates exposes author_profile through company_updates_author_id_fkey'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.company_update_engagement'::regclass and conname = 'company_update_engagement_update_id_fkey' and contype = 'f'),
  'company_update_engagement embeds under company_updates'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.company_update_comments'::regclass and conname = 'company_update_comments_author_id_fkey' and contype = 'f'),
  'company update comments expose author profiles'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.message_channels'::regclass and conname = 'message_channels_created_by_fkey' and contype = 'f'),
  'message_channels exposes creator profiles'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.message_channels'::regclass and conname = 'message_channels_department_id_fkey' and contype = 'f'),
  'message_channels exposes departments'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.channel_members'::regclass and conname = 'channel_members_channel_id_fkey' and contype = 'f'),
  'channel_members embeds under message_channels'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.messages'::regclass and conname = 'messages_channel_id_fkey' and contype = 'f'),
  'messages exposes message channel relationship'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.messages'::regclass and conname = 'messages_sender_id_fkey' and contype = 'f'),
  'messages exposes sender profile relationship'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.forms'::regclass and conname = 'forms_created_by_fkey' and contype = 'f'),
  'forms exposes creator profiles'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.forms'::regclass and conname = 'forms_department_id_fkey' and contype = 'f'),
  'forms exposes departments'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.form_fields'::regclass and conname = 'form_fields_form_id_fkey' and contype = 'f'),
  'form_fields embeds under forms'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.form_submissions'::regclass and conname = 'form_submissions_form_id_fkey' and contype = 'f'),
  'form_submissions embeds under forms'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.shift_swaps'::regclass and conname = 'shift_swaps_requesting_user_id_fkey' and contype = 'f'),
  'shift_swaps exposes requesting user profiles'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.shift_swaps'::regclass and conname = 'shift_swaps_target_user_id_fkey' and contype = 'f'),
  'shift_swaps exposes target user profiles'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.shift_swaps'::regclass and conname = 'shift_swaps_schedule_id_fkey' and contype = 'f'),
  'shift_swaps exposes schedules'
);

select ok(
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'events' and column_name = 'occurred_at'),
  'events has occurred_at for closed-loop dashboard queries'
);

select ok(
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'events' and column_name = 'event_type'),
  'events has event_type for closed-loop dashboard queries'
);

select ok(
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'idea_cycles' and column_name = 'stage'),
  'idea_cycles has stage for closed-loop dashboard queries'
);

select ok(
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'idea_cycles' and column_name = 'range'),
  'idea_cycles has range for closed-loop dashboard queries'
);

select ok(
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'shift_swaps' and column_name = 'company_id'),
  'shift_swaps has company_id for dashboard tenant queries'
);

select ok(
  exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'get_employee_enrichment'
  ),
  'get_employee_enrichment RPC exists'
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
  ('00000000-0000-0000-0000-000000000000', '2a000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase14-contract-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '2a000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase14-contract-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('1a000000-0000-4000-8000-000000000001', 'Phase 14 Contract Tenant A', 'phase-14-contract-tenant-a', '2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000001', true),
  ('1a000000-0000-4000-8000-000000000002', 'Phase 14 Contract Tenant B', 'phase-14-contract-tenant-b', '2a000000-0000-4000-8000-000000000002', '2a000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('2a000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000001', 'Phase', 'Contract A', 'phase14-contract-a@example.test', 'owner', true),
  ('2a000000-0000-4000-8000-000000000002', '1a000000-0000-4000-8000-000000000002', 'Phase', 'Contract B', 'phase14-contract-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('1a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000001', 'owner', now()),
  ('1a000000-0000-4000-8000-000000000002', '2a000000-0000-4000-8000-000000000002', 'owner', now());

insert into public.schedules (id, company_id, title, start_time, end_time, created_by, is_published)
values
  ('3a000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000001', 'Tenant A shift', now(), now() + interval '4 hours', '2a000000-0000-4000-8000-000000000001', true),
  ('3a000000-0000-4000-8000-000000000002', '1a000000-0000-4000-8000-000000000002', 'Tenant B shift', now(), now() + interval '4 hours', '2a000000-0000-4000-8000-000000000002', true);

insert into public.shift_swaps (id, company_id, schedule_id, requesting_user_id, target_user_id, status, swap_type, reason)
values
  ('4a000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000001', '3a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000001', null, 'pending', 'drop', 'Tenant A'),
  ('4a000000-0000-4000-8000-000000000002', '1a000000-0000-4000-8000-000000000002', '3a000000-0000-4000-8000-000000000002', '2a000000-0000-4000-8000-000000000002', null, 'pending', 'drop', 'Tenant B');

insert into public.skill_matrix (employee_id, role, level, xp)
values ('2a000000-0000-4000-8000-000000000001', 'Barista', 3, 120);

insert into public.employee_badge (employee_id, badge_code, reason, awarded_at)
values ('2a000000-0000-4000-8000-000000000001', 'reliable', 'Phase 14 test', now());

insert into public.employee_report (employee_id, created_by, category, date, severity, notes)
values ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000001', 'positive', current_date, 1, 'Phase 14 test');

insert into public.staff_performance (user_id, date, attendance_status, hours_worked)
values ('2a000000-0000-4000-8000-000000000001', current_date, 'present', 8);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '2a000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.shift_swaps),
  1::bigint,
  'Tenant A reads only its own shift swaps'
);

select is(
  jsonb_array_length(public.get_employee_enrichment(
    '1a000000-0000-4000-8000-000000000001',
    array['2a000000-0000-4000-8000-000000000001']::uuid[],
    current_date - 30
  ) -> 'skills'),
  1,
  'get_employee_enrichment returns tenant-scoped skills'
);

select is(
  jsonb_array_length(public.get_employee_enrichment(
    '1a000000-0000-4000-8000-000000000001',
    array['2a000000-0000-4000-8000-000000000001']::uuid[],
    current_date - 30
  ) -> 'attendance'),
  1,
  'get_employee_enrichment returns tenant-scoped attendance'
);

select * from finish();

rollback;
