-- Phase 2 forward migration: source-control the app contract that the
-- frontend already calls, and replace placeholder views with real definitions.

create extension if not exists pgcrypto with schema extensions;

alter table public.audit_log add column if not exists actor_id uuid;
alter table public.audit_log add column if not exists target_user_id uuid;
alter table public.audit_log add column if not exists action text;
alter table public.audit_log add column if not exists table_name text;
alter table public.audit_log add column if not exists record_id text;
alter table public.audit_log add column if not exists old_values jsonb;
alter table public.audit_log add column if not exists new_values jsonb;
alter table public.audit_log add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.event_participants add column if not exists company_id uuid;
alter table public.event_participants add column if not exists created_at timestamptz not null default now();
alter table public.event_participants add column if not exists updated_at timestamptz not null default now();
alter table public.event_participants add column if not exists email text;
alter table public.event_participants add column if not exists name text;
alter table public.event_participants add column if not exists avatar_url text;
alter table public.event_participants add column if not exists response_status text;
alter table public.event_participants add column if not exists metadata jsonb;
alter table public.event_participants alter column profile_id drop not null;

alter table public.event_shift_links add column if not exists linked_at timestamptz;
alter table public.event_shift_links add column if not exists updated_at timestamptz not null default now();
alter table public.event_shift_links add column if not exists metadata jsonb;
alter table public.event_shift_links add column if not exists store_id text;
alter table public.vendor_visits add column if not exists updated_at timestamptz not null default now();

create index if not exists event_participants_company_event_idx
on public.event_participants (company_id, event_id);

create index if not exists event_shift_links_company_event_idx
on public.event_shift_links (company_id, event_id);

