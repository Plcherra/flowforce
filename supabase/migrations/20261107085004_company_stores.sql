-- Real coffee-shop stores. Inventory count rooms stay on inv_locations.
-- Additive only: new table and nullable columns. Nothing is deleted.

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  address text,
  hours jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_name_not_blank check (length(trim(name)) > 0)
);

create index if not exists stores_company_id_idx
  on public.stores (company_id);

alter table public.profiles
  add column if not exists store_id uuid;

alter table public.schedules
  add column if not exists store_id uuid;

alter table public.schedules
  add column if not exists legacy_location text;

alter table public.company_invites
  add column if not exists store_id uuid;

alter table public.inv_locations
  add column if not exists hidden_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_store_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete set null
      not valid;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'schedules_store_id_fkey'
  ) then
    alter table public.schedules
      add constraint schedules_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete set null
      not valid;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'company_invites_store_id_fkey'
  ) then
    alter table public.company_invites
      add constraint company_invites_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete set null
      not valid;
  end if;
end $$;

create index if not exists profiles_store_id_idx on public.profiles (store_id);
create index if not exists schedules_store_id_idx on public.schedules (store_id);

alter table public.stores enable row level security;

grant select, insert, update on table public.stores to authenticated;

drop policy if exists "Company members read stores" on public.stores;
create policy "Company members read stores"
on public.stores
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company admins insert stores" on public.stores;
create policy "Company admins insert stores"
on public.stores
for insert
to authenticated
with check (public.current_user_is_company_admin(company_id));

drop policy if exists "Company admins update stores" on public.stores;
create policy "Company admins update stores"
on public.stores
for update
to authenticated
using (public.current_user_is_company_admin(company_id))
with check (public.current_user_is_company_admin(company_id));

insert into public.stores (company_id, name, address, hours, created_at)
select
  room.company_id,
  trim(room.name),
  null,
  jsonb_build_object(
    'monday', jsonb_build_object('closed', false, 'open', '08:00', 'close', '22:00'),
    'tuesday', jsonb_build_object('closed', false, 'open', '08:00', 'close', '22:00'),
    'wednesday', jsonb_build_object('closed', false, 'open', '08:00', 'close', '22:00'),
    'thursday', jsonb_build_object('closed', false, 'open', '08:00', 'close', '22:00'),
    'friday', jsonb_build_object('closed', false, 'open', '08:00', 'close', '22:00'),
    'saturday', jsonb_build_object('closed', false, 'open', '08:00', 'close', '22:00'),
    'sunday', jsonb_build_object('closed', false, 'open', '08:00', 'close', '22:00')
  ),
  coalesce(room.created_at, now())
from public.inv_locations as room
where room.company_id is not null
  and coalesce(room.location_type, '') = 'store'
  and length(trim(coalesce(room.name, ''))) > 0
  and lower(regexp_replace(trim(room.name), '\s+', ' ', 'g')) not in ('walk-in', 'walk in', 'walkin')
  and not exists (
    select 1
    from public.stores as store
    where store.company_id = room.company_id
      and lower(trim(store.name)) = lower(trim(room.name))
      and store.archived_at is null
  );

update public.inv_locations
set hidden_at = coalesce(hidden_at, now())
where hidden_at is null
  and (
    lower(regexp_replace(trim(coalesce(name, '')), '\s+', ' ', 'g')) in ('walk-in', 'walk in', 'walkin')
    or coalesce(location_type, '') = 'store'
  );

update public.profiles as person
set store_id = first_store.id
from public.inv_locations as room
join lateral (
  select store.id
  from public.stores as store
  where store.company_id = room.company_id
    and store.archived_at is null
    and lower(regexp_replace(trim(store.name), '\s+', ' ', 'g')) not in ('walk-in', 'walk in', 'walkin')
  order by store.created_at, store.id
  limit 1
) as first_store on true
where person.location_id = room.id
  and person.store_id is null
  and room.hidden_at is not null;

