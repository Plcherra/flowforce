-- Phase 09.02: CSV import framework.
-- Tenant-scoped migration batches keep mapping, validation, row outcomes,
-- rollback references, and audit entries for adoption-critical imports.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.integration_import_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_key text not null,
  source_filename text not null,
  source_checksum text,
  status text not null default 'uploaded',
  mapping jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  error_report jsonb not null default '[]'::jsonb,
  rollback_status text not null default 'none',
  rollback_reference text,
  started_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_import_batches_template_key_check
    check (template_key in ('employees', 'inventory_items', 'suppliers', 'schedules', 'tasks')),
  constraint integration_import_batches_status_check
    check (status in ('uploaded', 'mapped', 'validated', 'importing', 'completed', 'failed', 'rolled_back')),
  constraint integration_import_batches_rollback_status_check
    check (rollback_status in ('none', 'available', 'started', 'completed', 'failed'))
);

create table if not exists public.integration_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.integration_import_batches(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  row_number integer not null,
  source_row jsonb not null default '{}'::jsonb,
  mapped_row jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  error_report jsonb not null default '[]'::jsonb,
  target_table text,
  target_record_id text,
  rollback_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_import_rows_status_check
    check (status in ('pending', 'valid', 'invalid', 'imported', 'skipped', 'failed', 'rolled_back')),
  unique (batch_id, row_number)
);

create index if not exists integration_import_batches_company_idx
on public.integration_import_batches (company_id, created_at desc, status);

create index if not exists integration_import_batches_template_idx
on public.integration_import_batches (company_id, template_key, status);

create index if not exists integration_import_rows_batch_idx
on public.integration_import_rows (batch_id, row_number);

create index if not exists integration_import_rows_company_status_idx
on public.integration_import_rows (company_id, status, target_table);

drop trigger if exists set_integration_import_batches_updated_at on public.integration_import_batches;
create trigger set_integration_import_batches_updated_at
before update on public.integration_import_batches
for each row execute function public.set_updated_at();

drop trigger if exists set_integration_import_rows_updated_at on public.integration_import_rows;
create trigger set_integration_import_rows_updated_at
before update on public.integration_import_rows
for each row execute function public.set_updated_at();

alter table public.integration_import_batches enable row level security;
alter table public.integration_import_rows enable row level security;

drop policy if exists "Company members can manage integration import batches" on public.integration_import_batches;
create policy "Company members can manage integration import batches"
on public.integration_import_batches
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage integration import rows" on public.integration_import_rows;
create policy "Company members can manage integration import rows"
on public.integration_import_rows
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

grant select, insert, update, delete on public.integration_import_batches to authenticated;
grant select, insert, update, delete on public.integration_import_rows to authenticated;

create or replace view public.integration_import_batch_summary_v
with (security_invoker = true)
as
select
  batch.id,
  batch.company_id,
  batch.template_key,
  batch.source_filename,
  batch.status,
  batch.rollback_status,
  batch.rollback_reference,
  batch.started_by,
  batch.completed_at,
  batch.rolled_back_at,
  batch.created_at,
  count(row_result.id)::integer as total_rows,
  count(row_result.id) filter (where row_result.status in ('valid', 'imported', 'rolled_back'))::integer as accepted_rows,
  count(row_result.id) filter (where row_result.status in ('invalid', 'failed'))::integer as failed_rows,
  count(row_result.id) filter (where row_result.status = 'imported')::integer as imported_rows,
  jsonb_build_object(
    'summary', batch.summary,
    'error_report', batch.error_report
  ) as report
from public.integration_import_batches batch
left join public.integration_import_rows row_result
  on row_result.batch_id = batch.id
where batch.company_id in (select public.current_user_company_ids())
group by batch.id;

grant select on public.integration_import_batch_summary_v to authenticated;

