-- Phase 14 follow-up: restore inventory item and production relationships
-- surfaced by authenticated visible-module smoke tests.

alter table public.inv_items add column if not exists category_id uuid;
alter table public.inv_items add column if not exists recipe_yield_quantity numeric;
alter table public.inv_items add column if not exists recipe_yield_unit_id uuid;

alter table public.inv_production_events add column if not exists item_id uuid;
alter table public.inv_production_events add column if not exists production_type text;
alter table public.inv_production_events add column if not exists produced_quantity numeric;
alter table public.inv_production_events add column if not exists produced_unit_id uuid;
alter table public.inv_production_events add column if not exists yield_quantity numeric;
alter table public.inv_production_events add column if not exists yield_unit_id uuid;
alter table public.inv_production_events add column if not exists waste_quantity numeric;
alter table public.inv_production_events add column if not exists waste_unit_id uuid;
alter table public.inv_production_events add column if not exists material_cost numeric default 0;
alter table public.inv_production_events add column if not exists labor_cost numeric default 0;
alter table public.inv_production_events add column if not exists overhead_cost numeric default 0;
alter table public.inv_production_events add column if not exists total_output_cost numeric default 0;
alter table public.inv_production_events add column if not exists unit_output_cost numeric;
alter table public.inv_production_events add column if not exists batch_reference text;
alter table public.inv_production_events add column if not exists notes text;
alter table public.inv_production_events add column if not exists approval_status text default 'pending';
alter table public.inv_production_events add column if not exists produced_at timestamptz default now();
alter table public.inv_production_events add column if not exists created_by uuid;
alter table public.inv_production_events add column if not exists approved_by uuid;
alter table public.inv_production_events add column if not exists approved_at timestamptz;

alter table public.inv_production_materials add column if not exists production_id uuid;
alter table public.inv_production_materials add column if not exists ingredient_item_id uuid;
alter table public.inv_production_materials add column if not exists quantity_used numeric;
alter table public.inv_production_materials add column if not exists unit_id uuid;
alter table public.inv_production_materials add column if not exists unit_cost numeric;
alter table public.inv_production_materials add column if not exists total_cost numeric;
alter table public.inv_production_materials add column if not exists waste_quantity numeric;

alter table public.inv_production_approvals add column if not exists production_id uuid;
alter table public.inv_production_approvals add column if not exists action text;
alter table public.inv_production_approvals add column if not exists action_by uuid;
alter table public.inv_production_approvals add column if not exists action_at timestamptz default now();
alter table public.inv_production_approvals add column if not exists notes text;

update public.inv_production_events
set produced_at = coalesce(produced_at, created_at, now()),
    approval_status = coalesce(approval_status, status, 'pending');

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inv_items'
      and column_name = 'unit_id' and udt_name <> 'uuid'
  ) then
    alter table public.inv_items alter column unit_id type uuid using case
      when unit_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then unit_id::uuid
      else null
    end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inv_items'
      and column_name = 'default_location_id' and udt_name <> 'uuid'
  ) then
    alter table public.inv_items alter column default_location_id type uuid using case
      when default_location_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then default_location_id::uuid
      else null
    end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inv_items'
      and column_name = 'preferred_supplier_id' and udt_name <> 'uuid'
  ) then
    alter table public.inv_items alter column preferred_supplier_id type uuid using case
      when preferred_supplier_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then preferred_supplier_id::uuid
      else null
    end;
  end if;
end
$$;

do $$
begin
  alter table public.inv_items
    add constraint inv_items_unit_id_fkey
    foreign key (unit_id) references public.inv_units(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_items
    add constraint inv_items_recipe_yield_unit_id_fkey
    foreign key (recipe_yield_unit_id) references public.inv_units(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_items
    add constraint inv_items_default_location_id_fkey
    foreign key (default_location_id) references public.inv_locations(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_items
    add constraint inv_items_preferred_supplier_id_fkey
    foreign key (preferred_supplier_id) references public.inv_suppliers(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_items
    add constraint inv_items_category_id_fkey
    foreign key (category_id) references public.inventory_categories(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_production_events
    add constraint inv_production_events_item_id_fkey
    foreign key (item_id) references public.inv_items(id) on delete cascade not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_production_events
    add constraint inv_production_events_produced_unit_id_fkey
    foreign key (produced_unit_id) references public.inv_units(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_production_events
    add constraint inv_production_events_yield_unit_id_fkey
    foreign key (yield_unit_id) references public.inv_units(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_production_events
    add constraint inv_production_events_waste_unit_id_fkey
    foreign key (waste_unit_id) references public.inv_units(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_production_events
    add constraint inv_production_events_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_production_events
    add constraint inv_production_events_approved_by_fkey
    foreign key (approved_by) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_production_materials
    add constraint inv_production_materials_production_id_fkey
    foreign key (production_id) references public.inv_production_events(id) on delete cascade not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_production_materials
    add constraint inv_production_materials_unit_id_fkey
    foreign key (unit_id) references public.inv_units(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_production_materials
    add constraint inv_production_materials_ingredient_item_id_fkey
    foreign key (ingredient_item_id) references public.inv_items(id) on delete cascade not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_production_approvals
    add constraint inv_production_approvals_production_id_fkey
    foreign key (production_id) references public.inv_production_events(id) on delete cascade not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_production_approvals
    add constraint inv_production_approvals_action_by_fkey
    foreign key (action_by) references public.profiles(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

create index if not exists inv_items_unit_id_idx on public.inv_items (unit_id);
create index if not exists inv_items_recipe_yield_unit_id_idx on public.inv_items (recipe_yield_unit_id);
create index if not exists inv_items_default_location_id_idx on public.inv_items (default_location_id);
create index if not exists inv_items_preferred_supplier_id_idx on public.inv_items (preferred_supplier_id);
create index if not exists inv_items_category_id_idx on public.inv_items (category_id);
create index if not exists inv_production_events_item_id_idx on public.inv_production_events (item_id);
create index if not exists inv_production_events_produced_at_idx on public.inv_production_events (produced_at desc);
create index if not exists inv_production_materials_production_id_idx on public.inv_production_materials (production_id);
create index if not exists inv_production_approvals_production_id_idx on public.inv_production_approvals (production_id);

notify pgrst, 'reload schema';
