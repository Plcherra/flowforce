create extension if not exists "uuid-ossp";

drop view if exists public.vendor_event;

-- Core calendar events (idempotent to avoid clobbering existing schema)
create table if not exists public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id) on delete cascade,
  title text not null,
  description text,
  event_type text check (event_type in ('meeting','vendor_visit','session','custom')),
  location text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.event_participants (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.calendar_events(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role text default 'attendee',
  rsvp_status text check (rsvp_status in ('yes','no','maybe')) default 'yes'
);

create table if not exists public.vendor_visits (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id) on delete cascade,
  vendor_name text not null,
  service_type text,
  contact_email text,
  contact_phone text,
  location text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  description text,
  integration_id text,
  integration_type text check (integration_type in ('website','partner_api','manual')),
  linked_event_id uuid references public.calendar_events(id) on delete set null,
  created_at timestamptz default now()
);

create or replace view public.vendor_event as
select
  id,
  vendor_name,
  service_type,
  location,
  start_time,
  end_time,
  description,
  company_id
from public.vendor_visits;

create or replace view public.calendar_events_full as
select
  e.*,
  json_agg(p.*) filter (where p.id is not null) as participants
from public.calendar_events e
left join public.event_participants p on p.event_id = e.id
group by e.id;

alter table public.calendar_events enable row level security;
alter table public.vendor_visits enable row level security;

drop policy if exists "Allow company events view" on public.calendar_events;
drop policy if exists "Allow insert/update by event creators" on public.calendar_events;
drop policy if exists "Allow company vendor visits view" on public.vendor_visits;

drop policy if exists "Allow event access" on public.calendar_events;
drop policy if exists "Allow vendor access" on public.vendor_visits;

create policy "Allow company events view" on public.calendar_events
  for select using (auth.uid() is not null);

create policy "Allow insert/update by event creators" on public.calendar_events
  for all using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "Allow company vendor visits view" on public.vendor_visits
  for select using (auth.uid() is not null);
