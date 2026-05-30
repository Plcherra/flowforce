-- Phase 08.06: mobile push notification registry and preferences.
-- Native APNs/FCM tokens are accepted only through security-definer RPCs and
-- are not readable by authenticated clients.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mobile_push_devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'capacitor_push_notifications',
  platform text not null,
  token_hash text not null,
  device_token text not null,
  device_id_hash text,
  app_version text,
  enabled boolean not null default true,
  preferences jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_registered_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id, provider, platform, token_hash)
);

do $$
begin
  alter table public.mobile_push_devices
    add constraint mobile_push_devices_platform_known
    check (platform in ('ios', 'android', 'web')) not valid;
exception when duplicate_object then null;
end
$$;

create index if not exists mobile_push_devices_company_user_idx
  on public.mobile_push_devices (company_id, user_id);

create index if not exists mobile_push_devices_token_hash_idx
  on public.mobile_push_devices (token_hash);

drop trigger if exists set_mobile_push_devices_updated_at on public.mobile_push_devices;
create trigger set_mobile_push_devices_updated_at
before update on public.mobile_push_devices
for each row execute function public.set_updated_at();

alter table public.mobile_push_devices enable row level security;

revoke all on public.mobile_push_devices from authenticated;

create table if not exists public.mobile_push_preferences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tasks boolean not null default true,
  schedule_changes boolean not null default true,
  messages boolean not null default true,
  approvals boolean not null default true,
  low_stock boolean not null default true,
  overdue_workflows boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists mobile_push_preferences_company_user_idx
  on public.mobile_push_preferences (company_id, user_id);

drop trigger if exists set_mobile_push_preferences_updated_at on public.mobile_push_preferences;
create trigger set_mobile_push_preferences_updated_at
before update on public.mobile_push_preferences
for each row execute function public.set_updated_at();

alter table public.mobile_push_preferences enable row level security;

drop policy if exists "Users can manage their mobile push preferences" on public.mobile_push_preferences;
create policy "Users can manage their mobile push preferences"
on public.mobile_push_preferences
for all
to authenticated
using (
  user_id = auth.uid()
  and company_id in (select public.current_user_company_ids())
)
with check (
  user_id = auth.uid()
  and company_id in (select public.current_user_company_ids())
);

grant select, insert, update, delete on public.mobile_push_preferences to authenticated;

create or replace function public.register_mobile_push_device(
  p_company_id uuid,
  p_device_token text,
  p_platform text,
  p_device_id text default null,
  p_app_version text default null,
  p_preferences jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  normalized_platform text := lower(coalesce(p_platform, ''));
  normalized_token text := nullif(trim(coalesce(p_device_token, '')), '');
  token_hash_value text;
  device_id_hash_value text;
  registered_id uuid;
begin
  if actor_id is null then
    raise exception 'Authenticated user is required';
  end if;

  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to register push device for this company';
  end if;

  if normalized_platform not in ('ios', 'android', 'web') then
    raise exception 'Unsupported push platform: %', p_platform;
  end if;

  if normalized_token is null or length(normalized_token) < 16 then
    raise exception 'A valid device token is required';
  end if;

  token_hash_value := encode(extensions.digest(normalized_token, 'sha256'), 'hex');
  device_id_hash_value := case
    when nullif(trim(coalesce(p_device_id, '')), '') is null then null
    else encode(extensions.digest(trim(p_device_id), 'sha256'), 'hex')
  end;

  insert into public.mobile_push_preferences (
    company_id,
    user_id,
    tasks,
    schedule_changes,
    messages,
    approvals,
    low_stock,
    overdue_workflows
  )
  values (
    p_company_id,
    actor_id,
    coalesce((p_preferences ->> 'tasks')::boolean, true),
    coalesce((p_preferences ->> 'schedule_changes')::boolean, true),
    coalesce((p_preferences ->> 'messages')::boolean, true),
    coalesce((p_preferences ->> 'approvals')::boolean, true),
    coalesce((p_preferences ->> 'low_stock')::boolean, true),
    coalesce((p_preferences ->> 'overdue_workflows')::boolean, true)
  )
  on conflict (company_id, user_id) do nothing;

  insert into public.mobile_push_devices (
    company_id,
    user_id,
    provider,
    platform,
    token_hash,
    device_token,
    device_id_hash,
    app_version,
    enabled,
    preferences,
    metadata,
    last_registered_at,
    revoked_at
  )
  values (
    p_company_id,
    actor_id,
    'capacitor_push_notifications',
    normalized_platform,
    token_hash_value,
    normalized_token,
    device_id_hash_value,
    p_app_version,
    true,
    coalesce(p_preferences, '{}'::jsonb),
    coalesce(p_metadata, '{}'::jsonb),
    now(),
    null
  )
  on conflict (company_id, user_id, provider, platform, token_hash)
  do update set
    device_token = excluded.device_token,
    device_id_hash = excluded.device_id_hash,
    app_version = excluded.app_version,
    enabled = true,
    preferences = excluded.preferences,
    metadata = mobile_push_devices.metadata || excluded.metadata,
    last_registered_at = now(),
    revoked_at = null,
    updated_at = now()
  returning id into registered_id;

  return jsonb_build_object(
    'id', registered_id,
    'company_id', p_company_id,
    'user_id', actor_id,
    'provider', 'capacitor_push_notifications',
    'platform', normalized_platform,
    'token_hash', token_hash_value,
    'enabled', true
  );
end;
$$;

grant execute on function public.register_mobile_push_device(
  uuid,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb
) to authenticated;

create or replace function public.revoke_mobile_push_device(
  p_company_id uuid,
  p_device_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  normalized_token text := nullif(trim(coalesce(p_device_token, '')), '');
  token_hash_value text;
  revoked_count integer := 0;
begin
  if actor_id is null then
    raise exception 'Authenticated user is required';
  end if;

  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to revoke push device for this company';
  end if;

  if normalized_token is null then
    raise exception 'device token is required';
  end if;

  token_hash_value := encode(extensions.digest(normalized_token, 'sha256'), 'hex');

  update public.mobile_push_devices
  set
    enabled = false,
    revoked_at = now(),
    updated_at = now()
  where company_id = p_company_id
    and user_id = actor_id
    and token_hash = token_hash_value;

  get diagnostics revoked_count = row_count;

  return jsonb_build_object(
    'revoked_count', revoked_count,
    'token_hash', token_hash_value
  );
end;
$$;

grant execute on function public.revoke_mobile_push_device(uuid, text) to authenticated;
