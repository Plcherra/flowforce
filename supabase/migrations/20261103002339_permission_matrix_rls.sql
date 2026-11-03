-- Enforce the product permission matrix in RLS.
--
-- current_user_has_permission(company_id, key) follows useCan:
--   1. deny override on user_permissions
--   2. allow override on user_permissions
--   3. explicit company_roles.permissions jsonb (false wins over the contract)
--   4. owner product level, when the key is absent (contract wildcard "*")
--   5. product-role default from src/features/roles/constants/productRoleContract.json
--      when the class pack does not mention the key
--
-- Role row: profiles.role_id in this company, else the class whose name or
-- product level matches profiles.role, else company_members.role, else
-- positions.role. user_roles is not a grant source (it was self-writable).
-- role_permissions is not a grant source (any member could edit it).
--
-- Service role bypasses RLS. These policies are for authenticated only.
-- The SQL copy of the contract can drift from the TypeScript file; that file
-- stays the editor source of truth.

create or replace function public.permission_json_state(
  permissions jsonb,
  permission_key text
)
returns text
language plpgsql
immutable
as $$
declare
  packed jsonb := permissions;
  value jsonb;
begin
  if permission_key is null or btrim(permission_key) = '' then
    return 'missing';
  end if;

  if packed is null then
    return 'missing';
  end if;

  if jsonb_typeof(packed) = 'string' then
    begin
      packed := (packed #>> '{}')::jsonb;
    exception
      when others then
        return 'missing';
    end;
  end if;

  if jsonb_typeof(packed) = 'array' then
    if packed ? permission_key or packed ? '*' then
      return 'true';
    end if;
    return 'missing';
  end if;

  if jsonb_typeof(packed) <> 'object' then
    return 'missing';
  end if;

  if packed ? permission_key then
    value := packed -> permission_key;
    if value = 'true'::jsonb or value = '"true"'::jsonb or value = '1'::jsonb then
      return 'true';
    end if;
    if value = 'false'::jsonb or value = '"false"'::jsonb or value = '0'::jsonb then
      return 'false';
    end if;
    return 'missing';
  end if;

  if packed ? '*' then
    value := packed -> '*';
    if value = 'true'::jsonb or value = '"true"'::jsonb then
      return 'true';
    end if;
  end if;

  return 'missing';
end;
$$;

create or replace function public.product_role_default_allows(
  level text,
  permission_key text
)
returns boolean
language sql
immutable
as $$
  select case
    when permission_key is null or btrim(permission_key) = '' then false
    when level = 'owner' then true
    when level = 'admin' then (
      jsonb_build_array(
        'viewOwnProfile', 'editOwnProfile', 'viewTeamProfiles', 'editTeamProfiles',
        'viewOwnSchedules', 'viewTeamSchedules', 'editSchedules',
        'schedule.view', 'schedule.edit', 'schedule.create', 'schedule.delete',
        'schedule.grant', 'schedule.reminders.assign', 'schedule.reminders.grant_deactivate',
        'viewOwnTasks', 'viewTeamTasks', 'editTasks',
        'tasks.shift.create_self', 'tasks.shift.create_others',
        'tasks.checklist.create_self', 'tasks.checklist.create_others',
        'tasks.custom.create_self', 'tasks.custom.create_others',
        'viewOwnExpenses', 'viewTeamExpenses', 'approveExpenses', 'approveTimeOff',
        'manageUsers', 'systemSettings', 'forms.submissions.read',
        'createForms', 'manageForms', 'approveFormSubmissions', 'managePositions',
        'viewAIInsights', 'ai.insights.view', 'ai.actions.suggest', 'ai.actions.approve',
        'ai.actions.automate', 'ai.audit.view', 'ai.governance.manage',
        'manageInventory', 'managePayments', 'directory.view', 'directory.manage',
        'recognition.edit', 'onboarding.create', 'onboarding.delete',
        'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
        'inventory.adjust', 'inventory.import', 'inventory.export',
        'inventory.purchasing.view', 'inventory.purchasing.manage',
        'inventory.counts.view', 'inventory.counts.create', 'inventory.counts.edit',
        'inventory.counts.approve', 'inventory.waste.view', 'inventory.waste.create',
        'inventory.prep.view', 'inventory.prep.edit',
        'reports.view', 'reports.export', 'billing.view',
        'admin.roles', 'admin.permissions', 'admin.settings'
      )
    ) ? permission_key
    when level = 'manager' then (
      jsonb_build_array(
        'viewOwnProfile', 'editOwnProfile', 'viewTeamProfiles', 'editTeamProfiles',
        'viewOwnSchedules', 'viewTeamSchedules', 'editSchedules',
        'schedule.view', 'schedule.edit', 'schedule.create', 'schedule.grant',
        'schedule.reminders.assign', 'schedule.reminders.grant_deactivate',
        'viewOwnTasks', 'viewTeamTasks', 'editTasks',
        'tasks.shift.create_self', 'tasks.shift.create_others',
        'tasks.checklist.create_self', 'tasks.checklist.create_others',
        'tasks.custom.create_self', 'tasks.custom.create_others',
        'viewOwnExpenses', 'viewTeamExpenses', 'approveExpenses', 'approveTimeOff',
        'createForms', 'approveFormSubmissions',
        'viewAIInsights', 'ai.insights.view', 'ai.actions.suggest',
        'ai.actions.approve', 'ai.audit.view',
        'manageInventory', 'directory.view',
        'recognition.edit', 'onboarding.create', 'onboarding.delete',
        'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust',
        'inventory.purchasing.view',
        'inventory.counts.view', 'inventory.counts.create', 'inventory.counts.edit',
        'inventory.counts.approve', 'inventory.waste.view', 'inventory.waste.create',
        'inventory.prep.view', 'inventory.prep.edit',
        'reports.view'
      )
    ) ? permission_key
    when level = 'staff' then (
      jsonb_build_array(
        'viewOwnProfile', 'editOwnProfile', 'viewOwnSchedules',
        'viewOwnTasks', 'viewOwnExpenses', 'forms.submissions.read'
      )
    ) ? permission_key
    else false
  end;
$$;

-- Keys a class save may keep. Defaults plus levelGrantableExtras.
-- Owner is unclamped. This replaces the older list that dropped task-create,
-- list-issue, schedule grant, and recognition keys on save.
create or replace function public.product_level_allowed_permissions(level text)
returns jsonb
language plpgsql
immutable
as $$
begin
  if level = 'owner' then
    return null;
  end if;

  if level = 'admin' then
    return jsonb_build_array(
      'viewOwnProfile', 'editOwnProfile', 'viewTeamProfiles', 'editTeamProfiles',
      'viewOwnSchedules', 'viewTeamSchedules', 'editSchedules',
      'schedule.view', 'schedule.edit', 'schedule.create', 'schedule.delete',
      'schedule.grant', 'schedule.reminders.assign', 'schedule.reminders.grant_deactivate',
      'viewOwnTasks', 'viewTeamTasks', 'editTasks',
      'tasks.shift.create_self', 'tasks.shift.create_others',
      'tasks.checklist.create_self', 'tasks.checklist.create_others',
      'tasks.custom.create_self', 'tasks.custom.create_others',
      'tasks.list_issues.read', 'tasks.list_issues.act',
      'viewOwnExpenses', 'viewTeamExpenses', 'approveExpenses', 'approveTimeOff',
      'manageUsers', 'systemSettings', 'forms.submissions.read',
      'createForms', 'manageForms', 'approveFormSubmissions', 'managePositions',
      'viewAIInsights', 'ai.insights.view', 'ai.actions.suggest', 'ai.actions.approve',
      'ai.actions.automate', 'ai.audit.view', 'ai.governance.manage',
      'manageInventory', 'managePayments', 'directory.view', 'directory.manage',
      'recognition.edit', 'onboarding.create', 'onboarding.delete',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
      'inventory.adjust', 'inventory.import', 'inventory.export',
      'inventory.purchasing.view', 'inventory.purchasing.manage',
      'inventory.counts.view', 'inventory.counts.create', 'inventory.counts.edit',
      'inventory.counts.approve', 'inventory.waste.view', 'inventory.waste.create',
      'inventory.prep.view', 'inventory.prep.edit',
      'reports.view', 'reports.export', 'billing.view',
      'admin.roles', 'admin.permissions', 'admin.settings'
    );
  end if;

  if level = 'manager' then
    return jsonb_build_array(
      'viewOwnProfile', 'editOwnProfile', 'viewTeamProfiles', 'editTeamProfiles',
      'viewOwnSchedules', 'viewTeamSchedules', 'editSchedules',
      'schedule.view', 'schedule.edit', 'schedule.create', 'schedule.grant',
      'schedule.reminders.assign', 'schedule.reminders.grant_deactivate',
      'viewOwnTasks', 'viewTeamTasks', 'editTasks',
      'tasks.shift.create_self', 'tasks.shift.create_others',
      'tasks.checklist.create_self', 'tasks.checklist.create_others',
      'tasks.custom.create_self', 'tasks.custom.create_others',
      'tasks.list_issues.read', 'tasks.list_issues.act',
      'viewOwnExpenses', 'viewTeamExpenses', 'approveExpenses', 'approveTimeOff',
      'createForms', 'approveFormSubmissions',
      'viewAIInsights', 'ai.insights.view', 'ai.actions.suggest',
      'ai.actions.approve', 'ai.audit.view',
      'manageInventory', 'directory.view',
      'recognition.edit', 'onboarding.create', 'onboarding.delete',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust',
      'inventory.purchasing.view',
      'inventory.counts.view', 'inventory.counts.create', 'inventory.counts.edit',
      'inventory.counts.approve', 'inventory.waste.view', 'inventory.waste.create',
      'inventory.prep.view', 'inventory.prep.edit',
      'reports.view'
    );
  end if;

  return jsonb_build_array(
    'viewOwnProfile', 'editOwnProfile', 'viewOwnSchedules', 'viewOwnTasks',
    'viewOwnExpenses', 'forms.submissions.read',
    'viewTeamProfiles', 'viewTeamSchedules', 'schedule.view', 'editSchedules',
    'schedule.edit', 'viewTeamTasks', 'directory.view', 'recognition.edit',
    'onboarding.create', 'onboarding.delete',
    'tasks.shift.create_self', 'tasks.shift.create_others',
    'tasks.checklist.create_self', 'tasks.checklist.create_others',
    'tasks.custom.create_self', 'tasks.custom.create_others',
    'tasks.list_issues.read', 'tasks.list_issues.act'
  );
end;
$$;

create or replace function public.current_user_role_snapshot(target_company_id uuid)
returns table (
  product_level text,
  hierarchy_level numeric,
  permissions jsonb,
  role_id uuid
)
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
  profile_role text;
  profile_role_id text;
  member_role text;
  position_role text;
  candidate text;
  matched public.company_roles%rowtype;
begin
  if uid is null or target_company_id is null then
    return;
  end if;

  select cm.role
  into member_role
  from public.company_members cm
  where cm.user_id = uid
    and cm.company_id = target_company_id
  limit 1;

  if not found then
    return;
  end if;

  select p.role, nullif(p.role_id, ''), pos.role
  into profile_role, profile_role_id, position_role
  from public.profiles p
  left join public.positions pos
    on pos.company_id = target_company_id
   and pos.id::text = p.position_id::text
  where p.id = uid;

  if profile_role_id is not null then
    select *
    into matched
    from public.company_roles cr
    where cr.company_id = target_company_id
      and cr.id::text = profile_role_id
      and coalesce(cr.is_active, true)
    limit 1;
  end if;

  if matched.id is null then
    foreach candidate in array array[profile_role, member_role, position_role]
    loop
      if candidate is null or btrim(candidate) = '' then
        continue;
      end if;

      select *
      into matched
      from public.company_roles cr
      where cr.company_id = target_company_id
        and coalesce(cr.is_active, true)
        and (
          lower(cr.name) = lower(candidate)
          or cr.product_level = public.infer_company_role_product_level(candidate, null)
          or public.infer_company_role_product_level(cr.name, cr.hierarchy_level)
            = public.infer_company_role_product_level(candidate, null)
        )
      order by
        case when lower(cr.name) = lower(candidate) then 0 else 1 end,
        case
          when cr.product_level = public.infer_company_role_product_level(candidate, null) then 0
          else 1
        end,
        coalesce(cr.hierarchy_level, 999)
      limit 1;

      exit when matched.id is not null;
    end loop;
  end if;

  if matched.id is not null then
    product_level := coalesce(
      matched.product_level,
      public.infer_company_role_product_level(matched.name, matched.hierarchy_level)
    );
    hierarchy_level := matched.hierarchy_level;
    permissions := coalesce(matched.permissions, '{}'::jsonb);
    role_id := matched.id;
    return next;
    return;
  end if;

  product_level := public.infer_company_role_product_level(
    coalesce(member_role, profile_role, position_role),
    null
  );
  hierarchy_level := case product_level
    when 'owner' then 4
    when 'admin' then 3
    when 'manager' then 2
    else 1
  end;
  permissions := '{}'::jsonb;
  role_id := null;
  return next;
end;
$$;

create or replace function public.current_user_has_permission(
  target_company_id uuid,
  permission_key text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
  snapshot record;
  override_value text;
  state text;
begin
  if uid is null or target_company_id is null or permission_key is null then
    return false;
  end if;

  select snap.product_level, snap.permissions
  into snapshot
  from public.current_user_role_snapshot(target_company_id) snap
  limit 1;

  if not found or snapshot.product_level is null then
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

  state := public.permission_json_state(snapshot.permissions, permission_key);

  if state = 'false' then
    return false;
  end if;

  if state = 'true' then
    return true;
  end if;

  if snapshot.product_level = 'owner' then
    return true;
  end if;

  return public.product_role_default_allows(snapshot.product_level, permission_key);
end;
$$;

create or replace function public.current_user_has_any_permission(
  target_company_id uuid,
  permission_keys text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from unnest(coalesce(permission_keys, array[]::text[])) as permission_key
    where public.current_user_has_permission(target_company_id, permission_key)
  );
$$;

create or replace function public.current_user_is_manager_or_above(
  target_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.current_user_role_snapshot(target_company_id) snap
    where snap.product_level in ('manager', 'admin', 'owner')
  );
$$;

create or replace function public.current_user_can_write_task(
  target_company_id uuid,
  created_by text,
  assigned_to text,
  task_source text,
  operation text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  uid text := auth.uid()::text;
  source text := coalesce(task_source, '');
  self_assigned boolean := assigned_to is null or btrim(assigned_to) = '' or assigned_to = uid;
begin
  if target_company_id is null or uid is null then
    return false;
  end if;

  if operation = 'delete' then
    return public.current_user_is_manager_or_above(target_company_id);
  end if;

  if operation = 'insert'
    and created_by is not null
    and btrim(created_by) <> ''
    and created_by <> uid
  then
    return false;
  end if;

  if operation = 'insert' then
    if source = 'schedule' then
      return public.current_user_has_any_permission(target_company_id, array[
        'editTasks', 'schedule.edit', 'schedule.create', 'editSchedules',
        'tasks.shift.create_others'
      ])
      or (
        self_assigned
        and public.current_user_has_permission(target_company_id, 'tasks.shift.create_self')
      );
    end if;

    if source = 'form' then
      return public.current_user_has_any_permission(target_company_id, array[
        'editTasks', 'tasks.list_issues.act', 'tasks.checklist.create_others'
      ])
      or (
        self_assigned
        and public.current_user_has_permission(target_company_id, 'tasks.checklist.create_self')
      );
    end if;

    if source = 'auto' then
      return public.current_user_has_any_permission(target_company_id, array[
        'editTasks', 'ai.actions.approve', 'ai.actions.automate'
      ]);
    end if;

    return public.current_user_has_permission(target_company_id, 'editTasks')
      or public.current_user_has_any_permission(target_company_id, array[
        'tasks.custom.create_others',
        'tasks.shift.create_others',
        'tasks.checklist.create_others'
      ])
      or (
        self_assigned
        and public.current_user_has_any_permission(target_company_id, array[
          'tasks.custom.create_self',
          'tasks.shift.create_self',
          'tasks.checklist.create_self'
        ])
      );
  end if;

  if public.current_user_has_permission(target_company_id, 'editTasks') then
    return true;
  end if;

  if source = 'schedule' and public.current_user_has_any_permission(
    target_company_id,
    array['schedule.edit', 'schedule.create', 'editSchedules']
  ) then
    return true;
  end if;

  if source = 'form' and public.current_user_has_permission(
    target_company_id,
    'tasks.list_issues.act'
  ) then
    return true;
  end if;

  if source = 'auto' and public.current_user_has_any_permission(
    target_company_id,
    array['ai.actions.approve', 'ai.actions.automate']
  ) then
    return true;
  end if;

  return public.current_user_has_permission(target_company_id, 'viewOwnTasks')
    and (
      assigned_to = uid
      or (
        created_by = uid
        and (assigned_to is null or btrim(assigned_to) = '' or assigned_to = uid)
      )
    );
end;
$$;

create or replace function public.current_user_admins_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select target_user_id is not null
    and (
      exists (
        select 1
        from public.company_members cm
        where cm.user_id = target_user_id
          and public.current_user_is_company_admin(cm.company_id)
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = target_user_id
          and public.current_user_is_company_admin(p.company_id)
      )
    );
$$;

revoke all on function public.permission_json_state(jsonb, text) from public, anon, authenticated;
revoke all on function public.product_role_default_allows(text, text) from public, anon, authenticated;
revoke all on function public.current_user_role_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.current_user_has_permission(uuid, text) from public, anon, authenticated;
revoke all on function public.current_user_has_any_permission(uuid, text[]) from public, anon, authenticated;
revoke all on function public.current_user_is_manager_or_above(uuid) from public, anon, authenticated;
revoke all on function public.current_user_can_write_task(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.current_user_admins_user(uuid) from public, anon, authenticated;

grant execute on function public.permission_json_state(jsonb, text) to service_role;
grant execute on function public.product_role_default_allows(text, text) to service_role;
grant execute on function public.current_user_role_snapshot(uuid) to service_role;
grant execute on function public.current_user_has_permission(uuid, text) to authenticated, service_role;
grant execute on function public.current_user_has_any_permission(uuid, text[]) to authenticated, service_role;
grant execute on function public.current_user_is_manager_or_above(uuid) to authenticated, service_role;
grant execute on function public.current_user_can_write_task(uuid, text, text, text, text) to authenticated, service_role;
grant execute on function public.current_user_admins_user(uuid) to authenticated, service_role;

-- Staff cannot point their own profile at a privileged position.
create or replace function public.prevent_unsafe_profile_tenant_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('flowforce.allow_profile_tenant_write', true) = 'on' then
    return new;
  end if;

  if auth.role() = 'service_role' then
    return new;
  end if;

  if old.id = auth.uid()
    and (
      new.company_id is distinct from old.company_id
      or new.role is distinct from old.role
      or new.role_id is distinct from old.role_id
      or new.is_company_admin is distinct from old.is_company_admin
      or new.position_id is distinct from old.position_id
    )
  then
    raise exception 'Profile tenant and role fields require company admin access'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- Tasks -----------------------------------------------------------------
drop policy if exists "Company members can manage tasks" on public.tasks;
drop policy if exists "Company members can read tasks" on public.tasks;
drop policy if exists "Permissioned users can insert tasks" on public.tasks;
drop policy if exists "Permissioned users can update tasks" on public.tasks;
drop policy if exists "Managers can delete tasks" on public.tasks;

create policy "Company members can read tasks"
on public.tasks
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

create policy "Permissioned users can insert tasks"
on public.tasks
for insert
to authenticated
with check (
  public.current_user_can_write_task(
    company_id,
    created_by::text,
    assigned_to::text,
    source,
    'insert'
  )
);

create policy "Permissioned users can update tasks"
on public.tasks
for update
to authenticated
using (
  public.current_user_can_write_task(
    company_id,
    created_by::text,
    assigned_to::text,
    source,
    'update'
  )
)
with check (
  public.current_user_can_write_task(
    company_id,
    created_by::text,
    assigned_to::text,
    source,
    'update'
  )
);

create policy "Managers can delete tasks"
on public.tasks
for delete
to authenticated
using (public.current_user_is_manager_or_above(company_id));

-- Task comments ---------------------------------------------------------
drop policy if exists "Company members can manage task comments" on public.task_comments;
drop policy if exists "Company members can read task comments" on public.task_comments;
drop policy if exists "Permissioned users can insert task comments" on public.task_comments;
drop policy if exists "Permissioned users can update task comments" on public.task_comments;
drop policy if exists "Authors or managers can delete task comments" on public.task_comments;

create policy "Company members can read task comments"
on public.task_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.tasks task
    where task.id::text = task_comments.task_id
      and task.company_id in (select public.current_user_company_ids())
  )
);

create policy "Permissioned users can insert task comments"
on public.task_comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks task
    where task.id::text = task_comments.task_id
      and (
        public.current_user_has_any_permission(task.company_id, array['editTasks', 'viewTeamTasks'])
        or (
          public.current_user_has_permission(task.company_id, 'viewOwnTasks')
          and (
            task.created_by = auth.uid()
            or task.assigned_to = auth.uid()
          )
        )
      )
  )
);

