-- Phase 05 audit closure: implement the remaining planned cost-basis
-- artifacts and keep sample financial records out of composed cost summaries.

create or replace view public.cost_item_unit_basis_v
with (security_invoker = true)
as
with primary_units as (
  select distinct on (unit_row.company_id, unit_row.item_id)
    unit_row.company_id,
    unit_row.item_id,
    unit_row.unit_id,
    unit_row.conversion_factor,
    unit_row.cost_per_unit
  from public.inv_item_units unit_row
  order by
    unit_row.company_id,
    unit_row.item_id,
    coalesce(unit_row.is_primary, false) desc,
    unit_row.created_at desc nulls last
),
lot_cost as (
  select
    lot.company_id,
    lot.item_id,
    sum(coalesce(lot.quantity, 0) * coalesce(lot.unit_cost, 0))::numeric
      / nullif(sum(coalesce(lot.quantity, 0)), 0)::numeric as weighted_unit_cost,
    count(*)::integer as active_lot_count
  from public.inv_stock_lots lot
  where coalesce(lot.is_active, true) is true
    and coalesce(lot.quantity, 0) > 0
    and lot.unit_cost is not null
  group by lot.company_id, lot.item_id
)
select
  item.company_id,
  item.id as item_id,
  item.name as item_name,
  item.unit_id as item_unit_id,
  primary_units.unit_id as primary_unit_id,
  coalesce(primary_units.conversion_factor, 1)::numeric as conversion_factor,
  coalesce(
    lot_cost.weighted_unit_cost,
    primary_units.cost_per_unit,
    item.cost_per_unit
  )::numeric as cost_per_unit,
  case
    when lot_cost.weighted_unit_cost is not null then 'active_lot_weighted_average'
    when primary_units.cost_per_unit is not null then 'primary_item_unit'
    when item.cost_per_unit is not null then 'item_default'
    else 'missing'
  end as cost_source,
  coalesce(lot_cost.active_lot_count, 0)::integer as active_lot_count,
  item.default_location_id,
  item.preferred_supplier_id,
  item.is_active
from public.inv_items item
left join primary_units
  on primary_units.company_id = item.company_id
  and primary_units.item_id = item.id
left join lot_cost
  on lot_cost.company_id = item.company_id
  and lot_cost.item_id = item.id
where item.company_id is not null;

grant select on public.cost_item_unit_basis_v to authenticated;

create or replace view public.cost_inventory_position_v
with (security_invoker = true)
as
select
  position.company_id,
  position.item_id,
  basis.item_name,
  position.location_id,
  location.name as location_name,
  position.quantity_on_hand,
  coalesce(
    position.stock_value,
    position.quantity_on_hand * coalesce(basis.cost_per_unit, 0)
  )::numeric as stock_value,
  basis.cost_per_unit,
  basis.cost_source,
  basis.primary_unit_id,
  basis.default_location_id,
  basis.preferred_supplier_id
from public.inv_stock_positions position
left join public.cost_item_unit_basis_v basis
  on basis.company_id = position.company_id
  and basis.item_id = position.item_id
left join public.inv_locations location
  on location.id = position.location_id
  and location.company_id = position.company_id;

grant select on public.cost_inventory_position_v to authenticated;

