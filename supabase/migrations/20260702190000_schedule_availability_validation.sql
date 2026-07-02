-- Phase 2: server-side schedule assignment validation + publish gate

create schema if not exists private;

-- Monday = 0 … Sunday = 6 (matches staff availability grid)
create or replace function private.day_of_week_index(p_date date)
returns integer
language sql
immutable
as $$
  select ((extract(dow from p_date)::integer + 6) % 7);
$$;

-- ISO week start (Monday) for a calendar date
create or replace function private.iso_week_start(p_date date)
returns date
language sql
immutable
as $$
  select (p_date - ((extract(dow from p_date)::integer + 6) % 7));
$$;

create or replace function private.timestamptz_to_minutes(p_value timestamptz)
returns integer
language sql
immutable
as $$
  select (
    extract(hour from p_value)::integer * 60
    + extract(minute from p_value)::integer
  );
$$;

create or replace function private.shift_fits_windows(
  p_shift_start_minutes integer,
  p_shift_end_minutes integer,
  p_windows jsonb
)
returns boolean
language sql
immutable
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(p_windows, '[]'::jsonb)) as window(value)
    where p_shift_start_minutes >= (window.value ->> 'start')::integer
      and p_shift_end_minutes <= (window.value ->> 'end')::integer
  );
$$;

create or replace function private.subtract_interval_from_windows(
  p_windows jsonb,
  p_block_start integer,
  p_block_end integer
)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb := '[]'::jsonb;
  window jsonb;
  win_start integer;
  win_end integer;
