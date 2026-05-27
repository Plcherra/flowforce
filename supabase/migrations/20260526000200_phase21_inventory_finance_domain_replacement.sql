-- Phase 21 forward migration: replace restore-era inventory/finance ownership
-- with reviewed tenant contracts.

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'payment_approvals',
    'purchase_orders',
    'purchase_order_items',
    'inv_adjustments',
    'inv_count_lines',
    'inv_counts',
    'inv_item_units',
    'inv_par_overrides',
    'inv_par_profiles',
    'inv_prep_batches',
    'inv_purchase_lines',
    'inv_recipes',
    'inv_stock_lots',
    'inv_waste'
  ] loop
    execute format('alter table public.%I add column if not exists company_id uuid', target_table);
  end loop;
end
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'expenses',
    'payments',
    'payment_approvals',
    'purchase_orders',
    'purchase_order_items',
    'inventory_categories',
    'inventory_items',
    'inventory_transactions',
    'inv_adjustments',
    'inv_count_events',
    'inv_count_lines',
    'inv_count_locations',
    'inv_count_scans',
    'inv_counts',
    'inv_items',
    'inv_item_units',
    'inv_locations',
    'inv_par_overrides',
    'inv_par_profiles',
    'inv_prep_batches',
    'inv_prep_plans',
    'inv_production_approvals',
    'inv_production_events',
    'inv_production_materials',
    'inv_purchase_lines',
    'inv_purchases',
    'inv_recipes',
    'inv_stock_lots',
    'inv_suppliers',
    'inv_transfer_audit',
    'inv_transfer_items',
    'inv_transfers',
    'inv_waste'
  ] loop
    execute format('drop policy if exists "Authenticated users can manage scoped restored rows" on public.%I', target_table);
    execute format('drop policy if exists "Authenticated users can read global restored rows" on public.%I', target_table);
  end loop;
end
$$;

drop policy if exists "Authenticated users can read global restored rows" on public.inv_units;
drop policy if exists "Authenticated users can manage scoped restored rows" on public.inv_units;

do $$
declare
  target_table text;
  target_column text;
begin
  for target_table, target_column in
    select *
    from (values
      ('payment_approvals', 'approver_id'),
      ('payment_approvals', 'payment_id'),
      ('purchase_order_items', 'item_id'),
      ('purchase_order_items', 'po_id'),
      ('inventory_items', 'category_id'),
      ('inventory_transactions', 'item_id'),
      ('inv_adjustments', 'from_location_id'),
      ('inv_adjustments', 'item_id'),
      ('inv_adjustments', 'location_id'),
      ('inv_adjustments', 'lot_id'),
      ('inv_adjustments', 'to_location_id'),
      ('inv_count_lines', 'count_id'),
      ('inv_count_lines', 'item_id'),
      ('inv_count_lines', 'lot_id'),
      ('inv_count_lines', 'unit_id'),
      ('inv_counts', 'location_id'),
      ('inv_item_units', 'item_id'),
      ('inv_item_units', 'unit_id'),
      ('inv_par_overrides', 'item_id'),
      ('inv_par_overrides', 'location_id'),
      ('inv_par_profiles', 'item_id'),
      ('inv_par_profiles', 'location_id'),
      ('inv_prep_batches', 'item_id'),
      ('inv_prep_batches', 'prep_location_id'),
      ('inv_purchases', 'supplier_id'),
      ('inv_purchase_lines', 'item_id'),
      ('inv_purchase_lines', 'purchase_id'),
      ('inv_recipes', 'ingredient_id'),
      ('inv_recipes', 'item_id'),
      ('inv_recipes', 'unit_id'),
      ('inv_stock_lots', 'item_id'),
      ('inv_stock_lots', 'location_id'),
      ('inv_stock_lots', 'supplier_id'),
      ('inv_units', 'base_unit_id'),
      ('inv_units', 'parent_unit_id'),
      ('inv_waste', 'item_id'),
      ('inv_waste', 'location_id'),
      ('inv_waste', 'lot_id')
    ) as columns_to_convert(table_name, column_name)
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = target_table
        and column_name = target_column
        and udt_name <> 'uuid'
    ) then
      execute format(
        'alter table public.%I alter column %I type uuid using case when %I ~* %L then %I::uuid else null end',
        target_table,
        target_column,
        target_column,
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        target_column
      );
    end if;
  end loop;
end
$$;

update public.payments payment
set company_id = profile.company_id
from public.profiles profile
where payment.company_id is null
  and coalesce(payment.created_by, payment.approved_by, payment.recipient_id) = profile.id
  and profile.company_id is not null;

