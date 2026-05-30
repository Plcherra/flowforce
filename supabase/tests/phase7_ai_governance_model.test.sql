begin;

create extension if not exists pgtap;

select plan(14);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.ai_governance_policies where company_id in (
  '7a000000-0000-4000-8000-000000000001',
  '7a000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '7a000000-0000-4000-8000-000000000001',
  '7a000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '7a100000-0000-4000-8000-000000000001',
  '7a100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '7a000000-0000-4000-8000-000000000001',
  '7a000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '7a100000-0000-4000-8000-000000000001',
  '7a100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '7a100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase7-ai-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '7a100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase7-ai-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('7a000000-0000-4000-8000-000000000001', 'Phase 7 AI Tenant A', 'phase-7-ai-a', '7a100000-0000-4000-8000-000000000001', '7a100000-0000-4000-8000-000000000001', true),
  ('7a000000-0000-4000-8000-000000000002', 'Phase 7 AI Tenant B', 'phase-7-ai-b', '7a100000-0000-4000-8000-000000000002', '7a100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('7a100000-0000-4000-8000-000000000001', '7a000000-0000-4000-8000-000000000001', 'AI', 'Owner A', 'phase7-ai-a@example.test', 'owner', true),
  ('7a100000-0000-4000-8000-000000000002', '7a000000-0000-4000-8000-000000000002', 'AI', 'Owner B', 'phase7-ai-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('7a000000-0000-4000-8000-000000000001', '7a100000-0000-4000-8000-000000000001', 'owner', now()),
  ('7a000000-0000-4000-8000-000000000002', '7a100000-0000-4000-8000-000000000002', 'owner', now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '7a100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.install_ai_governance_baseline(
    '7a000000-0000-4000-8000-000000000001'
  ) $$,
  'tenant admin can install AI governance baseline'
);

select is(
  (select governance_policies from public.ai_governance_readiness_v),
  4,
  'readiness view counts four AI governance policies'
);

select ok((select has_read_only_insight from public.ai_governance_readiness_v), 'read-only insight level exists');
select ok((select has_suggested_action from public.ai_governance_readiness_v), 'suggested action level exists');
select ok((select has_approved_action from public.ai_governance_readiness_v), 'approved action level exists');
select ok((select has_automated_action from public.ai_governance_readiness_v), 'automated action level exists');
select ok((select blocks_sensitive_data from public.ai_governance_readiness_v), 'sensitive data classes are blocked');
select ok((select has_audit_events from public.ai_governance_readiness_v), 'AI governance policies declare audit events');
select ok((select ready_for_ai_phase_two from public.ai_governance_readiness_v), 'AI governance is ready for phase 07.02');

select is(
  (
    select requires_human_approval
    from public.ai_governance_policies
    where action_level = 'approved_action'
  ),
  true,
  'approved actions require human approval'
);

select is(
  (
    select allows_background_automation
    from public.ai_governance_policies
    where action_level = 'read_only_insight'
  ),
  false,
  'read-only insights cannot run background automation'
);

select throws_ok(
  $$ update public.ai_governance_policies
     set blocked_data_classes = array[]::text[]
     where company_id = '7a000000-0000-4000-8000-000000000001'
       and policy_key = 'suggested_action' $$,
  '42501',
  'permission denied for table ai_governance_policies',
  'tenant users cannot directly weaken AI governance policies'
);

select lives_ok(
  $$ select public.install_ai_governance_baseline(
    '7a000000-0000-4000-8000-000000000001'
  ) $$,
  'AI governance baseline installer is idempotent'
);

select set_config('request.jwt.claim.sub', '7a100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.install_ai_governance_baseline(
    '7a000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001',
  'Not allowed to install AI governance for this company',
  'Tenant B cannot install Tenant A AI governance baseline'
);

select * from finish();

rollback;
