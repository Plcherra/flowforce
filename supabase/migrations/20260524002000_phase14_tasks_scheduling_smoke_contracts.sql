-- Phase 14 follow-up: restore task and scheduling relationships surfaced by
-- authenticated visible-module smoke tests.

alter table public.task_activities add column if not exists company_id uuid;

update public.task_activities activity
set company_id = task.company_id
from public.tasks task
where activity.company_id is null
  and activity.task_id = task.id::text
  and task.company_id is not null;

update public.task_activities activity
set company_id = profile.company_id
from public.profiles profile
where activity.company_id is null
  and activity.user_id = profile.id
  and profile.company_id is not null;

drop policy if exists "Authenticated users can manage scoped restored rows" on public.task_activities;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks'
      and column_name = 'department_id' and udt_name <> 'uuid'
  ) then
    alter table public.tasks
      alter column department_id type uuid
      using case
        when department_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then department_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks'
      and column_name = 'goal_id' and udt_name <> 'uuid'
  ) then
    alter table public.tasks
      alter column goal_id type uuid
      using case
        when goal_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then goal_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'task_activities'
      and column_name = 'task_id' and udt_name <> 'uuid'
  ) then
    alter table public.task_activities
      alter column task_id type uuid
      using case
        when task_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then task_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'position_assignments'
      and column_name = 'position_id' and udt_name <> 'uuid'
  ) then
    alter table public.position_assignments
      alter column position_id type uuid
      using case
        when position_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then position_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'positions'
      and column_name = 'department_id' and udt_name <> 'uuid'
  ) then
    alter table public.positions
      alter column department_id type uuid
      using case
        when department_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then department_id::uuid
        else null
      end;
  end if;
end
$$;

update public.task_activities activity
set company_id = task.company_id
from public.tasks task
where activity.company_id is null
  and activity.task_id = task.id
  and task.company_id is not null;

create or replace function public.set_task_activity_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.task_id is not null then
    select task.company_id
    into new.company_id
    from public.tasks task
    where task.id = new.task_id
    limit 1;
  end if;

  if new.company_id is null and new.user_id is not null then
    select profile.company_id
    into new.company_id
    from public.profiles profile
    where profile.id = new.user_id
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists set_task_activity_company_id on public.task_activities;
create trigger set_task_activity_company_id
before insert or update on public.task_activities
for each row execute function public.set_task_activity_company_id();

do $$
begin
  alter table public.tasks
    add constraint tasks_assigned_to_fkey
    foreign key (assigned_to) references public.profiles(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.tasks
    add constraint tasks_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.tasks
    add constraint tasks_department_id_fkey
    foreign key (department_id) references public.departments(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.tasks
    add constraint tasks_goal_id_fkey
    foreign key (goal_id) references public.goals(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.task_activities
    add constraint task_activities_task_id_fkey
    foreign key (task_id) references public.tasks(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.task_activities
    add constraint task_activities_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.position_assignments
    add constraint position_assignments_position_id_fkey
    foreign key (position_id) references public.positions(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.position_assignments
    add constraint position_assignments_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.positions
    add constraint positions_department_id_fkey
    foreign key (department_id) references public.departments(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

create index if not exists tasks_assigned_to_idx on public.tasks (assigned_to);
create index if not exists tasks_created_by_idx on public.tasks (created_by);
create index if not exists tasks_department_id_idx on public.tasks (department_id);
create index if not exists tasks_goal_id_idx on public.tasks (goal_id);
create index if not exists task_activities_company_id_idx on public.task_activities (company_id);
create index if not exists task_activities_task_id_idx on public.task_activities (task_id);
create index if not exists task_activities_user_id_idx on public.task_activities (user_id);
create index if not exists position_assignments_position_id_idx on public.position_assignments (position_id);
create index if not exists position_assignments_user_id_idx on public.position_assignments (user_id);
create index if not exists positions_department_id_idx on public.positions (department_id);

grant select, insert, update, delete on public.task_activities to authenticated;
alter table public.task_activities enable row level security;

drop policy if exists "Company members can manage task activities" on public.task_activities;
create policy "Company members can manage task activities"
on public.task_activities
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    task_id is null
    or exists (
      select 1
      from public.tasks task
      where task.id = task_activities.task_id
        and task.company_id = task_activities.company_id
    )
  )
  and (
    user_id is null
    or exists (
      select 1
      from public.profiles profile
      where profile.id = task_activities.user_id
        and profile.company_id = task_activities.company_id
    )
  )
);

notify pgrst, 'reload schema';
