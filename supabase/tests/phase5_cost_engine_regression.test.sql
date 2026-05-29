begin;

create extension if not exists pgtap;

select plan(16);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.schedule_assignments where schedule_id = '5f200000-0000-4000-8000-000000000001';
delete from public.schedules where company_id = '5f000000-0000-4000-8000-000000000001';
delete from public.inv_production_materials where company_id = '5f000000-0000-4000-8000-000000000001';
delete from public.inv_production_events where company_id = '5f000000-0000-4000-8000-000000000001';
delete from public.inv_waste where company_id = '5f000000-0000-4000-8000-000000000001';
delete from public.payments where company_id = '5f000000-0000-4000-8000-000000000001';
delete from public.expenses where company_id = '5f000000-0000-4000-8000-000000000001';
delete from public.inventory_transactions where company_id = '5f000000-0000-4000-8000-000000000001';
delete from public.inventory_items where company_id = '5f000000-0000-4000-8000-000000000001';
delete from public.inv_items where company_id = '5f000000-0000-4000-8000-000000000001';
delete from public.inv_locations where company_id = '5f000000-0000-4000-8000-000000000001';
delete from public.company_members where company_id = '5f000000-0000-4000-8000-000000000001';
delete from public.profiles where id = '5f100000-0000-4000-8000-000000000001';
delete from public.companies where id = '5f000000-0000-4000-8000-000000000001';
delete from auth.users where id = '5f100000-0000-4000-8000-000000000001';

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
values (
  '00000000-0000-0000-0000-000000000000',
  '5f100000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'phase5-cost-owner@example.test',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false
);

insert into public.companies (id, name, slug, created_by, owner_id, currency, registration_complete)
values (
  '5f000000-0000-4000-8000-000000000001',
  'Phase 5 Cost Engine Tenant',
  'phase-5-cost-engine-tenant',
  '5f100000-0000-4000-8000-000000000001',
  '5f100000-0000-4000-8000-000000000001',
  'USD',
  true
);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values (
  '5f100000-0000-4000-8000-000000000001',
  '5f000000-0000-4000-8000-000000000001',
  'Phase',
  'Five',
  'phase5-cost-owner@example.test',
  'owner',
  true
);

insert into public.company_members (company_id, user_id, role, added_at)
values (
  '5f000000-0000-4000-8000-000000000001',
  '5f100000-0000-4000-8000-000000000001',
  'owner',
  now()
);

insert into public.inv_units (id, name, abbreviation, unit_type, is_active)
values ('5f300000-0000-4000-8000-000000000001', 'Each', 'ea', 'count', true)
on conflict (id) do update
set name = excluded.name,
    abbreviation = excluded.abbreviation,
    unit_type = excluded.unit_type,
    is_active = excluded.is_active;

insert into public.inv_locations (id, company_id, name, is_active)
values (
  '5f400000-0000-4000-8000-000000000001',
  '5f000000-0000-4000-8000-000000000001',
  'Main Kitchen',
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
  is_active
)
values (
  '5f500000-0000-4000-8000-000000000001',
  '5f000000-0000-4000-8000-000000000001',
  'Regression Dough',
  '5f100000-0000-4000-8000-000000000001',
  '5f300000-0000-4000-8000-000000000001',
  '5f400000-0000-4000-8000-000000000001',
  5,
  2,
  10,
  true
);

insert into public.inventory_items (id, company_id, name, created_by)
values (
  '5f510000-0000-4000-8000-000000000001',
  '5f000000-0000-4000-8000-000000000001',
  'Regression POS Item',
  '5f100000-0000-4000-8000-000000000001'
);

insert into public.schedules (
  id,
  company_id,
  title,
  start_time,
  end_time,
  break_minutes,
  required_headcount,
  hourly_rate,
  location,
  role,
  is_published,
  status,
  created_by
)
values (
  '5f200000-0000-4000-8000-000000000001',
  '5f000000-0000-4000-8000-000000000001',
  'Regression Opening Shift',
  current_date + time '08:00',
  current_date + time '16:00',
  60,
  2,
  20,
  'Main Kitchen',
  'cook',
  true,
  'published',
  '5f100000-0000-4000-8000-000000000001'
);

