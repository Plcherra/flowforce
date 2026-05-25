-- Phase 13 forward migration: contain the legacy restore migration surface.
-- This enables RLS on remaining restored tables and gives authenticated users
-- conservative access based on company/user ownership clues. Later domain
-- migrations should replace these generic policies with table-specific ones.

do $$
declare
  target_tables text[];
  global_read_tables text[] := array[
    'certification_catalog',
    'inv_units',
    'org_prefs',
    'section_templates'
  ];
  blocked_tables text[] := array[
    'analytics_cache',
    'supabase_migrations'
  ];
  target_table text;
  cols text[];
  conditions text[] := array[]::text[];
  policy_condition text;
begin
  select array_agg(t.tablename order by t.tablename)
  into target_tables
  from pg_catalog.pg_tables t
  where t.schemaname = 'public'
    and t.rowsecurity = false
    and t.tablename <> all(blocked_tables);

  foreach target_table in array coalesce(target_tables, array[]::text[]) loop
    select array_agg(c.column_name)
    into cols
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = target_table;

    conditions := array[]::text[];

    if 'company_id' = any(cols) then
      conditions := array_append(conditions, '(company_id::text in (select id::text from public.current_user_company_ids() as id))');
    end if;

    if 'user_id' = any(cols) then
      conditions := array_append(conditions, '(user_id::text = auth.uid()::text or exists (select 1 from public.profiles p where p.id::text = user_id::text and p.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'employee_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.profiles p where p.id::text = employee_id::text and p.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'created_by' = any(cols) then
      conditions := array_append(conditions, '(created_by::text = auth.uid()::text or exists (select 1 from public.profiles p where p.id::text = created_by::text and p.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'actor_user_id' = any(cols) then
      conditions := array_append(conditions, '(actor_user_id::text = auth.uid()::text or exists (select 1 from public.profiles p where p.id::text = actor_user_id::text and p.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'requester_id' = any(cols) then
      conditions := array_append(conditions, '(requester_id::text = auth.uid()::text or exists (select 1 from public.profiles p where p.id::text = requester_id::text and p.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'assigned_to' = any(cols) then
      conditions := array_append(conditions, '(assigned_to::text = auth.uid()::text or exists (select 1 from public.profiles p where p.id::text = assigned_to::text and p.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'assigned_user_id' = any(cols) then
      conditions := array_append(conditions, '(assigned_user_id::text = auth.uid()::text or exists (select 1 from public.profiles p where p.id::text = assigned_user_id::text and p.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'department_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.departments d where d.id::text = department_id::text and d.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'schedule_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.schedules s where s.id::text = schedule_id::text and s.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'task_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.tasks t where t.id::text = task_id::text and t.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'goal_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.goals g where g.id::text = goal_id::text and g.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'form_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.forms f where f.id::text = form_id::text and f.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'submission_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.form_submissions fs where fs.id::text = submission_id::text and fs.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'field_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.form_fields ff where ff.id::text = field_id::text and ff.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'update_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.company_updates cu where cu.id::text = update_id::text and cu.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'item_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.inv_items ii where ii.id::text = item_id::text and ii.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'ingredient_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.inv_items ii where ii.id::text = ingredient_id::text and ii.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'location_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.inv_locations il where il.id::text = location_id::text and il.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'from_location_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.inv_locations il where il.id::text = from_location_id::text and il.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'to_location_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.inv_locations il where il.id::text = to_location_id::text and il.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'supplier_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.inv_suppliers s where s.id::text = supplier_id::text and s.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'purchase_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.inv_purchases p where p.id::text = purchase_id::text and p.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'payment_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.payments p where p.id::text = payment_id::text and p.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'role_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.company_roles cr where cr.id::text = role_id::text and cr.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'cycle_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.ooda_cycles oc where oc.id::text = cycle_id::text and (oc.user_id::text = auth.uid()::text or exists (select 1 from public.profiles p where p.id::text = oc.user_id::text and p.company_id in (select public.current_user_company_ids())))))');
    end if;

    if 'workflow_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.workflows w where w.id::text = workflow_id::text and exists (select 1 from public.departments d where d.id::text = w.department_id::text and d.company_id in (select public.current_user_company_ids()))))');
    end if;

    if 'workflow_instance_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.task_workflow_instances twi join public.tasks t on t.id::text = twi.task_id::text where twi.id::text = workflow_instance_id::text and t.company_id in (select public.current_user_company_ids())))');
    end if;

    if 'step_id' = any(cols) then
      conditions := array_append(conditions, '(exists (select 1 from public.workflow_steps ws join public.workflows w on w.id::text = ws.workflow_id::text join public.departments d on d.id::text = w.department_id::text where ws.id::text = step_id::text and d.company_id in (select public.current_user_company_ids())))');
    end if;

    execute format('alter table public.%I enable row level security', target_table);
    execute format('revoke all on public.%I from anon', target_table);

    if target_table = any(global_read_tables) then
      execute format('grant select on public.%I to authenticated', target_table);
      execute format('drop policy if exists "Authenticated users can read global restored rows" on public.%I', target_table);
      execute format('create policy "Authenticated users can read global restored rows" on public.%I for select to authenticated using (true)', target_table);
    elsif cardinality(conditions) > 0 then
      policy_condition := array_to_string(conditions, ' or ');
      execute format('grant select, insert, update, delete on public.%I to authenticated', target_table);
      execute format('drop policy if exists "Authenticated users can manage scoped restored rows" on public.%I', target_table);
      execute format(
        'create policy "Authenticated users can manage scoped restored rows" on public.%I for all to authenticated using (%s) with check (%s)',
        target_table,
        policy_condition,
        policy_condition
      );
    end if;
  end loop;

  foreach target_table in array blocked_tables loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('alter table public.%I enable row level security', target_table);
      execute format('revoke all on public.%I from anon', target_table);
      execute format('revoke all on public.%I from authenticated', target_table);
    end if;
  end loop;
end $$;

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
    'disabledPublicTables', coalesce((
      select jsonb_agg(t.tablename order by t.tablename)
      from pg_catalog.pg_tables t
      where t.schemaname = 'public'
        and t.rowsecurity = false
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