create policy "Permissioned users can update task comments"
on public.task_comments
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks task
    where task.id::text = task_comments.task_id
      and task.company_id in (select public.current_user_company_ids())
  )
);

create policy "Authors or managers can delete task comments"
on public.task_comments
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.tasks task
    where task.id::text = task_comments.task_id
      and public.current_user_is_manager_or_above(task.company_id)
  )
);

-- Task activities -------------------------------------------------------
drop policy if exists "Company members can manage task activities" on public.task_activities;
drop policy if exists "Authenticated users can manage scoped restored rows" on public.task_activities;
drop policy if exists "Company members can read task activities" on public.task_activities;
drop policy if exists "Permissioned users can insert task activities" on public.task_activities;
drop policy if exists "Actors can update task activities" on public.task_activities;
drop policy if exists "Managers can delete task activities" on public.task_activities;

create policy "Company members can read task activities"
on public.task_activities
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

create policy "Permissioned users can insert task activities"
on public.task_activities
for insert
to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and (user_id is null or user_id = auth.uid())
  and public.current_user_has_any_permission(
    company_id,
    array['editTasks', 'viewOwnTasks', 'viewTeamTasks']
  )
);

create policy "Actors can update task activities"
on public.task_activities
for update
to authenticated
using (company_id in (select public.current_user_company_ids()) and user_id = auth.uid())
with check (company_id in (select public.current_user_company_ids()) and user_id = auth.uid());

