-- Phase 12.03: persist count rooms and approval events on the stub tables.

alter table public.inv_count_locations
  add column if not exists count_id uuid references public.inv_counts(id) on delete cascade,
  add column if not exists location_id uuid references public.inv_locations(id) on delete restrict;

do $$
begin
  alter table public.inv_count_locations
    add constraint inv_count_locations_count_location_key
    unique (count_id, location_id);
exception
  when duplicate_object then null;
end
$$;

alter table public.inv_count_events
  add column if not exists countid uuid references public.inv_counts(id) on delete cascade,
  add column if not exists event_type text,
  add column if not exists actorid uuid,
  add column if not exists payload jsonb not null default '{}'::jsonb;

create index if not exists inv_count_events_countid_created_idx
  on public.inv_count_events (countid, created_at desc);

notify pgrst, 'reload schema';
