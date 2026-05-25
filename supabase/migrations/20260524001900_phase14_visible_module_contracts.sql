-- Phase 14: restore visible module database contracts found by authenticated
-- route smoke tests.

create extension if not exists pgcrypto;

alter table public.events add column if not exists event_type text;
alter table public.events add column if not exists severity text;
alter table public.events add column if not exists occurred_at timestamptz;
alter table public.events add column if not exists summary text;
alter table public.events add column if not exists tags jsonb default '[]'::jsonb;
alter table public.events add column if not exists details jsonb default '{}'::jsonb;

update public.events
set occurred_at = coalesce(occurred_at, created_at, now())
where occurred_at is null;

alter table public.idea_cycles add column if not exists stage text;
alter table public.idea_cycles add column if not exists "range" text;
alter table public.idea_cycles add column if not exists insights jsonb default '[]'::jsonb;
alter table public.idea_cycles add column if not exists actions jsonb default '[]'::jsonb;
alter table public.idea_cycles add column if not exists assessments jsonb default '[]'::jsonb;

update public.idea_cycles
set stage = coalesce(stage, status, 'intake'),
    "range" = coalesce("range", 'current'),
    insights = coalesce(insights, metadata -> 'insights', '[]'::jsonb),
    actions = coalesce(actions, metadata -> 'actions', '[]'::jsonb),
    assessments = coalesce(assessments, metadata -> 'assessments', '[]'::jsonb);

alter table public.shift_swaps add column if not exists company_id uuid;

update public.shift_swaps swap
set company_id = schedule.company_id
from public.schedules schedule
where swap.company_id is null
  and swap.schedule_id = schedule.id::text
  and schedule.company_id is not null;

update public.shift_swaps swap
set company_id = profile.company_id
from public.profiles profile
where swap.company_id is null
  and swap.requesting_user_id = profile.id::text
  and profile.company_id is not null;

update public.shift_swaps swap
set company_id = profile.company_id
from public.profiles profile
where swap.company_id is null
  and swap.target_user_id = profile.id::text
  and profile.company_id is not null;

drop policy if exists "Authenticated users can manage scoped restored rows" on public.company_update_engagement;
drop policy if exists "Authenticated users can manage scoped restored rows" on public.shift_swaps;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'company_update_engagement'
      and column_name = 'update_id' and udt_name <> 'uuid'
  ) then
    alter table public.company_update_engagement
      alter column update_id type uuid
      using case
        when update_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then update_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'company_update_comments'
      and column_name = 'update_id' and udt_name <> 'uuid'
  ) then
    alter table public.company_update_comments
      alter column update_id type uuid
      using case
        when update_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then update_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'message_channels'
      and column_name = 'department_id' and udt_name <> 'uuid'
  ) then
    alter table public.message_channels
      alter column department_id type uuid
      using case
        when department_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then department_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'channel_members'
      and column_name = 'channel_id' and udt_name <> 'uuid'
  ) then
    alter table public.channel_members
      alter column channel_id type uuid
      using case
        when channel_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then channel_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages'
      and column_name = 'channel_id' and udt_name <> 'uuid'
  ) then
    alter table public.messages
      alter column channel_id type uuid
      using case
        when channel_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then channel_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'forms'
      and column_name = 'department_id' and udt_name <> 'uuid'
  ) then
    alter table public.forms
      alter column department_id type uuid
      using case
        when department_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then department_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'form_fields'
      and column_name = 'form_id' and udt_name <> 'uuid'
  ) then
    alter table public.form_fields
      alter column form_id type uuid
      using case
        when form_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then form_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'form_submissions'
      and column_name = 'form_id' and udt_name <> 'uuid'
  ) then
    alter table public.form_submissions
      alter column form_id type uuid
      using case
        when form_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then form_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shift_swaps'
      and column_name = 'requesting_user_id' and udt_name <> 'uuid'
  ) then
    alter table public.shift_swaps
      alter column requesting_user_id type uuid
      using case
        when requesting_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then requesting_user_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shift_swaps'
      and column_name = 'target_user_id' and udt_name <> 'uuid'
  ) then
    alter table public.shift_swaps
      alter column target_user_id type uuid
      using case
        when target_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then target_user_id::uuid
        else null
      end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shift_swaps'
      and column_name = 'schedule_id' and udt_name <> 'uuid'
  ) then
    alter table public.shift_swaps
      alter column schedule_id type uuid
      using case
        when schedule_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then schedule_id::uuid
        else null
      end;
  end if;
