-- Enforce simple task status workflow on UPDATE (matches taskStatusTransitions.ts).
create or replace function public.normalize_task_status_from_transition(status text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when status is null then null
    when status in ('open', 'in_progress', 'review', 'blocked') then 'todo'
    when status in ('todo', 'completed', 'cancelled') then status
    when status = 'done' then 'completed'
    else null
  end;
$$;

create or replace function public.normalize_task_status_to_transition(status text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when status is null then null
    when status = 'done' then 'completed'
    when status = 'open' then 'todo'
    when status in ('todo', 'completed', 'cancelled') then status
    else null
  end;
$$;

create or replace function public.task_status_transition_allowed(from_status text, to_status text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  from_norm text;
  to_norm text;
  allowed text[];
begin
  from_norm := public.normalize_task_status_from_transition(from_status);
  to_norm := public.normalize_task_status_to_transition(to_status);

  if from_norm is null or to_norm is null then
    return false;
  end if;

  if from_norm = to_norm then
    return true;
  end if;

  allowed := case from_norm
    when 'todo' then array['completed', 'cancelled']
    when 'completed' then array['todo']
    when 'cancelled' then array['todo']
    else null
  end;

  if allowed is null then
    return false;
  end if;

  return to_norm = any(allowed);
end;
$$;

create or replace function public.enforce_task_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return new;
  end if;

  if not public.task_status_transition_allowed(old.status, new.status) then
    raise exception 'Invalid task status transition from % to %', old.status, new.status
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_task_status_transition on public.tasks;
create trigger enforce_task_status_transition
before update on public.tasks
for each row
execute function public.enforce_task_status_transition();

revoke all on function public.normalize_task_status_from_transition(text) from public, anon;
revoke all on function public.normalize_task_status_to_transition(text) from public, anon;
revoke all on function public.task_status_transition_allowed(text, text) from public, anon;

grant execute on function public.normalize_task_status_from_transition(text) to authenticated, service_role;
grant execute on function public.normalize_task_status_to_transition(text) to authenticated, service_role;
grant execute on function public.task_status_transition_allowed(text, text) to authenticated, service_role;

notify pgrst, 'reload schema';