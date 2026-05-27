begin;

create extension if not exists pgtap;

select plan(24);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.inv_production_approvals where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_production_materials where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_production_events where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_waste where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_adjustments where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_count_lines where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_counts where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_item_units where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_recipes where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_stock_lots where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_purchase_lines where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_purchases where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_par_overrides where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_par_profiles where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_prep_batches where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_items where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_locations where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inv_suppliers where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.purchase_order_items where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.purchase_orders where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.payment_approvals where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.payments where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.expenses where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inventory_transactions where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inventory_items where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.inventory_categories where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.company_members where company_id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from public.profiles where id in ('2e000000-0000-4000-8000-000000000001', '2e000000-0000-4000-8000-000000000002');
delete from public.companies where id in ('1e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000002');
delete from auth.users where id in ('2e000000-0000-4000-8000-000000000001', '2e000000-0000-4000-8000-000000000002');

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
  ('00000000-0000-0000-0000-000000000000', '2e000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase21-owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '2e000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase21-owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('1e000000-0000-4000-8000-000000000001', 'Phase 21 Tenant A', 'phase-21-tenant-a', '2e000000-0000-4000-8000-000000000001', '2e000000-0000-4000-8000-000000000001', true),
  ('1e000000-0000-4000-8000-000000000002', 'Phase 21 Tenant B', 'phase-21-tenant-b', '2e000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('2e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000001', 'Phase', 'Twenty One A', 'phase21-owner-a@example.test', 'owner', true),
  ('2e000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000002', 'Phase', 'Twenty One B', 'phase21-owner-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('1e000000-0000-4000-8000-000000000001', '2e000000-0000-4000-8000-000000000001', 'owner', now()),
  ('1e000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000002', 'owner', now());

insert into public.inv_units (id, name, abbreviation, unit_type, is_active)
values ('7e000000-0000-4000-8000-000000000001', 'Each', 'ea', 'count', true)
on conflict (id) do update set name = excluded.name, abbreviation = excluded.abbreviation, is_active = excluded.is_active;

insert into public.inventory_categories (id, company_id, name)
values
  ('5e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000001', 'Tenant A legacy category'),
  ('5e000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000002', 'Tenant B legacy category');

insert into public.inventory_items (id, company_id, category_id, name, created_by)
values
  ('6e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000001', '5e000000-0000-4000-8000-000000000001', 'Tenant A legacy item', '2e000000-0000-4000-8000-000000000001'),
  ('6e000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000002', '5e000000-0000-4000-8000-000000000002', 'Tenant B legacy item', '2e000000-0000-4000-8000-000000000002');

insert into public.inventory_transactions (company_id, item_id, performed_by, quantity, transaction_type)
values
  ('1e000000-0000-4000-8000-000000000001', '6e000000-0000-4000-8000-000000000001', '2e000000-0000-4000-8000-000000000001', 1, 'adjustment'),
  ('1e000000-0000-4000-8000-000000000002', '6e000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000002', 2, 'adjustment');

insert into public.payments (id, company_id, amount, created_by, recipient_name, description, status, currency)
values
  ('3e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000001', 101, '2e000000-0000-4000-8000-000000000001', 'Vendor A', 'Payment A', 'pending', 'USD'),
  ('3e000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000002', 202, '2e000000-0000-4000-8000-000000000002', 'Vendor B', 'Payment B', 'pending', 'USD');

insert into public.payment_approvals (company_id, payment_id, approver_id, status)
values
  ('1e000000-0000-4000-8000-000000000001', '3e000000-0000-4000-8000-000000000001', '2e000000-0000-4000-8000-000000000001', 'pending'),
  ('1e000000-0000-4000-8000-000000000002', '3e000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000002', 'pending');

insert into public.purchase_orders (id, company_id, created_by, po_number, supplier_name, status, total_amount)
values
  ('4e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000001', '2e000000-0000-4000-8000-000000000001', 'A-001', 'Supplier A', 'draft', 10),
  ('4e000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000002', 'B-001', 'Supplier B', 'draft', 20);

insert into public.purchase_order_items (company_id, po_id, item_id, item_name, quantity, unit_price)
values
  ('1e000000-0000-4000-8000-000000000001', '4e000000-0000-4000-8000-000000000001', '6e000000-0000-4000-8000-000000000001', 'Tenant A item', 1, 10),
  ('1e000000-0000-4000-8000-000000000002', '4e000000-0000-4000-8000-000000000002', '6e000000-0000-4000-8000-000000000002', 'Tenant B item', 1, 20);

insert into public.inv_suppliers (id, company_id, created_by, name, is_active)
values
  ('8e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000001', '2e000000-0000-4000-8000-000000000001', 'Tenant A supplier', true),
  ('8e000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000002', 'Tenant B supplier', true);

insert into public.inv_locations (id, company_id, name, is_active)
values
  ('9e000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000001', 'Tenant A dry storage', true),
  ('9e000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000002', 'Tenant B dry storage', true);

insert into public.inv_items (id, company_id, name, created_by, unit_id, default_location_id, preferred_supplier_id, category_id)
values
  ('a1000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000001', 'Tenant A stock item', '2e000000-0000-4000-8000-000000000001', '7e000000-0000-4000-8000-000000000001', '9e000000-0000-4000-8000-000000000001', '8e000000-0000-4000-8000-000000000001', '5e000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000002', 'Tenant B stock item', '2e000000-0000-4000-8000-000000000002', '7e000000-0000-4000-8000-000000000001', '9e000000-0000-4000-8000-000000000002', '8e000000-0000-4000-8000-000000000002', '5e000000-0000-4000-8000-000000000002');

insert into public.inv_item_units (company_id, item_id, unit_id, conversion_factor, is_primary)
values
  ('1e000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '7e000000-0000-4000-8000-000000000001', 1, true),
  ('1e000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', '7e000000-0000-4000-8000-000000000001', 1, true);

insert into public.inv_counts (id, company_id, location_id, count_date, status)
values
  ('b1000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000001', '9e000000-0000-4000-8000-000000000001', current_date, 'open'),
  ('b1000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000002', '9e000000-0000-4000-8000-000000000002', current_date, 'open');

insert into public.inv_count_lines (company_id, count_id, item_id, unit_id, counted_quantity)
values
  ('1e000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '7e000000-0000-4000-8000-000000000001', 1),
  ('1e000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', '7e000000-0000-4000-8000-000000000001', 2);

insert into public.inv_purchases (id, company_id, supplier_id, created_by, status)
values
  ('c1000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000001', '8e000000-0000-4000-8000-000000000001', '2e000000-0000-4000-8000-000000000001', 'draft'),
  ('c1000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000002', '8e000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000002', 'draft');

insert into public.inv_purchase_lines (company_id, purchase_id, item_id, quantity_ordered)
values
  ('1e000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 1),
  ('1e000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 2);

insert into public.inv_recipes (company_id, item_id, ingredient_id, unit_id, quantity_needed)
values
  ('1e000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '7e000000-0000-4000-8000-000000000001', 1),
  ('1e000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', '7e000000-0000-4000-8000-000000000001', 2);

insert into public.inv_stock_lots (company_id, item_id, location_id, supplier_id, lot_number, quantity)
values
  ('1e000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '9e000000-0000-4000-8000-000000000001', '8e000000-0000-4000-8000-000000000001', 'A-lot', 1),
  ('1e000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', '9e000000-0000-4000-8000-000000000002', '8e000000-0000-4000-8000-000000000002', 'B-lot', 2);

insert into public.inv_adjustments (company_id, item_id, location_id, quantity, adjustment_type)
values
  ('1e000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '9e000000-0000-4000-8000-000000000001', 1, 'increase'),
  ('1e000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', '9e000000-0000-4000-8000-000000000002', 2, 'increase');

insert into public.inv_production_events (id, company_id, item_id, created_by, produced_quantity, produced_unit_id)
values
  ('d1000000-0000-4000-8000-000000000001', '1e000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2e000000-0000-4000-8000-000000000001', 1, '7e000000-0000-4000-8000-000000000001'),
  ('d1000000-0000-4000-8000-000000000002', '1e000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000002', 2, '7e000000-0000-4000-8000-000000000001');

insert into public.inv_production_materials (company_id, production_id, ingredient_item_id, quantity_used, unit_id)
values
  ('1e000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 1, '7e000000-0000-4000-8000-000000000001'),
  ('1e000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 2, '7e000000-0000-4000-8000-000000000001');

insert into public.inv_production_approvals (company_id, production_id, action_by, action)
values
  ('1e000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', '2e000000-0000-4000-8000-000000000001', 'approve'),
  ('1e000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000002', '2e000000-0000-4000-8000-000000000002', 'approve');

insert into public.inv_waste (company_id, item_id, location_id, quantity, reason)
values
  ('1e000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '9e000000-0000-4000-8000-000000000001', 1, 'test'),
  ('1e000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', '9e000000-0000-4000-8000-000000000002', 2, 'test');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '2e000000-0000-4000-8000-000000000001', true);

select is((select count(*) from public.payments), 1::bigint, 'Tenant A sees own payments');
select is((select count(*) from public.payment_approvals), 1::bigint, 'Tenant A sees own payment approvals');
select is((select count(*) from public.purchase_orders), 1::bigint, 'Tenant A sees own purchase orders');
select is((select count(*) from public.purchase_order_items), 1::bigint, 'Tenant A sees own purchase order items');
select is((select count(*) from public.inventory_categories), 1::bigint, 'Tenant A sees own legacy inventory categories');
select is((select count(*) from public.inventory_items), 1::bigint, 'Tenant A sees own legacy inventory items');
select is((select count(*) from public.inventory_transactions), 1::bigint, 'Tenant A sees own legacy inventory transactions');
select is((select count(*) from public.inv_suppliers), 1::bigint, 'Tenant A sees own inventory suppliers');
select is((select count(*) from public.inv_locations), 1::bigint, 'Tenant A sees own inventory locations');
select is((select count(*) from public.inv_items), 1::bigint, 'Tenant A sees own inventory items');
select is((select count(*) from public.inv_item_units), 1::bigint, 'Tenant A sees own inventory item units');
select is((select count(*) from public.inv_counts), 1::bigint, 'Tenant A sees own inventory counts');
select is((select count(*) from public.inv_count_lines), 1::bigint, 'Tenant A sees own inventory count lines');
select is((select count(*) from public.inv_units where id = '7e000000-0000-4000-8000-000000000001'), 1::bigint, 'Authenticated users can read global inventory units');

select lives_ok(
  $$ insert into public.payment_approvals (payment_id, approver_id, status)
     values ('3e000000-0000-4000-8000-000000000001', '2e000000-0000-4000-8000-000000000001', 'approved') $$,
  'Tenant A can create payment approvals and inherit company_id'
);

select is((select count(*) from public.payment_approvals), 2::bigint, 'Triggered payment approval is visible to Tenant A');

select lives_ok(
  $$ insert into public.inv_count_lines (count_id, item_id, unit_id, counted_quantity)
     values ('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '7e000000-0000-4000-8000-000000000001', 5) $$,
  'Tenant A can create count lines and inherit company_id'
);

select is((select count(*) from public.inv_count_lines), 2::bigint, 'Triggered count line is visible to Tenant A');

select throws_ok(
  $$ insert into public.purchase_order_items (company_id, po_id, item_id, item_name, quantity)
     values ('1e000000-0000-4000-8000-000000000001', '4e000000-0000-4000-8000-000000000002', '6e000000-0000-4000-8000-000000000001', 'Blocked', 1) $$,
  '42501',
  'new row violates row-level security policy for table "purchase_order_items"',
  'Tenant A cannot attach purchase items to Tenant B purchase orders'
);

select throws_ok(
  $$ insert into public.inv_waste (company_id, item_id, location_id, quantity)
     values ('1e000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', '9e000000-0000-4000-8000-000000000001', 1) $$,
  '42501',
  'new row violates row-level security policy for table "inv_waste"',
  'Tenant A cannot record waste against Tenant B inventory items'
);

reset role;

select throws_ok(
  $$ insert into public.inv_transfers (status) values ('draft') $$,
  '23514',
  'new row for relation "inv_transfers" violates check constraint "inv_transfers_company_id_required"',
  'Privileged writes still require inventory transfer company_id'
);

select col_type_is('public', 'payment_approvals', 'payment_id', 'uuid', 'Payment approval payment_id is a UUID relationship');
select col_type_is('public', 'inv_count_lines', 'item_id', 'uuid', 'Inventory count line item_id is a UUID relationship');
select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'inv_waste' and policyname = 'Company members can manage inv_waste'),
  1::bigint,
  'Inventory waste has an explicit reviewed tenant policy'
);

select * from finish();

rollback;