update public.expenses expense
set company_id = profile.company_id
from public.profiles profile
where expense.company_id is null
  and coalesce(expense.employee_id, expense.created_by, expense.approved_by) = profile.id
  and profile.company_id is not null;

update public.payment_approvals approval
set company_id = payment.company_id
from public.payments payment
where approval.company_id is null
  and approval.payment_id = payment.id
  and payment.company_id is not null;

update public.payment_approvals approval
set company_id = profile.company_id
from public.profiles profile
where approval.company_id is null
  and approval.approver_id = profile.id
  and profile.company_id is not null;

update public.purchase_orders purchase_order
set company_id = profile.company_id
from public.profiles profile
where purchase_order.company_id is null
  and coalesce(purchase_order.created_by, purchase_order.approved_by) = profile.id
  and profile.company_id is not null;

update public.purchase_order_items item
set company_id = purchase_order.company_id
from public.purchase_orders purchase_order
where item.company_id is null
  and item.po_id = purchase_order.id
  and purchase_order.company_id is not null;

update public.purchase_order_items item
set company_id = inventory_item.company_id
from public.inventory_items inventory_item
where item.company_id is null
  and item.item_id = inventory_item.id
  and inventory_item.company_id is not null;

update public.inventory_items item
set company_id = category.company_id
from public.inventory_categories category
where item.company_id is null
  and item.category_id = category.id
  and category.company_id is not null;

update public.inventory_transactions txn
set company_id = item.company_id
from public.inventory_items item
where txn.company_id is null
  and txn.item_id = item.id
  and item.company_id is not null;

update public.inv_items item
set company_id = profile.company_id
from public.profiles profile
where item.company_id is null
  and item.created_by = profile.id
  and profile.company_id is not null;

update public.inv_items item
set company_id = location.company_id
from public.inv_locations location
where item.company_id is null
  and item.default_location_id = location.id
  and location.company_id is not null;

update public.inv_items item
set company_id = supplier.company_id
from public.inv_suppliers supplier
where item.company_id is null
  and item.preferred_supplier_id = supplier.id
  and supplier.company_id is not null;

update public.inv_item_units child
set company_id = item.company_id
from public.inv_items item
where child.company_id is null
  and child.item_id = item.id
  and item.company_id is not null;

update public.inv_adjustments child
set company_id = item.company_id
from public.inv_items item
where child.company_id is null
  and child.item_id = item.id
  and item.company_id is not null;

update public.inv_counts count_row
set company_id = location.company_id
from public.inv_locations location
where count_row.company_id is null
  and count_row.location_id = location.id
  and location.company_id is not null;

update public.inv_count_lines child
set company_id = count_row.company_id
from public.inv_counts count_row
where child.company_id is null
  and child.count_id = count_row.id
  and count_row.company_id is not null;

update public.inv_par_profiles child
set company_id = item.company_id
from public.inv_items item
where child.company_id is null
  and child.item_id = item.id
  and item.company_id is not null;

update public.inv_par_overrides child
set company_id = item.company_id
from public.inv_items item
where child.company_id is null
  and child.item_id = item.id
  and item.company_id is not null;

update public.inv_prep_batches child
set company_id = item.company_id
from public.inv_items item
where child.company_id is null
  and child.item_id = item.id
  and item.company_id is not null;

update public.inv_purchases purchase
set company_id = supplier.company_id
from public.inv_suppliers supplier
where purchase.company_id is null
  and purchase.supplier_id = supplier.id
  and supplier.company_id is not null;

update public.inv_purchase_lines child
set company_id = purchase.company_id
from public.inv_purchases purchase
where child.company_id is null
  and child.purchase_id = purchase.id
  and purchase.company_id is not null;

update public.inv_recipes child
set company_id = item.company_id
from public.inv_items item
where child.company_id is null
  and child.item_id = item.id
  and item.company_id is not null;

update public.inv_stock_lots child
set company_id = item.company_id
from public.inv_items item
where child.company_id is null
  and child.item_id = item.id
  and item.company_id is not null;

update public.inv_waste child
set company_id = item.company_id
from public.inv_items item
where child.company_id is null
  and child.item_id = item.id
  and item.company_id is not null;

update public.inv_production_events event
set company_id = item.company_id
from public.inv_items item
where event.company_id is null
  and event.item_id = item.id
  and item.company_id is not null;

