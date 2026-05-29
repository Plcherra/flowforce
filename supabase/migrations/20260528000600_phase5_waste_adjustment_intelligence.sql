-- Phase 05.06: waste and adjustment intelligence.
-- Waste events now carry enough classification and cost context to become
-- actionable, and waste/adjustment rows share the same stock-position model.

alter table public.inv_waste
  add column if not exists unit_id uuid,
  add column if not exists reason_category text,
  add column if not exists shift_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.inv_adjustments
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table public.inv_waste
    add constraint inv_waste_quantity_positive
    check (quantity is null or quantity > 0) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_waste
    add constraint inv_waste_cost_impact_nonnegative
    check (cost_impact is null or cost_impact >= 0) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_waste
    add constraint inv_waste_type_known
    check (
      waste_type is null
      or waste_type in ('spoilage', 'prep_error', 'accident', 'theft', 'expired', 'damaged', 'production', 'other')
    ) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_adjustments
    add constraint inv_adjustments_quantity_positive
    check (quantity is null or quantity > 0) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_adjustments
    add constraint inv_adjustments_cost_impact_nonnegative
    check (cost_impact is null or cost_impact >= 0) not valid;
exception when duplicate_object then null;
end
$$;

create index if not exists inv_waste_company_date_type_idx
  on public.inv_waste (company_id, waste_date desc, waste_type);

create index if not exists inv_waste_company_item_location_idx
  on public.inv_waste (company_id, item_id, location_id);

create index if not exists inv_waste_reason_category_idx
  on public.inv_waste (company_id, reason_category);

create index if not exists inv_adjustments_company_date_type_idx
  on public.inv_adjustments (company_id, adjustment_date desc, adjustment_type);

create or replace view public.cost_waste_events_v
with (security_invoker = true) as
select
  waste.company_id,
  waste.id as waste_id,
  waste.item_id,
  item.name as item_name,
  waste.location_id,
  location.name as location_name,
  waste.shift_id,
  waste.waste_type,
  waste.reason_category,
  waste.reason,
  waste.quantity,
  waste.unit_id,
  unit.name as unit_name,
  waste.cost_impact,
  waste.waste_date,
  waste.recorded_by,
  waste.metadata
from public.inv_waste waste
left join public.inv_items item on item.id = waste.item_id
left join public.inv_locations location on location.id = waste.location_id
left join public.inv_units unit on unit.id = waste.unit_id;

create or replace view public.cost_waste_daily_v
with (security_invoker = true) as
select
  company_id,
  waste_date,
  location_id,
  item_id,
  waste_type,
  reason_category,
  count(*)::integer as event_count,
  sum(coalesce(quantity, 0))::numeric as total_quantity,
  sum(coalesce(cost_impact, 0))::numeric as total_cost
from public.inv_waste
group by company_id, waste_date, location_id, item_id, waste_type, reason_category;

notify pgrst, 'reload schema';