create policy "Managers can delete task activities"
on public.task_activities
for delete
to authenticated
using (public.current_user_is_manager_or_above(company_id));

-- Task notifications ----------------------------------------------------
drop policy if exists "Company members can manage task notifications" on public.task_notifications;
drop policy if exists "Authenticated users can manage scoped restored rows" on public.task_notifications;
drop policy if exists "Readers can select task notifications" on public.task_notifications;
drop policy if exists "Members can insert task notifications" on public.task_notifications;
drop policy if exists "Owners can update task notifications" on public.task_notifications;
drop policy if exists "Owners or managers can delete task notifications" on public.task_notifications;

create policy "Readers can select task notifications"
on public.task_notifications
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    user_id = auth.uid()
    or public.current_user_has_any_permission(
      company_id,
      array['viewTeamTasks', 'editTasks']
    )
  )
);

create policy "Members can insert task notifications"
on public.task_notifications
for insert
to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(
    company_id,
    array['viewOwnTasks', 'viewTeamTasks', 'editTasks']
  )
  and (
    user_id = auth.uid()
    or exists (
      select 1
      from public.profiles profile
      where profile.id = task_notifications.user_id
        and profile.company_id = task_notifications.company_id
    )
  )
);

create policy "Owners can update task notifications"
on public.task_notifications
for update
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    user_id = auth.uid()
    or public.current_user_has_permission(company_id, 'editTasks')
  )
)
with check (
  company_id in (select public.current_user_company_ids())
  and (
    user_id = auth.uid()
    or public.current_user_has_permission(company_id, 'editTasks')
  )
);

