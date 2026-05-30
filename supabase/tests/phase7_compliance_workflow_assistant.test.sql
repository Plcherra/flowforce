begin;

create extension if not exists pgtap;

select plan(15);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.ai_compliance_workflow_suggestions where company_id in (
  '7c000000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000002'
);
delete from public.audit_log where company_id in (
  '7c000000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000002'
);
delete from public.ai_governance_policies where company_id in (
  '7c000000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000002'
);
delete from public.training_assignments where company_id in (
  '7c000000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000002'
);
delete from public.workflow_exceptions where company_id in (
  '7c000000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000002'
);
delete from public.workflow_step_instances where company_id in (
  '7c000000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000002'
);
delete from public.task_workflow_instances where company_id in (
  '7c000000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000002'
);
delete from public.workflow_steps where company_id in (
  '7c000000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000002'
);
delete from public.workflows where company_id in (
  '7c000000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '7c000000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '7c100000-0000-4000-8000-000000000001',
  '7c100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '7c000000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '7c100000-0000-4000-8000-000000000001',
  '7c100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '7c100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase7-compliance-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '7c100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase7-compliance-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('7c000000-0000-4000-8000-000000000001', 'Phase 7 Compliance Tenant A', 'phase-7-compliance-a', '7c100000-0000-4000-8000-000000000001', '7c100000-0000-4000-8000-000000000001', true),
  ('7c000000-0000-4000-8000-000000000002', 'Phase 7 Compliance Tenant B', 'phase-7-compliance-b', '7c100000-0000-4000-8000-000000000002', '7c100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, employment_status, is_company_admin)
values
  ('7c100000-0000-4000-8000-000000000001', '7c000000-0000-4000-8000-000000000001', 'Compliance', 'Owner A', 'phase7-compliance-a@example.test', 'owner', 'active', true),
  ('7c100000-0000-4000-8000-000000000002', '7c000000-0000-4000-8000-000000000002', 'Compliance', 'Owner B', 'phase7-compliance-b@example.test', 'owner', 'active', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('7c000000-0000-4000-8000-000000000001', '7c100000-0000-4000-8000-000000000001', 'owner', now()),
  ('7c000000-0000-4000-8000-000000000002', '7c100000-0000-4000-8000-000000000002', 'owner', now());

insert into public.workflows (
  id,
  company_id,
  name,
  workflow_kind,
  template_category,
  status,
  review_required,
  created_by
)
values (
  '7c200000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000001',
  'Phase 7 Compliance Checklist',
  'checklist',
  'compliance',
  'active',
  true,
  '7c100000-0000-4000-8000-000000000001'
);

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
  '7c300000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000001',
  '7c200000-0000-4000-8000-000000000001',
  'Verify safety log',
  1,
  'checklist',
  true,
  true
);

insert into public.task_workflow_instances (
  id,
  company_id,
  workflow_id,
  assigned_to,
  assigned_role,
  status,
  review_status,
  due_at,
  source_type
)
values
  ('7c400000-0000-4000-8000-000000000001', '7c000000-0000-4000-8000-000000000001', '7c200000-0000-4000-8000-000000000001', '7c100000-0000-4000-8000-000000000001', 'manager', 'in_progress', 'pending', now() - interval '2 hours', 'manual'),
  ('7c400000-0000-4000-8000-000000000002', '7c000000-0000-4000-8000-000000000001', '7c200000-0000-4000-8000-000000000001', '7c100000-0000-4000-8000-000000000001', 'manager', 'in_progress', 'pending', now() - interval '1 hour', 'manual');

insert into public.workflow_step_instances (
  id,
  company_id,
  workflow_instance_id,
  step_id,
  status,
  evidence_status
)
values
  ('7c500000-0000-4000-8000-000000000001', '7c000000-0000-4000-8000-000000000001', '7c400000-0000-4000-8000-000000000001', '7c300000-0000-4000-8000-000000000001', 'failed', 'rejected'),
  ('7c500000-0000-4000-8000-000000000002', '7c000000-0000-4000-8000-000000000001', '7c400000-0000-4000-8000-000000000002', '7c300000-0000-4000-8000-000000000001', 'failed', 'rejected');

insert into public.workflow_exceptions (
  id,
  company_id,
  workflow_instance_id,
  step_instance_id,
  workflow_id,
  step_id,
  severity,
  status,
  title,
  description,
  owner_id,
  due_at,
  created_by,
  created_at
)
values
  ('7c600000-0000-4000-8000-000000000001', '7c000000-0000-4000-8000-000000000001', '7c400000-0000-4000-8000-000000000001', '7c500000-0000-4000-8000-000000000001', '7c200000-0000-4000-8000-000000000001', '7c300000-0000-4000-8000-000000000001', 'critical', 'open', 'Safety log failed', 'Safety log was incomplete.', '7c100000-0000-4000-8000-000000000001', now() - interval '1 hour', '7c100000-0000-4000-8000-000000000001', now() - interval '2 days'),
  ('7c600000-0000-4000-8000-000000000002', '7c000000-0000-4000-8000-000000000001', '7c400000-0000-4000-8000-000000000002', '7c500000-0000-4000-8000-000000000002', '7c200000-0000-4000-8000-000000000001', '7c300000-0000-4000-8000-000000000001', 'critical', 'open', 'Safety log failed again', 'Safety log was incomplete again.', '7c100000-0000-4000-8000-000000000001', now() - interval '30 minutes', '7c100000-0000-4000-8000-000000000001', now() - interval '1 day');

insert into public.training_assignments (
  id,
  company_id,
  employee_id,
  module_id,
  assigned_by,
  status,
  due_date
)
values (
  '7c700000-0000-4000-8000-000000000001',
  '7c000000-0000-4000-8000-000000000001',
  '7c100000-0000-4000-8000-000000000001',
  'compliance-safety-log',
  '7c100000-0000-4000-8000-000000000001',
  'assigned',
  current_date + 7
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '7c100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.install_ai_governance_baseline(
    '7c000000-0000-4000-8000-000000000001'
  ) $$,
  'tenant member can install governance before compliance workflow suggestions'
);

select lives_ok(
  $$ select public.refresh_ai_compliance_workflow_suggestions(
    '7c000000-0000-4000-8000-000000000001'
  ) $$,
  'tenant member can refresh compliance workflow suggestions'
);

select ok(
  (select count(*)::integer >= 3 from public.ai_compliance_workflow_suggestions_latest_v),
  'compliance workflow assistant creates multiple suggestions from execution signals'
);

select ok(
  exists (
    select 1
    from public.ai_compliance_workflow_suggestions_latest_v
    where suggestion_type = 'overdue_workflow'
  ),
  'compliance assistant detects overdue workflows'
);

select ok(
  exists (
    select 1
    from public.ai_compliance_workflow_suggestions_latest_v
    where suggestion_type = 'failed_checklist_pattern'
  ),
  'compliance assistant detects failed checklist patterns'
);

select ok(
  exists (
    select 1
    from public.ai_compliance_workflow_suggestions_latest_v
    where suggestion_type = 'training_followup'
  ),
  'compliance assistant suggests training follow-ups'
);

select is(
  (
    select bool_and(status = 'pending_review')
    from public.ai_compliance_workflow_suggestions_latest_v
  ),
  true,
  'compliance workflow suggestions are pending manager review'
);

select is(
  (
    select bool_and(approval_required and not direct_write_executed)
    from public.ai_compliance_workflow_suggestions_latest_v
  ),
  true,
  'compliance workflow suggestions do not execute direct writes'
);

select ok(
  (
    select bool_and(evidence::text like '%/app/operations%')
    from public.ai_compliance_workflow_suggestions_latest_v
  ),
  'compliance workflow suggestions include source metric links'
);

select ok(
  (
    select bool_and(suggested_action->>'writes_allowed' = 'false')
    from public.ai_compliance_workflow_suggestions_latest_v
  ),
  'compliance workflow suggested actions are read-only until approval'
);

select lives_ok(
  $$ select public.review_ai_compliance_workflow_suggestion(
    (
      select id
      from public.ai_compliance_workflow_suggestions_latest_v
      where suggestion_type = 'overdue_workflow'
      limit 1
    ),
    'approved',
    'Manager reviewed overdue workflow.'
  ) $$,
  'manager can approve compliance workflow suggestion without writing task rows'
);

select is(
  (
    select direct_write_executed
    from public.ai_compliance_workflow_suggestions_latest_v
    where status = 'approved'
    limit 1
  ),
  false,
  'approved compliance workflow suggestion still does not write rows'
);

select is(
  (
    select count(*)::integer
    from public.audit_log
    where company_id = '7c000000-0000-4000-8000-000000000001'
      and action in ('ai.compliance_workflow_suggestion.created', 'ai.compliance_workflow_suggestion.approved')
  ),
  2,
  'compliance workflow suggestion refresh and approval are audited'
);

select set_config('request.jwt.claim.sub', '7c100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.refresh_ai_compliance_workflow_suggestions(
    '7c000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001',
  'Not allowed to refresh compliance workflow suggestions for this company',
  'Tenant B cannot refresh Tenant A compliance workflow suggestions'
);

select throws_ok(
  $$ select public.refresh_ai_compliance_workflow_suggestions(
    '7c000000-0000-4000-8000-000000000002'
  ) $$,
  'P0001',
  'AI governance baseline is required before context fetch',
  'compliance workflow suggestions require governance before refresh'
);

select * from finish();

rollback;
