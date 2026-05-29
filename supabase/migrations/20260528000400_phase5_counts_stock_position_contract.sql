-- Phase 05.04: counts and stock-position contract.
-- Expected count quantities are based on stock lots plus signed inventory
-- adjustments. The view runs with invoker permissions so existing RLS remains
-- the security boundary.

alter table public.inv_counts
  add column if not exists count_period text,
  add column if not exists description text,
  add column if not exists review_status text not null default 'pending',
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text;

create or replace view public.inv_stock_positions
with (security_invoker = true) as
select
  movement.company_id,
  movement.item_id,
  movement.location_id,
  sum(movement.quantity_delta)::numeric as quantity_on_hand,
  sum(movement.stock_value_delta)::numeric as stock_value
from (
  select
    lot.company_id,
    lot.item_id,
    lot.location_id,
    coalesce(lot.quantity, 0)::numeric as quantity_delta,
    (coalesce(lot.quantity, 0) * coalesce(lot.unit_cost, 0))::numeric as stock_value_delta
  from public.inv_stock_lots lot
  where coalesce(lot.is_active, true) is true

  union all

  select
    adjustment.company_id,
    adjustment.item_id,
    coalesce(adjustment.to_location_id, adjustment.location_id) as location_id,
    coalesce(adjustment.quantity, 0)::numeric as quantity_delta,
    coalesce(adjustment.cost_impact, 0)::numeric as stock_value_delta
  from public.inv_adjustments adjustment
  where adjustment.adjustment_type in ('increase', 'add', 'addition', 'receive', 'received', 'production_output')

  union all

  select
    adjustment.company_id,
    adjustment.item_id,
    coalesce(adjustment.from_location_id, adjustment.location_id) as location_id,
    -coalesce(adjustment.quantity, 0)::numeric as quantity_delta,
    -coalesce(adjustment.cost_impact, 0)::numeric as stock_value_delta
  from public.inv_adjustments adjustment
  where adjustment.adjustment_type in ('decrease', 'remove', 'removal', 'waste', 'usage', 'production_consumption')

  union all

  select
    adjustment.company_id,
    adjustment.item_id,
    adjustment.from_location_id as location_id,
    -coalesce(adjustment.quantity, 0)::numeric as quantity_delta,
    -coalesce(adjustment.cost_impact, 0)::numeric as stock_value_delta
  from public.inv_adjustments adjustment
  where adjustment.adjustment_type in ('transfer', 'move') and adjustment.from_location_id is not null

  union all

  select
    adjustment.company_id,
    adjustment.item_id,
    adjustment.to_location_id as location_id,
    coalesce(adjustment.quantity, 0)::numeric as quantity_delta,
    coalesce(adjustment.cost_impact, 0)::numeric as stock_value_delta
  from public.inv_adjustments adjustment
  where adjustment.adjustment_type in ('transfer', 'move') and adjustment.to_location_id is not null
) movement
where movement.item_id is not null
group by movement.company_id, movement.item_id, movement.location_id;

do $$
begin
  alter table public.inv_count_lines
    add constraint inv_count_lines_expected_quantity_nonnegative
    check (expected_quantity is null or expected_quantity >= 0) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_count_lines
    add constraint inv_count_lines_counted_quantity_nonnegative
    check (counted_quantity is null or counted_quantity >= 0) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_counts
    add constraint inv_counts_review_status_known
    check (review_status is null or review_status in ('pending', 'under_review', 'approved', 'rejected')) not valid;
exception when duplicate_object then null;
end
$$;

create index if not exists inv_count_lines_count_item_unit_idx
  on public.inv_count_lines (count_id, item_id, unit_id);

create index if not exists inv_counts_company_date_period_idx
  on public.inv_counts (company_id, count_date desc, count_period);

create index if not exists inv_adjustments_company_item_location_date_idx
  on public.inv_adjustments (company_id, item_id, location_id, adjustment_date desc);

notify pgrst, 'reload schema';
