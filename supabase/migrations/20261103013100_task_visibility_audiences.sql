-- Per-task view and edit audiences.
-- private: assignee and creator. That is the default when someone is assigned.
-- people, position, role, department, or company add a wider circle.
-- viewTeamTasks still sees every company task (manager oversight).
-- editTasks still edits every company task (matrix edit). tasks.update edits
-- only inside the edit audience. tasks.delete deletes tasks the person can see.
-- This file is not applied by the pull request.

alter table public.tasks
  add column if not exists view_audience jsonb,
  add column if not exists edit_audience jsonb;

update public.tasks
set view_audience = case
  when assigned_to is not null then '{"kind":"private"}'::jsonb
  else '{"kind":"company"}'::jsonb
end
where view_audience is null;

update public.tasks
set edit_audience = case
  when assigned_to is not null then '{"kind":"private"}'::jsonb
  else '{"kind":"company"}'::jsonb
end
where edit_audience is null;

alter table public.tasks
  alter column view_audience set default '{"kind":"company"}'::jsonb,
  alter column edit_audience set default '{"kind":"company"}'::jsonb;

create or replace function public.set_task_audience_default()
returns trigger
language plpgsql
as $$
declare
  fallback jsonb;
begin
  fallback := case
    when new.assigned_to is not null then '{"kind":"private"}'::jsonb
    else '{"kind":"company"}'::jsonb
  end;
  if new.view_audience is null or new.view_audience = '{}'::jsonb then
    new.view_audience := fallback;
  end if;
  if new.edit_audience is null or new.edit_audience = '{}'::jsonb then
    new.edit_audience := fallback;
  end if;

  if tg_op = 'UPDATE'
    and auth.uid() is not null
    and coalesce(auth.role(), '') is distinct from 'service_role'
    and (
      new.view_audience is distinct from old.view_audience
      or new.edit_audience is distinct from old.edit_audience
    )
    and auth.uid() is distinct from old.created_by
    and not public.current_user_has_permission(old.company_id, 'editTasks')
  then
    raise exception 'Only the task creator can change who can view or edit this task'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists set_task_audience_default on public.tasks;
create trigger set_task_audience_default
before insert or update on public.tasks
for each row execute function public.set_task_audience_default();

alter function public.product_role_default_allows(text, text)
  rename to product_role_default_allows_base;

create or replace function public.product_role_default_allows(
  level text,
  permission_key text
)
returns boolean
language sql
immutable
as $$
  select public.product_role_default_allows_base(level, permission_key)
    or (
      level in ('admin', 'manager')
      and permission_key in ('tasks.view', 'tasks.update', 'tasks.delete')
    )
    or (level = 'staff' and permission_key = 'tasks.view');
$$;

alter function public.product_level_allowed_permissions(text)
  rename to product_level_allowed_permissions_base;

create or replace function public.product_level_allowed_permissions(level text)
returns jsonb
language plpgsql
immutable
as $$
declare
  base jsonb;
begin
  base := public.product_level_allowed_permissions_base(level);
  if level = 'owner' or base is null then
    return base;
  end if;
  return base || jsonb_build_array('tasks.view', 'tasks.update', 'tasks.delete');
end;
$$;

