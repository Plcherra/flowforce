-- Phase 2: every company class sits on a locked product level.
-- Seed/repair still insert missing Owner / Admin / Manager / Staff rows.
-- This migration does not rewrite owner-edited permission packs except to
-- strip keys that sit above the class level.

create or replace function public.infer_company_role_product_level(
  role_name text,
  hierarchy numeric default null
)
returns text
language plpgsql
immutable
as $$
declare
  normalized text;
begin
  normalized := lower(regexp_replace(trim(coalesce(role_name, '')), '\s+', '_', 'g'));

  if normalized in ('owner', 'admin', 'manager', 'staff') then
    return normalized;
  end if;

  if normalized in ('administrator', 'company_admin', 'company_administrator') then
    return 'admin';
  end if;

  if normalized in ('employee', 'team_member') then
    return 'staff';
  end if;

  if normalized = 'supervisor' then
    return 'manager';
  end if;

  if hierarchy = 2 then
    return 'manager';
  end if;

  if hierarchy = 3 then
    return 'admin';
  end if;

  return 'staff';
end;
$$;

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
      'viewOwnTasks', 'viewTeamTasks', 'editTasks',
      'viewOwnExpenses', 'viewTeamExpenses', 'approveExpenses', 'approveTimeOff',
      'manageUsers', 'systemSettings', 'createForms', 'manageForms', 'approveFormSubmissions',
      'managePositions', 'viewAIInsights', 'ai.insights.view', 'ai.actions.suggest',
      'ai.actions.approve', 'ai.actions.automate', 'ai.audit.view', 'ai.governance.manage',
      'manageInventory', 'managePayments', 'directory.view', 'directory.manage',
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
      'schedule.view', 'schedule.edit', 'schedule.create',
      'viewOwnTasks', 'viewTeamTasks', 'editTasks',
      'viewOwnExpenses', 'viewTeamExpenses', 'approveExpenses', 'approveTimeOff',
      'createForms', 'approveFormSubmissions',
      'viewAIInsights', 'ai.insights.view', 'ai.actions.suggest',
      'ai.actions.approve', 'ai.audit.view',
      'manageInventory', 'directory.view',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust',
      'inventory.purchasing.view',
      'inventory.counts.view', 'inventory.counts.create', 'inventory.counts.edit',
      'inventory.counts.approve', 'inventory.waste.view', 'inventory.waste.create',
      'inventory.prep.view', 'inventory.prep.edit',
      'reports.view'
    );
  end if;

  return jsonb_build_array(
    'viewOwnProfile',
    'editOwnProfile',
    'viewOwnSchedules',
    'viewOwnTasks',
    'viewOwnExpenses'
  );
end;
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
    return '{}'::jsonb;
  end if;

  if level = 'owner' then
    return permissions;
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

alter table public.company_roles
  add column if not exists product_level text;

update public.company_roles
set product_level = public.infer_company_role_product_level(name, hierarchy_level)
where product_level is null
   or product_level not in ('owner', 'admin', 'manager', 'staff');

with ranked_owners as (
  select
    id,
    row_number() over (
      partition by company_id
      order by
        case when lower(name) = 'owner' then 0 else 1 end,
        created_at nulls last,
        id
    ) as owner_rank
  from public.company_roles
  where product_level = 'owner'
)
update public.company_roles cr
set product_level = 'admin'
from ranked_owners
where cr.id = ranked_owners.id
  and ranked_owners.owner_rank > 1;

update public.company_roles
set permissions = public.clamp_permissions_to_product_level(
  product_level,
  coalesce(permissions, '{}'::jsonb)
);

alter table public.company_roles
  alter column product_level set default 'staff';

update public.company_roles
set product_level = 'staff'
where product_level is null;

alter table public.company_roles
  alter column product_level set not null;

alter table public.company_roles
  drop constraint if exists company_roles_product_level_check;

alter table public.company_roles
  add constraint company_roles_product_level_check
  check (product_level in ('owner', 'admin', 'manager', 'staff'));

create unique index if not exists company_roles_one_owner_level_per_company
  on public.company_roles (company_id)
  where product_level = 'owner';

