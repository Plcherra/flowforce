-- Core events
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null check (event_type in ('meeting','vendor_visit','session','custom')),
  location text,
  start_time timestamptz not null,
  end_time   timestamptz not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Participants
create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text default 'attendee',
  rsvp_status text default 'yes' check (rsvp_status in ('yes','no','maybe'))
);

-- Vendor visits
create table if not exists public.vendor_visits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vendor_name text not null,
  service_type text,
  contact_email text,
  contact_phone text,
  location text,
  start_time timestamptz not null,
  end_time   timestamptz not null,
  description text,
  integration_id text,
  integration_type text check (integration_type in ('website','partner_api','manual')),
  linked_event_id uuid references public.calendar_events(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Back-compat views so existing REST calls stop 404'ing
create or replace view public.vendor_event as
select id, vendor_name, service_type, location, start_time, end_time, description, company_id
from public.vendor_visits;

create or replace view public.calendar_events_full as
select e.*,
       coalesce(json_agg(p.*) filter (where p.id is not null), '[]'::json) as participants
from public.calendar_events e
left join public.event_participants p on p.event_id = e.id
group by e.id;

-- RLS
alter table public.calendar_events enable row level security;
alter table public.event_participants enable row level security;
alter table public.vendor_visits enable row level security;

-- Simple permissive policies (tighten later)
create policy "events_select" on public.calendar_events
  for select using (auth.uid() is not null);
create policy "events_insert" on public.calendar_events
  for insert with check (auth.uid() = created_by or created_by is null);
create policy "vendor_select" on public.vendor_visits
  for select using (auth.uid() is not null);
create policy "vendor_insert" on public.vendor_visits
  for insert with check (auth.uid() is not null);