begin;

create extension if not exists pgtap;

select plan(25);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.task_notifications where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.reminders where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.announcement_reads where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.announcements where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.staff_performance where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.staff_availability where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.skill_matrix where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.employee_report where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.employee_badge where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.employee_report_summary where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.hr_roster_cache where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.compliance_rules where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.employees where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.tasks where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.company_members where company_id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from public.profiles where id in ('2c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000002');
delete from public.companies where id in ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000002');
delete from auth.users where id in ('2c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000002');

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
  ('00000000-0000-0000-0000-000000000000', '2c000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase19-owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '2c000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase19-owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('1c000000-0000-4000-8000-000000000001', 'Phase 19 Tenant A', 'phase-19-tenant-a', '2c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', true),
  ('1c000000-0000-4000-8000-000000000002', 'Phase 19 Tenant B', 'phase-19-tenant-b', '2c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('2c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000001', 'Phase', 'Nineteen A', 'phase19-owner-a@example.test', 'owner', true),
  ('2c000000-0000-4000-8000-000000000002', '1c000000-0000-4000-8000-000000000002', 'Phase', 'Nineteen B', 'phase19-owner-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('1c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', 'owner', now()),
  ('1c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000002', 'owner', now());

insert into public.tasks (id, company_id, title, status, created_by, assigned_to)
values
  ('6c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000001', 'Tenant A task', 'open', '2c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001'),
  ('6c000000-0000-4000-8000-000000000002', '1c000000-0000-4000-8000-000000000002', 'Tenant B task', 'open', '2c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000002');

insert into public.employees (company_id) values
  ('1c000000-0000-4000-8000-000000000001'),
  ('1c000000-0000-4000-8000-000000000002');

insert into public.employee_badge (company_id, employee_id, badge_code, reason, awarded_at)
values
  ('1c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', 'a-badge', 'A', now()),
  ('1c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000002', 'b-badge', 'B', now());

insert into public.employee_report (company_id, employee_id, created_by, category, date, severity, notes)
values
  ('1c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', 'positive', current_date, 1, 'A'),
  ('1c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000002', 'positive', current_date, 1, 'B');

insert into public.employee_report_summary (company_id) values
  ('1c000000-0000-4000-8000-000000000001'),
  ('1c000000-0000-4000-8000-000000000002');

insert into public.hr_roster_cache (company_id, snapshot, synced_at) values
  ('1c000000-0000-4000-8000-000000000001', '{"count":1}'::jsonb, now()),
  ('1c000000-0000-4000-8000-000000000002', '{"count":1}'::jsonb, now());

insert into public.skill_matrix (company_id, employee_id, role, level, xp)
values
  ('1c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', 'Trainer', 3, 120),
  ('1c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000002', 'Trainer', 3, 120);

insert into public.staff_availability (company_id, user_id, day_of_week, start_time, end_time)
values
  ('1c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', 1, now(), now() + interval '8 hours'),
  ('1c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000002', 1, now(), now() + interval '8 hours');

insert into public.staff_performance (company_id, user_id, date, attendance_status, hours_worked)
values
  ('1c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', current_date, 'present', 8),
  ('1c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000002', current_date, 'present', 8);

insert into public.compliance_rules (company_id, rule_type, role, value, is_active, created_by)
values
  ('1c000000-0000-4000-8000-000000000001', 'training', 'owner', 1, true, '2c000000-0000-4000-8000-000000000001'),
  ('1c000000-0000-4000-8000-000000000002', 'training', 'owner', 1, true, '2c000000-0000-4000-8000-000000000002');

insert into public.announcements (id, company_id, title, content, created_by, is_published)
values
  ('7c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000001', 'Tenant A announcement', 'A', '2c000000-0000-4000-8000-000000000001', true),
  ('7c000000-0000-4000-8000-000000000002', '1c000000-0000-4000-8000-000000000002', 'Tenant B announcement', 'B', '2c000000-0000-4000-8000-000000000002', true);

insert into public.announcement_reads (company_id, announcement_id, user_id, read_at)
values
  ('1c000000-0000-4000-8000-000000000001', '7c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', now()),
  ('1c000000-0000-4000-8000-000000000002', '7c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000002', now());

insert into public.reminders (company_id, task_id, user_id, title, completed)
values
  ('1c000000-0000-4000-8000-000000000001', '6c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', 'Tenant A reminder', false),
  ('1c000000-0000-4000-8000-000000000002', '6c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000002', 'Tenant B reminder', false);

insert into public.task_notifications (company_id, task_id, user_id, title, message, type)
values
  ('1c000000-0000-4000-8000-000000000001', '6c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', 'Tenant A notification', 'A', 'task'),
  ('1c000000-0000-4000-8000-000000000002', '6c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000002', 'Tenant B notification', 'B', 'task');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '2c000000-0000-4000-8000-000000000001', true);

select is((select count(*) from public.employees), 1::bigint, 'Tenant A sees own employees rows');
select is((select count(*) from public.employee_badge), 1::bigint, 'Tenant A sees own employee badges');
select is((select count(*) from public.employee_report), 1::bigint, 'Tenant A sees own employee reports');
select is((select count(*) from public.employee_report_summary), 1::bigint, 'Tenant A sees own employee report summaries');
select is((select count(*) from public.hr_roster_cache), 1::bigint, 'Tenant A sees own HR roster cache');
select is((select count(*) from public.skill_matrix), 1::bigint, 'Tenant A sees own skill rows');
select is((select count(*) from public.staff_availability), 1::bigint, 'Tenant A sees own staff availability');
select is((select count(*) from public.staff_performance), 1::bigint, 'Tenant A sees own staff performance');
select is((select count(*) from public.compliance_rules), 1::bigint, 'Tenant A sees own compliance rules');
select is((select count(*) from public.announcements), 1::bigint, 'Tenant A sees own announcements');
select is((select count(*) from public.announcement_reads), 1::bigint, 'Tenant A sees own announcement read rows');
select is((select count(*) from public.reminders), 1::bigint, 'Tenant A sees own reminders');
select is((select count(*) from public.task_notifications), 1::bigint, 'Tenant A sees own task notifications');

select lives_ok(
  $$ insert into public.skill_matrix (employee_id, role, level, xp)
     values ('2c000000-0000-4000-8000-000000000001', 'Coach', 2, 50) $$,
  'Tenant A can insert skill rows and inherit company_id'
);

select is((select count(*) from public.skill_matrix), 2::bigint, 'Triggered skill insert is visible to Tenant A');

select lives_ok(
  $$ insert into public.announcement_reads (announcement_id, user_id, read_at)
     values ('7c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', now()) $$,
  'Tenant A can insert announcement reads and inherit company_id'
);

select is((select count(*) from public.announcement_reads), 2::bigint, 'Triggered announcement read insert is visible to Tenant A');

select lives_ok(
  $$ insert into public.reminders (task_id, user_id, title, completed)
     values ('6c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', 'Triggered reminder', false) $$,
  'Tenant A can insert reminders and inherit company_id'
);

select is((select count(*) from public.reminders), 2::bigint, 'Triggered reminder insert is visible to Tenant A');

select lives_ok(
  $$ insert into public.task_notifications (task_id, user_id, title, message, type)
     values ('6c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000001', 'Triggered notification', 'A', 'task') $$,
  'Tenant A can insert task notifications and inherit company_id'
);

select is((select count(*) from public.task_notifications), 2::bigint, 'Triggered task notification insert is visible to Tenant A');

select throws_ok(
  $$ insert into public.employee_badge (employee_id, badge_code, awarded_at)
     values ('2c000000-0000-4000-8000-000000000002', 'blocked', now()) $$,
  '42501',
  'new row violates row-level security policy for table "employee_badge"',
  'Tenant A cannot badge a Tenant B employee'
);

select throws_ok(
  $$ insert into public.announcements (company_id, title, content, created_by)
     values ('1c000000-0000-4000-8000-000000000002', 'Blocked', 'B', '2c000000-0000-4000-8000-000000000001') $$,
  '42501',
  'new row violates row-level security policy for table "announcements"',
  'Tenant A cannot create Tenant B announcements'
);

select throws_ok(
  $$ insert into public.task_notifications (task_id, user_id, title, message, type)
     values ('6c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000001', 'Blocked', 'B', 'task') $$,
  '42501',
  'new row violates row-level security policy for table "task_notifications"',
  'Tenant A cannot attach notifications to Tenant B tasks'
);

reset role;

select throws_ok(
  $$ insert into public.announcements (title, content)
     values ('Missing company', 'Nope') $$,
  '23514',
  'new row for relation "announcements" violates check constraint "announcements_company_id_required"',
  'Privileged writes still require announcement company_id'
);

select * from finish();

rollback;