insert into public.inv_production_events (
  id,
  company_id,
  item_id,
  created_by,
  produced_quantity,
  produced_unit_id,
  material_cost,
  labor_cost,
  overhead_cost,
  total_output_cost,
  unit_output_cost,
  approval_status,
  produced_at
)
values (
  '5f600000-0000-4000-8000-000000000001',
  '5f000000-0000-4000-8000-000000000001',
  '5f500000-0000-4000-8000-000000000001',
  '5f100000-0000-4000-8000-000000000001',
  10,
  '5f300000-0000-4000-8000-000000000001',
  80,
  30,
  10,
  120,
  12,
  'approved',
  current_date + time '09:30'
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
  '5f000000-0000-4000-8000-000000000001',
  '5f500000-0000-4000-8000-000000000001',
  '5f400000-0000-4000-8000-000000000001',
  3,
  '5f300000-0000-4000-8000-000000000001',
  15,
  'prep_error',
  'production',
  'Regression test waste',
  current_date,
  '5f100000-0000-4000-8000-000000000001'
);

insert into public.expenses (
  company_id,
  amount,
  currency,
  category,
  description,
  expense_date,
  status,
  data_source,
  created_by
)
values
  ('5f000000-0000-4000-8000-000000000001', 40, 'USD', 'utilities', 'Regression actual expense', current_date, 'approved', 'manual', '5f100000-0000-4000-8000-000000000001'),
  ('5f000000-0000-4000-8000-000000000001', 25, 'USD', 'supplies', 'Regression imported expense', current_date, 'approved', 'imported', '5f100000-0000-4000-8000-000000000001'),
  ('5f000000-0000-4000-8000-000000000001', 12, 'USD', 'travel', 'Regression pending expense', current_date, 'pending', 'manual', '5f100000-0000-4000-8000-000000000001');

insert into public.payments (
  company_id,
  amount,
  currency,
  payment_type,
  recipient_name,
  description,
  status,
  paid_date,
  due_date,
  data_source,
  created_by
)
values
  ('5f000000-0000-4000-8000-000000000001', 60, 'USD', 'vendor', 'Regression vendor', 'Regression actual payment', 'paid', current_date, current_date, 'manual', '5f100000-0000-4000-8000-000000000001'),
  ('5f000000-0000-4000-8000-000000000001', 18, 'USD', 'vendor', 'Regression vendor', 'Regression pending payment', 'pending', null, current_date, 'manual', '5f100000-0000-4000-8000-000000000001');

insert into public.inventory_transactions (
  company_id,
  item_id,
  performed_by,
  quantity,
  unit_price,
  total_amount,
  transaction_type,
  reference_number,
  notes,
  created_at
)
values (
  '5f000000-0000-4000-8000-000000000001',
  '5f510000-0000-4000-8000-000000000001',
  '5f100000-0000-4000-8000-000000000001',
  90,
  10,
  900,
  'sale',
  'REG-SALE-001',
  'Regression actual sale',
  current_date + time '12:00'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '5f100000-0000-4000-8000-000000000001', true);

select is(
  round((select planned_labor_cost from public.cost_schedule_labor_v where schedule_id = '5f200000-0000-4000-8000-000000000001'), 2),
  280.00::numeric,
  'scheduled labor cost equals net hours times headcount times rate'
);

select is(
  round((select net_shift_hours from public.cost_schedule_labor_v where schedule_id = '5f200000-0000-4000-8000-000000000001'), 2),
  7.00::numeric,
  'scheduled labor subtracts unpaid break minutes'
);

select is(
  round((select production_cost from public.cost_day_location_summary_v where company_id = '5f000000-0000-4000-8000-000000000001' and summary_date = current_date and location = 'Main Kitchen'), 2),
  120.00::numeric,
  'daily summary includes approved production cost'
);