end
$$;

update public.shift_swaps swap
set company_id = schedule.company_id
from public.schedules schedule
where swap.company_id is null
  and swap.schedule_id = schedule.id
  and schedule.company_id is not null;

update public.channel_members member
set company_id = channel.company_id
from public.message_channels channel
where member.company_id is null
  and member.channel_id = channel.id
  and channel.company_id is not null;

update public.messages message
set company_id = channel.company_id
from public.message_channels channel
where message.company_id is null
  and message.channel_id = channel.id
  and channel.company_id is not null;

update public.form_fields field
set company_id = form.company_id
from public.forms form
where field.company_id is null
  and field.form_id = form.id
  and form.company_id is not null;

update public.form_submissions submission
set company_id = form.company_id
from public.forms form
where submission.company_id is null
  and submission.form_id = form.id
  and form.company_id is not null;

create or replace function public.set_channel_child_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.channel_id is not null then
    select mc.company_id
    into new.company_id
    from public.message_channels mc
    where mc.id = new.channel_id
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.set_form_child_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.form_id is not null then
    select f.company_id
    into new.company_id
    from public.forms f
    where f.id = new.form_id
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.set_shift_swap_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.schedule_id is not null then
    select s.company_id
    into new.company_id
    from public.schedules s
    where s.id = new.schedule_id
    limit 1;
  end if;

  if new.company_id is null and new.requesting_user_id is not null then
    select p.company_id
    into new.company_id
    from public.profiles p
    where p.id = new.requesting_user_id
    limit 1;
  end if;

  if new.company_id is null and new.target_user_id is not null then
    select p.company_id
    into new.company_id
    from public.profiles p
    where p.id = new.target_user_id
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists set_shift_swap_company_id on public.shift_swaps;
create trigger set_shift_swap_company_id
before insert or update on public.shift_swaps
for each row execute function public.set_shift_swap_company_id();