create or replace function public.recalculate_item_cost_basis(
  p_company_id uuid default null,
  p_item_id uuid default null
)
returns table (
  company_id uuid,
  item_id uuid,
  old_cost_per_unit numeric,
  new_cost_per_unit numeric,
  cost_source text,
  changed boolean
)
language sql
security invoker
set search_path = public
as $$
  with candidates as (
    select
      basis.company_id,
      basis.item_id,
      item.cost_per_unit as old_cost_per_unit,
      basis.cost_per_unit as new_cost_per_unit,
      basis.cost_source
    from public.cost_item_unit_basis_v basis
    join public.inv_items item
      on item.company_id = basis.company_id
      and item.id = basis.item_id
    where basis.company_id in (select public.current_user_company_ids())
      and (p_company_id is null or basis.company_id = p_company_id)
      and (p_item_id is null or basis.item_id = p_item_id)
      and basis.cost_per_unit is not null
      and basis.cost_source <> 'missing'
  ),
  updated as (
    update public.inv_items item
    set
      cost_per_unit = candidates.new_cost_per_unit,
      updated_at = now()
    from candidates
    where item.company_id = candidates.company_id
      and item.id = candidates.item_id
      and item.cost_per_unit is distinct from candidates.new_cost_per_unit
    returning
      item.company_id,
      item.id as item_id,
      candidates.old_cost_per_unit,
      candidates.new_cost_per_unit,
      candidates.cost_source,
      true as changed
  )
  select * from updated
  union all
  select
    candidates.company_id,
    candidates.item_id,
    candidates.old_cost_per_unit,
    candidates.new_cost_per_unit,
    candidates.cost_source,
    false as changed
  from candidates
  where candidates.old_cost_per_unit is not distinct from candidates.new_cost_per_unit;
$$;

grant execute on function public.recalculate_item_cost_basis(uuid, uuid) to authenticated;

