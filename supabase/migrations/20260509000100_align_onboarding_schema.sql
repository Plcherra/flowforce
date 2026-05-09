create extension if not exists pgcrypto with schema extensions;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies
  add column if not exists phone text,
  add column if not exists industry text,
  add column if not exists size text,
  add column if not exists description text,
  add column if not exists primary_color text default '#3b82f6',
  add column if not exists secondary_color text default '#1e40af',
  add column if not exists template_id text,
  add column if not exists template_name text,
  add column if not exists enabled_sections jsonb not null default '[]'::jsonb,
  add column if not exists template_config jsonb not null default '{}'::jsonb,
  add column if not exists custom_roles jsonb not null default '[]'::jsonb,
  add column if not exists positions jsonb not null default '[]'::jsonb,
  add column if not exists registration_complete boolean not null default false,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists currency text default 'USD',
  add column if not exists timezone text default 'UTC',
  add column if not exists working_hours jsonb default '{"start":"09:00","end":"17:00","days":["monday","tuesday","wednesday","thursday","friday"]}'::jsonb;

create unique index if not exists companies_slug_key on public.companies(slug);
create index if not exists companies_owner_id_idx on public.companies(owner_id);
create index if not exists companies_created_by_idx on public.companies(created_by);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  first_name text not null default '',
  last_name text not null default '',
  avatar_url text,
  role text not null default 'employee',
  employee_id text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists is_company_admin boolean not null default false,
  add column if not exists employment_status text not null default 'active',
  add column if not exists department_id uuid,
  add column if not exists position_id uuid,
  add column if not exists role_id uuid,
  add column if not exists hire_date date,
  add column if not exists birth_date date,
  add column if not exists address jsonb,
  add column if not exists emergency_contact jsonb,
  add column if not exists invitation_token text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

update public.profiles
set
  first_name = coalesce(first_name, ''),
  last_name = coalesce(last_name, ''),
  email = coalesce(email, ''),
  role = coalesce(role, 'employee'),
  employment_status = coalesce(employment_status, 'active');

alter table public.profiles
  alter column first_name set not null,
  alter column last_name set not null,
  alter column email set default '',
  alter column email set not null,
  alter column role set default 'employee',
  alter column role set not null,
  alter column employment_status set default 'active',
  alter column employment_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_company_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in (
        'owner',
        'administrator',
        'admin',
        'company_admin',
        'manager',
        'supervisor',
        'employee',
        'staff'
      ));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_employment_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_employment_status_check
      check (employment_status in (
        'active',
        'inactive',
        'on_leave',
        'terminated'
      ));
  end if;
end $$;

create index if not exists profiles_company_id_idx on public.profiles(company_id);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_email_idx on public.profiles(email);

alter table public.companies enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Users can read their company" on public.companies;
create policy "Users can read their company"
on public.companies
for select
to authenticated
using (
  id in (
    select profiles.company_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
