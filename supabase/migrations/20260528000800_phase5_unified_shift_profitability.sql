-- Phase 5.08: unified shift/day/location profitability.
-- This phase composes the cost-engine inputs built in 05.01-05.07 without
-- treating payroll, POS sales, or accounting sync as complete integrations.

create index if not exists expenses_company_date_status_idx
on public.expenses (company_id, expense_date, status);

create index if not exists payments_company_paid_date_status_idx
on public.payments (company_id, paid_date, status);

create index if not exists inv_items_company_default_location_idx
on public.inv_items (company_id, default_location_id);

create or replace view public.cost_production_batches_v
with (security_invoker = true)
as
select
  production.company_id,
  production.id as production_id,
  production.item_id,
  item.name as item_name,
  item.default_location_id as location_id,
  location.name as location_name,
  production.production_type,
  production.status,
  production.approval_status,
  production.produced_quantity,
  production.produced_unit_id,
  production.yield_quantity,
  production.yield_unit_id,
  production.waste_quantity,
  production.waste_unit_id,
  coalesce(production.material_cost, 0)::numeric as material_cost,
  coalesce(production.labor_cost, 0)::numeric as labor_cost,
  coalesce(production.overhead_cost, 0)::numeric as overhead_cost,
  coalesce(production.total_output_cost, 0)::numeric as total_output_cost,
  production.unit_output_cost,
  production.produced_at,
  production.produced_at::date as production_date,
  production.batch_reference,
  production.created_by,
  production.approved_by,
  production.approved_at,
  production.metadata
from public.inv_production_events production
left join public.inv_items item
  on item.id = production.item_id
  and item.company_id = production.company_id
left join public.inv_locations location
  on location.id = item.default_location_id
  and location.company_id = production.company_id
where production.company_id is not null;

grant select on public.cost_production_batches_v to authenticated;

create or replace view public.cost_inventory_shortage_v
with (security_invoker = true)
as
select
  item.company_id,
  item.id as item_id,
  item.name as item_name,
  item.default_location_id as location_id,
  location.name as location_name,
  coalesce(position.quantity_on_hand, 0)::numeric as quantity_on_hand,
  coalesce(position.stock_value, 0)::numeric as stock_value,
  item.min_stock_level,
  item.max_stock_level,
  greatest(
    coalesce(item.min_stock_level, 0)::numeric
      - coalesce(position.quantity_on_hand, 0)::numeric,
    0
  )::numeric as shortage_quantity,
  case
    when item.min_stock_level is null or item.min_stock_level <= 0 then 'not_configured'
    when coalesce(position.quantity_on_hand, 0) <= 0 then 'stockout'
    when coalesce(position.quantity_on_hand, 0) <= item.min_stock_level then 'below_minimum'
    when item.max_stock_level is not null
      and item.max_stock_level > 0
      and coalesce(position.quantity_on_hand, 0) > item.max_stock_level
      then 'overstocked'
    else 'ok'
  end as inventory_signal
from public.inv_items item
left join public.inv_locations location
  on location.id = item.default_location_id
  and location.company_id = item.company_id
left join public.inv_stock_positions position
  on position.company_id = item.company_id
  and position.item_id = item.id
  and (
    position.location_id = item.default_location_id
    or (position.location_id is null and item.default_location_id is null)
  )
where coalesce(item.is_active, true) is true
  and item.company_id is not null;

grant select on public.cost_inventory_shortage_v to authenticated;

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

create or replace view public.cost_shift_summary_v
with (security_invoker = true)
as
with assignment_counts as (
  select
    assignment.company_id,
    assignment.schedule_id,
    count(*) filter (
      where coalesce(lower(assignment.status), 'assigned') not in (
        'cancelled',
        'canceled',
        'declined',
        'removed'
      )
    )::numeric as assigned_headcount
  from public.schedule_assignments assignment
  group by assignment.company_id, assignment.schedule_id
),
shift_labor as (
  select
    labor.*,
    coalesce(assignment_counts.assigned_headcount, 0)::numeric as assigned_headcount,
    greatest(coalesce(assignment_counts.assigned_headcount, 0) - coalesce(labor.planned_headcount, 1), 0)::numeric as overstaffed_headcount,
    greatest(coalesce(labor.planned_headcount, 1) - coalesce(assignment_counts.assigned_headcount, 0), 0)::numeric as understaffed_headcount
  from public.cost_schedule_labor_v labor
  left join assignment_counts
    on assignment_counts.company_id = labor.company_id
    and assignment_counts.schedule_id = labor.schedule_id::text
)
select
  shift_labor.schedule_id,
  shift_labor.company_id,
  shift_labor.shift_date,
  shift_labor.start_time,
  shift_labor.end_time,
  shift_labor.location,
  shift_labor.role,
  shift_labor.position_id,
  shift_labor.department_id,
  shift_labor.status,
  shift_labor.is_published,
  shift_labor.planned_headcount,
  shift_labor.assigned_headcount,
  shift_labor.overstaffed_headcount,
  shift_labor.understaffed_headcount,
  case
    when shift_labor.overstaffed_headcount > 0 then 'overstaffed'
    when shift_labor.understaffed_headcount > 0 then 'understaffed'
    else 'balanced'
  end as staffing_signal,
  shift_labor.net_shift_hours,
  shift_labor.planned_labor_hours,
  coalesce(shift_labor.planned_labor_cost, 0)::numeric as labor_cost,
  coalesce(day_summary.production_cost, 0)::numeric as production_cost,
  coalesce(day_summary.waste_cost, 0)::numeric as waste_cost,
  coalesce(day_summary.purchasing_cost, 0)::numeric as purchasing_cost,
  coalesce(day_summary.expense_cost, 0)::numeric as expense_cost,
  coalesce(day_summary.payment_cost, 0)::numeric as payment_cost,
  coalesce(day_summary.shortage_item_count, 0)::integer as shortage_item_count,
  coalesce(day_summary.overstock_item_count, 0)::integer as overstock_item_count,
  coalesce(day_summary.inventory_value, 0)::numeric as inventory_value,
  (
    coalesce(shift_labor.planned_labor_cost, 0)
    + coalesce(day_summary.production_cost, 0)
    + coalesce(day_summary.waste_cost, 0)
    + coalesce(day_summary.purchasing_cost, 0)
    + coalesce(day_summary.expense_cost, 0)
    + coalesce(day_summary.payment_cost, 0)
  )::numeric as total_operating_cost,
  day_summary.inventory_signal,
  jsonb_strip_nulls(
    jsonb_build_object(
      'labor_cost_basis', nullif(shift_labor.cost_basis_status, 'complete'),
      'staffing', case
        when shift_labor.overstaffed_headcount > 0 then 'overstaffed'
        when shift_labor.understaffed_headcount > 0 then 'understaffed'
        else null
      end,
      'inventory', nullif(day_summary.inventory_signal, 'ok')
    )
  ) as data_quality_flags
