-- Phase 04.10: make the report inbox upload/extraction schema explicit.

alter table public.files
  add column if not exists uploader_id uuid,
  add column if not exists filename text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists storage_path text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists uploaded_at timestamptz default now();

alter table public.documents
  add column if not exists file_id uuid,
  add column if not exists title text,
  add column if not exists doc_date date,
  add column if not exists source text,
  add column if not exists language text,
  add column if not exists meta jsonb default '{}'::jsonb,
  add column if not exists processing_state text default 'pending',
  add column if not exists processing_error text,
  add column if not exists text_extracted text;

alter table public.events
  add column if not exists document_id uuid,
  add column if not exists summary text,
  add column if not exists event_type text,
  add column if not exists severity text default 'info',
  add column if not exists occurred_at timestamptz,
  add column if not exists details jsonb default '{}'::jsonb,
  add column if not exists tags text[] default '{}'::text[];

create index if not exists files_company_id_uploaded_at_idx
  on public.files (company_id, uploaded_at desc);

create index if not exists documents_company_id_created_at_idx
  on public.documents (company_id, created_at desc);

create index if not exists documents_company_id_processing_state_idx
  on public.documents (company_id, processing_state);

create index if not exists events_company_id_document_id_idx
  on public.events (company_id, document_id);

create index if not exists tasks_company_id_origin_document_id_idx
  on public.tasks (company_id, origin_document_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_processing_state_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_processing_state_check
      check (processing_state in ('pending', 'processing', 'ready', 'error'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_severity_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_severity_check
      check (severity in ('info', 'warning', 'critical'));
  end if;
end $$;