update public.company_invites as invite
set store_id = first_store.id
from public.inv_locations as room
join lateral (
  select store.id
  from public.stores as store
  where store.company_id = room.company_id
    and store.archived_at is null
    and lower(regexp_replace(trim(store.name), '\s+', ' ', 'g')) not in ('walk-in', 'walk in', 'walkin')
  order by store.created_at, store.id
  limit 1
) as first_store on true
where invite.location_id = room.id
  and invite.store_id is null
  and room.hidden_at is not null;

update public.schedules as shift
set store_id = store.id
from public.stores as store
where shift.company_id = store.company_id
  and shift.store_id is null
  and store.archived_at is null
  and lower(trim(coalesce(shift.location, ''))) = lower(trim(store.name));

update public.schedules as shift
set
  legacy_location = coalesce(shift.legacy_location, shift.location),
  store_id = first_store.id,
  location = first_store.name
from (
  select
    s.id as schedule_id,
    store.id,
    store.name
  from public.schedules as s
  join lateral (
    select candidate.id, candidate.name
    from public.stores as candidate
    where candidate.company_id = s.company_id
      and candidate.archived_at is null
      and lower(regexp_replace(trim(candidate.name), '\s+', ' ', 'g')) not in ('walk-in', 'walk in', 'walkin')
    order by candidate.created_at, candidate.id
    limit 1
  ) as store on true
  where s.store_id is null
    and lower(regexp_replace(trim(coalesce(s.location, '')), '\s+', ' ', 'g')) in ('walk-in', 'walk in', 'walkin')
) as first_store
where shift.id = first_store.schedule_id;

update public.company_policy_assignments as assignment
set target_id = mapped.new_store_id
from (
  select
    a.ctid as assignment_ctid,
    first_store.id::text as new_store_id
  from public.company_policy_assignments as a
  join public.company_policies as policy
    on policy.id = a.policy_id
  join public.inv_locations as room
    on room.company_id = policy.company_id
   and room.id::text = a.target_id
  join lateral (
    select store.id
    from public.stores as store
    where store.company_id = policy.company_id
      and store.archived_at is null
      and lower(regexp_replace(trim(store.name), '\s+', ' ', 'g')) not in ('walk-in', 'walk in', 'walkin')
    order by store.created_at, store.id
    limit 1
  ) as first_store on true
  where a.target_type = 'store'
    and room.hidden_at is not null
    and a.target_id is distinct from first_store.id::text
    and not exists (
      select 1
      from public.company_policy_assignments as other
      where other.policy_id = a.policy_id
        and other.target_type = 'store'
        and other.target_id = first_store.id::text
    )
) as mapped
where assignment.ctid = mapped.assignment_ctid;

update public.forms as form
set settings = jsonb_set(
  coalesce(form.settings, '{}'::jsonb),
  '{distribution,store_ids}',
  to_jsonb(array[first_store.id]::text[]),
  true
)
from (
  select
    f.id as form_id,
    store.id
  from public.forms as f
  join lateral (
    select candidate.id
    from public.stores as candidate
    where candidate.company_id = f.company_id
      and candidate.archived_at is null
      and lower(regexp_replace(trim(candidate.name), '\s+', ' ', 'g')) not in ('walk-in', 'walk in', 'walkin')
    order by candidate.created_at, candidate.id
    limit 1
  ) as store on true
  where f.company_id is not null
    and coalesce(f.settings #>> '{distribution,record_kind}', '') = 'list'
    and (
      jsonb_typeof(f.settings #> '{distribution,store_ids}') is distinct from 'array'
      or jsonb_array_length(coalesce(f.settings #> '{distribution,store_ids}', '[]'::jsonb)) = 0
    )
    and (
      select count(*)
      from public.stores as candidate
      where candidate.company_id = f.company_id
        and candidate.archived_at is null
        and lower(regexp_replace(trim(candidate.name), '\s+', ' ', 'g')) not in ('walk-in', 'walk in', 'walkin')
    ) = 1
) as first_store
where form.id = first_store.form_id;
