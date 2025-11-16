create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  xp_reward integer not null default 0 check (xp_reward >= 0),
  target_date date,
  status text not null default 'pending',
  progress numeric(5,2) not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default now()
);

create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists goals_status_idx on public.goals (status);

create table if not exists public.goal_tasks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  weight numeric(6,2) not null default 1 check (weight > 0)
);

create unique index if not exists goal_tasks_goal_task_key on public.goal_tasks (goal_id, task_id);
create index if not exists goal_tasks_task_id_idx on public.goal_tasks (task_id);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  amount integer not null default 0,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists xp_events_user_created_idx on public.xp_events (user_id, created_at desc);

create table if not exists public.recognition_badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  threshold_xp integer not null check (threshold_xp >= 0),
  icon_url text
);

create table if not exists public.recognition_events (
  id uuid primary key default gen_random_uuid(),
  badge_id uuid not null references public.recognition_badges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  earned_at timestamptz not null default now(),
  xp_snapshot integer not null default 0,
  constraint recognition_events_user_badge_unique unique (badge_id, user_id)
);

create index if not exists recognition_events_user_idx on public.recognition_events (user_id, earned_at desc);

create or replace function public.recalculate_goal_progress(p_goal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_weight numeric(12,4) := 0;
  v_completed_weight numeric(12,4) := 0;
  v_progress numeric(5,2) := 0;
begin
  select
    coalesce(sum(gt.weight), 0),
    coalesce(sum(gt.weight) filter (where t.status = 'completed'), 0)
  into v_total_weight, v_completed_weight
  from public.goal_tasks gt
  left join public.tasks t on t.id = gt.task_id
  where gt.goal_id = p_goal_id;

  if v_total_weight > 0 then
    v_progress := least(100, greatest(0, round((v_completed_weight / v_total_weight) * 100, 2)));
  else
    v_progress := 0;
  end if;

  update public.goals
  set progress = v_progress
  where id = p_goal_id
    and progress is distinct from v_progress;
end;
$$;

create or replace function public.handle_goal_task_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.goal_id is not null then
      perform public.recalculate_goal_progress(NEW.goal_id);
    end if;
    return NEW;
  elsif TG_OP = 'UPDATE' then
    if OLD.goal_id is distinct from NEW.goal_id and OLD.goal_id is not null then
      perform public.recalculate_goal_progress(OLD.goal_id);
    end if;
    if NEW.goal_id is not null then
      perform public.recalculate_goal_progress(NEW.goal_id);
    end if;
    return NEW;
  elsif TG_OP = 'DELETE' then
    if OLD.goal_id is not null then
      perform public.recalculate_goal_progress(OLD.goal_id);
    end if;
    return OLD;
  end if;
  return NULL;
end;
$$;

drop trigger if exists goal_tasks_sync_progress on public.goal_tasks;

create trigger goal_tasks_sync_progress
after insert or update or delete on public.goal_tasks
for each row
execute function public.handle_goal_task_mutation();

create or replace function public.handle_task_goal_progress_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  goal_rec record;
begin
  for goal_rec in
    select distinct goal_id
    from public.goal_tasks
    where task_id = NEW.id
  loop
    perform public.recalculate_goal_progress(goal_rec.goal_id);
  end loop;

  return NEW;
end;
$$;

drop trigger if exists tasks_sync_goal_progress on public.tasks;

create trigger tasks_sync_goal_progress
after update of status on public.tasks
for each row
when (old.status is distinct from new.status)
execute function public.handle_task_goal_progress_update();

create or replace function public.enforce_goal_completion_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.progress >= 100 and NEW.status <> 'completed' then
    NEW.status := 'completed';
  end if;
  return NEW;
end;
$$;

drop trigger if exists goals_auto_complete_status on public.goals;

create trigger goals_auto_complete_status
before insert or update on public.goals
for each row
execute function public.enforce_goal_completion_status();

create or replace function public.handle_goal_completion_rewards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status <> 'completed' or NEW.user_id is null then
    return NEW;
  end if;

  if TG_OP = 'UPDATE' and OLD.status = 'completed' then
    return NEW;
  end if;

  perform 1
  from public.xp_events
  where entity_type = 'goal'
    and entity_id = NEW.id;

  if not found then
    insert into public.xp_events (user_id, entity_type, entity_id, amount, reason)
    values (
      NEW.user_id,
      'goal',
      NEW.id,
      coalesce(NEW.xp_reward, 0),
      'Goal completed: ' || coalesce(NEW.title, 'Goal')
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists goals_completion_rewards on public.goals;

create trigger goals_completion_rewards
after insert or update on public.goals
for each row
execute function public.handle_goal_completion_rewards();

create or replace function public.process_recognition_badges_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_xp bigint := 0;
  v_snapshot integer := 0;
begin
  select coalesce(sum(amount)::bigint, 0)
  into v_total_xp
  from public.xp_events
  where user_id = p_user_id;

  v_snapshot := least(greatest(v_total_xp, -2147483648), 2147483647)::integer;

  insert into public.recognition_events (badge_id, user_id, xp_snapshot)
  select b.id, p_user_id, v_snapshot
  from public.recognition_badges b
  where v_total_xp >= b.threshold_xp
    and not exists (
      select 1
      from public.recognition_events re
      where re.user_id = p_user_id
        and re.badge_id = b.id
    );
end;
$$;

create or replace function public.handle_xp_event_recognition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.user_id is not null then
    perform public.process_recognition_badges_for_user(NEW.user_id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists xp_events_recognition_award on public.xp_events;

create trigger xp_events_recognition_award
after insert on public.xp_events
for each row
execute function public.handle_xp_event_recognition();
