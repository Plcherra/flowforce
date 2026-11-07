-- Employee onboarding for people who accept a shop invite.
-- Additive only: new tables, private storage buckets, and policies.
-- Does not update or delete existing rows. Do not apply until reviewed.

create or replace function public.storage_object_segment_id(object_name text, segment integer)
returns uuid
language sql
immutable
as $$
  select case
    when segment > 0
      and split_part(coalesce(object_name, ''), '/', segment) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(object_name, '/', segment)::uuid
    else null::uuid
  end;
$$;

revoke all on function public.storage_object_segment_id(text, integer) from public, anon;
grant execute on function public.storage_object_segment_id(text, integer) to authenticated, service_role;

create table if not exists public.employee_onboarding_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  welcome_title text not null default '',
  welcome_body text not null default '',
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_onboarding_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  byte_size integer not null,
  uploaded_by uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint employee_onboarding_documents_title_not_blank check (length(btrim(title)) > 0),
  constraint employee_onboarding_documents_byte_size check (byte_size > 0 and byte_size <= 10485760),
  constraint employee_onboarding_documents_mime check (
    mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')
  ),
  constraint employee_onboarding_documents_path check (
    starts_with(storage_path, company_id::text || '/' || id::text || '/')
  )
);

create table if not exists public.employee_onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null,
  required boolean not null default true,
  sort_order integer not null default 0,
  document_id uuid references public.employee_onboarding_documents(id) on delete set null,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_onboarding_steps_title_not_blank check (length(btrim(title)) > 0),
  constraint employee_onboarding_steps_kind check (kind in ('acknowledge', 'upload'))
);

create table if not exists public.employee_onboarding_enrollments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  invite_id uuid references public.company_invites(id) on delete set null,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint employee_onboarding_enrollments_status check (status in ('active', 'complete')),
  constraint employee_onboarding_enrollments_profile unique (company_id, profile_id)
);

create table if not exists public.employee_onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  enrollment_id uuid not null references public.employee_onboarding_enrollments(id) on delete cascade,
  step_id uuid not null references public.employee_onboarding_steps(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  acknowledged_at timestamptz,
  storage_path text,
  file_name text,
  mime_type text,
  byte_size integer,
  completed_at timestamptz,
  constraint employee_onboarding_progress_status check (status in ('pending', 'done')),
  constraint employee_onboarding_progress_step unique (enrollment_id, step_id),
  constraint employee_onboarding_progress_byte_size check (
    byte_size is null or (byte_size > 0 and byte_size <= 10485760)
  ),
  constraint employee_onboarding_progress_mime check (
    mime_type is null or mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')
  ),
  constraint employee_onboarding_progress_path check (
    storage_path is null
    or starts_with(storage_path, company_id::text || '/' || profile_id::text || '/')
  )
);

create index if not exists employee_onboarding_documents_company_idx
  on public.employee_onboarding_documents (company_id);
create index if not exists employee_onboarding_steps_company_idx
  on public.employee_onboarding_steps (company_id, sort_order);
create index if not exists employee_onboarding_enrollments_profile_idx
  on public.employee_onboarding_enrollments (profile_id);
create index if not exists employee_onboarding_progress_profile_idx
  on public.employee_onboarding_progress (profile_id);

create or replace function public.guard_employee_onboarding_progress()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  step_kind text;
begin
  if tg_op = 'UPDATE' then
    if new.profile_id is distinct from old.profile_id
      or new.company_id is distinct from old.company_id
      or new.enrollment_id is distinct from old.enrollment_id
      or new.step_id is distinct from old.step_id
    then
      raise exception 'onboarding progress identity is fixed' using errcode = '42501';
    end if;
  end if;

  if new.status = 'done' then
    select kind into step_kind
    from public.employee_onboarding_steps
    where id = new.step_id
      and company_id = new.company_id;

    if step_kind is null then
      raise exception 'onboarding step is not in this shop' using errcode = '23514';
    end if;
    if step_kind = 'upload' and (new.storage_path is null or length(btrim(new.storage_path)) = 0) then
      raise exception 'upload step requires a file' using errcode = '23514';
    end if;
    if step_kind = 'acknowledge' and new.acknowledged_at is null then
      raise exception 'acknowledge step requires confirmation' using errcode = '23514';
    end if;
    if new.completed_at is null then
      new.completed_at = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists employee_onboarding_progress_guard on public.employee_onboarding_progress;
create trigger employee_onboarding_progress_guard
before insert or update on public.employee_onboarding_progress
for each row execute function public.guard_employee_onboarding_progress();