begin
  for window in
    select value
    from jsonb_array_elements(coalesce(p_windows, '[]'::jsonb))
  loop
    win_start := (window ->> 'start')::integer;
    win_end := (window ->> 'end')::integer;

    if p_block_end <= win_start or p_block_start >= win_end then
      result := result || window;
    else
      if p_block_start > win_start then
        result := result || jsonb_build_object('start', win_start, 'end', p_block_start);
      end if;
      if p_block_end < win_end then
        result := result || jsonb_build_object('start', p_block_end, 'end', win_end);
      end if;
    end if;
  end loop;

  return coalesce(
    (
      select jsonb_agg(window.value)
      from jsonb_array_elements(result) as window(value)
      where (window.value ->> 'end')::integer > (window.value ->> 'start')::integer
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function private.evaluate_schedule_assignment(
  p_user_id uuid,
  p_shift_start timestamptz,
  p_shift_end timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_shift_date date;
  v_week_start date;
  v_day_index integer;
  v_windows jsonb := '[]'::jsonb;
  v_shift_start_minutes integer;
  v_shift_end_minutes integer;
  v_has_pending_pto boolean := false;
  v_reasons jsonb := '[]'::jsonb;
  pref record;
  pto record;
  unavail record;
  v_block_start integer;
  v_block_end integer;
  v_schedule_day_start constant integer := 360;
  v_schedule_day_end constant integer := 1260;
begin
  v_shift_date := p_shift_start::date;
  v_week_start := private.iso_week_start(v_shift_date);
  v_day_index := private.day_of_week_index(v_shift_date);
  v_shift_start_minutes := private.timestamptz_to_minutes(p_shift_start);
  v_shift_end_minutes := private.timestamptz_to_minutes(p_shift_end);

  for pref in
    select
      private.timestamptz_to_minutes(sa.start_time) as start_minutes,
      private.timestamptz_to_minutes(sa.end_time) as end_minutes
    from public.staff_availability sa
    where sa.user_id = p_user_id
      and sa.week_start_date = v_week_start
      and sa.day_of_week = v_day_index
    order by private.timestamptz_to_minutes(sa.start_time)
  loop
    if pref.end_minutes > pref.start_minutes then
      v_windows := v_windows || jsonb_build_object(
        'start', pref.start_minutes,
        'end', pref.end_minutes
      );
    end if;
  end loop;

  if jsonb_array_length(v_windows) = 0 then
    return jsonb_build_object(
      'allowed', false,
      'severity', 'blocking',
      'reasons', jsonb_build_array('Employee is unavailable (Off).')
    );
  end if;

  for pto in
    select lower(coalesce(tor.status, '')) as status
    from public.time_off_requests tor
    where tor.user_id = p_user_id
      and lower(coalesce(tor.status, '')) not in ('rejected', 'denied', 'cancelled')
      and tor.start_date <= v_shift_date
      and coalesce(tor.end_date, tor.start_date) >= v_shift_date
  loop
    if pto.status = 'approved' then
      return jsonb_build_object(
        'allowed', false,
        'severity', 'blocking',
        'reasons', jsonb_build_array('Employee is unavailable (PTO).')
      );
    end if;

    v_has_pending_pto := true;
  end loop;

  for unavail in
    select
      uu.start_time,
      uu.end_time
    from public.user_unavailability uu
    where uu.user_id = p_user_id
      and uu.start_time is not null
      and uu.end_time is not null
      and uu.start_time < (v_shift_date + interval '1 day')
      and uu.end_time > v_shift_date::timestamptz
  loop
    v_block_start := greatest(
      private.timestamptz_to_minutes(unavail.start_time),
      v_schedule_day_start
    );
    v_block_end := least(
      private.timestamptz_to_minutes(unavail.end_time),
      v_schedule_day_end
    );
    v_windows := private.subtract_interval_from_windows(
      v_windows,
      v_block_start,
      v_block_end
    );
  end loop;

  if not private.shift_fits_windows(
    v_shift_start_minutes,
    v_shift_end_minutes,
    v_windows
  ) then
    return jsonb_build_object(
      'allowed', false,
      'severity', 'blocking',
      'reasons', jsonb_build_array('Employee is unavailable for this day.')
    );
  end if;

  if v_has_pending_pto then
    return jsonb_build_object(
      'allowed', true,
      'severity', 'warning',
      'reasons', jsonb_build_array('Employee has pending PTO on this day.')
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'severity', 'ok',
    'reasons', '[]'::jsonb
  );
end;
$$;

create or replace function public.assign_schedule_with_validation(
  p_schedule_id text,
  p_user_id uuid,
  p_status text default 'assigned',
  p_assigned_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_schedule record;
  v_evaluation jsonb;
  v_assignment_id uuid;
begin
  select s.id, s.company_id, s.start_time, s.end_time
  into v_schedule
  from public.schedules s
  where s.id::text = p_schedule_id;

  if v_schedule.id is null then
    raise exception 'Schedule not found'
      using errcode = 'P0002';
  end if;

  perform public.assert_company_membership(v_schedule.company_id);

  v_evaluation := private.evaluate_schedule_assignment(
    p_user_id,
    v_schedule.start_time,
    v_schedule.end_time
  );

  if coalesce((v_evaluation ->> 'allowed')::boolean, false) = false then
    return jsonb_build_object(
      'success', false,
      'allowed', false,
      'severity', v_evaluation ->> 'severity',
      'reasons', coalesce(v_evaluation -> 'reasons', '[]'::jsonb)
    );
  end if;

  insert into public.schedule_assignments (
    schedule_id,
    user_id,
    status,
    assigned_by,
    assigned_at
  )
  values (
    p_schedule_id,
    p_user_id,
    coalesce(p_status, 'assigned'),
    p_assigned_by,
    now()
  )
  returning id into v_assignment_id;

  return jsonb_build_object(
    'success', true,
    'allowed', true,
    'assignment_id', v_assignment_id,
    'severity', v_evaluation ->> 'severity',
    'reasons', coalesce(v_evaluation -> 'reasons', '[]'::jsonb)
  );
end;
$$;

create or replace function public.publish_schedules_week_with_validation(
  p_company_id uuid,
  p_week_start timestamptz,
  p_week_end timestamptz,
  p_is_published boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_conflicts jsonb := '[]'::jsonb;
  v_blocking_count integer := 0;
  assignment record;
  v_evaluation jsonb;
begin
  perform public.assert_company_membership(p_company_id);

  if coalesce(p_is_published, false) = false then
    update public.schedules
    set is_published = false,
        updated_at = now()
    where company_id = p_company_id
      and start_time >= p_week_start
      and start_time < p_week_end;

    return jsonb_build_object(
      'success', true,
      'is_published', false,
      'blocking_count', 0,
      'conflicts', '[]'::jsonb
    );
  end if;

  for assignment in
    select
      sa.schedule_id,
      sa.user_id,
      s.start_time,
      s.end_time
    from public.schedule_assignments sa
    inner join public.schedules s on s.id::text = sa.schedule_id::text
    where s.company_id = p_company_id
      and s.start_time >= p_week_start
      and s.start_time < p_week_end
      and sa.user_id is not null
  loop
    v_evaluation := private.evaluate_schedule_assignment(
      assignment.user_id,
      assignment.start_time,
      assignment.end_time
    );

    if coalesce((v_evaluation ->> 'allowed')::boolean, false) = false then
      v_blocking_count := v_blocking_count + 1;
      v_conflicts := v_conflicts || jsonb_build_object(
        'schedule_id', assignment.schedule_id,
        'user_id', assignment.user_id,
        'severity', v_evaluation ->> 'severity',
        'reasons', coalesce(v_evaluation -> 'reasons', '[]'::jsonb)
      );
    end if;
  end loop;

  if v_blocking_count > 0 then
    return jsonb_build_object(
      'success', false,
      'is_published', false,
      'blocking_count', v_blocking_count,
      'conflicts', v_conflicts
    );
  end if;

  update public.schedules
  set is_published = true,
      updated_at = now()
  where company_id = p_company_id
    and start_time >= p_week_start
    and start_time < p_week_end;

  return jsonb_build_object(
    'success', true,
    'is_published', true,
    'blocking_count', 0,
    'conflicts', '[]'::jsonb
  );
end;
$$;

grant usage on schema private to postgres, service_role;
grant execute on function public.assign_schedule_with_validation(text, uuid, text, uuid) to authenticated;
grant execute on function public.publish_schedules_week_with_validation(uuid, timestamptz, timestamptz, boolean) to authenticated;
