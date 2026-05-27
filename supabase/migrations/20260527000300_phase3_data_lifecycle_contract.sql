-- Phase 03.07: data lifecycle and retention readiness.
-- Adds export tracking, legal holds, and lifecycle metadata without deleting data.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.company_data_exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  status text not null default 'requested',
  export_scope text not null default 'company',
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  download_path text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_data_exports_status_check
    check (status in ('requested', 'processing', 'ready', 'failed', 'expired')),
  constraint company_data_exports_scope_check
    check (export_scope in ('company', 'module', 'legal_hold'))
);

create table if not exists public.lifecycle_legal_holds (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  target_table text not null,
  target_record_id text,
  reason text not null,
  status text not null default 'active',
  held_by uuid references public.profiles(id) on delete set null,
  released_by uuid references public.profiles(id) on delete set null,
  hold_until timestamptz,
  released_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lifecycle_legal_holds_status_check
    check (status in ('active', 'released'))
);

create index if not exists company_data_exports_company_id_idx
on public.company_data_exports (company_id);

create index if not exists company_data_exports_status_idx
on public.company_data_exports (company_id, status);

create index if not exists lifecycle_legal_holds_company_id_idx
on public.lifecycle_legal_holds (company_id);

create index if not exists lifecycle_legal_holds_active_idx
on public.lifecycle_legal_holds (company_id, target_table, target_record_id)
where status = 'active';

drop trigger if exists set_company_data_exports_updated_at on public.company_data_exports;
create trigger set_company_data_exports_updated_at
before update on public.company_data_exports
for each row execute function public.set_updated_at();

drop trigger if exists set_lifecycle_legal_holds_updated_at on public.lifecycle_legal_holds;
create trigger set_lifecycle_legal_holds_updated_at
before update on public.lifecycle_legal_holds
for each row execute function public.set_updated_at();

grant select, insert, update on public.company_data_exports to authenticated;
grant select, insert, update on public.lifecycle_legal_holds to authenticated;

alter table public.company_data_exports enable row level security;
alter table public.lifecycle_legal_holds enable row level security;

drop policy if exists "Company admins can manage data exports" on public.company_data_exports;
create policy "Company admins can manage data exports"
on public.company_data_exports
for all
to authenticated
using (public.current_user_is_company_admin(company_id))
with check (public.current_user_is_company_admin(company_id));

drop policy if exists "Company admins can manage lifecycle legal holds" on public.lifecycle_legal_holds;
create policy "Company admins can manage lifecycle legal holds"
on public.lifecycle_legal_holds
for all
to authenticated
using (public.current_user_is_company_admin(company_id))
with check (public.current_user_is_company_admin(company_id));

do $$
declare
  lifecycle_table text;
  lifecycle_tables text[] := array[
    'companies',
    'profiles',
    'company_members',
    'system_settings',
    'audit_log',
    'tasks',
    'task_comments',
    'messages',
    'message_channels',
    'forms',
    'form_submissions',
    'documents',
    'files',
    'custom_reports',
    'schedules',
    'time_off_requests',
    'expenses',
    'payments',
    'purchase_orders',
    'inventory_items',
    'inv_items',
    'inv_counts',
    'inv_purchases',
    'inv_waste',
    'ops_issues',
    'daily_insights',
    'learning_completions'
  ];
begin
  foreach lifecycle_table in array lifecycle_tables loop
    if to_regclass(format('public.%I', lifecycle_table)) is not null then
      execute format('alter table public.%I add column if not exists lifecycle_status text not null default %L', lifecycle_table, 'active');
      execute format('alter table public.%I add column if not exists archived_at timestamptz', lifecycle_table);
      execute format('alter table public.%I add column if not exists deleted_at timestamptz', lifecycle_table);
      execute format('alter table public.%I add column if not exists retention_hold_until timestamptz', lifecycle_table);

      if not exists (
        select 1
        from pg_constraint
        where conrelid = format('public.%I', lifecycle_table)::regclass
          and conname = lifecycle_table || '_lifecycle_status_check'
      ) then
        execute format(
          'alter table public.%I add constraint %I check (lifecycle_status in (%L, %L, %L, %L, %L, %L))',
          lifecycle_table,
          lifecycle_table || '_lifecycle_status_check',
          'active',
          'archive_pending',
          'archived',
          'delete_pending',
          'deleted',
          'legal_hold'
        );
      end if;

      execute format(
        'create index if not exists %I on public.%I (lifecycle_status)',
        lifecycle_table || '_lifecycle_status_idx',
        lifecycle_table
      );

      if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = lifecycle_table
          and column_name = 'company_id'
      ) then
        execute format(
          'create index if not exists %I on public.%I (company_id) where deleted_at is null',
          lifecycle_table || '_active_company_idx',
          lifecycle_table
        );
      elsif lifecycle_table = 'companies' then
        execute 'create index if not exists companies_active_idx on public.companies (id) where deleted_at is null';
      end if;
    end if;
  end loop;
end $$;
