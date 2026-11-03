begin;

create extension if not exists pgtap;

select plan(18);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.workflow_reviews where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.workflow_evidence where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.workflow_assignments where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.task_workflow_instances where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.workflows where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.company_update_comments where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.company_updates where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.documents where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.performance_reviews where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.time_off_requests where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.inv_items where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.form_submissions where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.forms where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.messages where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.channel_members where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.message_channels where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.company_roles where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.company_members where company_id = 'b22e0000-0000-4000-8000-000000000001';
delete from public.profiles where id in (
  'b22e0000-0000-4000-8000-000000000020',
  'b22e0000-0000-4000-8000-000000000030'
);
delete from public.companies where id = 'b22e0000-0000-4000-8000-000000000001';
delete from auth.users where id in (
  'b22e0000-0000-4000-8000-000000000020',
  'b22e0000-0000-4000-8000-000000000030'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
values
  ('00000000-0000-0000-0000-000000000000', 'b22e0000-0000-4000-8000-000000000020', 'authenticated', 'authenticated', 'access-manager@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', 'b22e0000-0000-4000-8000-000000000030', 'authenticated', 'authenticated', 'access-staff@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values (
  'b22e0000-0000-4000-8000-000000000001',
  'Feature Access Co',
  'feature-access-co',
  'b22e0000-0000-4000-8000-000000000020',
  'b22e0000-0000-4000-8000-000000000020',
  true
);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('b22e0000-0000-4000-8000-000000000020', 'b22e0000-0000-4000-8000-000000000001', 'Access', 'Manager', 'access-manager@example.test', 'manager', false),
  ('b22e0000-0000-4000-8000-000000000030', 'b22e0000-0000-4000-8000-000000000001', 'Access', 'Staff', 'access-staff@example.test', 'staff', false);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('b22e0000-0000-4000-8000-000000000001', 'b22e0000-0000-4000-8000-000000000020', 'manager', now()),
  ('b22e0000-0000-4000-8000-000000000001', 'b22e0000-0000-4000-8000-000000000030', 'staff', now());

insert into public.company_roles (
  id, company_id, name, hierarchy_level, product_level, permissions, is_system_role, is_active
)
values
  ('b22e0000-0000-4000-8000-000000000041', 'b22e0000-0000-4000-8000-000000000001', 'Staff', 1, 'staff', '{}'::jsonb, true, true),
  ('b22e0000-0000-4000-8000-000000000042', 'b22e0000-0000-4000-8000-000000000001', 'Manager', 2, 'manager', '{}'::jsonb, true, true);

update public.profiles
set role_id = 'b22e0000-0000-4000-8000-000000000041'
where id = 'b22e0000-0000-4000-8000-000000000030';

update public.profiles
set role_id = 'b22e0000-0000-4000-8000-000000000042'
where id = 'b22e0000-0000-4000-8000-000000000020';

insert into public.forms (id, company_id, title, created_by, status)
values (
  'b22e0000-0000-4000-8000-000000000051',
  'b22e0000-0000-4000-8000-000000000001',
  'Opening form',
  'b22e0000-0000-4000-8000-000000000020',
  'published'
);

insert into public.form_submissions (id, company_id, form_id, submitted_by, submission_data, submitted_at)
values (
  'b22e0000-0000-4000-8000-000000000052',
  'b22e0000-0000-4000-8000-000000000001',
  'b22e0000-0000-4000-8000-000000000051',
  'b22e0000-0000-4000-8000-000000000020',
  '{"answer":"manager"}'::jsonb,
  now()
);

insert into public.message_channels (id, company_id, name, type, created_by)
values (
  'b22e0000-0000-4000-8000-000000000061',
  'b22e0000-0000-4000-8000-000000000001',
  'Managers',
  'team',
  'b22e0000-0000-4000-8000-000000000020'
);

insert into public.channel_members (company_id, channel_id, user_id, role)
values (
  'b22e0000-0000-4000-8000-000000000001',
  'b22e0000-0000-4000-8000-000000000061',
  'b22e0000-0000-4000-8000-000000000020',
  'admin'
);

insert into public.messages (id, company_id, channel_id, sender_id, content)
values (
  'b22e0000-0000-4000-8000-000000000062',
  'b22e0000-0000-4000-8000-000000000001',
  'b22e0000-0000-4000-8000-000000000061',
  'b22e0000-0000-4000-8000-000000000020',
  'Manager only'
);

insert into public.company_updates (id, company_id, title, body, status, author_id)
values (
  'b22e0000-0000-4000-8000-000000000071',
  'b22e0000-0000-4000-8000-000000000001',
  'Published note',
  'Hello',
  'published',
  'b22e0000-0000-4000-8000-000000000020'
);

insert into public.performance_reviews (id, company_id, employee_id)
values
  ('b22e0000-0000-4000-8000-000000000081', 'b22e0000-0000-4000-8000-000000000001', 'b22e0000-0000-4000-8000-000000000030'),
  ('b22e0000-0000-4000-8000-000000000082', 'b22e0000-0000-4000-8000-000000000001', 'b22e0000-0000-4000-8000-000000000020');

insert into public.workflows (id, company_id, name, workflow_kind, status, created_by)
values (
  'b22e0000-0000-4000-8000-000000000091',
  'b22e0000-0000-4000-8000-000000000001',
  'Opening',
  'checklist',
  'active',
  'b22e0000-0000-4000-8000-000000000020'
);

insert into public.task_workflow_instances (
  id, company_id, workflow_id, assigned_to, status, review_status
)
values (
  'b22e0000-0000-4000-8000-000000000092',
  'b22e0000-0000-4000-8000-000000000001',
  'b22e0000-0000-4000-8000-000000000091',
  'b22e0000-0000-4000-8000-000000000030',
  'in_progress',
  'pending'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'b22e0000-0000-4000-8000-000000000030', true);

select is(
  (select count(*) from public.form_submissions where id = 'b22e0000-0000-4000-8000-000000000052'),
  0::bigint,
  'Staff cannot read another person''s form submission'
);

select throws_ok(
  $$ insert into public.forms (company_id, title, created_by, status)
     values (
       'b22e0000-0000-4000-8000-000000000001',
       'Staff template',
       'b22e0000-0000-4000-8000-000000000030',
       'draft'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "forms"',
  'Staff cannot create a form template'
);

select lives_ok(
  $$ insert into public.form_submissions (company_id, form_id, submitted_by, submission_data, submitted_at)
     values (
       'b22e0000-0000-4000-8000-000000000001',
       'b22e0000-0000-4000-8000-000000000051',
       'b22e0000-0000-4000-8000-000000000030',
       '{"answer":"staff"}'::jsonb,
       now()
     ) $$,
  'Staff can submit their own form'
);

select is(
  (select count(*) from public.messages where id = 'b22e0000-0000-4000-8000-000000000062'),
  0::bigint,
  'Staff cannot read a message in a channel they have not joined'
);

select throws_ok(
  $$ insert into public.company_updates (company_id, title, body, status, author_id)
     values (
       'b22e0000-0000-4000-8000-000000000001',
       'Staff post',
       'No',
       'published',
       'b22e0000-0000-4000-8000-000000000030'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "company_updates"',
  'Staff cannot publish a company update'
);

select lives_ok(
  $$ insert into public.company_update_comments (company_id, update_id, author_id, content)
     values (
       'b22e0000-0000-4000-8000-000000000001',
       'b22e0000-0000-4000-8000-000000000071',
       'b22e0000-0000-4000-8000-000000000030',
       'Seen'
     ) $$,
  'Staff can comment on a published update'
);

select lives_ok(
  $$ insert into public.time_off_requests (company_id, user_id, start_date, end_date, type, status)
     values (
       'b22e0000-0000-4000-8000-000000000001',
       'b22e0000-0000-4000-8000-000000000030',
       current_date,
       current_date + 1,
       'vacation',
       'pending'
     ) $$,
  'Staff can request their own time off'
);

select throws_ok(
  $$ update public.time_off_requests
     set status = 'approved'
     where user_id = 'b22e0000-0000-4000-8000-000000000030' $$,
  '42501',
  'new row violates row-level security policy for table "time_off_requests"',
  'Staff cannot approve their own time off'
);

select is(
  (select count(*) from public.performance_reviews),
  1::bigint,
  'Staff see only their own performance review'
);

select throws_ok(
  $$ insert into public.documents (company_id)
     values ('b22e0000-0000-4000-8000-000000000001') $$,
  '42501',
  'new row violates row-level security policy for table "documents"',
  'Staff cannot upload a document'
);

select throws_ok(
  $$ insert into public.inv_items (company_id, name, created_by)
     values (
       'b22e0000-0000-4000-8000-000000000001',
       'Staff item',
       'b22e0000-0000-4000-8000-000000000030'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "inv_items"',
  'Staff cannot create an inventory item'
);

select throws_ok(
  $$ insert into public.workflow_assignments (company_id, workflow_id, assignment_type)
     values (
       'b22e0000-0000-4000-8000-000000000001',
       'b22e0000-0000-4000-8000-000000000091',
       'role'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "workflow_assignments"',
  'Staff cannot assign a workflow'
);

select lives_ok(
  $$ insert into public.workflow_evidence (
       company_id, workflow_id, evidence_type, value, captured_by
     )
     values (
       'b22e0000-0000-4000-8000-000000000001',
       'b22e0000-0000-4000-8000-000000000091',
       'note',
       '{"ok":true}'::jsonb,
       'b22e0000-0000-4000-8000-000000000030'
     ) $$,
  'Staff can submit their own workflow evidence'
);

select throws_ok(
  $$ insert into public.workflow_reviews (company_id, workflow_instance_id, review_status, reviewer_id)
     values (
       'b22e0000-0000-4000-8000-000000000001',
       'b22e0000-0000-4000-8000-000000000092',
       'pending',
       'b22e0000-0000-4000-8000-000000000030'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "workflow_reviews"',
  'Staff cannot write a workflow review'
);

select set_config('request.jwt.claim.sub', 'b22e0000-0000-4000-8000-000000000020', true);

select is(
  (select count(*) from public.performance_reviews),
  2::bigint,
  'Manager can read the team''s performance reviews'
);

select lives_ok(
  $$ update public.time_off_requests
     set status = 'approved',
         approved_by = 'b22e0000-0000-4000-8000-000000000020'
     where user_id = 'b22e0000-0000-4000-8000-000000000030' $$,
  'Manager can approve time off'
);

select lives_ok(
  $$ insert into public.documents (company_id)
     values ('b22e0000-0000-4000-8000-000000000001') $$,
  'Manager can upload a document'
);

select lives_ok(
  $$ insert into public.inv_items (company_id, name, created_by)
     values (
       'b22e0000-0000-4000-8000-000000000001',
       'Manager item',
       'b22e0000-0000-4000-8000-000000000020'
     ) $$,
  'Manager can create an inventory item'
);

select lives_ok(
  $$ insert into public.workflow_assignments (company_id, workflow_id, assignment_type)
     values (
       'b22e0000-0000-4000-8000-000000000001',
       'b22e0000-0000-4000-8000-000000000091',
       'role'
     ) $$,
  'Manager can assign a workflow'
);

select * from finish();

rollback;
