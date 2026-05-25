begin;

create extension if not exists pgtap;

select plan(24);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.goal_rewards where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.goals where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.kpi_insights where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.idea_actions where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.idea_cycles where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.ops_automation_suggestions where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.ops_issues where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.ops_kpi_snapshots where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.performance_reviews where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.daily_insights where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.engagement_scores where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.documents where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.vendor_visits where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.gamification_leaderboard where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.gamification_xp where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.badge_catalog where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.employee_certifications where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.learning_completions where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.training_assignments where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.recognition_award_rules where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.recognition_events where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.company_members where company_id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from public.profiles where id in ('23000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000002');
delete from public.companies where id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002');
delete from auth.users where id in ('23000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000002');

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
  ('00000000-0000-0000-0000-000000000000', '23000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase6-owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '23000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase6-owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('13000000-0000-4000-8000-000000000001', 'Phase 6 Tenant A', 'phase-6-tenant-a', '23000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', true),
  ('13000000-0000-4000-8000-000000000002', 'Phase 6 Tenant B', 'phase-6-tenant-b', '23000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('23000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'Phase', 'Six A', 'phase6-owner-a@example.test', 'owner', true),
  ('23000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000002', 'Phase', 'Six B', 'phase6-owner-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'owner', now()),
  ('13000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000002', 'owner', now());

insert into public.kpi_insights (company_id, metric, label, value) values
  ('13000000-0000-4000-8000-000000000001', 'sales', 'Sales A', 1),
  ('13000000-0000-4000-8000-000000000002', 'sales', 'Sales B', 2);
insert into public.idea_actions (company_id, title, status) values
  ('13000000-0000-4000-8000-000000000001', 'Action A', 'pending'),
  ('13000000-0000-4000-8000-000000000002', 'Action B', 'pending');
insert into public.idea_cycles (company_id, title, status) values
  ('13000000-0000-4000-8000-000000000001', 'Cycle A', 'open'),
  ('13000000-0000-4000-8000-000000000002', 'Cycle B', 'open');
insert into public.ops_issues (company_id, title, severity, status) values
  ('13000000-0000-4000-8000-000000000001', 'Issue A', 'warning', 'open'),
  ('13000000-0000-4000-8000-000000000002', 'Issue B', 'warning', 'open');
insert into public.ops_automation_suggestions (company_id, suggestion_title, status) values
  ('13000000-0000-4000-8000-000000000001', 'Suggestion A', 'proposed'),
  ('13000000-0000-4000-8000-000000000002', 'Suggestion B', 'proposed');
insert into public.ops_kpi_snapshots (company_id, kpi_key, value) values
  ('13000000-0000-4000-8000-000000000001', 'sales', 1),
  ('13000000-0000-4000-8000-000000000002', 'sales', 2);
insert into public.performance_reviews (company_id) values
  ('13000000-0000-4000-8000-000000000001'),
  ('13000000-0000-4000-8000-000000000002');
insert into public.daily_insights (company_id, insight_date) values
  ('13000000-0000-4000-8000-000000000001', current_date),
  ('13000000-0000-4000-8000-000000000002', current_date);
insert into public.engagement_scores (company_id, period_start, period_end) values
  ('13000000-0000-4000-8000-000000000001', current_date, current_date),
  ('13000000-0000-4000-8000-000000000002', current_date, current_date);
insert into public.documents (company_id) values
  ('13000000-0000-4000-8000-000000000001'),
  ('13000000-0000-4000-8000-000000000002');
insert into public.vendor_visits (company_id, vendor_name, start_time) values
  ('13000000-0000-4000-8000-000000000001', 'Vendor A', now()),
  ('13000000-0000-4000-8000-000000000002', 'Vendor B', now());
insert into public.gamification_leaderboard (company_id, employee_id, period) values
  ('13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'all_time'),
  ('13000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000002', 'all_time');
insert into public.badge_catalog (company_id, code, title) values
  ('13000000-0000-4000-8000-000000000001', 'a', 'Badge A'),
  ('13000000-0000-4000-8000-000000000002', 'b', 'Badge B');
insert into public.employee_certifications (company_id, employee_id, status) values
  ('13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'active'),
  ('13000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000002', 'active');
insert into public.learning_completions (company_id, employee_id, passed) values
  ('13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', true),
  ('13000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000002', true);
insert into public.training_assignments (company_id, employee_id, status) values
  ('13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'assigned'),
  ('13000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000002', 'assigned');
insert into public.recognition_award_rules (company_id, trigger_type, reward_type) values
  ('13000000-0000-4000-8000-000000000001', 'manual', 'xp'),
  ('13000000-0000-4000-8000-000000000002', 'manual', 'xp');
insert into public.recognition_events (company_id, user_id, type, message, awarded_at) values
  ('13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'manual', 'Recognition A', now()),
  ('13000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000002', 'manual', 'Recognition B', now());
insert into public.goals (id, company_id, title, created_by) values
  ('35000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'Goal A', '23000000-0000-4000-8000-000000000001'),
  ('35000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000002', 'Goal B', '23000000-0000-4000-8000-000000000002');
insert into public.goal_rewards (company_id, goal_id, user_id, reward_type, awarded_at) values
  ('13000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'xp', now()),
  ('13000000-0000-4000-8000-000000000002', '35000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000002', 'xp', now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '23000000-0000-4000-8000-000000000001', true);

select is((select count(*) from public.kpi_insights), 1::bigint, 'Tenant A sees only own KPI insights');
select is((select count(*) from public.idea_actions), 1::bigint, 'Tenant A sees only own idea actions');
select is((select count(*) from public.idea_cycles), 1::bigint, 'Tenant A sees only own idea cycles');
select is((select count(*) from public.ops_issues), 1::bigint, 'Tenant A sees only own ops issues');
select is((select count(*) from public.ops_automation_suggestions), 1::bigint, 'Tenant A sees only own ops automation suggestions');
select is((select count(*) from public.ops_kpi_snapshots), 1::bigint, 'Tenant A sees only own ops KPI snapshots');
select is((select count(*) from public.performance_reviews), 1::bigint, 'Tenant A sees only own performance reviews');
select is((select count(*) from public.daily_insights), 1::bigint, 'Tenant A sees only own daily insights');
select is((select count(*) from public.engagement_scores), 1::bigint, 'Tenant A sees only own engagement scores');
select is((select count(*) from public.documents), 1::bigint, 'Tenant A sees only own documents');
select is((select count(*) from public.vendor_visits), 1::bigint, 'Tenant A sees only own vendor visits');
select is((select count(*) from public.gamification_leaderboard), 1::bigint, 'Tenant A sees only own leaderboard rows');
select is((select count(*) from public.badge_catalog), 1::bigint, 'Tenant A sees only own badge catalog rows');
select is((select count(*) from public.employee_certifications), 1::bigint, 'Tenant A sees only own employee certifications');
select is((select count(*) from public.learning_completions), 1::bigint, 'Tenant A sees only own learning completions');
select is((select count(*) from public.training_assignments), 1::bigint, 'Tenant A sees only own training assignments');
select is((select count(*) from public.recognition_award_rules), 1::bigint, 'Tenant A sees only own recognition award rules');
select is((select count(*) from public.recognition_events), 1::bigint, 'Tenant A sees only own recognition events');
select is((select count(*) from public.goal_rewards), 1::bigint, 'Tenant A sees only own goal rewards');
select is((select count(*) from public.recognitions), 2::bigint, 'Tenant A recognitions view is limited to own goal rewards and recognition events');

select lives_ok(
  $$ insert into public.gamification_xp (user_id, amount, reason)
     values ('23000000-0000-4000-8000-000000000001', 10, 'triggered') $$,
  'Tenant A can insert own gamification XP and inherit company_id'
);

select lives_ok(
  $$ insert into public.goal_rewards (goal_id, user_id, reward_type)
     values ('35000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'xp') $$,
  'Tenant A can insert own goal reward and inherit company_id'
);

select throws_ok(
  $$ insert into public.ops_issues (company_id, title, severity, status)
     values ('13000000-0000-4000-8000-000000000002', 'Blocked issue', 'critical', 'open') $$,
  '42501',
  'new row violates row-level security policy for table "ops_issues"',
  'Tenant A cannot insert Tenant B ops issue'
);

select throws_ok(
  $$ insert into public.recognition_events (company_id, user_id, type, message)
     values ('13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000002', 'manual', 'Blocked recognition') $$,
  '42501',
  'new row violates row-level security policy for table "recognition_events"',
  'Tenant A cannot create recognition for Tenant B user'
);

select * from finish();

rollback;
