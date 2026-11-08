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
  ),
  constraint hiring_blocks_path check (
    storage_path is null
    or starts_with(storage_path, company_id::text || '/')
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
  ),
  constraint hiring_responses_path check (
    storage_path is null
    or starts_with(storage_path, company_id::text || '/' || profile_id::text || '/')
  )
);

create index if not exists hiring_blocks_company_idx
  on public.hiring_blocks (company_id, sort_order);
create index if not exists hiring_responses_profile_idx
  on public.hiring_responses (profile_id);

create or replace function public.guard_hiring_response()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  block_company uuid;
  can_verify boolean;
begin
  select block.company_id
  into block_company
  from public.hiring_blocks as block
  where block.id = new.block_id;

  if block_company is null or block_company is distinct from new.company_id then
    raise exception 'hiring block is not in this shop' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id
      or new.block_id is distinct from old.block_id
      or new.profile_id is distinct from old.profile_id
    then
      raise exception 'hiring response identity is fixed' using errcode = '42501';
    end if;
  end if;

  can_verify := public.current_user_has_any_permission(
    new.company_id,
    array['systemSettings', 'documents.manage', 'manageUsers']
  );

  if tg_op = 'INSERT' then
    if (
      new.status = 'verified'
      or new.verified_at is not null
      or new.verified_by is not null
    ) and not can_verify then
      raise exception 'only a leader can verify a hiring response' using errcode = '42501';
    end if;
  elsif (
    (new.status is distinct from old.status and new.status = 'verified')
    or new.verified_at is distinct from old.verified_at
    or new.verified_by is distinct from old.verified_by
  ) and not can_verify then
    raise exception 'only a leader can verify a hiring response' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_hiring_response() from public, anon;
grant execute on function public.guard_hiring_response() to authenticated, service_role;

drop trigger if exists hiring_responses_guard on public.hiring_responses;
create trigger hiring_responses_guard
before insert or update on public.hiring_responses
for each row execute function public.guard_hiring_response();

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
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(
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
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(
    company_id,
    array['systemSettings', 'onboarding.create', 'documents.manage']
  )
)
with check (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(
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
  and exists (
    select 1
    from public.hiring_blocks as block
    where block.id = hiring_responses.block_id
      and block.company_id = hiring_responses.company_id
  )
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
  and exists (
    select 1
    from public.hiring_blocks as block
    where block.id = hiring_responses.block_id
      and block.company_id = hiring_responses.company_id
  )
);

drop policy if exists "Hires update own hiring responses" on public.hiring_responses;
create policy "Hires update own hiring responses"
on public.hiring_responses
for update
to authenticated
using (
  profile_id = auth.uid()
  and company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.hiring_blocks as block
    where block.id = hiring_responses.block_id
      and block.company_id = hiring_responses.company_id
  )
)
with check (
  profile_id = auth.uid()
  and company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.hiring_blocks as block
    where block.id = hiring_responses.block_id
      and block.company_id = hiring_responses.company_id
  )
);

drop policy if exists "Leaders verify hiring responses" on public.hiring_responses;
create policy "Leaders verify hiring responses"
on public.hiring_responses
for update
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.hiring_blocks as block
    where block.id = hiring_responses.block_id
      and block.company_id = hiring_responses.company_id
  )
  and public.current_user_has_any_permission(
    company_id,
    array['systemSettings', 'documents.manage', 'manageUsers']
  )
)
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.hiring_blocks as block
    where block.id = hiring_responses.block_id
      and block.company_id = hiring_responses.company_id
  )
  and public.current_user_has_any_permission(
    company_id,
    array['systemSettings', 'documents.manage', 'manageUsers']
  )
);

notify pgrst, 'reload schema';
