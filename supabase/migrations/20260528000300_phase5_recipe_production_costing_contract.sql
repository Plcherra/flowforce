-- Phase 05.03: recipe and production costing contract.
-- Keep production calculations nonnegative and queryable while preserving
-- compatibility with existing data through NOT VALID constraints.

alter table public.inv_recipes
  add constraint inv_recipes_quantity_needed_positive
  check (quantity_needed is null or quantity_needed > 0) not valid;

alter table public.inv_recipes
  add constraint inv_recipes_yield_amount_positive
  check (yield_amount is null or yield_amount > 0) not valid;

alter table public.inv_production_events
  add constraint inv_production_events_produced_quantity_positive
  check (produced_quantity is null or produced_quantity > 0) not valid;

alter table public.inv_production_events
  add constraint inv_production_events_yield_quantity_positive
  check (yield_quantity is null or yield_quantity > 0) not valid;

alter table public.inv_production_events
  add constraint inv_production_events_waste_quantity_nonnegative
  check (waste_quantity is null or waste_quantity >= 0) not valid;

alter table public.inv_production_events
  add constraint inv_production_events_costs_nonnegative
  check (
    coalesce(material_cost, 0) >= 0
    and coalesce(labor_cost, 0) >= 0
    and coalesce(overhead_cost, 0) >= 0
    and coalesce(total_output_cost, 0) >= 0
    and (unit_output_cost is null or unit_output_cost >= 0)
  ) not valid;

alter table public.inv_production_events
  add constraint inv_production_events_approval_status_known
  check (approval_status is null or approval_status in ('pending', 'approved', 'rejected')) not valid;

alter table public.inv_production_materials
  add constraint inv_production_materials_quantity_used_nonnegative
  check (quantity_used is null or quantity_used >= 0) not valid;

alter table public.inv_production_materials
  add constraint inv_production_materials_costs_nonnegative
  check (
    (unit_cost is null or unit_cost >= 0)
    and (total_cost is null or total_cost >= 0)
    and (waste_quantity is null or waste_quantity >= 0)
  ) not valid;

create index if not exists inv_recipes_company_item_idx
  on public.inv_recipes (company_id, item_id);

create index if not exists inv_recipes_company_ingredient_idx
  on public.inv_recipes (company_id, ingredient_id);

create index if not exists inv_production_events_company_item_date_idx
  on public.inv_production_events (company_id, item_id, produced_at desc);

create index if not exists inv_production_materials_company_production_idx
  on public.inv_production_materials (company_id, production_id);

create index if not exists inv_adjustments_production_reference_idx
  on public.inv_adjustments (company_id, reference_number)
  where reason in ('production_output', 'production_consumption');

create index if not exists inv_waste_production_reason_idx
  on public.inv_waste (company_id, reason)
  where waste_type = 'production';

notify pgrst, 'reload schema';