create or replace function public.guard_employee_onboarding_enrollment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.profile_id is distinct from old.profile_id
      or new.company_id is distinct from old.company_id
    then
      raise exception 'onboarding enrollment identity is fixed' using errcode = '42501';
    end if;
    if old.status = 'complete' and new.status is distinct from 'complete' then
      raise exception 'onboarding is already complete' using errcode = '42501';
    end if;
  end if;

  if new.status = 'complete' and (tg_op = 'INSERT' or old.status is distinct from 'complete') then
    if exists (
      select 1
      from public.employee_onboarding_steps as step
      where step.company_id = new.company_id
        and step.archived_at is null
        and step.required
        and not exists (
          select 1
          from public.employee_onboarding_progress as progress
          where progress.enrollment_id = new.id
            and progress.step_id = step.id
            and progress.status = 'done'
        )
    ) then
      raise exception 'required onboarding steps are still open' using errcode = '23514';
    end if;
    if new.completed_at is null then
      new.completed_at = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists employee_onboarding_enrollment_guard on public.employee_onboarding_enrollments;
create trigger employee_onboarding_enrollment_guard
before insert or update on public.employee_onboarding_enrollments
for each row execute function public.guard_employee_onboarding_enrollment();

revoke all on function public.guard_employee_onboarding_progress() from public, anon;
revoke all on function public.guard_employee_onboarding_enrollment() from public, anon;
grant execute on function public.guard_employee_onboarding_progress() to authenticated, service_role;
grant execute on function public.guard_employee_onboarding_enrollment() to authenticated, service_role;

alter table public.employee_onboarding_settings enable row level security;
alter table public.employee_onboarding_documents enable row level security;
alter table public.employee_onboarding_steps enable row level security;
alter table public.employee_onboarding_enrollments enable row level security;
alter table public.employee_onboarding_progress enable row level security;

revoke all on table public.employee_onboarding_settings from public, anon;
revoke all on table public.employee_onboarding_documents from public, anon;
revoke all on table public.employee_onboarding_steps from public, anon;
revoke all on table public.employee_onboarding_enrollments from public, anon;
revoke all on table public.employee_onboarding_progress from public, anon;

grant select, insert, update on table public.employee_onboarding_settings to authenticated, service_role;
grant select, insert, update on table public.employee_onboarding_documents to authenticated, service_role;
grant select, insert, update on table public.employee_onboarding_steps to authenticated, service_role;
grant select, update on table public.employee_onboarding_enrollments to authenticated;
grant select, insert, update, delete on table public.employee_onboarding_enrollments to service_role;
grant select, insert, update on table public.employee_onboarding_progress to authenticated, service_role;

drop policy if exists "Members read onboarding settings" on public.employee_onboarding_settings;
create policy "Members read onboarding settings"
on public.employee_onboarding_settings
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Owners write onboarding settings" on public.employee_onboarding_settings;
create policy "Owners write onboarding settings"
on public.employee_onboarding_settings
for insert
to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(company_id, array['systemSettings'])
);

drop policy if exists "Owners update onboarding settings" on public.employee_onboarding_settings;
create policy "Owners update onboarding settings"
on public.employee_onboarding_settings
for update
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(company_id, array['systemSettings'])
)
with check (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(company_id, array['systemSettings'])
);

drop policy if exists "Members read onboarding documents" on public.employee_onboarding_documents;
create policy "Members read onboarding documents"
on public.employee_onboarding_documents
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Leaders insert onboarding documents" on public.employee_onboarding_documents;
create policy "Leaders insert onboarding documents"
on public.employee_onboarding_documents
for insert
to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(company_id, array['documents.manage', 'systemSettings'])
);

drop policy if exists "Leaders update onboarding documents" on public.employee_onboarding_documents;
create policy "Leaders update onboarding documents"
on public.employee_onboarding_documents
for update
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(company_id, array['documents.manage', 'systemSettings'])
)
with check (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(company_id, array['documents.manage', 'systemSettings'])
);

drop policy if exists "Members read onboarding steps" on public.employee_onboarding_steps;
create policy "Members read onboarding steps"
on public.employee_onboarding_steps
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

drop policy if exists "Owners insert onboarding steps" on public.employee_onboarding_steps;
create policy "Owners insert onboarding steps"
on public.employee_onboarding_steps
for insert
to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(company_id, array['systemSettings'])
);

