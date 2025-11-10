-- Ensures calendar event relations are replaced atomically
create or replace function public.replace_event_participants(
  p_company_id uuid,
  p_event_id uuid,
  p_participants jsonb default '[]'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.event_participants
  where company_id = p_company_id
    and event_id = p_event_id;

  if p_participants is null or jsonb_typeof(p_participants) <> 'array' or jsonb_array_length(p_participants) = 0 then
    return;
  end if;

  insert into public.event_participants (
    company_id,
    event_id,
    profile_id,
    email,
    name,
    role,
    avatar_url,
    response_status,
    metadata
  )
  select
    p_company_id,
    p_event_id,
    nullif(elem->>'profile_id', '')::uuid,
    nullif(elem->>'email', ''),
    nullif(elem->>'name', ''),
    nullif(elem->>'role', ''),
    nullif(elem->>'avatar_url', ''),
    coalesce(elem->>'response_status', 'invited'),
    coalesce(elem->'metadata', jsonb_build_object())
  from jsonb_array_elements(p_participants) as elem;
end;
$$;

grant execute on function public.replace_event_participants(uuid, uuid, jsonb) to authenticated;
grant execute on function public.replace_event_participants(uuid, uuid, jsonb) to service_role;

create or replace function public.replace_event_shift_links(
  p_company_id uuid,
  p_event_id uuid,
  p_shift_ids text[] default '{}'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  filtered_ids uuid[];
begin
  delete from public.event_shift_links
  where company_id = p_company_id
    and event_id = p_event_id;

  if p_shift_ids is null or array_length(p_shift_ids, 1) = 0 then
    return;
  end if;

  select array_agg(distinct nullif(id_text, '')::uuid)
    into filtered_ids
  from unnest(p_shift_ids) as id_text
  where nullif(id_text, '') is not null;

  if filtered_ids is null or array_length(filtered_ids, 1) = 0 then
    return;
  end if;

  insert into public.event_shift_links (
    company_id,
    event_id,
    shift_id,
    store_id,
    metadata
  )
  select
    p_company_id,
    p_event_id,
    shift_id,
    null,
    jsonb_build_object()
  from unnest(filtered_ids) as shift_id;
end;
$$;

grant execute on function public.replace_event_shift_links(uuid, uuid, text[]) to authenticated;
grant execute on function public.replace_event_shift_links(uuid, uuid, text[]) to service_role;
