-- Phase 1 forward migration: remove stabilization-wide public access and
-- establish core tenant RLS helpers/policies on the already-restored schema.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  general jsonb not null default '{}'::jsonb,
  security jsonb not null default '{}'::jsonb,
  localization jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  integrations jsonb not null default '{}'::jsonb,
  appearance jsonb not null default '{}'::jsonb,
  admin_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_settings
  add column if not exists company_id uuid,
  add column if not exists general jsonb not null default '{}'::jsonb,
  add column if not exists security jsonb not null default '{}'::jsonb,
  add column if not exists localization jsonb not null default '{}'::jsonb,
  add column if not exists notifications jsonb not null default '{}'::jsonb,
  add column if not exists integrations jsonb not null default '{}'::jsonb,
  add column if not exists appearance jsonb not null default '{}'::jsonb,
  add column if not exists admin_config jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists system_settings_company_id_key
on public.system_settings (company_id);

create index if not exists system_settings_company_id_idx
on public.system_settings (company_id);

drop trigger if exists set_system_settings_updated_at on public.system_settings;
create trigger set_system_settings_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

alter table public.company_members add column if not exists id uuid;
update public.company_members set id = gen_random_uuid() where id is null;
alter table public.company_members alter column id set default gen_random_uuid();
alter table public.company_members alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.company_members'::regclass
      and contype = 'p'
  ) then
    alter table public.company_members
      add constraint company_members_pkey primary key (id);
  end if;
end $$;

create unique index if not exists company_members_company_user_key
on public.company_members (company_id, user_id);

create or replace function public.current_user_company_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select p.company_id
  from public.profiles p
  where p.id = auth.uid()
    and p.company_id is not null
  union
  select cm.company_id
  from public.company_members cm
  where cm.user_id = auth.uid()
    and cm.company_id is not null;
$$;

create or replace function public.current_user_is_company_admin(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = target_company_id
      and (
        p.is_company_admin is true
        or p.role in ('owner', 'administrator', 'admin', 'company_admin')
      )
  )
  or exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.company_id = target_company_id
      and cm.role in ('owner', 'administrator', 'admin', 'company_admin')
  );
$$;

revoke all on function public.current_user_company_ids() from public;
revoke all on function public.current_user_is_company_admin(uuid) from public;
grant execute on function public.current_user_company_ids() to authenticated, service_role;
grant execute on function public.current_user_is_company_admin(uuid) to authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;

-- Remove the broad stabilization grants from the restore migration.
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from anon;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on tables from authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant select, update on public.companies to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.company_members to authenticated;
grant select, insert, update, delete on public.company_roles to authenticated;
grant select, insert, update, delete on public.positions to authenticated;
grant select, insert, update on public.system_settings to authenticated;
grant select, insert, update, delete on public.company_invites to authenticated;
grant select, insert, update, delete on public.user_permissions to authenticated;
grant insert on public.audit_log to authenticated;
grant usage on all sequences in schema public to authenticated;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_members enable row level security;
alter table public.company_roles enable row level security;
alter table public.positions enable row level security;
alter table public.system_settings enable row level security;
alter table public.company_invites enable row level security;
alter table public.user_permissions enable row level security;
alter table public.audit_log enable row level security;
alter table public.system_logs enable row level security;

drop policy if exists "Company members can read companies" on public.companies;
create policy "Company members can read companies"
on public.companies
for select
to authenticated
using (id in (select public.current_user_company_ids()));

drop policy if exists "Company admins can update companies" on public.companies;
create policy "Company admins can update companies"
on public.companies
for update
to authenticated
using (public.current_user_is_company_admin(id))
with check (public.current_user_is_company_admin(id));

drop policy if exists "Users can read company profiles" on public.profiles;
create policy "Users can read company profiles"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or company_id in (select public.current_user_company_ids())
);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Company admins can update company profiles" on public.profiles;
create policy "Company admins can update company profiles"
on public.profiles
for update
to authenticated
using (public.current_user_is_company_admin(company_id))
with check (public.current_user_is_company_admin(company_id));

drop policy if exists "Company members can read memberships" on public.company_members;
create policy "Company members can read memberships"
on public.company_members
for select
to authenticated
using (
  user_id = auth.uid()
  or company_id in (select public.current_user_company_ids())
);

drop policy if exists "Company admins can manage memberships" on public.company_members;
create policy "Company admins can manage memberships"
on public.company_members
for all
to authenticated
using (public.current_user_is_company_admin(company_id))
with check (public.current_user_is_company_admin(company_id));

drop policy if exists "Company members can read company roles" on public.company_roles;
create policy "Company members can read company roles"
on public.company_roles
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company admins can manage company roles" on public.company_roles;
create policy "Company admins can manage company roles"
on public.company_roles
for all
to authenticated
using (public.current_user_is_company_admin(company_id))
with check (public.current_user_is_company_admin(company_id));

drop policy if exists "Company members can read positions" on public.positions;
create policy "Company members can read positions"
on public.positions
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company admins can manage positions" on public.positions;
create policy "Company admins can manage positions"
on public.positions
for all
to authenticated
using (public.current_user_is_company_admin(company_id))
with check (public.current_user_is_company_admin(company_id));

drop policy if exists "Company members can read system settings" on public.system_settings;
create policy "Company members can read system settings"
on public.system_settings
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company admins can manage system settings" on public.system_settings;
create policy "Company admins can manage system settings"
on public.system_settings
for all
to authenticated
using (public.current_user_is_company_admin(company_id))
with check (public.current_user_is_company_admin(company_id));

drop policy if exists "Company admins can manage invites" on public.company_invites;
create policy "Company admins can manage invites"
on public.company_invites
for all
to authenticated
using (public.current_user_is_company_admin(company_id))
with check (public.current_user_is_company_admin(company_id));

drop policy if exists "Users can read own permissions" on public.user_permissions;
create policy "Users can read own permissions"
on public.user_permissions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Company admins can manage user permissions" on public.user_permissions;
create policy "Company admins can manage user permissions"
on public.user_permissions
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = user_permissions.user_id
      and public.current_user_is_company_admin(p.company_id)
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = user_permissions.user_id
      and public.current_user_is_company_admin(p.company_id)
  )
);

drop policy if exists "Company members can write audit log" on public.audit_log;
create policy "Company members can write audit log"
on public.audit_log
for insert
to authenticated
with check (company_id in (select public.current_user_company_ids()));
