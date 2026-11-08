-- Split schedule writes into create, edit, assign, and delete.
-- Missing keys follow product_role_default_allows. An explicit false stays a deny.
-- Does not update or rewrite company_roles. Do not apply until reviewed.

create or replace function public.product_role_default_allows(
  level text,
  permission_key text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select public.product_role_default_allows_base(level, permission_key)
    or (
      level in ('admin', 'manager')
      and permission_key in ('tasks.view', 'tasks.update', 'tasks.delete')
    )
    or (level = 'staff' and permission_key = 'tasks.view')
    or (
      level in ('admin', 'manager')
      and permission_key in ('schedule.assign', 'schedule.delete')
    )
    or (
      level = 'supervisor'
      and permission_key in ('schedule.edit', 'schedule.assign', 'editSchedules')
    );
$$;

revoke all on function public.product_role_default_allows(text, text) from public, anon, authenticated;
grant execute on function public.product_role_default_allows(text, text) to service_role;

-- Any class the owner can edit may store any combination of the four keys.
-- The default function still decides a missing key. This list is only the ceiling.
create or replace function public.product_level_allowed_permissions(level text)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  base jsonb;
  extra jsonb := jsonb_build_array(
    'tasks.view',
    'tasks.update',
    'tasks.delete',
    'schedule.create',
    'schedule.edit',
    'schedule.assign',
    'schedule.delete',
    'editSchedules'
  );
begin
  if level = 'supervisor' then
    return extra || jsonb_build_array(
      'viewOwnProfile', 'editOwnProfile', 'viewOwnSchedules', 'viewTeamSchedules',
      'schedule.view', 'viewOwnTasks', 'tasks.view', 'forms.submit', 'messages.send'
    );
  end if;

  base := public.product_level_allowed_permissions_base(level);
  if level = 'owner' or base is null then
    return base;
  end if;
  return base || extra;
end;
$$;

revoke all on function public.product_level_allowed_permissions(text) from public, anon, authenticated;
grant execute on function public.product_level_allowed_permissions(text) to service_role;

create or replace function public.enforce_schedule_write_permissions()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  assignment_changed boolean;
  content_changed boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not public.current_user_has_permission(new.company_id, 'schedule.create') then
      raise exception 'schedule.create required' using errcode = '42501';
    end if;
    if new.user_id is not null
      and not public.current_user_has_permission(new.company_id, 'schedule.assign') then
      raise exception 'schedule.assign required' using errcode = '42501';
    end if;
    return new;
  end if;

  assignment_changed := new.user_id is distinct from old.user_id;
  content_changed :=
    new.title is distinct from old.title
    or new.start_time is distinct from old.start_time
    or new.end_time is distinct from old.end_time
    or new.role is distinct from old.role
    or new.location is distinct from old.location
    or new.notes is distinct from old.notes
    or new.break_minutes is distinct from old.break_minutes
    or new.status is distinct from old.status
    or new.is_published is distinct from old.is_published
    or new.required_headcount is distinct from old.required_headcount
    or new.position_id is distinct from old.position_id
    or new.requirements is distinct from old.requirements
    or new.hourly_rate is distinct from old.hourly_rate
    or new.color is distinct from old.color
    or new.is_all_day is distinct from old.is_all_day
    or new.template_id is distinct from old.template_id
    or new.timezone is distinct from old.timezone
    or new.store_id is distinct from old.store_id;

  if content_changed
    and not public.current_user_has_permission(new.company_id, 'schedule.edit') then
    raise exception 'schedule.edit required' using errcode = '42501';
  end if;
  if assignment_changed
    and not public.current_user_has_permission(new.company_id, 'schedule.assign') then
    raise exception 'schedule.assign required' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_schedule_write_permissions() from public, anon, authenticated;

drop trigger if exists enforce_schedule_write_permissions on public.schedules;
create trigger enforce_schedule_write_permissions
before insert or update on public.schedules
for each row execute function public.enforce_schedule_write_permissions();

drop policy if exists "Permissioned users can insert schedules" on public.schedules;
drop policy if exists "Permissioned users can update schedules" on public.schedules;
drop policy if exists "Permissioned users can delete schedules" on public.schedules;

create policy "Permissioned users can insert schedules"
on public.schedules
for insert
to authenticated
with check (public.current_user_has_permission(company_id, 'schedule.create'));

create policy "Permissioned users can update schedules"
on public.schedules
for update
to authenticated
using (
  public.current_user_has_any_permission(
    company_id,
    array['schedule.edit', 'schedule.assign']
  )
)
with check (
  public.current_user_has_any_permission(
    company_id,
    array['schedule.edit', 'schedule.assign']
  )
);

create policy "Permissioned users can delete schedules"
on public.schedules
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'schedule.delete'));

