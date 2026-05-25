-- Phase 7 forward migration: require company-prefixed storage object paths
-- for active upload surfaces and source-control the company updates media bucket.

create or replace function public.storage_object_company_id(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(coalesce(object_name, ''), '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
    else null::uuid
  end;
$$;

revoke all on function public.storage_object_company_id(text) from public;
grant execute on function public.storage_object_company_id(text) to authenticated, service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  ('company-updates-media', 'company-updates-media', true, 52428800, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm', 'application/pdf']::text[])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read FlowForce public storage objects" on storage.objects;
create policy "Public can read FlowForce public storage objects"
on storage.objects
for select
to public
using (
  bucket_id in (
    'company-assets',
    'company-updates-media',
    'form-audio',
    'form-images',
    'form-signatures',
    'form-uploads',
    'form-videos',
    'message-attachments',
    'operations-reports',
    'attachments'
  )
);

drop policy if exists "Company members can manage company assets" on storage.objects;
drop policy if exists "Authenticated users can upload form storage objects" on storage.objects;
drop policy if exists "Authenticated users can update form storage objects" on storage.objects;
drop policy if exists "Authenticated users can delete form storage objects" on storage.objects;
drop policy if exists "Users can manage own message attachments" on storage.objects;
drop policy if exists "Authenticated users can manage report attachments" on storage.objects;
drop policy if exists "Company members can manage form storage objects" on storage.objects;
drop policy if exists "Company members can manage message attachments" on storage.objects;
drop policy if exists "Company members can manage report attachments" on storage.objects;
drop policy if exists "Company members can manage company update media" on storage.objects;

create policy "Company members can manage company assets"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'company-assets'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
)
with check (
  bucket_id = 'company-assets'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
);

create policy "Company members can manage form storage objects"
on storage.objects
for all
to authenticated
using (
  bucket_id in (
    'form-audio',
    'form-images',
    'form-signatures',
    'form-uploads',
    'form-videos'
  )
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
)
with check (
  bucket_id in (
    'form-audio',
    'form-images',
    'form-signatures',
    'form-uploads',
    'form-videos'
  )
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
);

create policy "Company members can manage message attachments"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'message-attachments'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
)
with check (
  bucket_id = 'message-attachments'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
);

create policy "Company members can manage report attachments"
on storage.objects
for all
to authenticated
using (
  bucket_id in ('operations-reports', 'attachments')
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
)
with check (
  bucket_id in ('operations-reports', 'attachments')
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
);

create policy "Company members can manage company update media"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'company-updates-media'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
)
with check (
  bucket_id = 'company-updates-media'
  and public.storage_object_company_id(name) in (select public.current_user_company_ids())
);

create or replace function public.get_security_contract_status(
  rls_tables text[] default '{}'::text[],
  grant_tables text[] default '{}'::text[],
  bucket_ids text[] default '{}'::text[]
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'rls', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'schema', t.schemaname,
          'table', t.tablename,
          'enabled', t.rowsecurity
        )
        order by t.tablename
      )
      from pg_catalog.pg_tables t
      where t.schemaname = 'public'
        and t.tablename = any(rls_tables)
    ), '[]'::jsonb),
    'grants', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'schema', g.table_schema,
          'table', g.table_name,
          'grantee', g.grantee,
          'privilege', g.privilege_type
        )
        order by g.table_name, g.grantee, g.privilege_type
      )
      from information_schema.role_table_grants g
      where g.table_schema = 'public'
        and g.table_name = any(grant_tables)
        and g.grantee in ('anon', 'authenticated')
    ), '[]'::jsonb),
    'storageBuckets', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'public', b.public,
          'fileSizeLimit', b.file_size_limit
        )
        order by b.id
      )
      from storage.buckets b
      where b.id = any(bucket_ids)
    ), '[]'::jsonb),
    'storagePolicies', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', p.policyname,
          'roles', p.roles,
          'command', p.cmd
        )
        order by p.policyname
      )
      from pg_catalog.pg_policies p
      where p.schemaname = 'storage'
        and p.tablename = 'objects'
        and p.policyname in (
          'Public can read FlowForce public storage objects',
          'Company members can manage company assets',
          'Company members can manage form storage objects',
          'Company members can manage message attachments',
          'Company members can manage report attachments',
          'Company members can manage company update media'
        )
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_security_contract_status(text[], text[], text[]) from public;
grant execute on function public.get_security_contract_status(text[], text[], text[]) to service_role;