create policy "Owners or managers can delete task notifications"
on public.task_notifications
for delete
to authenticated
using (
  (
    company_id in (select public.current_user_company_ids())
    and user_id = auth.uid()
  )
  or public.current_user_is_manager_or_above(company_id)
);

-- Workflow definitions and runs ----------------------------------------
drop policy if exists "Company members can manage workflows" on public.workflows;
drop policy if exists "Company members can read workflows" on public.workflows;
drop policy if exists "Permissioned users can insert workflows" on public.workflows;
drop policy if exists "Permissioned users can update workflows" on public.workflows;
drop policy if exists "Managers can delete workflows" on public.workflows;

create policy "Company members can read workflows"
on public.workflows
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

create policy "Permissioned users can insert workflows"
on public.workflows
for insert
to authenticated
with check (
  public.current_user_has_any_permission(
    company_id,
    array['editTasks', 'createForms', 'manageForms']
  )
);

create policy "Permissioned users can update workflows"
on public.workflows
for update
to authenticated
using (
  public.current_user_has_any_permission(
    company_id,
    array['editTasks', 'createForms', 'manageForms']
  )
)
with check (
  public.current_user_has_any_permission(
    company_id,
    array['editTasks', 'createForms', 'manageForms']
  )
);

create policy "Managers can delete workflows"
on public.workflows
for delete
to authenticated
using (public.current_user_is_manager_or_above(company_id));