do $$
begin
  alter table public.company_updates
    add constraint company_updates_author_id_fkey
    foreign key (author_id) references public.profiles(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.company_update_engagement
    add constraint company_update_engagement_update_id_fkey
    foreign key (update_id) references public.company_updates(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.company_update_comments
    add constraint company_update_comments_author_id_fkey
    foreign key (author_id) references public.profiles(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.message_channels
    add constraint message_channels_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.message_channels
    add constraint message_channels_department_id_fkey
    foreign key (department_id) references public.departments(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.channel_members
    add constraint channel_members_channel_id_fkey
    foreign key (channel_id) references public.message_channels(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.messages
    add constraint messages_channel_id_fkey
    foreign key (channel_id) references public.message_channels(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.messages
    add constraint messages_sender_id_fkey
    foreign key (sender_id) references public.profiles(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.forms
    add constraint forms_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.forms
    add constraint forms_department_id_fkey
    foreign key (department_id) references public.departments(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.form_fields
    add constraint form_fields_form_id_fkey
    foreign key (form_id) references public.forms(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.form_submissions
    add constraint form_submissions_form_id_fkey
    foreign key (form_id) references public.forms(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.shift_swaps
    add constraint shift_swaps_requesting_user_id_fkey
    foreign key (requesting_user_id) references public.profiles(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.shift_swaps
    add constraint shift_swaps_target_user_id_fkey
    foreign key (target_user_id) references public.profiles(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.shift_swaps
    add constraint shift_swaps_schedule_id_fkey
    foreign key (schedule_id) references public.schedules(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

create index if not exists events_company_occurred_at_idx on public.events (company_id, occurred_at desc);
create index if not exists idea_cycles_company_created_idx on public.idea_cycles (company_id, created_at desc);
create index if not exists shift_swaps_company_id_idx on public.shift_swaps (company_id);
create index if not exists shift_swaps_schedule_id_idx on public.shift_swaps (schedule_id);
create index if not exists company_update_engagement_update_id_idx on public.company_update_engagement (update_id);
create index if not exists company_update_comments_author_id_idx on public.company_update_comments (author_id);
create index if not exists message_channels_created_by_idx on public.message_channels (created_by);
create index if not exists message_channels_department_id_idx on public.message_channels (department_id);
create index if not exists channel_members_channel_id_idx on public.channel_members (channel_id);
create index if not exists messages_channel_id_idx on public.messages (channel_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists forms_created_by_idx on public.forms (created_by);
create index if not exists forms_department_id_idx on public.forms (department_id);
create index if not exists form_fields_form_id_idx on public.form_fields (form_id);
create index if not exists form_submissions_form_id_idx on public.form_submissions (form_id);

grant select, insert, update, delete on public.shift_swaps to authenticated;
alter table public.shift_swaps enable row level security;

drop policy if exists "Company members can manage company update engagement" on public.company_update_engagement;
create policy "Company members can manage company update engagement"
on public.company_update_engagement
for all
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  or exists (
    select 1
    from public.company_updates update_row
    where update_row.id = company_update_engagement.update_id
      and update_row.company_id in (select public.current_user_company_ids())
  )
)
with check (
  company_id in (select public.current_user_company_ids())
  and (
    update_id is null
    or exists (
      select 1
      from public.company_updates update_row
      where update_row.id = company_update_engagement.update_id
        and update_row.company_id = company_update_engagement.company_id
    )
  )
);

drop policy if exists "Company members can manage shift swaps" on public.shift_swaps;
create policy "Company members can manage shift swaps"
on public.shift_swaps
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    requesting_user_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = shift_swaps.requesting_user_id
        and p.company_id = shift_swaps.company_id
    )
  )
  and (
    target_user_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = shift_swaps.target_user_id
        and p.company_id = shift_swaps.company_id
    )
  )
  and (
    schedule_id is null
    or exists (
      select 1
      from public.schedules s
      where s.id = shift_swaps.schedule_id
        and s.company_id = shift_swaps.company_id
    )
  )
);

create or replace function public.get_employee_enrichment(
  p_company_id uuid,
  p_employee_ids uuid[] default array[]::uuid[],
  p_lookback_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  skill_rows jsonb;
  badge_rows jsonb;
  report_rows jsonb;
  attendance_rows jsonb;
begin
  if not exists (
    select 1
    from public.current_user_company_ids() company_id
    where company_id = p_company_id
  ) then
    raise exception 'Not a member of company %', p_company_id
      using errcode = '42501';
  end if;

  with scoped_employees as (
    select p.id
    from public.profiles p
    where p.company_id = p_company_id
      and (coalesce(array_length(p_employee_ids, 1), 0) = 0 or p.id = any(p_employee_ids))
  )
  select coalesce(jsonb_agg(to_jsonb(sm)), '[]'::jsonb)
  into skill_rows
  from public.skill_matrix sm
  join scoped_employees employee on employee.id = sm.employee_id;

  with scoped_employees as (
    select p.id
    from public.profiles p
    where p.company_id = p_company_id
      and (coalesce(array_length(p_employee_ids, 1), 0) = 0 or p.id = any(p_employee_ids))
  )
  select coalesce(jsonb_agg(to_jsonb(badge)), '[]'::jsonb)
  into badge_rows
  from public.employee_badge badge
  join scoped_employees employee on employee.id = badge.employee_id;

  with scoped_employees as (
    select p.id
    from public.profiles p
    where p.company_id = p_company_id
      and (coalesce(array_length(p_employee_ids, 1), 0) = 0 or p.id = any(p_employee_ids))
  )
  select coalesce(jsonb_agg(to_jsonb(report)), '[]'::jsonb)
  into report_rows
  from public.employee_report report
  join scoped_employees employee on employee.id = report.employee_id
  where p_lookback_date is null or report.date >= p_lookback_date;

  with scoped_employees as (
    select p.id
    from public.profiles p
    where p.company_id = p_company_id
      and (coalesce(array_length(p_employee_ids, 1), 0) = 0 or p.id = any(p_employee_ids))
  )
  select coalesce(jsonb_agg(to_jsonb(attendance)), '[]'::jsonb)
  into attendance_rows
  from public.staff_performance attendance
  join scoped_employees employee on employee.id = attendance.user_id
  where p_lookback_date is null or attendance.date >= p_lookback_date;

  return jsonb_build_object(
    'skills', skill_rows,
    'badges', badge_rows,
    'reports', report_rows,
    'attendance', attendance_rows
  );
end;
$$;

grant execute on function public.get_employee_enrichment(uuid, uuid[], date) to authenticated;

notify pgrst, 'reload schema';