update public.inv_production_materials material
set company_id = event.company_id
from public.inv_production_events event
where material.company_id is null
  and material.production_id = event.id
  and event.company_id is not null;

update public.inv_production_approvals approval
set company_id = event.company_id
from public.inv_production_events event
where approval.company_id is null
  and approval.production_id = event.id
  and event.company_id is not null;

create or replace function public.set_inventory_finance_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb;
  relation_uuid uuid;
begin
  row_data := to_jsonb(new);

  if new.company_id is null and row_data ? 'created_by' and (row_data ->> 'created_by') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'created_by')::uuid;
    select company_id into new.company_id from public.profiles where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'employee_id' and (row_data ->> 'employee_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'employee_id')::uuid;
    select company_id into new.company_id from public.profiles where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'approved_by' and (row_data ->> 'approved_by') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'approved_by')::uuid;
    select company_id into new.company_id from public.profiles where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'recipient_id' and (row_data ->> 'recipient_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'recipient_id')::uuid;
    select company_id into new.company_id from public.profiles where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'approver_id' and (row_data ->> 'approver_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'approver_id')::uuid;
    select company_id into new.company_id from public.profiles where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'action_by' and (row_data ->> 'action_by') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'action_by')::uuid;
    select company_id into new.company_id from public.profiles where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'payment_id' and (row_data ->> 'payment_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'payment_id')::uuid;
    select company_id into new.company_id from public.payments where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'po_id' and (row_data ->> 'po_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'po_id')::uuid;
    select company_id into new.company_id from public.purchase_orders where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'purchase_id' and (row_data ->> 'purchase_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'purchase_id')::uuid;
    select company_id into new.company_id from public.inv_purchases where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'count_id' and (row_data ->> 'count_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'count_id')::uuid;
    select company_id into new.company_id from public.inv_counts where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'production_id' and (row_data ->> 'production_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'production_id')::uuid;
    select company_id into new.company_id from public.inv_production_events where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'item_id' and (row_data ->> 'item_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'item_id')::uuid;
    select company_id into new.company_id from public.inv_items where id = relation_uuid limit 1;
    if new.company_id is null then
      select company_id into new.company_id from public.inventory_items where id = relation_uuid limit 1;
    end if;
  end if;

  if new.company_id is null and row_data ? 'ingredient_id' and (row_data ->> 'ingredient_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'ingredient_id')::uuid;
    select company_id into new.company_id from public.inv_items where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'ingredient_item_id' and (row_data ->> 'ingredient_item_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'ingredient_item_id')::uuid;
    select company_id into new.company_id from public.inv_items where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'location_id' and (row_data ->> 'location_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'location_id')::uuid;
    select company_id into new.company_id from public.inv_locations where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'default_location_id' and (row_data ->> 'default_location_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'default_location_id')::uuid;
    select company_id into new.company_id from public.inv_locations where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'prep_location_id' and (row_data ->> 'prep_location_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'prep_location_id')::uuid;
    select company_id into new.company_id from public.inv_locations where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'from_location_id' and (row_data ->> 'from_location_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'from_location_id')::uuid;
    select company_id into new.company_id from public.inv_locations where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'to_location_id' and (row_data ->> 'to_location_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'to_location_id')::uuid;
    select company_id into new.company_id from public.inv_locations where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'supplier_id' and (row_data ->> 'supplier_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'supplier_id')::uuid;
    select company_id into new.company_id from public.inv_suppliers where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'preferred_supplier_id' and (row_data ->> 'preferred_supplier_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'preferred_supplier_id')::uuid;
    select company_id into new.company_id from public.inv_suppliers where id = relation_uuid limit 1;
  end if;

  if new.company_id is null and row_data ? 'category_id' and (row_data ->> 'category_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'category_id')::uuid;
    select company_id into new.company_id from public.inventory_categories where id = relation_uuid limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.inventory_finance_row_matches_company(row_data jsonb, row_company_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  relation_uuid uuid;
begin
  if row_company_id is null then
    return false;
  end if;

  if row_data ? 'created_by' and (row_data ->> 'created_by') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'created_by')::uuid;
    if exists (select 1 from public.profiles where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'employee_id' and (row_data ->> 'employee_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'employee_id')::uuid;
    if exists (select 1 from public.profiles where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'approved_by' and (row_data ->> 'approved_by') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'approved_by')::uuid;
    if exists (select 1 from public.profiles where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'recipient_id' and (row_data ->> 'recipient_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'recipient_id')::uuid;
    if exists (select 1 from public.profiles where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'approver_id' and (row_data ->> 'approver_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'approver_id')::uuid;
    if exists (select 1 from public.profiles where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'action_by' and (row_data ->> 'action_by') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'action_by')::uuid;
    if exists (select 1 from public.profiles where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'payment_id' and (row_data ->> 'payment_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'payment_id')::uuid;
    if exists (select 1 from public.payments where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'po_id' and (row_data ->> 'po_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'po_id')::uuid;
    if exists (select 1 from public.purchase_orders where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'purchase_id' and (row_data ->> 'purchase_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'purchase_id')::uuid;
    if exists (select 1 from public.inv_purchases where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'count_id' and (row_data ->> 'count_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'count_id')::uuid;
    if exists (select 1 from public.inv_counts where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'production_id' and (row_data ->> 'production_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'production_id')::uuid;
    if exists (select 1 from public.inv_production_events where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'item_id' and (row_data ->> 'item_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'item_id')::uuid;
    if exists (select 1 from public.inv_items where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
    if exists (select 1 from public.inventory_items where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'ingredient_id' and (row_data ->> 'ingredient_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'ingredient_id')::uuid;
    if exists (select 1 from public.inv_items where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'ingredient_item_id' and (row_data ->> 'ingredient_item_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'ingredient_item_id')::uuid;
    if exists (select 1 from public.inv_items where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'category_id' and (row_data ->> 'category_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'category_id')::uuid;
    if exists (select 1 from public.inventory_categories where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'location_id' and (row_data ->> 'location_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'location_id')::uuid;
    if exists (select 1 from public.inv_locations where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'default_location_id' and (row_data ->> 'default_location_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'default_location_id')::uuid;
    if exists (select 1 from public.inv_locations where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'prep_location_id' and (row_data ->> 'prep_location_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'prep_location_id')::uuid;
    if exists (select 1 from public.inv_locations where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'from_location_id' and (row_data ->> 'from_location_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'from_location_id')::uuid;
    if exists (select 1 from public.inv_locations where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'to_location_id' and (row_data ->> 'to_location_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'to_location_id')::uuid;
    if exists (select 1 from public.inv_locations where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'supplier_id' and (row_data ->> 'supplier_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'supplier_id')::uuid;
    if exists (select 1 from public.inv_suppliers where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  if row_data ? 'preferred_supplier_id' and (row_data ->> 'preferred_supplier_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    relation_uuid := (row_data ->> 'preferred_supplier_id')::uuid;
    if exists (select 1 from public.inv_suppliers where id = relation_uuid and company_id is distinct from row_company_id) then
      return false;
    end if;
  end if;

  return true;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'expenses',
    'payments',
    'payment_approvals',
    'purchase_orders',
    'purchase_order_items',
    'inventory_categories',
    'inventory_items',
    'inventory_transactions',
    'inv_adjustments',
    'inv_count_events',
    'inv_count_lines',
    'inv_count_locations',
    'inv_count_scans',
    'inv_counts',
    'inv_items',
    'inv_item_units',
    'inv_locations',
    'inv_par_overrides',
    'inv_par_profiles',
    'inv_prep_batches',
    'inv_prep_plans',
    'inv_production_approvals',
    'inv_production_events',
    'inv_production_materials',
    'inv_purchase_lines',
    'inv_purchases',
    'inv_recipes',
    'inv_stock_lots',
    'inv_suppliers',
    'inv_transfer_audit',
    'inv_transfer_items',
    'inv_transfers',
    'inv_waste'
  ] loop
    execute format('create index if not exists %I on public.%I (company_id)', target_table || '_company_id_idx', target_table);
    execute format('drop trigger if exists %I on public.%I', 'set_' || target_table || '_company_id', target_table);
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.set_inventory_finance_company_id()',
      'set_' || target_table || '_company_id',
      target_table
    );
  end loop;
end
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'expenses',
    'payments',
    'payment_approvals',
    'purchase_orders',
    'purchase_order_items',
    'inventory_categories',
    'inventory_items',
    'inventory_transactions',
    'inv_adjustments',
    'inv_count_events',
    'inv_count_lines',
    'inv_count_locations',
    'inv_count_scans',
    'inv_counts',
    'inv_items',
    'inv_item_units',
    'inv_locations',
    'inv_par_overrides',
    'inv_par_profiles',
    'inv_prep_batches',
    'inv_prep_plans',
    'inv_production_approvals',
    'inv_production_events',
    'inv_production_materials',
    'inv_purchase_lines',
    'inv_purchases',
    'inv_recipes',
    'inv_stock_lots',
    'inv_suppliers',
    'inv_transfer_audit',
    'inv_transfer_items',
    'inv_transfers',
    'inv_waste'
  ] loop
    begin
      execute format(
        'alter table public.%I add constraint %I check (company_id is not null) not valid',
        target_table,
        target_table || '_company_id_required'
      );
    exception
      when duplicate_object then null;
    end;

    begin
      execute format(
        'alter table public.%I add constraint %I foreign key (company_id) references public.companies(id) on delete cascade not valid',
        target_table,
        target_table || '_company_id_fkey'
      );
    exception
      when duplicate_object then null;
    end;
  end loop;
end
$$;

do $$
declare
  target_table text;
  target_column text;
  referenced_table text;
  on_delete text;
begin
  for target_table, target_column, referenced_table, on_delete in
    select *
    from (values
      ('expenses', 'approved_by', 'profiles', 'set null'),
      ('expenses', 'created_by', 'profiles', 'set null'),
      ('expenses', 'employee_id', 'profiles', 'set null'),
      ('payments', 'approved_by', 'profiles', 'set null'),
      ('payments', 'created_by', 'profiles', 'set null'),
      ('payments', 'recipient_id', 'profiles', 'set null'),
      ('payment_approvals', 'approver_id', 'profiles', 'set null'),
      ('payment_approvals', 'payment_id', 'payments', 'cascade'),
      ('purchase_orders', 'approved_by', 'profiles', 'set null'),
      ('purchase_orders', 'created_by', 'profiles', 'set null'),
      ('purchase_order_items', 'item_id', 'inventory_items', 'set null'),
      ('purchase_order_items', 'po_id', 'purchase_orders', 'cascade'),
      ('inventory_items', 'category_id', 'inventory_categories', 'set null'),
      ('inventory_items', 'created_by', 'profiles', 'set null'),
      ('inventory_transactions', 'item_id', 'inventory_items', 'cascade'),
      ('inv_adjustments', 'from_location_id', 'inv_locations', 'set null'),
      ('inv_adjustments', 'item_id', 'inv_items', 'cascade'),
      ('inv_adjustments', 'location_id', 'inv_locations', 'set null'),
      ('inv_adjustments', 'lot_id', 'inv_stock_lots', 'set null'),
      ('inv_adjustments', 'to_location_id', 'inv_locations', 'set null'),
      ('inv_count_lines', 'count_id', 'inv_counts', 'cascade'),
      ('inv_count_lines', 'item_id', 'inv_items', 'cascade'),
      ('inv_count_lines', 'lot_id', 'inv_stock_lots', 'set null'),
      ('inv_count_lines', 'unit_id', 'inv_units', 'set null'),
      ('inv_counts', 'location_id', 'inv_locations', 'set null'),
      ('inv_item_units', 'item_id', 'inv_items', 'cascade'),
      ('inv_item_units', 'unit_id', 'inv_units', 'cascade'),
      ('inv_items', 'created_by', 'profiles', 'set null'),
      ('inv_par_overrides', 'created_by', 'profiles', 'set null'),
      ('inv_par_overrides', 'item_id', 'inv_items', 'cascade'),
      ('inv_par_overrides', 'location_id', 'inv_locations', 'cascade'),
      ('inv_par_profiles', 'created_by', 'profiles', 'set null'),
      ('inv_par_profiles', 'item_id', 'inv_items', 'cascade'),
      ('inv_par_profiles', 'location_id', 'inv_locations', 'cascade'),
      ('inv_prep_batches', 'created_by', 'profiles', 'set null'),
      ('inv_prep_batches', 'item_id', 'inv_items', 'cascade'),
      ('inv_prep_batches', 'prep_location_id', 'inv_locations', 'set null'),
      ('inv_purchases', 'created_by', 'profiles', 'set null'),
      ('inv_purchases', 'supplier_id', 'inv_suppliers', 'set null'),
      ('inv_purchase_lines', 'item_id', 'inv_items', 'set null'),
      ('inv_purchase_lines', 'purchase_id', 'inv_purchases', 'cascade'),
      ('inv_recipes', 'ingredient_id', 'inv_items', 'cascade'),
      ('inv_recipes', 'item_id', 'inv_items', 'cascade'),
      ('inv_recipes', 'unit_id', 'inv_units', 'set null'),
      ('inv_stock_lots', 'item_id', 'inv_items', 'cascade'),
      ('inv_stock_lots', 'location_id', 'inv_locations', 'cascade'),
      ('inv_stock_lots', 'supplier_id', 'inv_suppliers', 'set null'),
      ('inv_units', 'base_unit_id', 'inv_units', 'set null'),
      ('inv_units', 'parent_unit_id', 'inv_units', 'set null'),
      ('inv_waste', 'item_id', 'inv_items', 'cascade'),
      ('inv_waste', 'location_id', 'inv_locations', 'set null'),
      ('inv_waste', 'lot_id', 'inv_stock_lots', 'set null')
    ) as fks(table_name, column_name, referenced_table_name, delete_action)
  loop
    begin
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.%I(id) on delete %s not valid',
        target_table,
        target_table || '_' || target_column || '_fkey',
        target_column,
        referenced_table,
        on_delete
      );
    exception
      when duplicate_object then null;
    end;
  end loop;
end
$$;

do $$
declare
  target_table text;
  target_column text;
begin
  for target_table, target_column in
    select *
    from (values
      ('payment_approvals', 'payment_id'),
      ('payment_approvals', 'approver_id'),
      ('purchase_order_items', 'po_id'),
      ('purchase_order_items', 'item_id'),
      ('inventory_items', 'category_id'),
      ('inventory_transactions', 'item_id'),
      ('inv_adjustments', 'item_id'),
      ('inv_adjustments', 'location_id'),
      ('inv_adjustments', 'from_location_id'),
      ('inv_adjustments', 'to_location_id'),
      ('inv_count_lines', 'count_id'),
      ('inv_count_lines', 'item_id'),
      ('inv_counts', 'location_id'),
      ('inv_item_units', 'item_id'),
      ('inv_item_units', 'unit_id'),
      ('inv_par_overrides', 'item_id'),
      ('inv_par_overrides', 'location_id'),
      ('inv_par_profiles', 'item_id'),
      ('inv_par_profiles', 'location_id'),
      ('inv_prep_batches', 'item_id'),
      ('inv_prep_batches', 'prep_location_id'),
      ('inv_purchases', 'supplier_id'),
      ('inv_purchase_lines', 'purchase_id'),
      ('inv_purchase_lines', 'item_id'),
      ('inv_recipes', 'item_id'),
      ('inv_recipes', 'ingredient_id'),
      ('inv_recipes', 'unit_id'),
      ('inv_stock_lots', 'item_id'),
      ('inv_stock_lots', 'location_id'),
      ('inv_stock_lots', 'supplier_id'),
      ('inv_waste', 'item_id'),
      ('inv_waste', 'location_id')
    ) as indexes(table_name, column_name)
  loop
    execute format('create index if not exists %I on public.%I (%I)', target_table || '_' || target_column || '_idx', target_table, target_column);
  end loop;
end
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'expenses',
    'payments',
    'payment_approvals',
    'purchase_orders',
    'purchase_order_items',
    'inventory_categories',
    'inventory_items',
    'inventory_transactions',
    'inv_adjustments',
    'inv_count_events',
    'inv_count_lines',
    'inv_count_locations',
    'inv_count_scans',
    'inv_counts',
    'inv_items',
    'inv_item_units',
    'inv_locations',
    'inv_par_overrides',
    'inv_par_profiles',
    'inv_prep_batches',
    'inv_prep_plans',
    'inv_production_approvals',
    'inv_production_events',
    'inv_production_materials',
    'inv_purchase_lines',
    'inv_purchases',
    'inv_recipes',
    'inv_stock_lots',
    'inv_suppliers',
    'inv_transfer_audit',
    'inv_transfer_items',
    'inv_transfers',
    'inv_waste'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', target_table);
    execute format('revoke all on public.%I from anon', target_table);
    execute format('alter table public.%I enable row level security', target_table);
    execute format('drop policy if exists %I on public.%I', 'Company members can manage ' || target_table, target_table);
    execute format(
      'create policy %I on public.%I for all to authenticated using (company_id in (select public.current_user_company_ids())) with check (company_id in (select public.current_user_company_ids()) and public.inventory_finance_row_matches_company(to_jsonb(%I), company_id))',
      'Company members can manage ' || target_table,
      target_table,
      target_table
    );
  end loop;
end
$$;

grant select on public.inv_units to authenticated;
revoke all on public.inv_units from anon;
alter table public.inv_units enable row level security;
drop policy if exists "Authenticated users can read inventory units" on public.inv_units;
create policy "Authenticated users can read inventory units"
on public.inv_units
for select
to authenticated
using (true);

notify pgrst, 'reload schema';