create or replace view public.cost_day_location_summary_v
with (security_invoker = true)
as
with labor as (
  select
    company_id,
    shift_date as summary_date,
    location,
    sum(coalesce(planned_labor_cost, 0))::numeric as labor_cost,
    sum(coalesce(planned_labor_hours, 0))::numeric as labor_hours,
    count(*)::integer as scheduled_shifts
  from public.cost_schedule_labor_v
  group by company_id, shift_date, location
),
production as (
  select
    company_id,
    production_date as summary_date,
    location_name as location,
    sum(coalesce(total_output_cost, 0))::numeric as production_cost,
    count(*)::integer as production_batches
  from public.cost_production_batches_v
  where coalesce(approval_status, 'approved') <> 'rejected'
  group by company_id, production_date, location_name
),
waste as (
  select
    waste_daily.company_id,
    waste_daily.waste_date as summary_date,
    location.name as location,
    sum(coalesce(waste_daily.total_cost, 0))::numeric as waste_cost,
    sum(coalesce(waste_daily.event_count, 0))::integer as waste_events
  from public.cost_waste_daily_v waste_daily
  left join public.inv_locations location
    on location.id = waste_daily.location_id
    and location.company_id = waste_daily.company_id
  group by waste_daily.company_id, waste_daily.waste_date, location.name
),
purchases as (
  select
    receipt.company_id,
    coalesce(
      receipt.received_date,
      receipt.purchase_received_date,
      receipt.expected_date,
      receipt.order_date
    )::date as summary_date,
    location.name as location,
    sum(coalesce(receipt.received_cost, 0))::numeric as purchasing_cost,
    count(distinct receipt.purchase_id)::integer as purchase_count
  from public.cost_purchase_receipts_v receipt
  left join public.inv_locations location
    on location.id = receipt.location_id
    and location.company_id = receipt.company_id
  group by
    receipt.company_id,
    coalesce(
      receipt.received_date,
      receipt.purchase_received_date,
      receipt.expected_date,
      receipt.order_date
    )::date,
    location.name
),
expenses as (
  select
    company_id,
    expense_date as summary_date,
    null::text as location,
    sum(coalesce(amount, 0))::numeric as expense_cost,
    count(*)::integer as expense_count
  from public.expenses
  where coalesce(lower(status), 'approved') not in ('rejected', 'cancelled', 'canceled')
    and lower(coalesce(data_source, 'manual')) <> 'sample'
    and coalesce(description, '') not ilike 'Demo Financial%'
  group by company_id, expense_date
),
payments as (
  select
    company_id,
    paid_date as summary_date,
    null::text as location,
    sum(coalesce(amount, 0))::numeric as payment_cost,
    count(*)::integer as payment_count
  from public.payments
  where paid_date is not null
    and coalesce(lower(status), 'paid') not in ('rejected', 'cancelled', 'canceled', 'void')
    and lower(coalesce(data_source, 'manual')) <> 'sample'
    and coalesce(description, '') not ilike 'Demo Financial%'
  group by company_id, paid_date
),
inventory as (
  select
    shortage.company_id,
    shortage.location_name as location,
    count(*) filter (where shortage.inventory_signal in ('stockout', 'below_minimum'))::integer as shortage_item_count,
    count(*) filter (where shortage.inventory_signal = 'overstocked')::integer as overstock_item_count,
    sum(coalesce(shortage.stock_value, 0))::numeric as inventory_value
  from public.cost_inventory_shortage_v shortage
  group by shortage.company_id, shortage.location_name
),
keys as (
  select company_id, summary_date, location from labor
  union
  select company_id, summary_date, location from production
  union
  select company_id, summary_date, location from waste
  union
  select company_id, summary_date, location from purchases
  union
  select company_id, summary_date, location from expenses
  union
  select company_id, summary_date, location from payments
)
select
  keys.company_id,
  keys.summary_date,
  keys.location,
  coalesce(labor.scheduled_shifts, 0)::integer as scheduled_shifts,
  coalesce(labor.labor_hours, 0)::numeric as labor_hours,
  coalesce(labor.labor_cost, 0)::numeric as labor_cost,
  coalesce(production.production_batches, 0)::integer as production_batches,
  coalesce(production.production_cost, 0)::numeric as production_cost,
  coalesce(waste.waste_events, 0)::integer as waste_events,
  coalesce(waste.waste_cost, 0)::numeric as waste_cost,
  coalesce(purchases.purchase_count, 0)::integer as purchase_count,
  coalesce(purchases.purchasing_cost, 0)::numeric as purchasing_cost,
  coalesce(expenses.expense_count, 0)::integer as expense_count,
  coalesce(expenses.expense_cost, 0)::numeric as expense_cost,
  coalesce(payments.payment_count, 0)::integer as payment_count,
  coalesce(payments.payment_cost, 0)::numeric as payment_cost,
  coalesce(inventory.shortage_item_count, 0)::integer as shortage_item_count,
  coalesce(inventory.overstock_item_count, 0)::integer as overstock_item_count,
  coalesce(inventory.inventory_value, 0)::numeric as inventory_value,
  (
    coalesce(labor.labor_cost, 0)
    + coalesce(production.production_cost, 0)
    + coalesce(waste.waste_cost, 0)
    + coalesce(purchases.purchasing_cost, 0)
    + coalesce(expenses.expense_cost, 0)
    + coalesce(payments.payment_cost, 0)
  )::numeric as total_operating_cost,
  case
    when coalesce(inventory.shortage_item_count, 0) > 0 then 'shortage'
    when coalesce(inventory.overstock_item_count, 0) > 0 then 'overstock'
    else 'ok'
  end as inventory_signal
from keys
left join labor
  on labor.company_id = keys.company_id
  and labor.summary_date = keys.summary_date
  and labor.location is not distinct from keys.location
left join production
  on production.company_id = keys.company_id
  and production.summary_date = keys.summary_date
  and production.location is not distinct from keys.location
left join waste
  on waste.company_id = keys.company_id
  and waste.summary_date = keys.summary_date
  and waste.location is not distinct from keys.location
left join purchases
  on purchases.company_id = keys.company_id
  and purchases.summary_date = keys.summary_date
  and purchases.location is not distinct from keys.location
left join expenses
  on expenses.company_id = keys.company_id
  and expenses.summary_date = keys.summary_date
  and expenses.location is not distinct from keys.location
left join payments
  on payments.company_id = keys.company_id
  and payments.summary_date = keys.summary_date
  and payments.location is not distinct from keys.location
left join inventory
  on inventory.company_id = keys.company_id
  and inventory.location is not distinct from keys.location
where keys.company_id is not null
  and keys.summary_date is not null;

grant select on public.cost_day_location_summary_v to authenticated;

notify pgrst, 'reload schema';
