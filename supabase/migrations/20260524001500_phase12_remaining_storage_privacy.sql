-- Phase 12 forward migration: company update media and employee report
-- attachments now use durable storage paths and signed URLs.

alter table public.employee_report
add column if not exists attachment jsonb;

update storage.buckets
set public = false
where id in (
  'company-updates-media',
  'attachments'
);

drop policy if exists "Public can read FlowForce public storage objects" on storage.objects;
create policy "Public can read FlowForce public storage objects"
on storage.objects
for select
to public
using (
  bucket_id in (
    'company-assets'
  )
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