drop policy if exists "Company members can manage workflow steps" on public.workflow_steps;
drop policy if exists "Company members can read workflow steps" on public.workflow_steps;
drop policy if exists "Permissioned users can insert workflow steps" on public.workflow_steps;
drop policy if exists "Permissioned users can update workflow steps" on public.workflow_steps;
drop policy if exists "Managers can delete workflow steps" on public.workflow_steps;

create policy "Company members can read workflow steps"
on public.workflow_steps
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

create policy "Permissioned users can insert workflow steps"
on public.workflow_steps
for insert
to authenticated
with check (
  public.current_user_has_any_permission(
    company_id,
    array['editTasks', 'createForms', 'manageForms']
  )
  and (
    workflow_id is null
    or exists (
      select 1
      from public.workflows workflow
      where workflow.id::text = workflow_steps.workflow_id::text
        and workflow.company_id = workflow_steps.company_id
    )
  )
);

create policy "Permissioned users can update workflow steps"
on public.workflow_steps
for update
to authenticated
using (
  public.current_user_has_any_permission(
    company_id,
    array['editTasks', 'createForms', 'manageForms']
  )
)
with check (
  public.current_user_has_any_permission(
    company_id,
    array['editTasks', 'createForms', 'manageForms']
  )
  and (
    workflow_id is null
    or exists (
      select 1
      from public.workflows workflow
      where workflow.id::text = workflow_steps.workflow_id::text
        and workflow.company_id = workflow_steps.company_id
    )
  )
);

