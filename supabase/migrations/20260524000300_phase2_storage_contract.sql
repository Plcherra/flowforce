-- Phase 2 forward migration: source-control storage buckets and policies used
-- by active app modules.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  ('company-assets', 'company-assets', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']::text[]),
  ('form-audio', 'form-audio', true, 52428800, array['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-wav']::text[]),
  ('form-images', 'form-images', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]),
  ('form-signatures', 'form-signatures', true, 5242880, array['image/png']::text[]),
  ('form-uploads', 'form-uploads', true, 26214400, null),
  ('form-videos', 'form-videos', true, 104857600, array['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm']::text[]),
  ('message-attachments', 'message-attachments', true, 26214400, null),
  ('operations-reports', 'operations-reports', true, 52428800, null),
  ('attachments', 'attachments', true, 26214400, null)
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
create policy "Company members can manage company assets"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'company-assets'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and split_part(name, '/', 1)::uuid in (select public.current_user_company_ids())
)
with check (
  bucket_id = 'company-assets'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and split_part(name, '/', 1)::uuid in (select public.current_user_company_ids())
);

drop policy if exists "Authenticated users can upload form storage objects" on storage.objects;
create policy "Authenticated users can upload form storage objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in (
    'form-audio',
    'form-images',
    'form-signatures',
    'form-uploads',
    'form-videos'
  )
);

drop policy if exists "Authenticated users can update form storage objects" on storage.objects;
create policy "Authenticated users can update form storage objects"
on storage.objects
for update
to authenticated
using (
  bucket_id in (
    'form-audio',
    'form-images',
    'form-signatures',
    'form-uploads',
    'form-videos'
  )
)
with check (
  bucket_id in (
    'form-audio',
    'form-images',
    'form-signatures',
    'form-uploads',
    'form-videos'
  )
);

drop policy if exists "Authenticated users can delete form storage objects" on storage.objects;
create policy "Authenticated users can delete form storage objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id in (
    'form-audio',
    'form-images',
    'form-signatures',
    'form-uploads',
    'form-videos'
  )
);

drop policy if exists "Users can manage own message attachments" on storage.objects;
create policy "Users can manage own message attachments"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'message-attachments'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'message-attachments'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Authenticated users can manage report attachments" on storage.objects;
create policy "Authenticated users can manage report attachments"
on storage.objects
for all
to authenticated
using (bucket_id in ('operations-reports', 'attachments'))
with check (bucket_id in ('operations-reports', 'attachments'));

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
          'Authenticated users can upload form storage objects',
          'Authenticated users can update form storage objects',
          'Authenticated users can delete form storage objects',
          'Users can manage own message attachments',
          'Authenticated users can manage report attachments'
        )
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_security_contract_status(text[], text[], text[]) from public;
grant execute on function public.get_security_contract_status(text[], text[], text[]) to service_role;
