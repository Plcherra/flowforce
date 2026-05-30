begin;

create extension if not exists pgtap;

select plan(15);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.ai_inventory_waste_suggestions where company_id in (
  '7f000000-0000-4000-8000-000000000001',
  '7f000000-0000-4000-8000-000000000002'
);
delete from public.audit_log where company_id in (
  '7f000000-0000-4000-8000-000000000001',
  '7f000000-0000-4000-8000-000000000002'
);
delete from public.ai_governance_policies where company_id in (
  '7f000000-0000-4000-8000-000000000001',
  '7f000000-0000-4000-8000-000000000002'
);
delete from public.inv_waste where company_id in (
  '7f000000-0000-4000-8000-000000000001',
  '7f000000-0000-4000-8000-000000000002'
);
delete from public.inv_items where company_id in (
  '7f000000-0000-4000-8000-000000000001',
  '7f000000-0000-4000-8000-000000000002'
);
delete from public.inv_locations where company_id in (
  '7f000000-0000-4000-8000-000000000001',
  '7f000000-0000-4000-8000-000000000002'
);
delete from public.company_members where company_id in (
  '7f000000-0000-4000-8000-000000000001',
  '7f000000-0000-4000-8000-000000000002'
);
delete from public.profiles where id in (
  '7f100000-0000-4000-8000-000000000001',
  '7f100000-0000-4000-8000-000000000002'
);
delete from public.companies where id in (
  '7f000000-0000-4000-8000-000000000001',
  '7f000000-0000-4000-8000-000000000002'
);
delete from auth.users where id in (
  '7f100000-0000-4000-8000-000000000001',
  '7f100000-0000-4000-8000-000000000002'
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
  ('00000000-0000-0000-0000-000000000000', '7f100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase7-inventory-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '7f100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase7-inventory-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('7f000000-0000-4000-8000-000000000001', 'Phase 7 Inventory Tenant A', 'phase-7-inventory-a', '7f100000-0000-4000-8000-000000000001', '7f100000-0000-4000-8000-000000000001', true),
  ('7f000000-0000-4000-8000-000000000002', 'Phase 7 Inventory Tenant B', 'phase-7-inventory-b', '7f100000-0000-4000-8000-000000000002', '7f100000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, employment_status, is_company_admin)
values
  ('7f100000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000001', 'Inventory', 'Owner A', 'phase7-inventory-a@example.test', 'owner', 'active', true),
  ('7f100000-0000-4000-8000-000000000002', '7f000000-0000-4000-8000-000000000002', 'Inventory', 'Owner B', 'phase7-inventory-b@example.test', 'owner', 'active', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('7f000000-0000-4000-8000-000000000001', '7f100000-0000-4000-8000-000000000001', 'owner', now()),
  ('7f000000-0000-4000-8000-000000000002', '7f100000-0000-4000-8000-000000000002', 'owner', now());

insert into public.inv_units (id, name, abbreviation, unit_type, is_active)
values ('7f300000-0000-4000-8000-000000000001', 'Each', 'ea', 'count', true)
on conflict (id) do update
set name = excluded.name,
    abbreviation = excluded.abbreviation,
    unit_type = excluded.unit_type,
    is_active = excluded.is_active;

insert into public.inv_locations (id, company_id, name, is_active)
values (
  '7f400000-0000-4000-8000-000000000001',
  '7f000000-0000-4000-8000-000000000001',
  'Phase 7 Kitchen',
  true
);

insert into public.inv_items (
  id,
  company_id,
  name,
  created_by,
  unit_id,
  default_location_id,
  cost_per_unit,
  unit_quantity,
  min_stock_level,
  is_active,
  is_prep_item
)
values
  (
    '7f500000-0000-4000-8000-000000000001',
    '7f000000-0000-4000-8000-000000000001',
    'Phase 7 Stockout Item One',
    '7f100000-0000-4000-8000-000000000001',
    '7f300000-0000-4000-8000-000000000001',
    '7f400000-0000-4000-8000-000000000001',
    8,
    1,
    12,
    true,
    true
  ),
  (
    '7f500000-0000-4000-8000-000000000002',
    '7f000000-0000-4000-8000-000000000001',
    'Phase 7 Stockout Item Two',
    '7f100000-0000-4000-8000-000000000001',
    '7f300000-0000-4000-8000-000000000001',
    '7f400000-0000-4000-8000-000000000001',
    6,
    1,
    8,
    true,
    false
  ),
  (
    '7f500000-0000-4000-8000-000000000003',
    '7f000000-0000-4000-8000-000000000001',
    'Phase 7 Threshold Missing Item',
    '7f100000-0000-4000-8000-000000000001',
    '7f300000-0000-4000-8000-000000000001',
    '7f400000-0000-4000-8000-000000000001',
    3,
    1,
    null,
    true,
    false
  );

insert into public.inv_waste (
  company_id,
  item_id,
  location_id,
  quantity,
  unit_id,
  cost_impact,
  waste_type,
  reason_category,
  reason,
  waste_date,
  recorded_by
)
values (
  '7f000000-0000-4000-8000-000000000001',
  '7f500000-0000-4000-8000-000000000001',
  '7f400000-0000-4000-8000-000000000001',
  5,
  '7f300000-0000-4000-8000-000000000001',
  100,
  'prep_error',
  'production',
  'Phase 7 test waste',
  current_date,
  '7f100000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '7f100000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.install_ai_governance_baseline(
    '7f000000-0000-4000-8000-000000000001'
  ) $$,
  'tenant member can install governance before inventory and waste suggestions'
);

select lives_ok(
  $$ select public.refresh_ai_inventory_waste_suggestions(
    '7f000000-0000-4000-8000-000000000001'
  ) $$,
  'tenant member can refresh inventory and waste suggestions'
);

select ok(
  (select count(*)::integer >= 3 from public.ai_inventory_waste_suggestions_latest_v),
  'inventory and waste assistant creates multiple suggestions from stock and waste signals'
);

select ok(
  exists (
    select 1
    from public.ai_inventory_waste_suggestions_latest_v
    where suggestion_type = 'stockout_risk'
  ),
  'inventory assistant detects stockout risk'
);

select ok(
  exists (
    select 1
    from public.ai_inventory_waste_suggestions_latest_v
    where suggestion_type = 'reorder_review'
  ),
  'inventory assistant detects reorder review needs'
);

select ok(
  exists (
    select 1
    from public.ai_inventory_waste_suggestions_latest_v
    where suggestion_type = 'waste_outlier'
  ),
  'waste assistant detects waste outliers'
);

select is(
  (
    select bool_and(status = 'pending_review')
    from public.ai_inventory_waste_suggestions_latest_v
  ),
  true,
  'inventory and waste suggestions are pending manager review'
);

select is(
  (
    select bool_and(approval_required and not direct_write_executed)
    from public.ai_inventory_waste_suggestions_latest_v
  ),
  true,
  'inventory and waste suggestions do not execute direct writes'
);

select ok(
  (
    select bool_and(evidence::text like '%/app/inventory%')
    from public.ai_inventory_waste_suggestions_latest_v
  ),
  'inventory and waste suggestions include source metric links'
);

select ok(
  (
    select bool_and(suggested_action->>'writes_allowed' = 'false')
    from public.ai_inventory_waste_suggestions_latest_v
  ),
  'inventory and waste suggested actions are read-only until approval'
);

select lives_ok(
  $$ select public.review_ai_inventory_waste_suggestion(
    (
      select id
      from public.ai_inventory_waste_suggestions_latest_v
      where suggestion_type = 'stockout_risk'
      limit 1
    ),
    'approved',
    'Manager reviewed stock risk.'
  ) $$,
  'manager can approve inventory suggestion without writing inventory rows'
);

select is(
  (
    select direct_write_executed
    from public.ai_inventory_waste_suggestions_latest_v
    where status = 'approved'
    limit 1
  ),
  false,
  'approved inventory and waste suggestion still does not write rows'
);

select is(
  (
    select count(*)::integer
    from public.audit_log
    where company_id = '7f000000-0000-4000-8000-000000000001'
      and action in ('ai.inventory_waste_suggestion.created', 'ai.inventory_waste_suggestion.approved')
  ),
  2,
  'inventory and waste suggestion refresh and approval are audited'
);

select set_config('request.jwt.claim.sub', '7f100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.refresh_ai_inventory_waste_suggestions(
    '7f000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001',
  'Not allowed to refresh inventory and waste suggestions for this company',
  'Tenant B cannot refresh Tenant A inventory and waste suggestions'
);

select throws_ok(
  $$ select public.refresh_ai_inventory_waste_suggestions(
    '7f000000-0000-4000-8000-000000000002'
  ) $$,
  'P0001',
  'AI governance baseline is required before context fetch',
  'inventory and waste suggestions require governance before refresh'
);

select * from finish();

rollback;
