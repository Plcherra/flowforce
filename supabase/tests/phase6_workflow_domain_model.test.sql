begin;

create extension if not exists pgtap;

select plan(13);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.workflow_exceptions where company_id in (
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002'
);
delete from public.workflow_reviews where company_id in (
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002'
);
delete from public.workflow_evidence where company_id in (
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002'
);
delete from public.workflow_assignments where company_id in (
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002'
);
delete from public.workflow_step_instances where company_id in (
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002'
);
delete from public.task_workflow_instances where company_id in (
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002'
);
delete from public.workflow_steps where company_id in (
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002'
);
delete from public.workflows where company_id in (
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '61100000-0000-4000-8000-000000000001',
  '61100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '61100000-0000-4000-8000-000000000001',
  '61100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '61100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase6-workflow-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '61100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase6-workflow-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('61000000-0000-4000-8000-000000000001', 'Phase 6 Workflow Tenant A', 'phase-6-workflow-a', '61100000-0000-4000-8000-000000000001', '61100000-0000-4000-8000-000000000001', true),
  ('61000000-0000-4000-8000-000000000002', 'Phase 6 Workflow Tenant B', 'phase-6-workflow-b', '61100000-0000-4000-8000-000000000002', '61100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('61100000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'Workflow', 'Owner A', 'phase6-workflow-a@example.test', 'owner', true),
  ('61100000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000002', 'Workflow', 'Owner B', 'phase6-workflow-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('61000000-0000-4000-8000-000000000001', '61100000-0000-4000-8000-000000000001', 'owner', now()),
  ('61000000-0000-4000-8000-000000000002', '61100000-0000-4000-8000-000000000002', 'owner', now());

select ok(
  (
    select bool_and(relrowsecurity)
    from pg_class
    where oid in (
      'public.workflows'::regclass,
      'public.workflow_steps'::regclass,
      'public.task_workflow_instances'::regclass,
      'public.workflow_step_instances'::regclass,
      'public.workflow_assignments'::regclass,
      'public.workflow_evidence'::regclass,
      'public.workflow_reviews'::regclass,
      'public.workflow_exceptions'::regclass
    )
  ),
  'all workflow domain tables have RLS enabled'
);

select ok(
  exists (
    select 1
    from information_schema.views
    where table_schema = 'public'
      and table_name = 'workflow_domain_model_v'
  ),
  'workflow domain model view exists'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workflows'
      and column_name = 'company_id'
  ),
  'workflows carries company_id'
);

insert into public.workflows (
  id,
  company_id,
  name,
  workflow_kind,
  template_category,
  status,
  is_template,
  review_required,
  created_by
)
values
  ('61200000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'Opening Checklist', 'checklist', 'opening', 'active', true, true, '61100000-0000-4000-8000-000000000001'),
  ('61200000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000002', 'Closing Checklist', 'checklist', 'closing', 'active', true, false, '61100000-0000-4000-8000-000000000002');

insert into public.workflow_steps (
  id,
  company_id,
  workflow_id,
  name,
  step_number,
  step_type,
  required,
  evidence_required
)
values (
  '61300000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  '61200000-0000-4000-8000-000000000001',
  'Check sanitizer temperature',
  1,
  'measurement',
  true,
  true
);

insert into public.workflow_assignments (
  id,
  company_id,
  workflow_id,
  assignment_type,
  assigned_to,
  created_by
)
values (
  '61400000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  '61200000-0000-4000-8000-000000000001',
  'person',
  '61100000-0000-4000-8000-000000000001',
  '61100000-0000-4000-8000-000000000001'
);

insert into public.task_workflow_instances (
  id,
  company_id,
  workflow_id,
  assigned_to,
  status,
  due_at,
  review_status
)
values (
  '61500000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  '61200000-0000-4000-8000-000000000001',
  '61100000-0000-4000-8000-000000000001',
  'in_progress',
  now() + interval '2 hours',
  'pending'
);

insert into public.workflow_step_instances (
  id,
  company_id,
  workflow_instance_id,
  step_id,
  status,
  evidence_status
)
values (
  '61600000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  '61500000-0000-4000-8000-000000000001',
  '61300000-0000-4000-8000-000000000001',
  'completed',
  'complete'
);

insert into public.workflow_evidence (
  id,
  company_id,
  workflow_instance_id,
  step_instance_id,
  workflow_id,
  step_id,
  evidence_type,
  value,
  captured_by
)
values (
  '61700000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  '61500000-0000-4000-8000-000000000001',
  '61600000-0000-4000-8000-000000000001',
  '61200000-0000-4000-8000-000000000001',
  '61300000-0000-4000-8000-000000000001',
  'measurement',
  '{"temperature": 72}'::jsonb,
  '61100000-0000-4000-8000-000000000001'
);

insert into public.workflow_reviews (
  id,
  company_id,
  workflow_instance_id,
  review_status,
  reviewer_id
)
values (
  '61800000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  '61500000-0000-4000-8000-000000000001',
  'pending',
  '61100000-0000-4000-8000-000000000001'
);

insert into public.workflow_exceptions (
  id,
  company_id,
  workflow_instance_id,
  step_instance_id,
  workflow_id,
  step_id,
  title,
  severity,
  status,
  owner_id,
  created_by
)
values (
  '61900000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  '61500000-0000-4000-8000-000000000001',
  '61600000-0000-4000-8000-000000000001',
  '61200000-0000-4000-8000-000000000001',
  '61300000-0000-4000-8000-000000000001',
  'Sanitizer reading needs review',
  'warning',
  'open',
  '61100000-0000-4000-8000-000000000001',
  '61100000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '61100000-0000-4000-8000-000000000001', true);

select is((select count(*) from public.workflows), 1::bigint, 'Tenant A reads only own workflows');
select is((select count(*) from public.workflow_steps), 1::bigint, 'Tenant A reads own workflow steps');
select is((select count(*) from public.workflow_assignments), 1::bigint, 'Tenant A reads own workflow assignments');
select is((select count(*) from public.task_workflow_instances), 1::bigint, 'Tenant A reads own workflow runs');
select is((select count(*) from public.workflow_step_instances), 1::bigint, 'Tenant A reads own step runs');
select is((select count(*) from public.workflow_evidence), 1::bigint, 'Tenant A reads own evidence');
select is((select count(*) from public.workflow_reviews), 1::bigint, 'Tenant A reads own reviews');
select is((select count(*) from public.workflow_exceptions), 1::bigint, 'Tenant A reads own exceptions');

select is(
  (select open_exception_count from public.workflow_domain_model_v where workflow_id = '61200000-0000-4000-8000-000000000001'),
  1::integer,
  'workflow domain view summarizes open exceptions'
);

select throws_ok(
  $$ insert into public.workflow_assignments (company_id, workflow_id, assignment_type)
     values ('61000000-0000-4000-8000-000000000001', '61200000-0000-4000-8000-000000000002', 'role') $$,
  '42501',
  'new row violates row-level security policy for table "workflow_assignments"',
  'Tenant A cannot assign a Tenant B workflow'
);

select * from finish();

rollback;
