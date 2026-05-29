begin;

create extension if not exists pgtap;

select plan(10);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.workflow_assignments where company_id in (
  '62000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000002'
);
delete from public.workflow_steps where company_id in (
  '62000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000002'
);
delete from public.workflows where company_id in (
  '62000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000002'
);
delete from public.form_fields where company_id in (
  '62000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000002'
);
delete from public.forms where company_id in (
  '62000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '62000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '62100000-0000-4000-8000-000000000001',
  '62100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '62000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '62100000-0000-4000-8000-000000000001',
  '62100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '62100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase6-builder-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '62100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase6-builder-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('62000000-0000-4000-8000-000000000001', 'Phase 6 Builder Tenant A', 'phase-6-builder-a', '62100000-0000-4000-8000-000000000001', '62100000-0000-4000-8000-000000000001', true),
  ('62000000-0000-4000-8000-000000000002', 'Phase 6 Builder Tenant B', 'phase-6-builder-b', '62100000-0000-4000-8000-000000000002', '62100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('62100000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001', 'Builder', 'Owner A', 'phase6-builder-a@example.test', 'owner', true),
  ('62100000-0000-4000-8000-000000000002', '62000000-0000-4000-8000-000000000002', 'Builder', 'Owner B', 'phase6-builder-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('62000000-0000-4000-8000-000000000001', '62100000-0000-4000-8000-000000000001', 'owner', now()),
  ('62000000-0000-4000-8000-000000000002', '62100000-0000-4000-8000-000000000002', 'owner', now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '62100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.create_sop_checklist_template(
    '62000000-0000-4000-8000-000000000001',
    '{
      "name": "Opening Checklist",
      "description": "Opening routine",
      "template_category": "opening",
      "workflow_kind": "checklist",
      "assignment_type": "role",
      "review_required": true,
      "schedule_rule": {"frequency": "daily"},
      "due_window": {"due_minutes_before": 15},
      "escalation_rule": {"overdue_minutes": 10},
      "steps": [
        {
          "label": "Record cooler temperature",
          "step_type": "measurement",
          "field_type": "number",
          "required": true,
          "evidence_required": true
        },
        {
          "label": "Manager signature",
          "step_type": "signature",
          "field_type": "signature",
          "required": true,
          "evidence_required": true
        }
      ]
    }'::jsonb
  ) $$,
  'Tenant A can create an SOP checklist template'
);

select is((select count(*) from public.forms), 1::bigint, 'published form is created');
select is((select count(*) from public.form_fields), 2::bigint, 'form fields are created');
select is((select count(*) from public.workflows), 1::bigint, 'workflow template is created');
select is((select count(*) from public.workflow_steps), 2::bigint, 'workflow steps are created');
select is((select count(*) from public.workflow_assignments), 1::bigint, 'assignment rule is created');

select is(
  (
    select count(*)
    from public.workflow_steps step
    join public.form_fields field
      on field.id = step.form_field_id
      and field.company_id = step.company_id
  ),
  2::bigint,
  'workflow steps are linked to generated form fields'
);

select is(
  (select step_count from public.sop_checklist_builder_templates_v limit 1),
  2::integer,
  'builder template view exposes step count'
);

select throws_ok(
  $$ select public.create_sop_checklist_template(
    '62000000-0000-4000-8000-000000000002',
    '{"name":"Blocked","steps":[{"label":"Blocked step"}]}'::jsonb
  ) $$,
  '42501',
  null,
  'Tenant B cannot call builder for Tenant A'
);

select throws_ok(
  $$ select public.create_sop_checklist_template(
    '62000000-0000-4000-8000-000000000001',
    '{"name":"Missing steps","steps":[]}'::jsonb
  ) $$,
  '22023',
  null,
  'builder rejects templates without steps'
);

select * from finish();

rollback;
