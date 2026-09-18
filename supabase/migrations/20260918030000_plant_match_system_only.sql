-- Plant must not treat a custom Employee / Supervisor class as the system
-- Staff / Manager row, and must not rewrite boxes on a match.

create or replace function public.plant_onboarding_company_roles(
  target_company_id uuid,
  custom_roles jsonb,
  owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  role_item jsonb;
  resolved_level text;
  existing_id uuid;
  role_name text;
  incoming_system boolean;
begin
  for role_item in select value from jsonb_array_elements(coalesce(custom_roles, '[]'::jsonb))
  loop
    role_name := coalesce(nullif(role_item ->> 'name', ''), 'Custom Role');
    incoming_system := coalesce((role_item ->> 'is_system_role')::boolean, false);
    resolved_level := case
      when coalesce(role_item ->> 'product_level', '') in ('owner', 'admin', 'manager', 'staff')
        then role_item ->> 'product_level'
      else public.infer_company_role_product_level(
        role_name,
        coalesce((role_item ->> 'hierarchy_level')::numeric, 1)
      )
    end;

    existing_id := null;
    select cr.id
    into existing_id
    from public.company_roles cr
    where cr.company_id = target_company_id
      and (
        lower(cr.name) = lower(role_name)
        or (
          incoming_system
          and coalesce(cr.is_system_role, false)
          and (
            cr.product_level = resolved_level
            or public.infer_company_role_product_level(cr.name, cr.hierarchy_level) = resolved_level
          )
        )
      )
    order by
      case when lower(cr.name) = lower(role_name) then 0 else 1 end
    limit 1;

    if existing_id is not null then
      update public.company_roles
      set
        is_active = coalesce((role_item ->> 'is_active')::boolean, is_active)
      where id = existing_id
        and company_id = target_company_id;
    else
      insert into public.company_roles (
        company_id,
        name,
        description,
        color,
        icon,
        hierarchy_level,
        product_level,
        permissions,
        is_system_role,
        is_active,
        created_by
      )
      values (
        target_company_id,
        role_name,
        role_item ->> 'description',
        coalesce(role_item ->> 'color', '#3b82f6'),
        coalesce(role_item ->> 'icon', 'Users'),
        coalesce((role_item ->> 'hierarchy_level')::numeric, 1),
        resolved_level,
        coalesce(role_item -> 'permissions', '{}'::jsonb),
        incoming_system,
        coalesce((role_item ->> 'is_active')::boolean, true),
        owner_user_id
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.plant_onboarding_company_roles(uuid, jsonb, uuid) from public;
grant execute on function public.plant_onboarding_company_roles(uuid, jsonb, uuid) to authenticated, service_role;