create or replace function public.record_integration_import_audit(
  p_company_id uuid,
  p_batch_id uuid,
  p_action text,
  p_status text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to audit integration imports for this company'
      using errcode = '42501';
  end if;

  if p_action not in (
    'integration.csv_import.started',
    'integration.csv_import.validated',
    'integration.csv_import.completed',
    'integration.csv_import.failed',
    'integration.csv_import.rolled_back'
  ) then
    raise exception 'Unsupported integration import audit action'
      using errcode = '22023';
  end if;

  insert into public.audit_log (
    company_id,
    actor_id,
    action,
    table_name,
    record_id,
    new_values,
    metadata
  )
  values (
    p_company_id,
    auth.uid(),
    p_action,
    'integration_import_batches',
    p_batch_id::text,
    jsonb_build_object('status', p_status),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.record_integration_import_audit(uuid, uuid, text, text, jsonb) from public;
grant execute on function public.record_integration_import_audit(uuid, uuid, text, text, jsonb) to authenticated, service_role;

create or replace function public.mark_integration_import_batch_status(
  p_batch_id uuid,
  p_status text,
  p_summary jsonb default '{}'::jsonb,
  p_error_report jsonb default '[]'::jsonb,
  p_rollback_reference text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_batch public.integration_import_batches%rowtype;
  audit_action text;
begin
  select *
  into target_batch
  from public.integration_import_batches
  where id = p_batch_id;

  if target_batch.id is null then
    raise exception 'Integration import batch not found'
      using errcode = 'P0002';
  end if;

  if target_batch.company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to update this integration import batch'
      using errcode = '42501';
  end if;

  if p_status not in ('uploaded', 'mapped', 'validated', 'importing', 'completed', 'failed', 'rolled_back') then
    raise exception 'Unsupported integration import batch status'
      using errcode = '22023';
  end if;

  update public.integration_import_batches
  set
    status = p_status,
    summary = coalesce(p_summary, '{}'::jsonb),
    error_report = coalesce(p_error_report, '[]'::jsonb),
    rollback_reference = coalesce(p_rollback_reference, rollback_reference),
    rollback_status = case
      when p_status = 'completed' and coalesce(p_rollback_reference, rollback_reference) is not null then 'available'
      when p_status = 'rolled_back' then 'completed'
      else rollback_status
    end,
    completed_at = case when p_status in ('completed', 'failed') then now() else completed_at end,
    rolled_back_at = case when p_status = 'rolled_back' then now() else rolled_back_at end
  where id = p_batch_id
  returning * into target_batch;

  audit_action := case
    when p_status = 'validated' then 'integration.csv_import.validated'
    when p_status = 'completed' then 'integration.csv_import.completed'
    when p_status = 'failed' then 'integration.csv_import.failed'
    when p_status = 'rolled_back' then 'integration.csv_import.rolled_back'
    else 'integration.csv_import.started'
  end;

  perform public.record_integration_import_audit(
    target_batch.company_id,
    target_batch.id,
    audit_action,
    p_status,
    jsonb_build_object(
      'template_key', target_batch.template_key,
      'source_filename', target_batch.source_filename,
      'summary', target_batch.summary,
      'error_count', jsonb_array_length(target_batch.error_report)
    )
  );

  return jsonb_build_object(
    'id', target_batch.id,
    'company_id', target_batch.company_id,
    'template_key', target_batch.template_key,
    'status', target_batch.status,
    'rollback_status', target_batch.rollback_status,
    'rollback_reference', target_batch.rollback_reference
  );
end;
$$;

revoke all on function public.mark_integration_import_batch_status(uuid, text, jsonb, jsonb, text) from public;
grant execute on function public.mark_integration_import_batch_status(uuid, text, jsonb, jsonb, text) to authenticated, service_role;

create or replace function public.integration_import_readiness()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'has_batch_ledger', to_regclass('public.integration_import_batches') is not null,
    'has_row_ledger', to_regclass('public.integration_import_rows') is not null,
    'has_summary_view', to_regclass('public.integration_import_batch_summary_v') is not null,
    'has_status_function', to_regprocedure('public.mark_integration_import_batch_status(uuid,text,jsonb,jsonb,text)') is not null,
    'templates', jsonb_build_array('employees', 'inventory_items', 'suppliers', 'schedules', 'tasks')
  );
$$;

grant execute on function public.integration_import_readiness() to authenticated, service_role;
