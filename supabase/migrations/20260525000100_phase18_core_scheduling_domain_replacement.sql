-- Phase 18 forward migration: begin replacing the legacy restore migration
-- with reviewed domain ownership for core tenant/auth and scheduling views.

create extension if not exists pgcrypto with schema extensions;

alter table public.company_members alter column added_at set default now();
alter table public.company_roles alter column is_active set default true;
alter table public.company_roles alter column is_system_role set default false;
alter table public.company_roles alter column permissions set default '{}'::jsonb;
alter table public.positions alter column is_active set default true;
alter table public.positions alter column permissions set default '{}'::jsonb;
alter table public.system_settings alter column general set default '{}'::jsonb;
alter table public.system_settings alter column security set default '{}'::jsonb;
alter table public.system_settings alter column localization set default '{}'::jsonb;
alter table public.system_settings alter column notifications set default '{}'::jsonb;
alter table public.system_settings alter column integrations set default '{}'::jsonb;
alter table public.system_settings alter column appearance set default '{}'::jsonb;
alter table public.system_settings alter column admin_config set default '{}'::jsonb;
alter table public.audit_log alter column metadata set default '{}'::jsonb;

create unique index if not exists company_members_company_user_key
on public.company_members (company_id, user_id);

create unique index if not exists system_settings_company_id_key
on public.system_settings (company_id);

do $$
begin
  if not exists (
    select 1
    from public.companies
    where slug is not null
    group by lower(slug)
    having count(*) > 1
  ) then
    create unique index if not exists companies_slug_lower_key
    on public.companies (lower(slug))
    where slug is not null;
  end if;
end
$$;

create index if not exists companies_owner_id_idx on public.companies (owner_id);
create index if not exists companies_created_by_idx on public.companies (created_by);
create index if not exists company_roles_created_by_idx on public.company_roles (created_by);
create index if not exists positions_created_by_idx on public.positions (created_by);
create index if not exists audit_log_actor_id_idx on public.audit_log (actor_id);
create index if not exists company_invites_invited_by_idx on public.company_invites (invited_by);

do $$
begin
  alter table public.company_members
    add constraint company_members_company_id_required
    check (company_id is not null) not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.company_members
    add constraint company_members_user_id_required
    check (user_id is not null) not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.company_members
    add constraint company_members_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.company_members
    add constraint company_members_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.profiles
    add constraint profiles_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.company_roles
    add constraint company_roles_company_id_required
    check (company_id is not null) not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.company_roles
    add constraint company_roles_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.positions
    add constraint positions_company_id_required
    check (company_id is not null) not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.positions
    add constraint positions_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.system_settings
    add constraint system_settings_company_id_required
    check (company_id is not null) not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.system_settings
    add constraint system_settings_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.audit_log
    add constraint audit_log_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.system_logs
    add constraint system_logs_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.company_invites
    add constraint company_invites_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

grant select, insert on public.audit_log to authenticated;

drop policy if exists "Company admins can read audit log" on public.audit_log;
create policy "Company admins can read audit log"
on public.audit_log
for select
to authenticated
using (public.current_user_is_company_admin(company_id));

drop view if exists public.audit_logs;
create view public.audit_logs
with (security_invoker = true)
as
select
  id,
  company_id,
  target_user_id as user_id,
  actor_id as performed_by,
  actor_id,
  target_user_id,
  action,
  table_name,
  record_id,
  old_values,
  new_values,
  metadata,
  created_at,
  updated_at
from public.audit_log;

grant select on public.audit_logs to authenticated;

alter table public.event_participants add column if not exists company_id uuid;

update public.event_participants participant
set company_id = event.company_id
from public.calendar_events event
where participant.company_id is null
  and participant.event_id = event.id::text
  and event.company_id is not null;

create index if not exists event_participants_company_id_idx on public.event_participants (company_id);
create index if not exists event_participants_event_id_idx on public.event_participants (event_id);
create index if not exists event_participants_profile_id_idx on public.event_participants (profile_id);
create index if not exists calendar_events_company_start_time_idx on public.calendar_events (company_id, start_time);
create index if not exists vendor_visits_company_start_time_idx on public.vendor_visits (company_id, start_time);
create index if not exists schedules_company_start_time_idx on public.schedules (company_id, start_time);

create or replace function public.set_event_participant_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.event_id is not null then
    select event.company_id
    into new.company_id
    from public.calendar_events event
    where event.id::text = new.event_id
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists set_event_participant_company_id on public.event_participants;
create trigger set_event_participant_company_id
before insert or update on public.event_participants
for each row execute function public.set_event_participant_company_id();

grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, insert, update, delete on public.event_participants to authenticated;
grant select, insert, update, delete on public.event_shift_links to authenticated;
grant select, insert, update, delete on public.vendor_visits to authenticated;

alter table public.calendar_events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_shift_links enable row level security;
alter table public.vendor_visits enable row level security;

drop policy if exists "Authenticated users can manage scoped restored rows" on public.calendar_events;
drop policy if exists "Company members can manage calendar events" on public.calendar_events;
create policy "Company members can manage calendar events"
on public.calendar_events
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Authenticated users can manage scoped restored rows" on public.event_participants;
drop policy if exists "Company members can manage event participants" on public.event_participants;
create policy "Company members can manage event participants"
on public.event_participants
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.calendar_events event
    where event.id::text = event_participants.event_id
      and event.company_id = event_participants.company_id
  )
  and (
    profile_id is null
    or exists (
      select 1
      from public.profiles profile
      where profile.id = event_participants.profile_id
        and profile.company_id = event_participants.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.event_shift_links;
drop policy if exists "Company members can manage event shift links" on public.event_shift_links;
create policy "Company members can manage event shift links"
on public.event_shift_links
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    event_id is null
    or exists (
      select 1
      from public.calendar_events event
      where event.id::text = event_shift_links.event_id
        and event.company_id = event_shift_links.company_id
    )
  )
  and (
    shift_id is null
    or exists (
      select 1
      from public.schedules schedule
      where schedule.id::text = event_shift_links.shift_id
        and schedule.company_id = event_shift_links.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.vendor_visits;
drop policy if exists "Company members can manage vendor visits" on public.vendor_visits;
create policy "Company members can manage vendor visits"
on public.vendor_visits
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop view if exists public.calendar_events_full;
create view public.calendar_events_full
with (security_invoker = true)
as
select
  event.attendees,
  event.checklist,
  event.color,
  event.company_id,
  event.created_at,
  event.created_by,
  event.description,
  event.end_time,
  event.event_type,
  event.id,
  event.location,
  event.metadata,
  coalesce(participants.participants, '[]'::jsonb) as participants,
  event.related_shift_id,
  event.related_shift_ids,
  event.start_time,
  event.store_id,
  event.title,
  event.updated_at,
  event.vendor
from public.calendar_events event
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'id', participant.id,
      'profile_id', participant.profile_id,
      'role', participant.role,
      'rsvp_status', participant.rsvp_status
    )
    order by participant.id
  ) as participants
  from public.event_participants participant
  where participant.event_id = event.id::text
) participants on true;

drop view if exists public.vendor_event;
create view public.vendor_event
with (security_invoker = true)
as
select
  company_id,
  description,
  end_time,
  start_time::date as event_date,
  end_time::date as event_end_date,
  id,
  location,
  service_type,
  start_time,
  vendor_name
from public.vendor_visits;

drop view if exists public.calendar_unified_view;
create view public.calendar_unified_view
with (security_invoker = true)
as
select
  event.company_id,
  event.created_at,
  event.created_by,
  event.description,
  event.end_time,
  coalesce(event.event_type, 'event') as event_type,
  event.id,
  null::text as service_type,
  event.start_time,
  event.title,
  event.updated_at,
  event.vendor ->> 'id' as vendor_id,
  event.vendor ->> 'name' as vendor_name
from public.calendar_events event
union all
select
  schedule.company_id,
  schedule.created_at,
  schedule.created_by,
  schedule.notes as description,
  schedule.end_time,
  'shift'::text as event_type,
  schedule.id,
  null::text as service_type,
  schedule.start_time,
  schedule.title,
  schedule.updated_at,
  null::text as vendor_id,
  null::text as vendor_name
from public.schedules schedule
union all
select
  vendor.company_id,
  vendor.created_at,
  null::uuid as created_by,
  vendor.description,
  vendor.end_time,
  'vendor'::text as event_type,
  vendor.id,
  vendor.service_type,
  vendor.start_time,
  vendor.vendor_name as title,
  vendor.created_at as updated_at,
  vendor.integration_id as vendor_id,
  vendor.vendor_name
from public.vendor_visits vendor;

grant select on public.calendar_events_full to authenticated;
grant select on public.calendar_unified_view to authenticated;
grant select on public.vendor_event to authenticated;

notify pgrst, 'reload schema';
