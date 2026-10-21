-- People who can grant schedule permissions may read teammate overrides
-- and write the schedule keys Team hours edits.

create or replace function public.can_grant_schedule_permissions(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles target
    where target.id = target_user_id
      and target.company_id in (select public.current_user_company_ids())
      and (
        exists (
          select 1
          from public.profiles caller
          where caller.id = auth.uid()
            and caller.company_id = target.company_id
            and (
              coalesce(caller.is_company_admin, false)
              or lower(coalesce(caller.role, '')) in (
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
              or lower(coalesce(caller.role, '')) like '%manager%'
            )
        )
        or exists (
          select 1
          from public.user_permissions up
          where up.user_id = auth.uid()
            and up.permission_key = 'schedule.grant'
            and up.permission_value = 'allow'
        )
        or (
          not exists (
            select 1
            from public.user_permissions up
            where up.user_id = auth.uid()
              and up.permission_key = 'schedule.grant'
              and up.permission_value = 'deny'
          )
          and exists (
            select 1
            from public.profiles caller
            join public.company_roles cr
              on cr.id = caller.role_id
             and cr.company_id = target.company_id
            where caller.id = auth.uid()
              and caller.company_id = target.company_id
              and (cr.permissions -> 'schedule.grant') = 'true'::jsonb
          )
        )
      )
  );
$$;

revoke all on function public.can_grant_schedule_permissions(uuid) from public;
grant execute on function public.can_grant_schedule_permissions(uuid) to authenticated, service_role;

drop policy if exists "Schedule grant can read team permission overrides" on public.user_permissions;
create policy "Schedule grant can read team permission overrides"
on public.user_permissions
for select
to authenticated
using (public.can_grant_schedule_permissions(user_id));

drop policy if exists "Schedule grant can write schedule permission overrides" on public.user_permissions;
create policy "Schedule grant can write schedule permission overrides"
on public.user_permissions
for all
to authenticated
using (
  public.can_grant_schedule_permissions(user_id)
  and permission_key in (
    'viewOwnSchedules',
    'viewTeamSchedules',
    'schedule.view',
    'editSchedules',
    'schedule.edit',
    'schedule.create',
    'schedule.delete'
  )
)
with check (
  public.can_grant_schedule_permissions(user_id)
  and permission_key in (
    'viewOwnSchedules',
    'viewTeamSchedules',
    'schedule.view',
    'editSchedules',
    'schedule.edit',
    'schedule.create',
    'schedule.delete'
  )
);
