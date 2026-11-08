-- Flexible new-hire blocks and wider private-file types.
-- Additive: new tables, wider checks, bucket MIME lists. No row rewrites.
-- Do not apply until reviewed. Files stay at 10 MB.

alter table public.employee_onboarding_documents
  drop constraint if exists employee_onboarding_documents_mime;

alter table public.employee_onboarding_documents
  add constraint employee_onboarding_documents_mime check (
    mime_type in (
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    )
  );

alter table public.employee_onboarding_progress
  drop constraint if exists employee_onboarding_progress_mime;

alter table public.employee_onboarding_progress
  add constraint employee_onboarding_progress_mime check (
    mime_type is null or mime_type in (
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    )
  );

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]
where id in ('onboarding-company-files', 'onboarding-employee-files');

create table if not exists public.hiring_blocks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  required boolean not null default true,
  sort_order integer not null default 0,
  link_url text,
  storage_path text,
  file_name text,
  mime_type text,
  byte_size integer,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hiring_blocks_title_not_blank check (length(btrim(title)) > 0),
  constraint hiring_blocks_kind check (
    kind in (
      'share_file', 'share_card', 'collect_file', 'collect_text', 'collect_long_text',
      'collect_yes_no', 'collect_date', 'collect_ack', 'collect_link'
    )
  ),
  constraint hiring_blocks_byte_size check (
    byte_size is null or (byte_size > 0 and byte_size <= 10485760)
  )
);

create table if not exists public.hiring_responses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  block_id uuid not null references public.hiring_blocks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  text_value text,
  bool_value boolean,
  date_value date,
  storage_path text,
  file_name text,
  mime_type text,
  byte_size integer,
  completed_at timestamptz,
  verified_at timestamptz,
  verified_by uuid,
  constraint hiring_responses_status check (status in ('pending', 'done', 'verified')),
  constraint hiring_responses_one unique (block_id, profile_id),
  constraint hiring_responses_byte_size check (
    byte_size is null or (byte_size > 0 and byte_size <= 10485760)
  )
);

create index if not exists hiring_blocks_company_idx
  on public.hiring_blocks (company_id, sort_order);
create index if not exists hiring_responses_profile_idx
  on public.hiring_responses (profile_id);

alter table public.hiring_blocks enable row level security;
alter table public.hiring_responses enable row level security;

revoke all on table public.hiring_blocks from public, anon;
revoke all on table public.hiring_responses from public, anon;
grant select, insert, update on table public.hiring_blocks to authenticated, service_role;
grant select, insert, update on table public.hiring_responses to authenticated, service_role;

drop policy if exists "Members read hiring blocks" on public.hiring_blocks;
create policy "Members read hiring blocks"
on public.hiring_blocks
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Leaders write hiring blocks" on public.hiring_blocks;
create policy "Leaders write hiring blocks"
on public.hiring_blocks
for insert
to authenticated
with check (
  public.current_user_has_any_permission(
    company_id,
    array['systemSettings', 'onboarding.create', 'documents.manage']
  )
);

drop policy if exists "Leaders update hiring blocks" on public.hiring_blocks;
create policy "Leaders update hiring blocks"
on public.hiring_blocks
for update
to authenticated
using (
  public.current_user_has_any_permission(
    company_id,
    array['systemSettings', 'onboarding.create', 'documents.manage']
  )
)
with check (
  public.current_user_has_any_permission(
    company_id,
    array['systemSettings', 'onboarding.create', 'documents.manage']
  )
);

drop policy if exists "Members read hiring responses" on public.hiring_responses;
create policy "Members read hiring responses"
on public.hiring_responses
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    profile_id = auth.uid()
    or public.current_user_has_any_permission(
      company_id,
      array['systemSettings', 'documents.manage', 'manageUsers']
    )
  )
);

drop policy if exists "Hires write own hiring responses" on public.hiring_responses;
create policy "Hires write own hiring responses"
on public.hiring_responses
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and company_id in (select public.current_user_company_ids())
);

drop policy if exists "Hires update own hiring responses" on public.hiring_responses;
create policy "Hires update own hiring responses"
on public.hiring_responses
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "Leaders verify hiring responses" on public.hiring_responses;
create policy "Leaders verify hiring responses"
on public.hiring_responses
for update
to authenticated
using (
  public.current_user_has_any_permission(
    company_id,
    array['systemSettings', 'documents.manage', 'manageUsers']
  )
)
with check (
  public.current_user_has_any_permission(
    company_id,
    array['systemSettings', 'documents.manage', 'manageUsers']
  )
);

notify pgrst, 'reload schema';