create or replace function public.assert_company_membership(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if p_company_id is null then
    raise exception 'Company context is required'
      using errcode = '22023';
  end if;

  if auth.role() = 'service_role' then
    return;
  end if;

  if not exists (
    select 1
    from public.current_user_company_ids() company_id
    where company_id = p_company_id
  ) then
    raise exception 'User is not a member of this company'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.get_company_roles(company_uuid uuid default null)
returns table (
  id uuid,
  name text,
  description text,
  color text,
  icon text,
  hierarchy_level numeric,
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
    coalesce(cr.permissions, '{}'::jsonb) as permissions,
    coalesce(cr.is_system_role, false) as is_system_role,
    coalesce(cr.is_active, true) as is_active
  from public.company_roles cr
  where cr.company_id = target_company_id
  order by coalesce(cr.hierarchy_level, 999999), cr.name;
end;
$$;

create or replace function public.get_dashboard_stats(
  p_company_id uuid,
  p_today date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result jsonb;
begin
  perform public.assert_company_membership(p_company_id);

  select jsonb_build_object(
    'total_employees', (
      select count(*) from public.profiles p where p.company_id = p_company_id
    ),
    'active_employees', (
      select count(*) from public.profiles p
      where p.company_id = p_company_id
        and coalesce(p.employment_status, 'active') = 'active'
    ),
    'total_departments', (
      select count(*) from public.departments d where d.company_id = p_company_id
    ),
    'todays_shifts', (
      select count(*) from public.schedules s
      where s.company_id = p_company_id
        and s.start_time >= p_today::timestamptz
        and s.start_time < (p_today + 1)::timestamptz
    ),
    'pending_time_off', (
      select count(*)
      from public.time_off_requests tor
      join public.profiles p on p.id = tor.user_id
      where p.company_id = p_company_id
        and coalesce(tor.status, 'pending') = 'pending'
    ),
    'approved_time_off_upcoming', (
      select count(*)
      from public.time_off_requests tor
      join public.profiles p on p.id = tor.user_id
      where p.company_id = p_company_id
        and tor.status = 'approved'
        and tor.start_date >= p_today
    ),
    'time_off_days_used', 0,
    'time_off_balance_remaining', 0,
    'coverage_completeness', 0,
    'hours_utilization', 0,
    'task_completion', (
      select case
        when count(*) = 0 then 0
        else round(
          100.0 * count(*) filter (where t.status in ('completed', 'done')) / count(*)
        )
      end
      from public.tasks t
      where t.company_id = p_company_id
    )
  )
  into result;

  return result;
end;
$$;

create or replace function public.get_kpi_summary(
  company_id uuid,
  range_start timestamptz default null,
  range_end timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.assert_company_membership(company_id);

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', k.id,
        'label', k.label,
        'metric', k.metric,
        'value', coalesce(k.value, 0),
        'delta', k.delta,
        'trend', k.trend,
        'unit', k.unit
      )
      order by k.recorded_at desc nulls last, k.created_at desc nulls last
    )
    from public.kpi_insights k
    where k.company_id = get_kpi_summary.company_id
      and (range_start is null or coalesce(k.recorded_at, k.created_at) >= range_start)
      and (range_end is null or coalesce(k.recorded_at, k.created_at) <= range_end)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_ai_kpi_insights(
  company_id uuid,
  range_start timestamptz default null,
  range_end timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.assert_company_membership(company_id);

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'metric', coalesce(k.metric, k.label, 'Operations'),
        'change', coalesce(k.delta, 0),
        'signal', coalesce(k.trend, 'flat'),
        'impact', coalesce(k.metadata ->> 'impact', k.label, k.metric, 'No insight available')
      )
      order by k.recorded_at desc nulls last, k.created_at desc nulls last
    )
    from public.kpi_insights k
    where k.company_id = get_ai_kpi_insights.company_id
      and (range_start is null or coalesce(k.recorded_at, k.created_at) >= range_start)
      and (range_end is null or coalesce(k.recorded_at, k.created_at) <= range_end)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_recipient_insights(
  recipients_filter jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  target_company_id uuid;
  total_employees integer;
begin
  select company_id
  into target_company_id
  from public.current_user_company_ids() company_id
  limit 1;

  if auth.role() = 'service_role' and target_company_id is null then
    select id into target_company_id from public.companies order by created_at limit 1;
  end if;

  perform public.assert_company_membership(target_company_id);

  select count(*)
  into total_employees
  from public.profiles p
  where p.company_id = target_company_id
    and coalesce(p.employment_status, 'active') = 'active';

  return jsonb_build_object(
    'total_employees', coalesce(total_employees, 0),
    'active_filters', coalesce(jsonb_array_length(coalesce(recipients_filter -> 'departments', '[]'::jsonb)), 0)
      + coalesce(jsonb_array_length(coalesce(recipients_filter -> 'roles', '[]'::jsonb)), 0)
      + coalesce(jsonb_array_length(coalesce(recipients_filter -> 'groups', '[]'::jsonb)), 0),
    'estimated_reach', coalesce(total_employees, 0),
    'segments', '[]'::jsonb
  );
end;
$$;

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
  company_id uuid;
  company_slug text;
  role_item jsonb;
  position_item jsonb;
begin
  if owner_user_id is null then
    owner_user_id := auth.uid();
  end if;

  if owner_user_id is null then
    raise exception 'owner_user_id is required'
      using errcode = '22023';
  end if;

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
    coalesce(
      case
        when jsonb_typeof(company_data -> 'template_config') = 'string'
          then (company_data ->> 'template_config')::jsonb
        else company_data -> 'template_config'
      end,
      '{}'::jsonb
    ),
    coalesce(custom_roles, '[]'::jsonb),
    coalesce(positions_data, '[]'::jsonb),
    true,
    owner_user_id,
    owner_user_id
  )
  returning id into company_id;

  insert into public.company_members (company_id, user_id, role, added_at)
  values (company_id, owner_user_id, 'owner', now())
  on conflict (company_id, user_id) do update
  set role = excluded.role;

  update public.profiles
  set
    company_id = create_company_with_setup.company_id,
    role = 'owner',
    is_company_admin = true,
    updated_at = now()
  where id = owner_user_id;

  if not found then
    insert into public.profiles (
      id,
      company_id,
      first_name,
      last_name,
      role,
      is_company_admin
    )
    values (owner_user_id, company_id, '', '', 'owner', true);
  end if;

  for role_item in select value from jsonb_array_elements(coalesce(custom_roles, '[]'::jsonb))
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
    values (
      company_id,
      coalesce(role_item ->> 'name', 'Custom Role'),
      role_item ->> 'description',
      coalesce(role_item ->> 'color', '#3b82f6'),
      coalesce(role_item ->> 'icon', 'Users'),
      coalesce((role_item ->> 'hierarchy_level')::numeric, 1),
      coalesce(role_item -> 'permissions', '{}'::jsonb),
      coalesce((role_item ->> 'is_system_role')::boolean, false),
      true,
      owner_user_id
    );
  end loop;

  for position_item in select value from jsonb_array_elements(coalesce(positions_data, '[]'::jsonb))
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
    values (
      company_id,
      coalesce(position_item ->> 'name', 'Position'),
      position_item ->> 'description',
      position_item ->> 'roleId',
      coalesce(position_item -> 'permissions', '{}'::jsonb),
      true,
      owner_user_id
    );
  end loop;

  return company_id;
end;
$$;

create or replace function public.create_company_invite(
  company_uuid uuid default null,
  invite_email text default null,
  invite_role text default 'employee',
  employee_first_name text default null,
  employee_last_name text default null,
  employee_birth_date date default null,
  employee_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  target_company_id uuid;
  invite_id uuid;
  token text;
begin
  target_company_id := company_uuid;

  if target_company_id is null then
    select company_id
    into target_company_id
    from public.current_user_company_ids() company_id
    limit 1;
  end if;

  perform public.assert_company_membership(target_company_id);

  if invite_email is null or length(trim(invite_email)) = 0 then
    raise exception 'invite_email is required'
      using errcode = '22023';
  end if;

  token := encode(gen_random_bytes(24), 'hex');

  insert into public.company_invites (
    company_id,
    email,
    role,
    first_name,
    last_name,
    birth_date,
    phone,
    invite_token,
    invited_by,
    status,
    expires_at
  )
  values (
    target_company_id,
    lower(trim(invite_email)),
    coalesce(invite_role, 'employee'),
    employee_first_name,
    employee_last_name,
    employee_birth_date,
    employee_phone,
    token,
    auth.uid(),
    'pending',
    now() + interval '14 days'
  )
  returning id into invite_id;

  return invite_id;
end;
$$;

create or replace function public.trigger_onboarding_checklist(invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
volatile
as $$
begin
  return exists (
    select 1
    from public.company_invites ci
    where ci.id = invite_id
      and (
        auth.role() = 'service_role'
        or ci.company_id in (select public.current_user_company_ids())
      )
  );
end;
$$;

create or replace function public.log_audit_event(
  target_user_id uuid default null,
  event_action text default null,
  target_table text default null,
  target_record_id text default null,
  previous_values jsonb default null,
  next_values jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  target_company_id uuid;
begin
  if event_action is null or target_table is null then
    return;
  end if;

  select p.company_id
  into target_company_id
  from public.profiles p
  where p.id = coalesce(auth.uid(), target_user_id)
  limit 1;

  if target_company_id is null and target_user_id is not null then
    select p.company_id
    into target_company_id
    from public.profiles p
    where p.id = target_user_id
    limit 1;
  end if;

  if target_company_id is null then
    select company_id
    into target_company_id
    from public.current_user_company_ids() company_id
    limit 1;
  end if;

  insert into public.audit_log (
    company_id,
    actor_id,
    target_user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  )
  values (
    target_company_id,
    auth.uid(),
    target_user_id,
    event_action,
    target_table,
    target_record_id,
    previous_values,
    next_values
  );
end;
$$;

create or replace function public.replace_event_participants(
  p_company_id uuid,
  p_event_id text,
  p_participants jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  participant jsonb;
begin
  perform public.assert_company_membership(p_company_id);

  delete from public.event_participants
  where company_id = p_company_id
    and event_id = p_event_id;

  for participant in select value from jsonb_array_elements(coalesce(p_participants, '[]'::jsonb))
  loop
    insert into public.event_participants (
      event_id,
      company_id,
      profile_id,
      email,
      name,
      role,
      avatar_url,
      response_status,
      rsvp_status,
      metadata
    )
    values (
      p_event_id,
      p_company_id,
      nullif(participant ->> 'profile_id', '')::uuid,
      participant ->> 'email',
      participant ->> 'name',
      participant ->> 'role',
      participant ->> 'avatar_url',
      coalesce(participant ->> 'response_status', participant ->> 'rsvp_status', 'invited'),
      coalesce(participant ->> 'rsvp_status', participant ->> 'response_status', 'invited'),
      coalesce(participant -> 'metadata', '{}'::jsonb)
    );
  end loop;
end;
$$;

create or replace function public.replace_event_shift_links(
  p_company_id uuid,
  p_event_id text,
  p_shift_ids text[] default '{}'::text[]
)
returns void
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  shift_id text;
begin
  perform public.assert_company_membership(p_company_id);

  delete from public.event_shift_links
  where company_id = p_company_id
    and event_id = p_event_id;

  foreach shift_id in array coalesce(p_shift_ids, '{}'::text[])
  loop
    insert into public.event_shift_links (
      company_id,
      event_id,
      shift_id,
      linked_at,
      metadata
    )
    values (
      p_company_id,
      p_event_id,
      shift_id,
      now(),
      '{}'::jsonb
    );
  end loop;
end;
$$;

drop view if exists public.calendar_events_full;
create view public.calendar_events_full as
select
  ce.attendees,
  ce.checklist,
  ce.color,
  ce.company_id,
  ce.created_at,
  ce.created_by,
  ce.description,
  ce.end_time,
  ce.event_type,
  ce.id,
  ce.location,
  ce.metadata,
  coalesce(participant_data.participants, '[]'::jsonb) as participants,
  ce.related_shift_id,
  ce.related_shift_ids,
  ce.start_time,
  ce.store_id,
  ce.title,
  ce.updated_at,
  ce.vendor
from public.calendar_events ce
left join lateral (
  select jsonb_agg(to_jsonb(ep) order by ep.created_at, ep.id) as participants
  from public.event_participants ep
  where ep.event_id = ce.id::text
    and (ep.company_id = ce.company_id or ep.company_id is null)
) participant_data on true;

drop view if exists public.calendar_unified_view;
create view public.calendar_unified_view as
select
  ce.company_id,
  ce.created_at,
  ce.created_by,
  ce.description,
  ce.end_time,
  ce.event_type,
  ce.id,
  null::text as service_type,
  ce.start_time,
  ce.title,
  ce.updated_at,
  null::text as vendor_id,
  null::text as vendor_name
from public.calendar_events ce
union all
select
  vv.company_id,
  vv.created_at,
  null::uuid as created_by,
  vv.description,
  vv.end_time,
  'vendor'::text as event_type,
  vv.id,
  vv.service_type,
  vv.start_time,
  vv.vendor_name as title,
  vv.updated_at,
  vv.integration_id as vendor_id,
  vv.vendor_name
from public.vendor_visits vv;

drop view if exists public.vendor_event;
create view public.vendor_event as
select
  vv.company_id,
  vv.description,
  vv.end_time,
  vv.start_time::date as event_date,
  vv.end_time::date as event_end_date,
  vv.id,
  vv.location,
  vv.service_type,
  vv.start_time,
  vv.vendor_name
from public.vendor_visits vv;

drop view if exists public.recognitions;
create view public.recognitions as
select
  null::text as badge_description,
  null::text as badge_icon_url,
  null::text as badge_id,
  null::text as badge_name,
  null::text as badge_slug,
  gr.awarded_at as earned_at,
  gr.id,
  p.avatar_url as recipient_avatar,
  trim(concat(coalesce(p.first_name, ''), ' ', coalesce(p.last_name, ''))) as recipient_name,
  null::numeric as threshold_xp,
  gr.user_id,
  null::numeric as xp_snapshot,
  g.company_id,
  gr.goal_id,
  gr.reward_type,
  gr.reward_details,
  gr.awarded_at,
  gr.created_by,
  null::text as award_rule
from public.goal_rewards gr
left join public.goals g on g.id::text = gr.goal_id
left join public.profiles p on p.id = gr.user_id
union all
select
  re.message as badge_description,
  null::text as badge_icon_url,
  null::text as badge_id,
  coalesce(re.type, 'Recognition') as badge_name,
  re.type as badge_slug,
  re.awarded_at as earned_at,
  re.id,
  p.avatar_url as recipient_avatar,
  trim(concat(coalesce(p.first_name, ''), ' ', coalesce(p.last_name, ''))) as recipient_name,
  null::numeric as threshold_xp,
  re.user_id,
  null::numeric as xp_snapshot,
  re.company_id,
  null::text as goal_id,
  coalesce(re.type, 'manual') as reward_type,
  jsonb_build_object('message', re.message, 'source', coalesce(re.type, 'manual')) as reward_details,
  re.awarded_at,
  re.user_id as created_by,
  null::text as award_rule
from public.recognition_events re
left join public.profiles p on p.id = re.user_id;

grant select on public.calendar_events_full to authenticated;
grant select on public.calendar_unified_view to authenticated;
grant select on public.vendor_event to authenticated;
grant select on public.recognitions to authenticated;

revoke all on function public.assert_company_membership(uuid) from public;
revoke all on function public.get_company_roles(uuid) from public;
revoke all on function public.get_dashboard_stats(uuid, date) from public;
revoke all on function public.get_kpi_summary(uuid, timestamptz, timestamptz) from public;
revoke all on function public.get_ai_kpi_insights(uuid, timestamptz, timestamptz) from public;
revoke all on function public.get_recipient_insights(jsonb) from public;
revoke all on function public.create_company_with_setup(jsonb, jsonb, jsonb, uuid) from public;
revoke all on function public.create_company_invite(uuid, text, text, text, text, date, text) from public;
revoke all on function public.trigger_onboarding_checklist(uuid) from public;
revoke all on function public.log_audit_event(uuid, text, text, text, jsonb, jsonb) from public;
revoke all on function public.replace_event_participants(uuid, text, jsonb) from public;
revoke all on function public.replace_event_shift_links(uuid, text, text[]) from public;

grant execute on function public.assert_company_membership(uuid) to authenticated, service_role;
grant execute on function public.get_company_roles(uuid) to authenticated, service_role;
grant execute on function public.get_dashboard_stats(uuid, date) to authenticated, service_role;
grant execute on function public.get_kpi_summary(uuid, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.get_ai_kpi_insights(uuid, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.get_recipient_insights(jsonb) to authenticated, service_role;
grant execute on function public.create_company_with_setup(jsonb, jsonb, jsonb, uuid) to authenticated, service_role;
grant execute on function public.create_company_invite(uuid, text, text, text, text, date, text) to authenticated, service_role;
grant execute on function public.trigger_onboarding_checklist(uuid) to authenticated, service_role;
grant execute on function public.log_audit_event(uuid, text, text, text, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.replace_event_participants(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.replace_event_shift_links(uuid, text, text[]) to authenticated, service_role;

notify pgrst, 'reload schema';