drop policy if exists "Permissioned users can insert schedule assignments" on public.schedule_assignments;
drop policy if exists "Permissioned users can update schedule assignments" on public.schedule_assignments;
drop policy if exists "Permissioned users can delete schedule assignments" on public.schedule_assignments;

create policy "Permissioned users can insert schedule assignments"
on public.schedule_assignments
for insert
to authenticated
with check (
  public.current_user_has_permission(company_id, 'schedule.assign')
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
using (public.current_user_has_permission(company_id, 'schedule.assign'))
with check (
  public.current_user_has_permission(company_id, 'schedule.assign')
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
using (public.current_user_has_permission(company_id, 'schedule.assign'));

drop policy if exists "Permissioned users can insert schedule shifts" on public.schedule_shifts;
drop policy if exists "Permissioned users can update schedule shifts" on public.schedule_shifts;
drop policy if exists "Permissioned users can delete schedule shifts" on public.schedule_shifts;

create policy "Permissioned users can insert schedule shifts"
on public.schedule_shifts
for insert
to authenticated
with check (public.current_user_has_permission(company_id, 'schedule.create'));

create policy "Permissioned users can update schedule shifts"
on public.schedule_shifts
for update
to authenticated
using (public.current_user_has_permission(company_id, 'schedule.edit'))
with check (public.current_user_has_permission(company_id, 'schedule.edit'));

create policy "Permissioned users can delete schedule shifts"
on public.schedule_shifts
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'schedule.delete'));

drop function if exists public.get_company_roles(uuid);

create function public.get_company_roles(company_uuid uuid default null)
returns table (
  id uuid,
  name text,
  description text,
  color text,
  icon text,
  hierarchy_level numeric,
  product_level text,
  permissions jsonb,
  is_system_role boolean,
  is_active boolean,
  department_id uuid
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  target_company_id uuid;
begin
  target_company_id := company_uuid;

  if target_company_id is null then
    select company_id
    into target_company_id
    from public.current_user_company_ids() company_id
    limit 1;
  end if;

  perform public.assert_company_membership(target_company_id);

  return query
  select
    cr.id,
    cr.name,
    cr.description,
    coalesce(cr.color, '#3b82f6') as color,
    coalesce(cr.icon, 'Users') as icon,
    coalesce(cr.hierarchy_level, 1) as hierarchy_level,
    cr.product_level,
    coalesce(cr.permissions, '{}'::jsonb) as permissions,
    coalesce(cr.is_system_role, false) as is_system_role,
    coalesce(cr.is_active, true) as is_active,
    cr.department_id
  from public.company_roles cr
  where cr.company_id = target_company_id
  order by coalesce(cr.hierarchy_level, 999999), cr.name;
end;
$$;

revoke all on function public.get_company_roles(uuid) from public, anon;
grant execute on function public.get_company_roles(uuid) to authenticated, service_role;

alter table public.employee_onboarding_documents
  add column if not exists description text not null default '';

notify pgrst, 'reload schema';
