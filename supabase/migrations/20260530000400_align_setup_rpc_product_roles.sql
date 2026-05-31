-- Align direct onboarding RPC role baselines with the product role contract.
-- The TypeScript onboarding/support paths already enforce this, but this keeps
-- direct database setup calls from leaving legacy Administrator/Employee roles.

create or replace function public.ensure_product_company_roles_sql(
  target_company_id uuid,
  creator_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id_value uuid;
begin
  if target_company_id is null then
    return;
  end if;

  select c.owner_id
  into owner_id_value
  from public.companies c
  where c.id = target_company_id;

  delete from public.company_roles legacy
  where legacy.company_id = target_company_id
    and lower(legacy.name) in ('administrator', 'company administrator')
    and exists (
      select 1
      from public.company_roles product
      where product.company_id = target_company_id
        and lower(product.name) = 'admin'
        and product.id <> legacy.id
    );

  update public.company_roles
  set
    name = 'Admin',
    description = coalesce(nullif(description, ''), 'Administrative workspace access'),
    color = coalesce(nullif(color, ''), '#2563eb'),
    icon = coalesce(nullif(icon, ''), 'Shield'),
    hierarchy_level = 3,
    is_system_role = true,
    is_active = true
  where company_id = target_company_id
    and lower(name) in ('administrator', 'company administrator');

  delete from public.company_roles legacy
  where legacy.company_id = target_company_id
    and lower(legacy.name) in ('employee', 'team member')
    and exists (
      select 1
      from public.company_roles product
      where product.company_id = target_company_id
        and lower(product.name) = 'staff'
        and product.id <> legacy.id
    );

  update public.company_roles
  set
    name = 'Staff',
    description = coalesce(nullif(description, ''), 'Standard team member access'),
    color = coalesce(nullif(color, ''), '#6b7280'),
    icon = coalesce(nullif(icon, ''), 'User'),
    hierarchy_level = 1,
    is_system_role = true,
    is_active = true
  where company_id = target_company_id
    and lower(name) in ('employee', 'team member');

  update public.company_roles
  set
    description = coalesce(nullif(description, ''), 'Full workspace ownership'),
    color = coalesce(nullif(color, ''), '#111827'),
    icon = coalesce(nullif(icon, ''), 'Crown'),
    hierarchy_level = 4,
    is_system_role = true,
    is_active = true
  where company_id = target_company_id
    and lower(name) = 'owner';

  update public.company_roles
  set
    description = coalesce(nullif(description, ''), 'Team and operations management'),
    color = coalesce(nullif(color, ''), '#16a34a'),
    icon = coalesce(nullif(icon, ''), 'Users'),
    hierarchy_level = 2,
    is_system_role = true,
    is_active = true
  where company_id = target_company_id
    and lower(name) = 'manager';

  insert into public.company_roles (
    company_id,
    name,
    description,
    color,
    icon,
    hierarchy_level,
    permissions,
    is_system_role,
    is_active,
    created_by
  )
  select
    target_company_id,
    role_name,
    role_description,
    role_color,
    role_icon,
    role_level,
    role_permissions,
    true,
    true,
    coalesce(creator_user_id, owner_id_value)
  from (
    values
      ('Owner', 'Full workspace ownership', '#111827', 'Crown', 4::numeric, '{"admin": true, "owner": true}'::jsonb),
      ('Admin', 'Administrative workspace access', '#2563eb', 'Shield', 3::numeric, '{"admin": true}'::jsonb),
      ('Manager', 'Team and operations management', '#16a34a', 'Users', 2::numeric, '{"manageTeam": true}'::jsonb),
      ('Staff', 'Standard team member access', '#6b7280', 'User', 1::numeric, '{"viewOwnProfile": true}'::jsonb)
  ) defaults(role_name, role_description, role_color, role_icon, role_level, role_permissions)
  where not exists (
    select 1
    from public.company_roles cr
    where cr.company_id = target_company_id
      and lower(cr.name) = lower(defaults.role_name)
  );
end;
$$;

create or replace function public.normalize_company_roles_after_setup_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.action = 'company.setup_verified' then
    perform public.ensure_product_company_roles_sql(new.company_id, new.actor_id);
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_company_roles_after_setup_audit on public.audit_log;
create trigger normalize_company_roles_after_setup_audit
after insert on public.audit_log
for each row execute function public.normalize_company_roles_after_setup_audit();

do $$
declare
  company_record record;
begin
  for company_record in
    select id, owner_id
    from public.companies
  loop
    perform public.ensure_product_company_roles_sql(company_record.id, company_record.owner_id);
  end loop;
end;
$$;

revoke all on function public.ensure_product_company_roles_sql(uuid, uuid) from public;
revoke all on function public.normalize_company_roles_after_setup_audit() from public;
grant execute on function public.ensure_product_company_roles_sql(uuid, uuid) to service_role;
grant execute on function public.normalize_company_roles_after_setup_audit() to service_role;

notify pgrst, 'reload schema';
