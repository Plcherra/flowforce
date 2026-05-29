-- Phase 05.02: inventory item/unit reliability guardrails.

do $$
begin
  alter table public.inv_items
    add constraint inv_items_cost_per_unit_nonnegative
    check (cost_per_unit is null or cost_per_unit >= 0) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_items
    add constraint inv_items_unit_quantity_positive
    check (unit_quantity is null or unit_quantity > 0) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_item_units
    add constraint inv_item_units_conversion_factor_positive
    check (conversion_factor is null or conversion_factor > 0) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_item_units
    add constraint inv_item_units_cost_per_unit_nonnegative
    check (cost_per_unit is null or cost_per_unit >= 0) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_units
    add constraint inv_units_conversion_factor_positive
    check (conversion_factor is null or conversion_factor > 0) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_units
    add constraint inv_units_conversion_to_parent_positive
    check (conversion_to_parent is null or conversion_to_parent > 0) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_stock_lots
    add constraint inv_stock_lots_quantity_nonnegative
    check (quantity is null or quantity >= 0) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_stock_lots
    add constraint inv_stock_lots_unit_cost_nonnegative
    check (unit_cost is null or unit_cost >= 0) not valid;
exception when duplicate_object then null;
end
$$;

create index if not exists inv_item_units_company_item_idx
  on public.inv_item_units (company_id, item_id);

create index if not exists inv_item_units_item_primary_idx
  on public.inv_item_units (item_id, is_primary)
  where is_primary is true;

create index if not exists inv_items_company_setup_idx
  on public.inv_items (company_id, is_active, category_id, default_location_id, preferred_supplier_id);

create index if not exists inv_stock_lots_company_item_location_idx
  on public.inv_stock_lots (company_id, item_id, location_id)
  where is_active is true;

notify pgrst, 'reload schema';