select is(
  round((select waste_cost from public.cost_day_location_summary_v where company_id = '5f000000-0000-4000-8000-000000000001' and summary_date = current_date and location = 'Main Kitchen'), 2),
  15.00::numeric,
  'daily summary includes waste cost impact'
);

select is(
  round((select labor_cost from public.get_cost_engine_summary('5f000000-0000-4000-8000-000000000001', current_date, current_date)), 2),
  280.00::numeric,
  'cost engine summary exposes labor cost'
);

select is(
  round((select production_cost from public.get_cost_engine_summary('5f000000-0000-4000-8000-000000000001', current_date, current_date)), 2),
  120.00::numeric,
  'cost engine summary exposes production cost'
);

select is(
  round((select waste_cost from public.get_cost_engine_summary('5f000000-0000-4000-8000-000000000001', current_date, current_date)), 2),
  15.00::numeric,
  'cost engine summary exposes waste cost'
);

select is(
  round((select actual_revenue from public.get_owner_financial_overview('5f000000-0000-4000-8000-000000000001', current_date, current_date)), 2),
  900.00::numeric,
  'owner overview includes actual revenue'
);

select is(
  round((select actual_expenses from public.get_owner_financial_overview('5f000000-0000-4000-8000-000000000001', current_date, current_date)), 2),
  40.00::numeric,
  'owner overview separates actual expenses'
);

select is(
  round((select actual_payments from public.get_owner_financial_overview('5f000000-0000-4000-8000-000000000001', current_date, current_date)), 2),
  60.00::numeric,
  'owner overview separates actual payments'
);

select is(
  round((select imported_cost from public.get_owner_financial_overview('5f000000-0000-4000-8000-000000000001', current_date, current_date)), 2),
  25.00::numeric,
  'owner overview separates imported cost'
);

select is(
  round((select estimated_cost from public.get_owner_financial_overview('5f000000-0000-4000-8000-000000000001', current_date, current_date)), 2),
  415.00::numeric,
  'owner overview keeps estimated operating cost separate'
);

select is(
  round((select pending_expense_total + pending_payment_total from public.get_owner_financial_overview('5f000000-0000-4000-8000-000000000001', current_date, current_date)), 2),
  30.00::numeric,
  'owner overview keeps pending approvals separate'
);

select is(
  round((select net_operating_position from public.get_owner_financial_overview('5f000000-0000-4000-8000-000000000001', current_date, current_date)), 2),
  360.00::numeric,
  'owner overview net position excludes pending approvals'
);

insert into public.expenses (
  company_id,
  amount,
  currency,
  category,
  description,
  expense_date,
  status,
  data_source,
  created_by
)
values (
  '5f000000-0000-4000-8000-000000000001',
  999,
  'USD',
  'sample',
  'Demo Financial sample expense',
  current_date,
  'approved',
  'sample',
  '5f100000-0000-4000-8000-000000000001'
);

insert into public.inventory_transactions (
  company_id,
  item_id,
  performed_by,
  quantity,
  unit_price,
  total_amount,
  transaction_type,
  reference_number,
  notes,
  created_at
)
values (
  '5f000000-0000-4000-8000-000000000001',
  '5f510000-0000-4000-8000-000000000001',
  '5f100000-0000-4000-8000-000000000001',
  999,
  1,
  999,
  'sale',
  'DEMO-FIN-SALE-001',
  'demo regression sale',
  current_date + time '13:00'
);

select is(
  round((select actual_revenue from public.get_owner_financial_overview('5f000000-0000-4000-8000-000000000001', current_date, current_date)), 2),
  900.00::numeric,
  'owner overview excludes demo revenue rows'
);

select is(
  round((select actual_expenses from public.get_owner_financial_overview('5f000000-0000-4000-8000-000000000001', current_date, current_date)), 2),
  40.00::numeric,
  'owner overview excludes sample expense rows'
);

select * from finish();

rollback;
