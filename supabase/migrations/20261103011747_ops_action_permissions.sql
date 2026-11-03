-- Issue and workflow actions follow the permission matrix.
-- If PR #20 has already created current_user_has_permission, that function is kept.
-- Otherwise this migration installs a compatible check for the operations keys.

do $ops_permission_bootstrap$
begin
  if to_regprocedure('public.current_user_has_permission(uuid,text)') is not null then
    return;
  end if;

  execute $ops_permission_fn$
    create function public.current_user_has_permission(
      target_company_id uuid,
      permission_key text
    )
    returns boolean
    language plpgsql
    stable
    security definer
    set search_path = public
    set row_security = off
    as $body$
    declare
      uid uuid := auth.uid();
      profile_role text;
      profile_role_id uuid;
      member_role text;
      role_permissions jsonb := '{}'::jsonb;
      product_level text;
      override_value text;
      stored jsonb;
    begin
      if uid is null or target_company_id is null or permission_key is null then
        return false;
      end if;

      if target_company_id not in (select public.current_user_company_ids()) then
        return false;
      end if;

      select up.permission_value
      into override_value
      from public.user_permissions up
      where up.user_id = uid
        and up.permission_key = current_user_has_permission.permission_key
      order by up.updated_at desc nulls last, up.created_at desc nulls last
      limit 1;

      if override_value = 'deny' then
        return false;
      end if;
      if override_value = 'allow' then
        return true;
      end if;

      select p.role, p.role_id
      into profile_role, profile_role_id
      from public.profiles p
      where p.id = uid;

      select cm.role
      into member_role
      from public.company_members cm
      where cm.user_id = uid
        and cm.company_id = target_company_id
      limit 1;

      select
        coalesce(cr.permissions, '{}'::jsonb),
        coalesce(
          cr.product_level,
          public.infer_company_role_product_level(cr.name, cr.hierarchy_level)
        )
      into role_permissions, product_level
      from public.company_roles cr
      where cr.company_id = target_company_id
        and coalesce(cr.is_active, true)
        and (
          (profile_role_id is not null and cr.id = profile_role_id)
          or lower(cr.name) = lower(coalesce(profile_role, member_role, ''))
          or cr.product_level = public.infer_company_role_product_level(
            coalesce(profile_role, member_role),
            null
          )
        )
      order by
        case when profile_role_id is not null and cr.id = profile_role_id then 0 else 1 end,
        case when lower(cr.name) = lower(coalesce(profile_role, '')) then 0 else 1 end
      limit 1;

      if product_level is null then
        product_level := public.infer_company_role_product_level(
          coalesce(profile_role, member_role),
          null
        );
      end if;

      role_permissions := coalesce(role_permissions, '{}'::jsonb);
      if role_permissions ? permission_key then
        stored := role_permissions -> permission_key;
        if jsonb_typeof(stored) = 'boolean' then
          return stored = 'true'::jsonb;
        end if;
        if stored #>> '{}' in ('true', 'allow') then
          return true;
        end if;
        if stored #>> '{}' in ('false', 'deny') then
          return false;
        end if;
      end if;

      if product_level = 'owner' then
        return true;
      end if;

      if product_level = 'admin' and permission_key in (
        'editTasks',
        'viewOwnTasks',
        'viewTeamTasks',
        'ai.actions.suggest',
        'ai.actions.approve',
        'ai.actions.automate'
      ) then
        return true;
      end if;

      if product_level = 'manager' and permission_key in (
        'editTasks',
        'viewOwnTasks',
        'viewTeamTasks',
        'ai.actions.suggest',
        'ai.actions.approve'
      ) then
        return true;
      end if;

      if product_level = 'staff' and permission_key = 'viewOwnTasks' then
        return true;
      end if;

      return false;
    end;
    $body$;
  $ops_permission_fn$;
end
$ops_permission_bootstrap$;

revoke all on function public.current_user_has_permission(uuid, text) from public, anon;
grant execute on function public.current_user_has_permission(uuid, text) to authenticated, service_role;