create policy "Managers can delete workflow steps"
on public.workflow_steps
for delete
to authenticated
using (public.current_user_is_manager_or_above(company_id));

drop policy if exists "Company members can manage task workflow instances" on public.task_workflow_instances;
drop policy if exists "Company members can read task workflow instances" on public.task_workflow_instances;
drop policy if exists "Permissioned users can insert task workflow instances" on public.task_workflow_instances;
drop policy if exists "Permissioned users can update task workflow instances" on public.task_workflow_instances;
drop policy if exists "Managers can delete task workflow instances" on public.task_workflow_instances;

create policy "Company members can read task workflow instances"
on public.task_workflow_instances
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

create policy "Permissioned users can insert task workflow instances"
on public.task_workflow_instances
for insert
to authenticated
with check (
  public.current_user_has_permission(company_id, 'editTasks')
  and (
    workflow_id is null
    or exists (
      select 1
      from public.workflows workflow
      where workflow.id::text = task_workflow_instances.workflow_id::text
        and workflow.company_id = task_workflow_instances.company_id
    )
  )
);

create policy "Permissioned users can update task workflow instances"
on public.task_workflow_instances
for update
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    public.current_user_has_permission(company_id, 'editTasks')
    or assigned_to is null
    or assigned_to = auth.uid()
  )
)
with check (
  company_id in (select public.current_user_company_ids())
  and (
    public.current_user_has_permission(company_id, 'editTasks')
    or assigned_to is null
    or assigned_to = auth.uid()
  )
  and (
    workflow_id is null
    or exists (
      select 1
      from public.workflows workflow
      where workflow.id::text = task_workflow_instances.workflow_id::text
        and workflow.company_id = task_workflow_instances.company_id
    )
  )
);

create policy "Managers can delete task workflow instances"
on public.task_workflow_instances
for delete
to authenticated
using (public.current_user_is_manager_or_above(company_id));

drop policy if exists "Company members can manage workflow step instances" on public.workflow_step_instances;
drop policy if exists "Company members can read workflow step instances" on public.workflow_step_instances;
drop policy if exists "Assignees can insert workflow step instances" on public.workflow_step_instances;
drop policy if exists "Assignees can update workflow step instances" on public.workflow_step_instances;
drop policy if exists "Managers can delete workflow step instances" on public.workflow_step_instances;

create policy "Company members can read workflow step instances"
on public.workflow_step_instances
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

create policy "Assignees can insert workflow step instances"
on public.workflow_step_instances
for insert
to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and (
    public.current_user_has_permission(company_id, 'editTasks')
    or exists (
      select 1
      from public.task_workflow_instances run
      where run.id::text = workflow_step_instances.workflow_instance_id::text
        and run.company_id = workflow_step_instances.company_id
        and (run.assigned_to is null or run.assigned_to = auth.uid())
    )
  )
);

create policy "Assignees can update workflow step instances"
on public.workflow_step_instances
for update
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    public.current_user_has_permission(company_id, 'editTasks')
    or exists (
      select 1
      from public.task_workflow_instances run
      where run.id::text = workflow_step_instances.workflow_instance_id::text
        and run.company_id = workflow_step_instances.company_id
        and (run.assigned_to is null or run.assigned_to = auth.uid())
    )
  )
)
with check (
  company_id in (select public.current_user_company_ids())
  and (
    public.current_user_has_permission(company_id, 'editTasks')
    or exists (
      select 1
      from public.task_workflow_instances run
      where run.id::text = workflow_step_instances.workflow_instance_id::text
        and run.company_id = workflow_step_instances.company_id
        and (run.assigned_to is null or run.assigned_to = auth.uid())
    )
  )
);

create policy "Managers can delete workflow step instances"
on public.workflow_step_instances
for delete
to authenticated
using (public.current_user_is_manager_or_above(company_id));

-- Privilege tables ------------------------------------------------------
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.role_permissions to authenticated;

drop policy if exists "Authenticated users can manage scoped restored rows" on public.user_roles;
drop policy if exists "Company members can read user roles" on public.user_roles;
drop policy if exists "Company admins can insert user roles" on public.user_roles;
drop policy if exists "Company admins can update user roles" on public.user_roles;
drop policy if exists "Company admins can delete user roles" on public.user_roles;

create policy "Company members can read user roles"
on public.user_roles
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.company_members mine
    join public.company_members theirs
      on theirs.company_id = mine.company_id
    where mine.user_id = auth.uid()
      and theirs.user_id = user_roles.user_id
  )
  or exists (
    select 1
    from public.profiles profile
    where profile.id = user_roles.user_id
      and profile.company_id in (select public.current_user_company_ids())
  )
  or exists (
    select 1
    from public.departments department
    where department.id::text = user_roles.department_id
      and department.company_id in (select public.current_user_company_ids())
  )
);

create policy "Company admins can insert user roles"
on public.user_roles
for insert
to authenticated
with check (public.current_user_admins_user(user_id));

create policy "Company admins can update user roles"
on public.user_roles
for update
to authenticated
using (public.current_user_admins_user(user_id))
with check (public.current_user_admins_user(user_id));

create policy "Company admins can delete user roles"
on public.user_roles
for delete
to authenticated
using (public.current_user_admins_user(user_id));

