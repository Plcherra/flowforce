create or replace function public.owner_major_permissions()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'manageUsers', true,
    'systemSettings', true,
    'managePositions', true,
    'admin.roles', true,
    'admin.permissions', true,
    'admin.settings', true,
    'billing.view', true,
    'billing.manage', true
  );
$$;

create or replace function public.clamp_permissions_to_product_level(
  level text,
  permissions jsonb
)
returns jsonb
language plpgsql
immutable
as $$
declare
  allowed jsonb;
  clamped jsonb := '{}'::jsonb;
  permission_key text;
begin
  if permissions is null or jsonb_typeof(permissions) <> 'object' then
    if level = 'owner' then
      return public.owner_major_permissions();
    end if;
    return '{}'::jsonb;
  end if;

  if level = 'owner' then
    return permissions || public.owner_major_permissions();
  end if;

  allowed := public.product_level_allowed_permissions(level);

  for permission_key in select jsonb_object_keys(permissions)
  loop
    if allowed ? permission_key then
      clamped := clamped || jsonb_build_object(permission_key, permissions -> permission_key);
    end if;
  end loop;

  return clamped;
end;
$$;

update public.company_roles
set permissions = public.clamp_permissions_to_product_level(product_level, permissions)
where product_level = 'owner';

revoke all on function public.owner_major_permissions() from public;
grant execute on function public.owner_major_permissions() to service_role;
grant execute on function public.clamp_permissions_to_product_level(text, jsonb) to service_role;