create or replace function public.ops_can_update_workflow_run(
  target_company_id uuid,
  assigned_to uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_has_permission(target_company_id, 'editTasks')
    or (
      public.current_user_has_permission(target_company_id, 'viewOwnTasks')
      and (assigned_to is null or assigned_to = auth.uid())
    );
$$;

revoke all on function public.ops_can_update_workflow_run(uuid, uuid) from public, anon;
grant execute on function public.ops_can_update_workflow_run(uuid, uuid) to authenticated, service_role;

create or replace function public.current_user_can_manage_ops_issue(
  p_company_id uuid,
  p_issue_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(p_company_id, 'editTasks')
    and exists (
      select 1
      from public.ops_issues issue
      where issue.id = p_issue_id
        and issue.company_id = p_company_id
    );
$$;

create or replace function public.current_user_can_review_workflows(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select target_company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(target_company_id, 'editTasks');
$$;

create or replace function public.current_user_can_execute_workflow_run(
  p_company_id uuid,
  p_workflow_instance_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.task_workflow_instances run
    where run.id = p_workflow_instance_id
      and run.company_id = p_company_id
      and run.company_id in (select public.current_user_company_ids())
      and (run.assigned_to is null or run.assigned_to = auth.uid())
      and public.ops_can_update_workflow_run(p_company_id, run.assigned_to)
  );
$$;

create or replace function public.run_workflow_exception_automation(
  p_company_id uuid,
  p_workflow_exception_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_company_id not in (select public.current_user_company_ids())
    or not public.current_user_has_permission(p_company_id, 'editTasks')
  then
    raise exception 'Not allowed to run workflow automation for this company'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.workflow_exceptions exception
    where exception.id = p_workflow_exception_id
      and exception.company_id = p_company_id
  ) then
    raise exception 'Workflow exception not found for this company'
      using errcode = '22023';
  end if;

  return public.apply_workflow_exception_automation(p_workflow_exception_id);
end;
$$;

-- Writes require editTasks. Reads stay open to company members.
drop policy if exists "Company members can manage ops issues" on public.ops_issues;
drop policy if exists "Company members can read ops issues" on public.ops_issues;
drop policy if exists "Editors can write ops issues" on public.ops_issues;
create policy "Company members can read ops issues"
  on public.ops_issues
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));
create policy "Editors can write ops issues"
  on public.ops_issues
  for insert
  to authenticated
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );
create policy "Editors can update ops issues"
  on public.ops_issues
  for update
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  )
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );
create policy "Editors can delete ops issues"
  on public.ops_issues
  for delete
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );

drop policy if exists "Company members can manage workflows" on public.workflows;
drop policy if exists "Company members can read workflows" on public.workflows;
drop policy if exists "Editors can write workflows" on public.workflows;
create policy "Company members can read workflows"
  on public.workflows
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));
create policy "Editors can insert workflows"
  on public.workflows
  for insert
  to authenticated
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );
create policy "Editors can update workflows"
  on public.workflows
  for update
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  )
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );
create policy "Editors can delete workflows"
  on public.workflows
  for delete
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );

drop policy if exists "Company members can manage workflow steps" on public.workflow_steps;
drop policy if exists "Company members can read workflow steps" on public.workflow_steps;
create policy "Company members can read workflow steps"
  on public.workflow_steps
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));
create policy "Editors can insert workflow steps"
  on public.workflow_steps
  for insert
  to authenticated
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );
create policy "Editors can update workflow steps"
  on public.workflow_steps
  for update
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  )
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );
create policy "Editors can delete workflow steps"
  on public.workflow_steps
  for delete
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );

drop policy if exists "Company members can manage workflow assignments" on public.workflow_assignments;
drop policy if exists "Company members can read workflow assignments" on public.workflow_assignments;
create policy "Company members can read workflow assignments"
  on public.workflow_assignments
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));
create policy "Editors can insert workflow assignments"
  on public.workflow_assignments
  for insert
  to authenticated
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
    and exists (
      select 1
      from public.workflows workflow
      where workflow.id = workflow_assignments.workflow_id
        and workflow.company_id = workflow_assignments.company_id
    )
  );
create policy "Editors can update workflow assignments"
  on public.workflow_assignments
  for update
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  )
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );
create policy "Editors can delete workflow assignments"
  on public.workflow_assignments
  for delete
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );

drop policy if exists "Company members can manage task workflow instances" on public.task_workflow_instances;
drop policy if exists "Company members can read task workflow instances" on public.task_workflow_instances;
create policy "Company members can read task workflow instances"
  on public.task_workflow_instances
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));
create policy "Editors can insert task workflow instances"
  on public.task_workflow_instances
  for insert
  to authenticated
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );
create policy "Assignees can update task workflow instances"
  on public.task_workflow_instances
  for update
  to authenticated
  using (public.ops_can_update_workflow_run(company_id, assigned_to))
  with check (public.ops_can_update_workflow_run(company_id, assigned_to));
create policy "Editors can delete task workflow instances"
  on public.task_workflow_instances
  for delete
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );

drop policy if exists "Company members can manage workflow step instances" on public.workflow_step_instances;
drop policy if exists "Company members can read workflow step instances" on public.workflow_step_instances;
create policy "Company members can read workflow step instances"
  on public.workflow_step_instances
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));
create policy "Editors can insert workflow step instances"
  on public.workflow_step_instances
  for insert
  to authenticated
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );
create policy "Assignees can update workflow step instances"
  on public.workflow_step_instances
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.task_workflow_instances run
      where run.company_id = workflow_step_instances.company_id
        and run.id::text = workflow_step_instances.workflow_instance_id::text
        and public.ops_can_update_workflow_run(run.company_id, run.assigned_to)
    )
  )
  with check (
    exists (
      select 1
      from public.task_workflow_instances run
      where run.company_id = workflow_step_instances.company_id
        and run.id::text = workflow_step_instances.workflow_instance_id::text
        and public.ops_can_update_workflow_run(run.company_id, run.assigned_to)
    )
  );
create policy "Editors can delete workflow step instances"
  on public.workflow_step_instances
  for delete
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );

drop policy if exists "Company members can manage workflow evidence" on public.workflow_evidence;
drop policy if exists "Company members can read workflow evidence" on public.workflow_evidence;
create policy "Company members can read workflow evidence"
  on public.workflow_evidence
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));
create policy "Assignees can insert workflow evidence"
  on public.workflow_evidence
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.task_workflow_instances run
      where run.company_id = workflow_evidence.company_id
        and run.id = workflow_evidence.workflow_instance_id
        and public.ops_can_update_workflow_run(run.company_id, run.assigned_to)
    )
  );
create policy "Editors can delete workflow evidence"
  on public.workflow_evidence
  for delete
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );

drop policy if exists "Company members can manage workflow reviews" on public.workflow_reviews;
drop policy if exists "Company members can read workflow reviews" on public.workflow_reviews;
create policy "Company members can read workflow reviews"
  on public.workflow_reviews
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));
create policy "Editors can insert workflow reviews"
  on public.workflow_reviews
  for insert
  to authenticated
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );
create policy "Editors can update workflow reviews"
  on public.workflow_reviews
  for update
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  )
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );

drop policy if exists "Company members can manage workflow exceptions" on public.workflow_exceptions;
drop policy if exists "Company members can read workflow exceptions" on public.workflow_exceptions;
create policy "Company members can read workflow exceptions"
  on public.workflow_exceptions
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));
create policy "Assignees can insert workflow exceptions"
  on public.workflow_exceptions
  for insert
  to authenticated
  with check (
    company_id in (select public.current_user_company_ids())
    and (
      public.current_user_has_permission(company_id, 'editTasks')
      or exists (
        select 1
        from public.task_workflow_instances run
        where run.company_id = workflow_exceptions.company_id
          and run.id = workflow_exceptions.workflow_instance_id
          and public.ops_can_update_workflow_run(run.company_id, run.assigned_to)
      )
    )
  );
create policy "Editors can update workflow exceptions"
  on public.workflow_exceptions
  for update
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  )
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );

drop policy if exists "Company members can manage workflow compliance packs" on public.workflow_compliance_packs;
drop policy if exists "Company members can read workflow compliance packs" on public.workflow_compliance_packs;
create policy "Company members can read workflow compliance packs"
  on public.workflow_compliance_packs
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));
create policy "Editors can insert workflow compliance packs"
  on public.workflow_compliance_packs
  for insert
  to authenticated
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );
create policy "Editors can update workflow compliance packs"
  on public.workflow_compliance_packs
  for update
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  )
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );

drop policy if exists "Company members can manage workflow compliance audit exports" on public.workflow_compliance_audit_exports;
drop policy if exists "Company members can read workflow compliance audit exports" on public.workflow_compliance_audit_exports;
create policy "Company members can read workflow compliance audit exports"
  on public.workflow_compliance_audit_exports
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));
create policy "Editors can insert workflow compliance audit exports"
  on public.workflow_compliance_audit_exports
  for insert
  to authenticated
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );

drop policy if exists "Company members can manage workflow automation runs" on public.workflow_automation_runs;
drop policy if exists "Company members can read workflow automation runs" on public.workflow_automation_runs;
create policy "Company members can read workflow automation runs"
  on public.workflow_automation_runs
  for select
  to authenticated
  using (company_id in (select public.current_user_company_ids()));
create policy "Editors can insert workflow automation runs"
  on public.workflow_automation_runs
  for insert
  to authenticated
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );
create policy "Editors can update workflow automation runs"
  on public.workflow_automation_runs
  for update
  to authenticated
  using (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  )
  with check (
    company_id in (select public.current_user_company_ids())
    and public.current_user_has_permission(company_id, 'editTasks')
  );