drop policy if exists "Authenticated users can manage scoped restored rows" on public.role_permissions;
drop policy if exists "Company members can read role permissions" on public.role_permissions;
drop policy if exists "Company admins can insert role permissions" on public.role_permissions;
drop policy if exists "Company admins can update role permissions" on public.role_permissions;
drop policy if exists "Company admins can delete role permissions" on public.role_permissions;

create policy "Company members can read role permissions"
on public.role_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.company_roles role
    where role.id::text = role_permissions.role_id
      and role.company_id in (select public.current_user_company_ids())
  )
);

create policy "Company admins can insert role permissions"
on public.role_permissions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_roles role
    where role.id::text = role_permissions.role_id
      and public.current_user_is_company_admin(role.company_id)
  )
);

create policy "Company admins can update role permissions"
on public.role_permissions
for update
to authenticated
using (
  exists (
    select 1
    from public.company_roles role
    where role.id::text = role_permissions.role_id
      and public.current_user_is_company_admin(role.company_id)
  )
)
with check (
  exists (
    select 1
    from public.company_roles role
    where role.id::text = role_permissions.role_id
      and public.current_user_is_company_admin(role.company_id)
  )
);

create policy "Company admins can delete role permissions"
on public.role_permissions
for delete
to authenticated
using (
  exists (
    select 1
    from public.company_roles role
    where role.id::text = role_permissions.role_id
      and public.current_user_is_company_admin(role.company_id)
  )
);

-- Schedules, money, and legacy inventory. Same member-wide write hole.
drop policy if exists "Company members can manage schedules" on public.schedules;
drop policy if exists "Company members can read schedules" on public.schedules;
drop policy if exists "Permissioned users can insert schedules" on public.schedules;
drop policy if exists "Permissioned users can update schedules" on public.schedules;
drop policy if exists "Permissioned users can delete schedules" on public.schedules;

create policy "Company members can read schedules"
on public.schedules
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

create policy "Permissioned users can insert schedules"
on public.schedules
for insert
to authenticated
with check (
  public.current_user_has_any_permission(
    company_id,
    array['schedule.create', 'schedule.edit', 'editSchedules']
  )
);

create policy "Permissioned users can update schedules"
on public.schedules
for update
to authenticated
using (
  public.current_user_has_any_permission(
    company_id,
    array['schedule.create', 'schedule.edit', 'editSchedules']
  )
)
with check (
  public.current_user_has_any_permission(
    company_id,
    array['schedule.create', 'schedule.edit', 'editSchedules']
  )
);

create policy "Permissioned users can delete schedules"
on public.schedules
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'schedule.delete'));

drop policy if exists "Company members can manage schedule assignments" on public.schedule_assignments;
drop policy if exists "Company members can read schedule assignments" on public.schedule_assignments;
drop policy if exists "Permissioned users can insert schedule assignments" on public.schedule_assignments;
drop policy if exists "Permissioned users can update schedule assignments" on public.schedule_assignments;
drop policy if exists "Permissioned users can delete schedule assignments" on public.schedule_assignments;

create policy "Company members can read schedule assignments"
on public.schedule_assignments
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

create policy "Permissioned users can insert schedule assignments"
on public.schedule_assignments
for insert
to authenticated
with check (
  public.current_user_has_any_permission(
    company_id,
    array['schedule.create', 'schedule.edit', 'editSchedules']
  )
  and (
    user_id is null
    or exists (
      select 1
      from public.profiles profile
      where profile.id = schedule_assignments.user_id
        and profile.company_id = schedule_assignments.company_id
    )
  )
);

create policy "Permissioned users can update schedule assignments"
on public.schedule_assignments
for update
to authenticated
using (
  public.current_user_has_any_permission(
    company_id,
    array['schedule.create', 'schedule.edit', 'editSchedules']
  )
)
with check (
  public.current_user_has_any_permission(
    company_id,
    array['schedule.create', 'schedule.edit', 'editSchedules']
  )
  and (
    user_id is null
    or exists (
      select 1
      from public.profiles profile
      where profile.id = schedule_assignments.user_id
        and profile.company_id = schedule_assignments.company_id
    )
  )
);

create policy "Permissioned users can delete schedule assignments"
on public.schedule_assignments
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'schedule.delete'));

drop policy if exists "Company members can manage schedule shifts" on public.schedule_shifts;
drop policy if exists "Company members can read schedule shifts" on public.schedule_shifts;
drop policy if exists "Permissioned users can insert schedule shifts" on public.schedule_shifts;
drop policy if exists "Permissioned users can update schedule shifts" on public.schedule_shifts;
drop policy if exists "Permissioned users can delete schedule shifts" on public.schedule_shifts;

create policy "Company members can read schedule shifts"
on public.schedule_shifts
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

create policy "Permissioned users can insert schedule shifts"
on public.schedule_shifts
for insert
to authenticated
with check (
  public.current_user_has_any_permission(
    company_id,
    array['schedule.create', 'schedule.edit', 'editSchedules']
  )
);

create policy "Permissioned users can update schedule shifts"
on public.schedule_shifts
for update
to authenticated
using (
  public.current_user_has_any_permission(
    company_id,
    array['schedule.create', 'schedule.edit', 'editSchedules']
  )
)
with check (
  public.current_user_has_any_permission(
    company_id,
    array['schedule.create', 'schedule.edit', 'editSchedules']
  )
);

create policy "Permissioned users can delete schedule shifts"
on public.schedule_shifts
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'schedule.delete'));

