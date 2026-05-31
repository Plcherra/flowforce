-- Hardening: company_members is the tenant membership source. The onboarding
-- setup RPC may use profiles.company_id as a current-company shortcut only
-- when that company already belongs to the same owner.

create or replace function public.create_company_with_setup(
  company_data jsonb,
  custom_roles jsonb default '[]'::jsonb,
  positions_data jsonb default '[]'::jsonb,
  owner_user_id uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_company_id uuid;
  company_slug text;
  role_item jsonb;
  position_item jsonb;
  owner_first_name text := coalesce(nullif(company_data #>> '{owner_profile,first_name}', ''), '');
  owner_last_name text := coalesce(nullif(company_data #>> '{owner_profile,last_name}', ''), '');
  owner_email text := nullif(company_data #>> '{owner_profile,email}', '');
  owner_phone text := nullif(company_data #>> '{owner_profile,phone}', '');
  template_config_value jsonb;
  custom_roles_value jsonb := coalesce(custom_roles, '[]'::jsonb);
  positions_data_value jsonb := coalesce(positions_data, '[]'::jsonb);
begin
  if owner_user_id is null then
    owner_user_id := auth.uid();
  end if;

  if owner_user_id is null then
    raise exception 'owner_user_id is required'
      using errcode = '22023';
  end if;

  if auth.role() <> 'service_role' and owner_user_id <> auth.uid() then
    raise exception 'owner_user_id must match the authenticated user'
      using errcode = '42501';
  end if;

  template_config_value := coalesce(
    case
      when jsonb_typeof(company_data -> 'template_config') = 'string'
        then (company_data ->> 'template_config')::jsonb
      else company_data -> 'template_config'
    end,
    '{}'::jsonb
  );

  select cm.company_id
  into v_company_id
  from public.company_members cm
  where cm.user_id = owner_user_id
    and cm.company_id is not null
  order by cm.added_at nulls last
  limit 1;

  if v_company_id is null then
    select p.company_id
    into v_company_id
    from public.profiles p
    join public.companies c on c.id = p.company_id
    where p.id = owner_user_id
      and p.company_id is not null
      and (c.owner_id = owner_user_id or c.created_by = owner_user_id)
    order by c.created_at nulls last
    limit 1;
  end if;

  if v_company_id is null then
    select c.id
    into v_company_id
    from public.companies c
    where c.owner_id = owner_user_id
      or c.created_by = owner_user_id
    order by c.created_at nulls last
    limit 1;
  end if;

  if v_company_id is null then
    company_slug := lower(regexp_replace(coalesce(company_data ->> 'name', 'company'), '[^a-zA-Z0-9]+', '-', 'g'));
    company_slug := trim(both '-' from company_slug) || '-' || substring(gen_random_uuid()::text, 1, 8);

    insert into public.companies (
      name,
      slug,
      industry,
      size,
      description,
      website,
      phone,
      primary_color,
      secondary_color,
      template_id,
      template_name,
      enabled_sections,
      template_config,
      custom_roles,
      positions,
      registration_complete,
      created_by,
      owner_id
    )
    values (
      coalesce(company_data ->> 'name', 'New Company'),
      company_slug,
      company_data ->> 'industry',
      company_data ->> 'size',
      company_data ->> 'description',
      company_data ->> 'website',
      company_data ->> 'phone',
      coalesce(company_data ->> 'primary_color', '#3b82f6'),
      coalesce(company_data ->> 'secondary_color', '#1e40af'),
      company_data ->> 'template_id',
      company_data ->> 'template_name',
      coalesce(company_data -> 'enabled_sections', '[]'::jsonb),
      template_config_value,
      custom_roles_value,
      positions_data_value,
      true,
      owner_user_id,
      owner_user_id
    )
    returning id into v_company_id;
  else
    update public.companies
    set
      name = coalesce(nullif(company_data ->> 'name', ''), name),
      industry = coalesce(company_data ->> 'industry', industry),
      size = coalesce(company_data ->> 'size', size),
      description = coalesce(company_data ->> 'description', description),
      website = coalesce(company_data ->> 'website', website),
      phone = coalesce(company_data ->> 'phone', phone),
      primary_color = coalesce(company_data ->> 'primary_color', primary_color),
      secondary_color = coalesce(company_data ->> 'secondary_color', secondary_color),
      template_id = coalesce(company_data ->> 'template_id', template_id),
      template_name = coalesce(company_data ->> 'template_name', template_name),
      enabled_sections = coalesce(company_data -> 'enabled_sections', enabled_sections),
      template_config = template_config_value,
      custom_roles = custom_roles_value,
      positions = positions_data_value,
      registration_complete = true,
      owner_id = coalesce(owner_id, owner_user_id),
      created_by = coalesce(created_by, owner_user_id),
      updated_at = now()
    where id = v_company_id;
  end if;

  insert into public.company_members (company_id, user_id, role, added_at)
  values (v_company_id, owner_user_id, 'owner', now())
  on conflict (company_id, user_id) do update
  set role = excluded.role;

  perform set_config('flowforce.allow_profile_tenant_write', 'on', true);

  update public.profiles
  set
    company_id = v_company_id,
    first_name = coalesce(nullif(owner_first_name, ''), first_name),
    last_name = coalesce(nullif(owner_last_name, ''), last_name),
    email = coalesce(owner_email, email),
    phone = coalesce(owner_phone, phone),
    role = 'owner',
    is_company_admin = true,
    employment_status = coalesce(employment_status, 'active'),
    updated_at = now()
  where id = owner_user_id;

  if not found then
    insert into public.profiles (
      id,
      company_id,
      first_name,
      last_name,
      email,
      phone,
      role,
      is_company_admin,
      employment_status
    )
    values (
      owner_user_id,
      v_company_id,
      owner_first_name,
      owner_last_name,
      owner_email,
      owner_phone,
      'owner',
      true,
      'active'
    );
  end if;

  perform set_config('flowforce.allow_profile_tenant_write', 'off', true);

  insert into public.system_settings (company_id)
  values (v_company_id)
  on conflict (company_id) do nothing;

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
    v_company_id,
    role_name,
    role_description,
    role_color,
    role_icon,
    role_level,
    role_permissions,
    true,
    true,
    owner_user_id
  from (
    values
      ('Owner', 'Full workspace ownership', '#111827', 'Crown', 1::numeric, '{"admin": true, "owner": true}'::jsonb),
      ('Administrator', 'Administrative workspace access', '#2563eb', 'Shield', 2::numeric, '{"admin": true}'::jsonb),
      ('Manager', 'Team and operations management', '#16a34a', 'Users', 3::numeric, '{"manageTeam": true}'::jsonb),
      ('Employee', 'Standard employee access', '#6b7280', 'User', 4::numeric, '{"viewOwnProfile": true}'::jsonb)
  ) defaults(role_name, role_description, role_color, role_icon, role_level, role_permissions)
  where not exists (
    select 1
    from public.company_roles cr
    where cr.company_id = v_company_id
      and lower(cr.name) = lower(defaults.role_name)
  );

  for role_item in select value from jsonb_array_elements(custom_roles_value)
  loop
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
      v_company_id,
      coalesce(role_item ->> 'name', 'Custom Role'),
      role_item ->> 'description',
      coalesce(role_item ->> 'color', '#3b82f6'),
      coalesce(role_item ->> 'icon', 'Users'),
      coalesce((role_item ->> 'hierarchy_level')::numeric, 1),
      coalesce(role_item -> 'permissions', '{}'::jsonb),
      coalesce((role_item ->> 'is_system_role')::boolean, false),
      true,
      owner_user_id
    where not exists (
      select 1
      from public.company_roles cr
      where cr.company_id = v_company_id
        and lower(cr.name) = lower(coalesce(role_item ->> 'name', 'Custom Role'))
    );
  end loop;

  for position_item in select value from jsonb_array_elements(positions_data_value)
  loop
    insert into public.positions (
      company_id,
      name,
      description,
      role_id,
      permissions,
      is_active,
      created_by
    )
    select
      v_company_id,
      coalesce(position_item ->> 'name', 'Position'),
      position_item ->> 'description',
      position_item ->> 'roleId',
      coalesce(position_item -> 'permissions', '{}'::jsonb),
      true,
      owner_user_id
    where not exists (
      select 1
      from public.positions p
      where p.company_id = v_company_id
        and lower(p.name) = lower(coalesce(position_item ->> 'name', 'Position'))
    );
  end loop;

  insert into public.audit_log (
    company_id,
    actor_id,
    action,
    table_name,
    record_id,
    new_values
  )
  values (
    v_company_id,
    owner_user_id,
    'company.setup_verified',
    'companies',
    v_company_id::text,
    jsonb_build_object('source', 'create_company_with_setup')
  );

  return v_company_id;
end;
$$;

revoke all on function public.create_company_with_setup(jsonb, jsonb, jsonb, uuid) from public;
grant execute on function public.create_company_with_setup(jsonb, jsonb, jsonb, uuid) to authenticated, service_role;

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
    )
  then
    raise exception 'Profile tenant and role fields require company admin access'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_unsafe_profile_tenant_update on public.profiles;
create trigger prevent_unsafe_profile_tenant_update
before update on public.profiles
for each row execute function public.prevent_unsafe_profile_tenant_update();

notify pgrst, 'reload schema';