drop policy if exists "Owners update onboarding steps" on public.employee_onboarding_steps;
create policy "Owners update onboarding steps"
on public.employee_onboarding_steps
for update
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(company_id, array['systemSettings'])
)
with check (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(company_id, array['systemSettings'])
);

drop policy if exists "Members read own onboarding enrollment" on public.employee_onboarding_enrollments;
create policy "Members read own onboarding enrollment"
on public.employee_onboarding_enrollments
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    profile_id = auth.uid()
    or public.current_user_has_any_permission(company_id, array['documents.manage', 'systemSettings'])
  )
);

drop policy if exists "Employees complete own onboarding" on public.employee_onboarding_enrollments;
create policy "Employees complete own onboarding"
on public.employee_onboarding_enrollments
for update
to authenticated
using (
  profile_id = auth.uid()
  and company_id in (select public.current_user_company_ids())
)
with check (
  profile_id = auth.uid()
  and company_id in (select public.current_user_company_ids())
);

drop policy if exists "Members read onboarding progress" on public.employee_onboarding_progress;
create policy "Members read onboarding progress"
on public.employee_onboarding_progress
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    profile_id = auth.uid()
    or public.current_user_has_any_permission(company_id, array['documents.manage', 'systemSettings'])
  )
);

drop policy if exists "Employees insert own onboarding progress" on public.employee_onboarding_progress;
create policy "Employees insert own onboarding progress"
on public.employee_onboarding_progress
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.employee_onboarding_enrollments as enrollment
    where enrollment.id = enrollment_id
      and enrollment.profile_id = auth.uid()
      and enrollment.company_id = employee_onboarding_progress.company_id
  )
);

drop policy if exists "Owners insert onboarding progress" on public.employee_onboarding_progress;
create policy "Owners insert onboarding progress"
on public.employee_onboarding_progress
for insert
to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(company_id, array['systemSettings'])
);

drop policy if exists "Employees update own onboarding progress" on public.employee_onboarding_progress;
create policy "Employees update own onboarding progress"
on public.employee_onboarding_progress
for update
to authenticated
using (
  profile_id = auth.uid()
  and company_id in (select public.current_user_company_ids())
)
with check (
  profile_id = auth.uid()
  and company_id in (select public.current_user_company_ids())
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'onboarding-company-files',
    'onboarding-company-files',
    false,
    10485760,
    array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']::text[]
  ),
  (
    'onboarding-employee-files',
    'onboarding-employee-files',
    false,
    10485760,
    array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']::text[]
  )
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members read onboarding company files" on storage.objects;
create policy "Members read onboarding company files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'onboarding-company-files'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
);

drop policy if exists "Leaders insert onboarding company files" on storage.objects;
create policy "Leaders insert onboarding company files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'onboarding-company-files'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(
    public.storage_object_company_id(name),
    array['documents.manage', 'systemSettings']
  )
);

drop policy if exists "Leaders update onboarding company files" on storage.objects;
create policy "Leaders update onboarding company files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'onboarding-company-files'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(
    public.storage_object_company_id(name),
    array['documents.manage', 'systemSettings']
  )
)
with check (
  bucket_id = 'onboarding-company-files'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(
    public.storage_object_company_id(name),
    array['documents.manage', 'systemSettings']
  )
);

drop policy if exists "Leaders delete onboarding company files" on storage.objects;
create policy "Leaders delete onboarding company files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'onboarding-company-files'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(
    public.storage_object_company_id(name),
    array['documents.manage', 'systemSettings']
  )
);

drop policy if exists "Readers read onboarding employee files" on storage.objects;
create policy "Readers read onboarding employee files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'onboarding-employee-files'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
  and (
    public.storage_object_segment_id(name, 2) = auth.uid()
    or public.current_user_has_any_permission(
      public.storage_object_company_id(name),
      array['documents.manage', 'systemSettings']
    )
  )
);

drop policy if exists "Employees insert own onboarding files" on storage.objects;
create policy "Employees insert own onboarding files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'onboarding-employee-files'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
  and public.storage_object_segment_id(name, 2) = auth.uid()
);

drop policy if exists "Employees update own onboarding files" on storage.objects;
create policy "Employees update own onboarding files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'onboarding-employee-files'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
  and public.storage_object_segment_id(name, 2) = auth.uid()
)
with check (
  bucket_id = 'onboarding-employee-files'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
  and public.storage_object_segment_id(name, 2) = auth.uid()
);

drop policy if exists "Employees delete own onboarding files" on storage.objects;
create policy "Employees delete own onboarding files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'onboarding-employee-files'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
  and public.storage_object_segment_id(name, 2) = auth.uid()
);