create or replace function public.enforce_company_role_product_level()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.product_level = 'owner' then
      raise exception 'Owner class cannot be deleted'
        using errcode = '42501';
    end if;
    return old;
  end if;

  if new.product_level is null or new.product_level not in ('owner', 'admin', 'manager', 'staff') then
    new.product_level := public.infer_company_role_product_level(new.name, new.hierarchy_level);
  end if;

  if tg_op = 'INSERT' and (new.product_level is null) then
    new.product_level := public.infer_company_role_product_level(new.name, new.hierarchy_level);
  end if;

  if tg_op = 'UPDATE' and new.product_level is distinct from old.product_level then
    raise exception 'product_level is locked'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE'
    and old.product_level = 'owner'
    and new.is_active is distinct from old.is_active
    and new.is_active = false
  then
    raise exception 'Owner class cannot be deactivated'
      using errcode = '42501';
  end if;

  if new.product_level = 'owner'
    and exists (
      select 1
      from public.company_roles existing
      where existing.company_id = new.company_id
        and existing.product_level = 'owner'
        and existing.id is distinct from new.id
    )
  then
    raise exception 'A company can have only one Owner-level class'
      using errcode = '23505';
  end if;

  new.permissions := public.clamp_permissions_to_product_level(
    new.product_level,
    coalesce(new.permissions, '{}'::jsonb)
  );

  return new;
end;
$$;

drop trigger if exists enforce_company_role_product_level on public.company_roles;
create trigger enforce_company_role_product_level
before insert or update or delete on public.company_roles
for each row execute function public.enforce_company_role_product_level();

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
  is_active boolean
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
    coalesce(cr.is_active, true) as is_active
  from public.company_roles cr
  where cr.company_id = target_company_id
  order by coalesce(cr.hierarchy_level, 999999), cr.name;
end;
$$;

revoke all on function public.infer_company_role_product_level(text, numeric) from public;
revoke all on function public.product_level_allowed_permissions(text) from public;
revoke all on function public.clamp_permissions_to_product_level(text, jsonb) from public;
revoke all on function public.enforce_company_role_product_level() from public;
revoke all on function public.get_company_roles(uuid) from public;

grant execute on function public.infer_company_role_product_level(text, numeric) to service_role;
grant execute on function public.product_level_allowed_permissions(text) to service_role;
grant execute on function public.clamp_permissions_to_product_level(text, jsonb) to service_role;
grant execute on function public.get_company_roles(uuid) to authenticated, service_role;

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
    product_level,
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
    role_product_level,
    role_permissions,
    true,
    true,
    owner_user_id
  from (
    values
      ('Owner', 'Full workspace ownership', '#111827', 'Crown', 4::numeric, 'owner', '{"admin": true, "owner": true}'::jsonb),
      ('Administrator', 'Administrative workspace access', '#2563eb', 'Shield', 3::numeric, 'admin', '{"admin": true}'::jsonb),
      ('Manager', 'Team and operations management', '#16a34a', 'Users', 2::numeric, 'manager', '{"manageTeam": true}'::jsonb),
      ('Employee', 'Standard employee access', '#6b7280', 'User', 1::numeric, 'staff', '{"viewOwnProfile": true}'::jsonb)
  ) defaults(role_name, role_description, role_color, role_icon, role_level, role_product_level, role_permissions)
  where not exists (
    select 1
    from public.company_roles cr
    where cr.company_id = v_company_id
      and (
        lower(cr.name) = lower(defaults.role_name)
        or (
          defaults.role_product_level = 'owner'
          and cr.product_level = 'owner'
        )
      )
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
      product_level,
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
      case
        when coalesce(role_item ->> 'product_level', '') in ('admin', 'manager', 'staff')
          then role_item ->> 'product_level'
        else public.infer_company_role_product_level(
          coalesce(role_item ->> 'name', 'Custom Role'),
          coalesce((role_item ->> 'hierarchy_level')::numeric, 1)
        )
      end,
      coalesce(role_item -> 'permissions', '{}'::jsonb),
      coalesce((role_item ->> 'is_system_role')::boolean, false),
      true,
      owner_user_id
    where not exists (
      select 1
      from public.company_roles cr
      where cr.company_id = v_company_id
        and lower(cr.name) = lower(coalesce(role_item ->> 'name', 'Custom Role'))
    )
    and coalesce(role_item ->> 'product_level', '') is distinct from 'owner'
    and public.infer_company_role_product_level(
      coalesce(role_item ->> 'name', 'Custom Role'),
      coalesce((role_item ->> 'hierarchy_level')::numeric, 1)
    ) is distinct from 'owner';
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

notify pgrst, 'reload schema';
