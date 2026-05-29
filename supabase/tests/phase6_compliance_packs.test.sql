begin;

create extension if not exists pgtap;

select plan(14);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.audit_log where company_id in (
  '67000000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000002'
);
delete from public.workflow_compliance_audit_exports where company_id in (
  '67000000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000002'
);
delete from public.workflow_compliance_packs where company_id in (
  '67000000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000002'
);
delete from public.workflow_exceptions where company_id in (
  '67000000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000002'
);
delete from public.workflow_evidence where company_id in (
  '67000000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000002'
);
delete from public.workflow_step_instances where company_id in (
  '67000000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000002'
);
delete from public.task_workflow_instances where company_id in (
  '67000000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000002'
);
delete from public.workflow_steps where company_id in (
  '67000000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000002'
);
delete from public.workflows where company_id in (
  '67000000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '67000000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '67100000-0000-4000-8000-000000000001',
  '67100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '67000000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '67100000-0000-4000-8000-000000000001',
  '67100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '67100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase6-compliance-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '67100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase6-compliance-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('67000000-0000-4000-8000-000000000001', 'Phase 6 Compliance Tenant A', 'phase-6-compliance-a', '67100000-0000-4000-8000-000000000001', '67100000-0000-4000-8000-000000000001', true),
  ('67000000-0000-4000-8000-000000000002', 'Phase 6 Compliance Tenant B', 'phase-6-compliance-b', '67100000-0000-4000-8000-000000000002', '67100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('67100000-0000-4000-8000-000000000001', '67000000-0000-4000-8000-000000000001', 'Compliance', 'Manager A', 'phase6-compliance-a@example.test', 'manager', true),
  ('67100000-0000-4000-8000-000000000002', '67000000-0000-4000-8000-000000000002', 'Compliance', 'Manager B', 'phase6-compliance-b@example.test', 'manager', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('67000000-0000-4000-8000-000000000001', '67100000-0000-4000-8000-000000000001', 'admin', now()),
  ('67000000-0000-4000-8000-000000000002', '67100000-0000-4000-8000-000000000002', 'admin', now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '67100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.install_compliance_pack(
    '67000000-0000-4000-8000-000000000001',
    'food_safety'
  ) $$,
  'tenant manager can install a food safety compliance pack'
);

select is(
  (select count(*) from public.workflow_compliance_packs where pack_key = 'food_safety'),
  1::bigint,
  'compliance pack row is installed'
);

select is(
  (select count(*) from public.workflows where compliance_pack = 'food_safety' and is_template),
  1::bigint,
  'install creates one template workflow'
);

select is(
  (select count(*) from public.workflow_steps where workflow_id = (select id::text from public.workflows where compliance_pack = 'food_safety')),
  3::bigint,
  'install creates the compliance checklist steps'
);

select is(
  (select count(*) from public.workflow_steps where evidence_required and step_type = 'compliance_evidence'),
  3::bigint,
  'installed compliance steps require evidence'
);

insert into public.task_workflow_instances (
  id,
  company_id,
  workflow_id,
  assigned_to,
  status,
  review_status,
  due_at,
  completed_at
)
values (
  '67300000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000001',
  (select id::text from public.workflows where compliance_pack = 'food_safety'),
  '67100000-0000-4000-8000-000000000001',
  'completed',
  'pending',
  now() - interval '1 hour',
  now()
);

insert into public.workflow_evidence (
  id,
  company_id,
  workflow_instance_id,
  workflow_id,
  evidence_type,
  value,
  captured_by,
  retention_until
)
values (
  '67400000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000001',
  '67300000-0000-4000-8000-000000000001',
  (select id from public.workflows where compliance_pack = 'food_safety'),
  'temperature_log',
  '{"temperature": 38}'::jsonb,
  '67100000-0000-4000-8000-000000000001',
  current_date + 30
);

select is(
  (select compliance_pack from public.workflow_evidence where id = '67400000-0000-4000-8000-000000000001'),
  'food_safety',
  'evidence inherits compliance pack from workflow'
);

select is(
  (select retention_class from public.workflow_evidence where id = '67400000-0000-4000-8000-000000000001'),
  'compliance_record',
  'evidence is promoted to compliance record retention'
);

select ok(
  (select retention_until >= current_date + 2555 from public.workflow_evidence where id = '67400000-0000-4000-8000-000000000001'),
  'evidence retention extends to pack retention window'
);

insert into public.workflow_exceptions (
  id,
  company_id,
  workflow_instance_id,
  workflow_id,
  title,
  severity,
  status,
  created_by
)
values (
  '67500000-0000-4000-8000-000000000001',
  '67000000-0000-4000-8000-000000000001',
  '67300000-0000-4000-8000-000000000001',
  (select id from public.workflows where compliance_pack = 'food_safety'),
  'Cooler corrective action required',
  'critical',
  'open',
  '67100000-0000-4000-8000-000000000001'
);

select is(
  (select total_runs from public.operations_compliance_dashboard_v where pack_key = 'food_safety'),
  1,
  'compliance dashboard counts workflow runs'
);

select is(
  (select evidence_count from public.operations_compliance_dashboard_v where pack_key = 'food_safety'),
  1,
  'compliance dashboard counts evidence records'
);

select is(
  (select open_exceptions from public.operations_compliance_dashboard_v where pack_key = 'food_safety'),
  1,
  'compliance dashboard counts open exceptions'
);

select lives_ok(
  $$ select public.create_compliance_audit_export(
    '67000000-0000-4000-8000-000000000001',
    'food_safety',
    current_date - 30,
    current_date
  ) $$,
  'manager can create a compliance audit export'
);

select ok(
  (
    select jsonb_array_length(snapshot -> 'runs') = 1
      and jsonb_array_length(snapshot -> 'evidence') = 1
      and jsonb_array_length(snapshot -> 'exceptions') = 1
    from public.workflow_compliance_audit_exports
    where pack_key = 'food_safety'
    limit 1
  ),
  'audit export snapshot includes runs, evidence, and exceptions'
);

select set_config('request.jwt.claim.sub', '67100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.create_compliance_audit_export(
    '67000000-0000-4000-8000-000000000001',
    'food_safety',
    current_date - 30,
    current_date
  ) $$,
  '42501',
  null,
  'Tenant B cannot export Tenant A compliance data'
);

select * from finish();

rollback;
