begin;

create extension if not exists pgtap;

select plan(17);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.ai_recommendation_feedback where company_id in (
  '8a000000-0000-4000-8000-000000000001',
  '8a000000-0000-4000-8000-000000000002'
);
delete from public.ai_scheduling_suggestions where company_id in (
  '8a000000-0000-4000-8000-000000000001',
  '8a000000-0000-4000-8000-000000000002'
);
delete from public.ai_compliance_workflow_suggestions where company_id in (
  '8a000000-0000-4000-8000-000000000001',
  '8a000000-0000-4000-8000-000000000002'
);
delete from public.audit_log where company_id in (
  '8a000000-0000-4000-8000-000000000001',
  '8a000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '8a000000-0000-4000-8000-000000000001',
  '8a000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '8a100000-0000-4000-8000-000000000001',
  '8a100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '8a000000-0000-4000-8000-000000000001',
  '8a000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '8a100000-0000-4000-8000-000000000001',
  '8a100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '8a100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase7-learning-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '8a100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase7-learning-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('8a000000-0000-4000-8000-000000000001', 'Phase 7 Learning Tenant A', 'phase-7-learning-a', '8a100000-0000-4000-8000-000000000001', '8a100000-0000-4000-8000-000000000001', true),
  ('8a000000-0000-4000-8000-000000000002', 'Phase 7 Learning Tenant B', 'phase-7-learning-b', '8a100000-0000-4000-8000-000000000002', '8a100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, employment_status, is_company_admin)
values
  ('8a100000-0000-4000-8000-000000000001', '8a000000-0000-4000-8000-000000000001', 'Learning', 'Owner A', 'phase7-learning-a@example.test', 'owner', 'active', true),
  ('8a100000-0000-4000-8000-000000000002', '8a000000-0000-4000-8000-000000000002', 'Learning', 'Owner B', 'phase7-learning-b@example.test', 'owner', 'active', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('8a000000-0000-4000-8000-000000000001', '8a100000-0000-4000-8000-000000000001', 'owner', now()),
  ('8a000000-0000-4000-8000-000000000002', '8a100000-0000-4000-8000-000000000002', 'owner', now());

insert into public.ai_scheduling_suggestions (
  id,
  company_id,
  prompt_key,
  status,
  suggestion_type,
  priority,
  title,
  rationale,
  suggested_action,
  evidence,
  context_generated_at,
  approved_by,
  approved_at,
  created_by
)
values (
  '8a200000-0000-4000-8000-000000000001',
  '8a000000-0000-4000-8000-000000000001',
  'scheduling_assistant',
  'approved',
  'coverage_gap',
  'medium',
  'Review open shift coverage',
  'Open shift coverage was useful.',
  '{"writes_allowed":false,"requires_human_approval":true}'::jsonb,
  '[{"module":"scheduling","metric":"unassigned_shifts","value":2}]'::jsonb,
  now(),
  '8a100000-0000-4000-8000-000000000001',
  now(),
  '8a100000-0000-4000-8000-000000000001'
);

insert into public.ai_compliance_workflow_suggestions (
  id,
  company_id,
  prompt_key,
  status,
  suggestion_type,
  priority,
  title,
  rationale,
  suggested_action,
  evidence,
  context_generated_at,
  rejected_by,
  rejected_at,
  created_by
)
values
  ('8a300000-0000-4000-8000-000000000001', '8a000000-0000-4000-8000-000000000001', 'compliance_assistant', 'rejected', 'failed_checklist_pattern', 'medium', 'Review failed checklist pattern', 'Wrong context one.', '{"writes_allowed":false,"requires_human_approval":true}'::jsonb, '[{"module":"operations","metric":"failed_steps","value":1}]'::jsonb, now(), '8a100000-0000-4000-8000-000000000001', now(), '8a100000-0000-4000-8000-000000000001'),
  ('8a300000-0000-4000-8000-000000000002', '8a000000-0000-4000-8000-000000000001', 'compliance_assistant', 'rejected', 'failed_checklist_pattern', 'medium', 'Review failed checklist pattern', 'Wrong context two.', '{"writes_allowed":false,"requires_human_approval":true}'::jsonb, '[{"module":"operations","metric":"failed_steps","value":1}]'::jsonb, now(), '8a100000-0000-4000-8000-000000000001', now(), '8a100000-0000-4000-8000-000000000001'),
  ('8a300000-0000-4000-8000-000000000003', '8a000000-0000-4000-8000-000000000001', 'compliance_assistant', 'rejected', 'failed_checklist_pattern', 'medium', 'Review failed checklist pattern', 'Wrong context three.', '{"writes_allowed":false,"requires_human_approval":true}'::jsonb, '[{"module":"operations","metric":"failed_steps","value":1}]'::jsonb, now(), '8a100000-0000-4000-8000-000000000001', now(), '8a100000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '8a100000-0000-4000-8000-000000000001', true);

select has_table('public', 'ai_recommendation_feedback', 'AI recommendation feedback table exists');

select lives_ok(
  $$ select public.record_ai_recommendation_feedback(
    'ai_scheduling_suggestions',
    '8a200000-0000-4000-8000-000000000001',
    'accepted',
    'useful',
    'This was correct.'
  ) $$,
  'tenant admin can record accepted scheduling feedback'
);

select lives_ok(
  $$ select public.record_ai_recommendation_feedback('ai_compliance_workflow_suggestions', '8a300000-0000-4000-8000-000000000001', 'rejected', 'wrong_context', null) $$,
  'tenant admin can record rejected compliance feedback'
);

select lives_ok(
  $$ select public.record_ai_recommendation_feedback('ai_compliance_workflow_suggestions', '8a300000-0000-4000-8000-000000000002', 'rejected', 'wrong_context', null) $$,
  'tenant admin can record second rejected compliance feedback'
);

select lives_ok(
  $$ select public.record_ai_recommendation_feedback('ai_compliance_workflow_suggestions', '8a300000-0000-4000-8000-000000000003', 'rejected', 'wrong_context', null) $$,
  'tenant admin can record third rejected compliance feedback'
);

select is(
  (select count(*) from public.ai_recommendation_feedback_latest_v),
  4::bigint,
  'learning loop records four tenant feedback rows'
);

select is(
  (select reason_code from public.ai_recommendation_feedback_latest_v where source_table = 'ai_scheduling_suggestions'),
  'useful',
  'learning loop captures accepted reason code'
);

select is(
  (select count(*) from public.ai_recommendation_feedback_latest_v where reason_code = 'wrong_context'),
  3::bigint,
  'learning loop captures rejected reason codes'
);

select ok(
  (select bool_and(feedback_scope = 'tenant' and no_cross_tenant_training and learning_fingerprint like company_id::text || ':%') from public.ai_recommendation_feedback_latest_v),
  'learning feedback is tenant-scoped and blocks cross-tenant training'
);

select is(
  (select accepted_count from public.ai_learning_loop_summary_v where prompt_key = 'scheduling_assistant' and suggestion_type = 'coverage_gap'),
  1,
  'learning summary counts accepted scheduling feedback'
);

select is(
  (select rejected_count from public.ai_learning_loop_summary_v where prompt_key = 'compliance_assistant' and suggestion_type = 'failed_checklist_pattern'),
  3,
  'learning summary counts rejected compliance feedback'
);

select is(
  (public.get_ai_learning_adjustment('8a000000-0000-4000-8000-000000000001', 'compliance_assistant', 'failed_checklist_pattern')->>'recommendation'),
  'deprioritize',
  'learning adjustment deprioritizes repeatedly rejected suggestions'
);

select ok(
  ((public.get_ai_learning_adjustment('8a000000-0000-4000-8000-000000000001', 'compliance_assistant', 'failed_checklist_pattern')->>'confidence_adjustment')::numeric < 0),
  'learning adjustment lowers confidence for rejected patterns'
);

select is(
  (select count(*) from public.audit_log where action = 'ai.recommendation_feedback.recorded' and company_id = '8a000000-0000-4000-8000-000000000001'),
  4::bigint,
  'learning feedback writes audit records'
);

select set_config('request.jwt.claim.sub', '8a100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.record_ai_recommendation_feedback('ai_scheduling_suggestions', '8a200000-0000-4000-8000-000000000001', 'accepted', 'useful', null) $$,
  'P0001',
  null,
  'Tenant B cannot record Tenant A learning feedback'
);

select is(
  (select count(*) from public.ai_recommendation_feedback_latest_v),
  0::bigint,
  'Tenant B cannot read Tenant A learning feedback'
);

select throws_ok(
  $$ select public.get_ai_learning_adjustment('8a000000-0000-4000-8000-000000000001', 'scheduling_assistant', 'coverage_gap') $$,
  'P0001',
  null,
  'Tenant B cannot read Tenant A learning adjustment'
);

select * from finish();

rollback;
