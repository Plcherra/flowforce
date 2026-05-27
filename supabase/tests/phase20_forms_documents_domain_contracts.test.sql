begin;

create extension if not exists pgtap;

select plan(26);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.report_events where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.helpdesk_tickets where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.files where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.documents where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.custom_reports where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.custom_section_pages where section_id in ('7d000000-0000-4000-8000-000000000001', '7d000000-0000-4000-8000-000000000002');
delete from public.custom_sections where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.form_submission_reviewers where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.form_submission_files where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.form_field_signatures where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.form_field_scans where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.form_field_ratings where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.form_field_locations where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.form_reviewer_rules where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.form_access_rules where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.form_submissions where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.form_fields where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.forms where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.departments where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.company_members where company_id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from public.profiles where id in ('2d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000002');
delete from public.companies where id in ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000002');
delete from auth.users where id in ('2d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000002');

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
  ('00000000-0000-0000-0000-000000000000', '2d000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase20-owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '2d000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase20-owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('1d000000-0000-4000-8000-000000000001', 'Phase 20 Tenant A', 'phase-20-tenant-a', '2d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', true),
  ('1d000000-0000-4000-8000-000000000002', 'Phase 20 Tenant B', 'phase-20-tenant-b', '2d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('2d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000001', 'Phase', 'Twenty A', 'phase20-owner-a@example.test', 'owner', true),
  ('2d000000-0000-4000-8000-000000000002', '1d000000-0000-4000-8000-000000000002', 'Phase', 'Twenty B', 'phase20-owner-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('1d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', 'owner', now()),
  ('1d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000002', 'owner', now());

insert into public.departments (id, company_id, name)
values
  ('3d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000001', 'Tenant A Ops'),
  ('3d000000-0000-4000-8000-000000000002', '1d000000-0000-4000-8000-000000000002', 'Tenant B Ops');

insert into public.forms (id, company_id, title, created_by, department_id, status)
values
  ('4d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000001', 'Tenant A form', '2d000000-0000-4000-8000-000000000001', '3d000000-0000-4000-8000-000000000001', 'draft'),
  ('4d000000-0000-4000-8000-000000000002', '1d000000-0000-4000-8000-000000000002', 'Tenant B form', '2d000000-0000-4000-8000-000000000002', '3d000000-0000-4000-8000-000000000002', 'draft');

insert into public.form_fields (id, company_id, form_id, field_order, field_type, label)
values
  ('5d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000001', '4d000000-0000-4000-8000-000000000001', 1, 'text', 'Tenant A field'),
  ('5d000000-0000-4000-8000-000000000002', '1d000000-0000-4000-8000-000000000002', '4d000000-0000-4000-8000-000000000002', 1, 'text', 'Tenant B field');

insert into public.form_submissions (id, company_id, form_id, submitted_by, submission_data, submitted_at)
values
  ('6d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000001', '4d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', '{"answer":"A"}'::jsonb, now()),
  ('6d000000-0000-4000-8000-000000000002', '1d000000-0000-4000-8000-000000000002', '4d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000002', '{"answer":"B"}'::jsonb, now());

insert into public.form_access_rules (company_id, form_id, rule_type, scope_type, scope_id, created_by)
values
  ('1d000000-0000-4000-8000-000000000001', '4d000000-0000-4000-8000-000000000001', 'allow', 'department', '3d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001'),
  ('1d000000-0000-4000-8000-000000000002', '4d000000-0000-4000-8000-000000000002', 'allow', 'department', '3d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000002');

insert into public.form_reviewer_rules (company_id, form_id, scope_type, scope_id, created_by)
values
  ('1d000000-0000-4000-8000-000000000001', '4d000000-0000-4000-8000-000000000001', 'user', '2d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001'),
  ('1d000000-0000-4000-8000-000000000002', '4d000000-0000-4000-8000-000000000002', 'user', '2d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000002');

insert into public.form_field_locations (company_id, field_id, submission_id, latitude, longitude)
values
  ('1d000000-0000-4000-8000-000000000001', '5d000000-0000-4000-8000-000000000001', '6d000000-0000-4000-8000-000000000001', 1, 1),
  ('1d000000-0000-4000-8000-000000000002', '5d000000-0000-4000-8000-000000000002', '6d000000-0000-4000-8000-000000000002', 2, 2);

insert into public.form_field_ratings (company_id, field_id, submission_id, rating_value, max_rating)
values
  ('1d000000-0000-4000-8000-000000000001', '5d000000-0000-4000-8000-000000000001', '6d000000-0000-4000-8000-000000000001', 5, 5),
  ('1d000000-0000-4000-8000-000000000002', '5d000000-0000-4000-8000-000000000002', '6d000000-0000-4000-8000-000000000002', 4, 5);

insert into public.form_field_scans (company_id, field_id, submission_id, scan_data, scan_type)
values
  ('1d000000-0000-4000-8000-000000000001', '5d000000-0000-4000-8000-000000000001', '6d000000-0000-4000-8000-000000000001', 'A', 'qr'),
  ('1d000000-0000-4000-8000-000000000002', '5d000000-0000-4000-8000-000000000002', '6d000000-0000-4000-8000-000000000002', 'B', 'qr');

insert into public.form_field_signatures (company_id, field_id, submission_id, signer_name, signed_at)
values
  ('1d000000-0000-4000-8000-000000000001', '5d000000-0000-4000-8000-000000000001', '6d000000-0000-4000-8000-000000000001', 'Tenant A', now()),
  ('1d000000-0000-4000-8000-000000000002', '5d000000-0000-4000-8000-000000000002', '6d000000-0000-4000-8000-000000000002', 'Tenant B', now());

insert into public.form_submission_files (company_id, field_id, submission_id, file_name, storage_path)
values
  ('1d000000-0000-4000-8000-000000000001', '5d000000-0000-4000-8000-000000000001', '6d000000-0000-4000-8000-000000000001', 'a.png', '1d000000-0000-4000-8000-000000000001/forms/a.png'),
  ('1d000000-0000-4000-8000-000000000002', '5d000000-0000-4000-8000-000000000002', '6d000000-0000-4000-8000-000000000002', 'b.png', '1d000000-0000-4000-8000-000000000002/forms/b.png');

insert into public.form_submission_reviewers (company_id, submission_id, assigned_user_id, status)
values
  ('1d000000-0000-4000-8000-000000000001', '6d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', 'pending'),
  ('1d000000-0000-4000-8000-000000000002', '6d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000002', 'pending');

insert into public.custom_sections (id, company_id, name, path, category, is_active, is_template, created_by)
values
  ('7d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000001', 'Tenant A section', '/a', 'forms', true, false, '2d000000-0000-4000-8000-000000000001'),
  ('7d000000-0000-4000-8000-000000000002', '1d000000-0000-4000-8000-000000000002', 'Tenant B section', '/b', 'forms', true, false, '2d000000-0000-4000-8000-000000000002');

insert into public.custom_section_pages (section_id, name, title, route, content, permissions, is_active, sort_order)
values
  ('7d000000-0000-4000-8000-000000000001', 'Tenant A page', 'Tenant A page', '/a/page', '[]'::jsonb, '[]'::jsonb, true, 1),
  ('7d000000-0000-4000-8000-000000000002', 'Tenant B page', 'Tenant B page', '/b/page', '[]'::jsonb, '[]'::jsonb, true, 1);

insert into public.custom_reports (company_id, created_by, name, report_type, filters, columns, chart_config, is_public)
values
  ('1d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', 'Tenant A report', 'forms', '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, false),
  ('1d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000002', 'Tenant B report', 'forms', '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, false);

insert into public.documents (company_id)
values ('1d000000-0000-4000-8000-000000000001'), ('1d000000-0000-4000-8000-000000000002');

insert into public.files (company_id)
values ('1d000000-0000-4000-8000-000000000001'), ('1d000000-0000-4000-8000-000000000002');

insert into public.helpdesk_tickets (company_id, requester_id, assigned_to, department_id, subject, status, priority)
values
  ('1d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', '3d000000-0000-4000-8000-000000000001', 'Tenant A ticket', 'open', 'medium'),
  ('1d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000002', '3d000000-0000-4000-8000-000000000002', 'Tenant B ticket', 'open', 'medium');

insert into public.report_events (company_id, user_id, event_type, severity, occurred_at)
values
  ('1d000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', 'viewed', 'info', now()),
  ('1d000000-0000-4000-8000-000000000002', '2d000000-0000-4000-8000-000000000002', 'viewed', 'info', now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '2d000000-0000-4000-8000-000000000001', true);

select is((select count(*) from public.forms), 1::bigint, 'Tenant A sees own forms');
select is((select count(*) from public.form_fields), 1::bigint, 'Tenant A sees own form fields');
select is((select count(*) from public.form_submissions), 1::bigint, 'Tenant A sees own form submissions');
select is((select count(*) from public.form_access_rules), 1::bigint, 'Tenant A sees own form access rules');
select is((select count(*) from public.form_field_locations), 1::bigint, 'Tenant A sees own form field locations');
select is((select count(*) from public.form_field_ratings), 1::bigint, 'Tenant A sees own form field ratings');
select is((select count(*) from public.form_field_scans), 1::bigint, 'Tenant A sees own form field scans');
select is((select count(*) from public.form_field_signatures), 1::bigint, 'Tenant A sees own form field signatures');
select is((select count(*) from public.form_reviewer_rules), 1::bigint, 'Tenant A sees own form reviewer rules');
select is((select count(*) from public.form_submission_files), 1::bigint, 'Tenant A sees own form submission files');
select is((select count(*) from public.form_submission_reviewers), 1::bigint, 'Tenant A sees own form submission reviewers');
select is((select count(*) from public.custom_sections), 1::bigint, 'Tenant A sees own custom sections');
select is((select count(*) from public.custom_section_pages), 1::bigint, 'Tenant A sees own custom section pages');
select is((select count(*) from public.custom_reports), 1::bigint, 'Tenant A sees own custom reports');
select is((select count(*) from public.documents), 1::bigint, 'Tenant A sees own documents');
select is((select count(*) from public.files), 1::bigint, 'Tenant A sees own files');
select is((select count(*) from public.helpdesk_tickets), 1::bigint, 'Tenant A sees own helpdesk tickets');
select is((select count(*) from public.report_events), 1::bigint, 'Tenant A sees own report events');

select lives_ok(
  $$ insert into public.form_submission_files (field_id, submission_id, file_name, storage_path)
     values ('5d000000-0000-4000-8000-000000000001', '6d000000-0000-4000-8000-000000000001', 'triggered.png', '1d000000-0000-4000-8000-000000000001/forms/triggered.png') $$,
  'Tenant A can insert form submission files and inherit company_id'
);

select is((select count(*) from public.form_submission_files), 2::bigint, 'Triggered form submission file is visible to Tenant A');

select lives_ok(
  $$ insert into public.custom_reports (created_by, name, report_type, filters, columns, chart_config, is_public)
     values ('2d000000-0000-4000-8000-000000000001', 'Triggered report', 'forms', '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, false) $$,
  'Tenant A can insert custom reports and inherit company_id'
);

select is((select count(*) from public.custom_reports), 2::bigint, 'Triggered custom report is visible to Tenant A');

select lives_ok(
  $$ insert into public.helpdesk_tickets (requester_id, subject, status, priority)
     values ('2d000000-0000-4000-8000-000000000001', 'Triggered ticket', 'open', 'medium') $$,
  'Tenant A can insert helpdesk tickets and inherit company_id'
);

select throws_ok(
  $$ insert into public.form_access_rules (form_id, rule_type)
     values ('4d000000-0000-4000-8000-000000000002', 'blocked') $$,
  '42501',
  'new row violates row-level security policy for table "form_access_rules"',
  'Tenant A cannot create access rules for Tenant B forms'
);

select throws_ok(
  $$ insert into public.helpdesk_tickets (requester_id, subject, status, priority)
     values ('2d000000-0000-4000-8000-000000000002', 'Blocked ticket', 'open', 'medium') $$,
  '42501',
  'new row violates row-level security policy for table "helpdesk_tickets"',
  'Tenant A cannot create tickets for Tenant B users'
);

reset role;

select throws_ok(
  $$ insert into public.custom_reports (name, report_type)
     values ('Missing company', 'forms') $$,
  '23514',
  'new row for relation "custom_reports" violates check constraint "custom_reports_company_id_required"',
  'Privileged writes still require custom report company_id'
);

select * from finish();

rollback;
