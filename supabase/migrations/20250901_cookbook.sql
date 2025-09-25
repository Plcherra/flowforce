-- Cookbook schema (proposed). Run in Supabase SQL editor.

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  pos_code text,
  category text,
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.prep_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  uom text not null default 'ea',
  category text,
  par_min numeric not null default 0,
  par_max numeric not null default 0,
  recipe_id uuid,
  yield_qty numeric,
  yield_uom text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.prep_items(id) on delete cascade,
  on_hand numeric not null,
  uom text not null,
  counted_at timestamp with time zone not null default now(),
  created_by uuid references public.profiles(id)
);

create table if not exists public.production_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.prep_items(id) on delete cascade,
  qty numeric not null,
  uom text not null,
  produced_at timestamp with time zone not null default now(),
  note text,
  created_by uuid references public.profiles(id)
);

