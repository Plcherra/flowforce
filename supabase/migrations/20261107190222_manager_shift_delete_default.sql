-- Managers can delete shifts unless an owner turns that off on the class.
-- A missing key follows this default. An explicit false stays a deny.
-- public.schedules DELETE already requires
-- current_user_has_permission(company_id, 'schedule.delete').
-- The manager grant ceiling already includes schedule.delete.

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
    or (level = 'manager' and permission_key = 'schedule.delete');
$$;

-- Add the key only. Do not change an explicit true or false, and do not
-- remove any other permission.
update public.company_roles
set permissions = case
  when permissions is null then jsonb_build_object('schedule.delete', true)
  when jsonb_typeof(permissions) = 'array'
    then permissions || jsonb_build_array('schedule.delete')
  else permissions || jsonb_build_object('schedule.delete', true)
end
where coalesce(
  product_level,
  public.infer_company_role_product_level(name, hierarchy_level)
) = 'manager'
  and (
    permissions is null
    or (
      jsonb_typeof(permissions) in ('object', 'array')
      and not (permissions ? 'schedule.delete')
    )
  );