from shift_labor
left join public.cost_day_location_summary_v day_summary
  on day_summary.company_id = shift_labor.company_id
  and day_summary.summary_date = shift_labor.shift_date
  and day_summary.location is not distinct from shift_labor.location;

grant select on public.cost_shift_summary_v to authenticated;

create or replace function public.get_cost_engine_summary(
  p_company_id uuid default null,
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  company_id uuid,
  start_date date,
  end_date date,
  scheduled_shifts integer,
  labor_hours numeric,
  labor_cost numeric,
  production_cost numeric,
  waste_cost numeric,
  purchasing_cost numeric,
  expense_cost numeric,
  payment_cost numeric,
  total_operating_cost numeric,
  shortage_item_count integer,
  overstock_item_count integer,
  overstaffed_shift_count integer,
  understaffed_shift_count integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with scoped_days as (
    select *
    from public.cost_day_location_summary_v summary
    where summary.company_id in (select public.current_user_company_ids())
      and (p_company_id is null or summary.company_id = p_company_id)
      and (p_start_date is null or summary.summary_date >= p_start_date)
      and (p_end_date is null or summary.summary_date <= p_end_date)
  ),
  scoped_shifts as (
    select *
    from public.cost_shift_summary_v shift_summary
    where shift_summary.company_id in (select public.current_user_company_ids())
      and (p_company_id is null or shift_summary.company_id = p_company_id)
      and (p_start_date is null or shift_summary.shift_date >= p_start_date)
      and (p_end_date is null or shift_summary.shift_date <= p_end_date)
  )
  select
    coalesce(
      p_company_id,
      (select company_id from scoped_days limit 1),
      (select company_id from scoped_shifts limit 1)
    ) as company_id,
    coalesce(
      p_start_date,
      (select min(summary_date) from scoped_days),
      (select min(shift_date) from scoped_shifts)
    ) as start_date,
    coalesce(
      p_end_date,
      (select max(summary_date) from scoped_days),
      (select max(shift_date) from scoped_shifts)
    ) as end_date,
    coalesce((select count(*)::integer from scoped_shifts), 0) as scheduled_shifts,
    coalesce((select sum(labor_hours) from scoped_days), 0)::numeric as labor_hours,
    coalesce((select sum(labor_cost) from scoped_days), 0)::numeric as labor_cost,
    coalesce((select sum(production_cost) from scoped_days), 0)::numeric as production_cost,
    coalesce((select sum(waste_cost) from scoped_days), 0)::numeric as waste_cost,
    coalesce((select sum(purchasing_cost) from scoped_days), 0)::numeric as purchasing_cost,
    coalesce((select sum(expense_cost) from scoped_days), 0)::numeric as expense_cost,
    coalesce((select sum(payment_cost) from scoped_days), 0)::numeric as payment_cost,
    coalesce((select sum(total_operating_cost) from scoped_days), 0)::numeric as total_operating_cost,
    coalesce((select sum(shortage_item_count)::integer from scoped_days), 0) as shortage_item_count,
    coalesce((select sum(overstock_item_count)::integer from scoped_days), 0) as overstock_item_count,
    coalesce((select count(*)::integer from scoped_shifts where overstaffed_headcount > 0), 0) as overstaffed_shift_count,
    coalesce((select count(*)::integer from scoped_shifts where understaffed_headcount > 0), 0) as understaffed_shift_count;
$$;

grant execute on function public.get_cost_engine_summary(uuid, date, date) to authenticated;

create or replace function public.get_shift_cost_breakdown(
  p_company_id uuid default null,
  p_start_date date default null,
  p_end_date date default null
)
returns setof public.cost_shift_summary_v
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.cost_shift_summary_v shift_summary
  where shift_summary.company_id in (select public.current_user_company_ids())
    and (p_company_id is null or shift_summary.company_id = p_company_id)
    and (p_start_date is null or shift_summary.shift_date >= p_start_date)
    and (p_end_date is null or shift_summary.shift_date <= p_end_date)
  order by shift_summary.start_time;
$$;

grant execute on function public.get_shift_cost_breakdown(uuid, date, date) to authenticated;

notify pgrst, 'reload schema';