create or replace function public.task_audience_includes(
  audience jsonb,
  target_company_id uuid,
  created_by text,
  assigned_to text,
  always_include_assignee boolean
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
  packed jsonb := audience;
  kind text;
  profile_role text;
  profile_role_id text;
  profile_position text;
  profile_department text;
  member_role text;
begin
  if uid is null then
    return false;
  end if;

  if packed is null then
    packed := '{"kind":"private"}'::jsonb;
  elsif jsonb_typeof(packed) = 'string' then
    begin
      packed := (packed #>> '{}')::jsonb;
    exception
      when others then
        packed := '{"kind":"private"}'::jsonb;
    end;
  end if;

  kind := coalesce(packed->>'kind', 'private');

  if uid = created_by then
    return true;
  end if;

  if assigned_to is not null and uid = assigned_to and (kind = 'private' or always_include_assignee) then
    return true;
  end if;

  if kind = 'company' then
    return true;
  end if;

  if kind = 'private' then
    return false;
  end if;

  select cm.role
  into member_role
  from public.company_members cm
  where cm.user_id = auth.uid()
    and cm.company_id = target_company_id
  limit 1;

  select
    case when p.company_id = target_company_id then p.role end,
    case when p.company_id = target_company_id then p.role_id::text end,
    case when p.company_id = target_company_id then p.position_id::text end,
    case when p.company_id = target_company_id then p.department_id::text end
  into profile_role, profile_role_id, profile_position, profile_department
  from public.profiles p
  where p.id = auth.uid();

  if profile_role is null then
    profile_role := member_role;
  end if;

  if kind = 'people' then
    return coalesce(packed->'user_ids', '[]'::jsonb) ? uid;
  end if;

  if kind = 'position' then
    return coalesce(packed->'position_ids', '[]'::jsonb) ? profile_position
      or exists (
        select 1
        from public.position_assignments assignment
        where assignment.user_id = auth.uid()
          and coalesce(assignment.is_active, true)
          and coalesce(packed->'position_ids', '[]'::jsonb) ? assignment.position_id::text
      );
  end if;

  if kind = 'role' then
    return exists (
      select 1
      from public.company_roles role
      where role.company_id = target_company_id
        and coalesce(packed->'role_ids', '[]'::jsonb) ? role.id::text
        and (
          role.id::text = profile_role_id
          or lower(role.name) = lower(coalesce(profile_role, ''))
        )
    );
  end if;

  if kind = 'department' then
    return profile_department is not null
      and coalesce(packed->'department_ids', '[]'::jsonb) ? profile_department;
  end if;

  return false;
end;
$$;

create or replace function public.current_user_can_view_task(
  target_company_id uuid,
  created_by text,
  assigned_to text,
  view_audience jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  if target_company_id is null or auth.uid() is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.current_user_role_snapshot(target_company_id)
  ) then
    return false;
  end if;

  -- Matrix oversight: view team tasks sees every task in the company.
  if public.current_user_has_permission(target_company_id, 'viewTeamTasks') then
    return true;
  end if;

  if not public.current_user_has_any_permission(
    target_company_id,
    array['tasks.view', 'viewOwnTasks', 'viewTeamTasks']
  ) then
    return false;
  end if;

  return public.task_audience_includes(
    view_audience,
    target_company_id,
    created_by,
    assigned_to,
    true
  );
end;
$$;

create or replace function public.current_user_can_edit_task_audience(
  target_company_id uuid,
  created_by text,
  assigned_to text,
  task_source text,
  edit_audience jsonb
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
  on_task boolean := uid = created_by or (assigned_to is not null and uid = assigned_to);
begin
  if target_company_id is null or uid is null then
    return false;
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

  if not public.task_audience_includes(
    edit_audience,
    target_company_id,
    created_by,
    assigned_to,
    false
  ) then
    return false;
  end if;

  if public.current_user_has_permission(target_company_id, 'tasks.update') then
    return true;
  end if;

  return on_task and public.current_user_has_permission(target_company_id, 'viewOwnTasks');
end;
$$;

create or replace function public.current_user_can_delete_task(
  target_company_id uuid,
  created_by text,
  assigned_to text,
  view_audience jsonb
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_has_permission(target_company_id, 'tasks.delete')
    and public.current_user_can_view_task(
      target_company_id,
      created_by,
      assigned_to,
      view_audience
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
    return public.current_user_can_delete_task(
      target_company_id,
      created_by,
      assigned_to,
      null
    );
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

  return public.current_user_can_edit_task_audience(
    target_company_id,
    created_by,
    assigned_to,
    task_source,
    null
  );
end;
$$;

revoke all on function public.product_role_default_allows(text, text) from public, anon, authenticated;
revoke all on function public.product_role_default_allows_base(text, text) from public, anon, authenticated;
revoke all on function public.product_level_allowed_permissions(text) from public, anon, authenticated;
revoke all on function public.product_level_allowed_permissions_base(text) from public, anon, authenticated;
revoke all on function public.task_audience_includes(jsonb, uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.current_user_can_view_task(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.current_user_can_edit_task_audience(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.current_user_can_delete_task(uuid, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.product_role_default_allows(text, text) to service_role;
grant execute on function public.product_role_default_allows_base(text, text) to service_role;
grant execute on function public.product_level_allowed_permissions(text) to service_role;
grant execute on function public.product_level_allowed_permissions_base(text) to service_role;
grant execute on function public.task_audience_includes(jsonb, uuid, text, text, boolean) to service_role;
grant execute on function public.current_user_can_view_task(uuid, text, text, jsonb) to authenticated, service_role;
grant execute on function public.current_user_can_edit_task_audience(uuid, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.current_user_can_delete_task(uuid, text, text, jsonb) to authenticated, service_role;

drop policy if exists "Company members can read tasks" on public.tasks;
drop policy if exists "Permissioned users can update tasks" on public.tasks;
drop policy if exists "Managers can delete tasks" on public.tasks;

create policy "Company members can read tasks"
on public.tasks
for select
to authenticated
using (
  public.current_user_can_view_task(
    company_id,
    created_by::text,
    assigned_to::text,
    view_audience
  )
);

create policy "Permissioned users can update tasks"
on public.tasks
for update
to authenticated
using (
  public.current_user_can_edit_task_audience(
    company_id,
    created_by::text,
    assigned_to::text,
    source,
    edit_audience
  )
)
with check (
  public.current_user_can_edit_task_audience(
    company_id,
    created_by::text,
    assigned_to::text,
    source,
    edit_audience
  )
);

create policy "Managers can delete tasks"
on public.tasks
for delete
to authenticated
using (
  public.current_user_can_delete_task(
    company_id,
    created_by::text,
    assigned_to::text,
    view_audience
  )
);

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
      and public.current_user_can_view_task(
        task.company_id,
        task.created_by::text,
        task.assigned_to::text,
        task.view_audience
      )
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
      and public.current_user_can_view_task(
        task.company_id,
        task.created_by::text,
        task.assigned_to::text,
        task.view_audience
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
      and public.current_user_can_view_task(
        task.company_id,
        task.created_by::text,
        task.assigned_to::text,
        task.view_audience
      )
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
      and public.current_user_can_delete_task(
        task.company_id,
        task.created_by::text,
        task.assigned_to::text,
        task.view_audience
      )
  )
);

drop policy if exists "Company members can read task activities" on public.task_activities;
drop policy if exists "Permissioned users can insert task activities" on public.task_activities;
drop policy if exists "Actors can update task activities" on public.task_activities;
drop policy if exists "Managers can delete task activities" on public.task_activities;

create policy "Company members can read task activities"
on public.task_activities
for select
to authenticated
using (
  exists (
    select 1
    from public.tasks task
    where task.id = task_activities.task_id
      and task.company_id = task_activities.company_id
      and public.current_user_can_view_task(
        task.company_id,
        task.created_by::text,
        task.assigned_to::text,
        task.view_audience
      )
  )
);

create policy "Permissioned users can insert task activities"
on public.task_activities
for insert
to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and (user_id is null or user_id = auth.uid())
  and (
    task_id is null
    or exists (
      select 1
      from public.tasks task
      where task.id = task_activities.task_id
        and task.company_id = task_activities.company_id
        and public.current_user_can_view_task(
          task.company_id,
          task.created_by::text,
          task.assigned_to::text,
          task.view_audience
        )
    )
  )
);

create policy "Actors can update task activities"
on public.task_activities
for update
to authenticated
using (company_id in (select public.current_user_company_ids()) and user_id = auth.uid())
with check (
  company_id in (select public.current_user_company_ids())
  and user_id = auth.uid()
  and (
    task_id is null
    or exists (
      select 1
      from public.tasks task
      where task.id = task_activities.task_id
        and task.company_id = task_activities.company_id
    )
  )
);

create policy "Managers can delete task activities"
on public.task_activities
for delete
to authenticated
using (
  exists (
    select 1
    from public.tasks task
    where task.id = task_activities.task_id
      and task.company_id = task_activities.company_id
      and public.current_user_can_delete_task(
        task.company_id,
        task.created_by::text,
        task.assigned_to::text,
        task.view_audience
      )
  )
);

drop policy if exists "Readers can select task notifications" on public.task_notifications;
drop policy if exists "Members can insert task notifications" on public.task_notifications;

create policy "Readers can select task notifications"
on public.task_notifications
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    task_id is null
    or exists (
      select 1
      from public.tasks task
      where task.id::text = task_notifications.task_id
        and task.company_id = task_notifications.company_id
        and public.current_user_can_view_task(
          task.company_id,
          task.created_by::text,
          task.assigned_to::text,
          task.view_audience
        )
    )
  )
  and (
    user_id = auth.uid()
    or public.current_user_has_permission(company_id, 'viewTeamTasks')
  )
);

create policy "Members can insert task notifications"
on public.task_notifications
for insert
to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and (
    task_id is null
    or exists (
      select 1
      from public.tasks task
      where task.id::text = task_notifications.task_id
        and task.company_id = task_notifications.company_id
        and public.current_user_can_view_task(
          task.company_id,
          task.created_by::text,
          task.assigned_to::text,
          task.view_audience
        )
    )
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

notify pgrst, 'reload schema';
