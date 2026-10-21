-- Managers who can manage availability may insert and update their company org_prefs row.
-- Authenticated previously had SELECT only, so the Team hours choice could not be saved.

grant insert, update on table public.org_prefs to authenticated;

create or replace function public.can_manage_org_availability(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_org_id in (select public.current_user_company_ids())
    and (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.company_id = target_org_id
          and (
            coalesce(p.is_company_admin, false)
            or lower(coalesce(p.role, '')) in (
              'owner',
              'admin',
              'manager',
              'operations_manager',
              'schedule_admin',
              'gm',
              'general_manager',
              'administrator',
              'company_admin'
            )
            or lower(coalesce(p.role, '')) like '%manager%'
          )
      )
      or exists (
        select 1
        from public.company_members cm
        where cm.user_id = auth.uid()
          and cm.company_id = target_org_id
          and (
            lower(coalesce(cm.role, '')) in (
              'owner',
              'admin',
              'manager',
              'operations_manager',
              'schedule_admin',
              'gm',
              'general_manager',
              'administrator',
              'company_admin'
            )
            or lower(coalesce(cm.role, '')) like '%manager%'
          )
      )
      or exists (
        select 1
        from public.user_permissions up
        where up.user_id = auth.uid()
          and up.permission_key = 'editSchedules'
          and up.permission_value = 'allow'
      )
      or (
        not exists (
          select 1
          from public.user_permissions up
          where up.user_id = auth.uid()
            and up.permission_key = 'editSchedules'
            and up.permission_value = 'deny'
        )
        and exists (
          select 1
          from public.profiles p
          join public.company_roles cr
            on cr.id = p.role_id
           and cr.company_id = target_org_id
          where p.id = auth.uid()
            and p.company_id = target_org_id
            and (cr.permissions -> 'editSchedules') = 'true'::jsonb
        )
      )
    );
$$;

revoke all on function public.can_manage_org_availability(uuid) from public;
grant execute on function public.can_manage_org_availability(uuid) to authenticated, service_role;

drop policy if exists "Company managers can insert org prefs" on public.org_prefs;
create policy "Company managers can insert org prefs"
on public.org_prefs
for insert
to authenticated
with check (public.can_manage_org_availability(id));

drop policy if exists "Company managers can update org prefs" on public.org_prefs;
create policy "Company managers can update org prefs"
on public.org_prefs
for update
to authenticated
using (public.can_manage_org_availability(id))
with check (public.can_manage_org_availability(id));