drop policy if exists "Company members can manage payments" on public.payments;
drop policy if exists "Company members can read payments" on public.payments;
drop policy if exists "Permissioned users can insert payments" on public.payments;
drop policy if exists "Permissioned users can update payments" on public.payments;
drop policy if exists "Permissioned users can delete payments" on public.payments;

create policy "Company members can read payments"
on public.payments
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

create policy "Permissioned users can insert payments"
on public.payments
for insert
to authenticated
with check (
  public.current_user_has_any_permission(
    company_id,
    array['managePayments', 'billing.manage']
  )
);

create policy "Permissioned users can update payments"
on public.payments
for update
to authenticated
using (
  public.current_user_has_any_permission(
    company_id,
    array['managePayments', 'billing.manage']
  )
)
with check (
  public.current_user_has_any_permission(
    company_id,
    array['managePayments', 'billing.manage']
  )
);

create policy "Permissioned users can delete payments"
on public.payments
for delete
to authenticated
using (
  public.current_user_has_any_permission(
    company_id,
    array['managePayments', 'billing.manage']
  )
);

drop policy if exists "Company members can manage expenses" on public.expenses;
drop policy if exists "Company members can read expenses" on public.expenses;
drop policy if exists "Permissioned users can insert expenses" on public.expenses;
drop policy if exists "Permissioned users can update expenses" on public.expenses;
drop policy if exists "Managers can delete expenses" on public.expenses;

create policy "Company members can read expenses"
on public.expenses
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

create policy "Permissioned users can insert expenses"
on public.expenses
for insert
to authenticated
with check (
  public.current_user_has_permission(company_id, 'approveExpenses')
  or public.current_user_has_permission(company_id, 'viewTeamExpenses')
  or (
    public.current_user_has_permission(company_id, 'viewOwnExpenses')
    and (
      created_by::text = auth.uid()::text
      or employee_id::text = auth.uid()::text
    )
  )
);

create policy "Permissioned users can update expenses"
on public.expenses
for update
to authenticated
using (
  public.current_user_has_permission(company_id, 'approveExpenses')
  or public.current_user_has_permission(company_id, 'viewTeamExpenses')
  or (
    public.current_user_has_permission(company_id, 'viewOwnExpenses')
    and (
      created_by::text = auth.uid()::text
      or employee_id::text = auth.uid()::text
    )
  )
)
with check (
  public.current_user_has_permission(company_id, 'approveExpenses')
  or public.current_user_has_permission(company_id, 'viewTeamExpenses')
  or (
    public.current_user_has_permission(company_id, 'viewOwnExpenses')
    and (
      created_by::text = auth.uid()::text
      or employee_id::text = auth.uid()::text
    )
  )
);

create policy "Managers can delete expenses"
on public.expenses
for delete
to authenticated
using (public.current_user_is_manager_or_above(company_id));

drop policy if exists "Company members can manage inventory items" on public.inventory_items;
drop policy if exists "Company members can read inventory items" on public.inventory_items;
drop policy if exists "Permissioned users can insert inventory items" on public.inventory_items;
drop policy if exists "Permissioned users can update inventory items" on public.inventory_items;
drop policy if exists "Permissioned users can delete inventory items" on public.inventory_items;

create policy "Company members can read inventory items"
on public.inventory_items
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

create policy "Permissioned users can insert inventory items"
on public.inventory_items
for insert
to authenticated
with check (
  public.current_user_has_any_permission(
    company_id,
    array['manageInventory', 'inventory.create', 'inventory.edit', 'inventory.adjust']
  )
);

create policy "Permissioned users can update inventory items"
on public.inventory_items
for update
to authenticated
using (
  public.current_user_has_any_permission(
    company_id,
    array['manageInventory', 'inventory.create', 'inventory.edit', 'inventory.adjust']
  )
)
with check (
  public.current_user_has_any_permission(
    company_id,
    array['manageInventory', 'inventory.create', 'inventory.edit', 'inventory.adjust']
  )
);

create policy "Permissioned users can delete inventory items"
on public.inventory_items
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'inventory.delete'));

drop policy if exists "Company members can manage inventory transactions" on public.inventory_transactions;
drop policy if exists "Company members can read inventory transactions" on public.inventory_transactions;
drop policy if exists "Permissioned users can insert inventory transactions" on public.inventory_transactions;
drop policy if exists "Permissioned users can update inventory transactions" on public.inventory_transactions;
drop policy if exists "Permissioned users can delete inventory transactions" on public.inventory_transactions;

create policy "Company members can read inventory transactions"
on public.inventory_transactions
for select
to authenticated
using (company_id in (select public.current_user_company_ids()));

create policy "Permissioned users can insert inventory transactions"
on public.inventory_transactions
for insert
to authenticated
with check (
  public.current_user_has_any_permission(
    company_id,
    array['manageInventory', 'inventory.create', 'inventory.edit', 'inventory.adjust']
  )
);

create policy "Permissioned users can update inventory transactions"
on public.inventory_transactions
for update
to authenticated
using (
  public.current_user_has_any_permission(
    company_id,
    array['manageInventory', 'inventory.create', 'inventory.edit', 'inventory.adjust']
  )
)
with check (
  public.current_user_has_any_permission(
    company_id,
    array['manageInventory', 'inventory.create', 'inventory.edit', 'inventory.adjust']
  )
);

create policy "Permissioned users can delete inventory transactions"
on public.inventory_transactions
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'inventory.delete'));

notify pgrst, 'reload schema';
