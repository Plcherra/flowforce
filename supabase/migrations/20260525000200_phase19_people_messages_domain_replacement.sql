-- Phase 19 forward migration: replace more restore-era generic ownership with
-- reviewed people/HR and messages/announcements contracts.

create extension if not exists pgcrypto with schema extensions;

alter table public.employee_badge add column if not exists company_id uuid;
alter table public.employee_report add column if not exists company_id uuid;
alter table public.skill_matrix add column if not exists company_id uuid;
alter table public.staff_availability add column if not exists company_id uuid;
alter table public.staff_performance add column if not exists company_id uuid;
alter table public.announcement_reads add column if not exists company_id uuid;
alter table public.reminders add column if not exists company_id uuid;
alter table public.task_notifications add column if not exists company_id uuid;

update public.employee_badge badge
set company_id = profile.company_id
from public.profiles profile
where badge.company_id is null
  and badge.employee_id = profile.id
  and profile.company_id is not null;

update public.employee_report report
set company_id = profile.company_id
from public.profiles profile
where report.company_id is null
  and report.employee_id = profile.id
  and profile.company_id is not null;

update public.employee_report report
set company_id = profile.company_id
from public.profiles profile
where report.company_id is null
  and report.created_by = profile.id
  and profile.company_id is not null;

update public.skill_matrix skill
set company_id = profile.company_id
from public.profiles profile
where skill.company_id is null
  and skill.employee_id = profile.id
  and profile.company_id is not null;

update public.staff_availability availability
set company_id = profile.company_id
from public.profiles profile
where availability.company_id is null
  and availability.user_id = profile.id
  and profile.company_id is not null;

update public.staff_performance performance
set company_id = profile.company_id
from public.profiles profile
where performance.company_id is null
  and performance.user_id = profile.id
  and profile.company_id is not null;

update public.announcement_reads read
set company_id = announcement.company_id
from public.announcements announcement
where read.company_id is null
  and read.announcement_id = announcement.id::text
  and announcement.company_id is not null;

update public.announcement_reads read
set company_id = profile.company_id
from public.profiles profile
where read.company_id is null
  and read.user_id = profile.id
  and profile.company_id is not null;

update public.reminders reminder
set company_id = task.company_id
from public.tasks task
where reminder.company_id is null
  and reminder.task_id = task.id::text
  and task.company_id is not null;

update public.reminders reminder
set company_id = profile.company_id
from public.profiles profile
where reminder.company_id is null
  and reminder.user_id = profile.id
  and profile.company_id is not null;

update public.task_notifications notification
set company_id = task.company_id
from public.tasks task
where notification.company_id is null
  and notification.task_id = task.id::text
  and task.company_id is not null;

update public.task_notifications notification
set company_id = profile.company_id
from public.profiles profile
where notification.company_id is null
  and notification.user_id = profile.id
  and profile.company_id is not null;

create index if not exists employee_badge_company_id_idx on public.employee_badge (company_id);
create index if not exists employee_report_company_id_idx on public.employee_report (company_id);
create index if not exists employee_report_created_by_idx on public.employee_report (created_by);
create index if not exists skill_matrix_company_id_idx on public.skill_matrix (company_id);
create index if not exists staff_availability_company_id_idx on public.staff_availability (company_id);
create index if not exists staff_performance_company_id_idx on public.staff_performance (company_id);
create index if not exists announcements_created_by_idx on public.announcements (created_by);
create index if not exists announcement_reads_company_id_idx on public.announcement_reads (company_id);
create index if not exists announcement_reads_announcement_id_idx on public.announcement_reads (announcement_id);
create index if not exists reminders_company_id_idx on public.reminders (company_id);
create index if not exists reminders_task_id_idx on public.reminders (task_id);
create index if not exists task_notifications_company_id_idx on public.task_notifications (company_id);
create index if not exists task_notifications_task_id_idx on public.task_notifications (task_id);

create or replace function public.set_employee_owned_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.employee_id is not null then
    select profile.company_id
    into new.company_id
    from public.profiles profile
    where profile.id = new.employee_id
    limit 1;
  end if;

  if new.company_id is null and to_jsonb(new) ? 'created_by' then
    select profile.company_id
    into new.company_id
    from public.profiles profile
    where profile.id = (to_jsonb(new) ->> 'created_by')::uuid
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.set_announcement_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.created_by is not null then
    select profile.company_id
    into new.company_id
    from public.profiles profile
    where profile.id = new.created_by
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.set_announcement_read_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.announcement_id is not null then
    select announcement.company_id
    into new.company_id
    from public.announcements announcement
    where announcement.id::text = new.announcement_id
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

create or replace function public.set_task_owned_company_id()
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
    where task.id::text = new.task_id
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

drop trigger if exists set_employee_badge_company_id on public.employee_badge;
create trigger set_employee_badge_company_id
before insert or update on public.employee_badge
for each row execute function public.set_employee_owned_company_id();

drop trigger if exists set_employee_report_company_id on public.employee_report;
create trigger set_employee_report_company_id
before insert or update on public.employee_report
for each row execute function public.set_employee_owned_company_id();

drop trigger if exists set_skill_matrix_company_id on public.skill_matrix;
create trigger set_skill_matrix_company_id
before insert or update on public.skill_matrix
for each row execute function public.set_employee_owned_company_id();

drop trigger if exists set_staff_availability_company_id on public.staff_availability;
create trigger set_staff_availability_company_id
before insert or update on public.staff_availability
for each row execute function public.set_profile_owned_company_id();

drop trigger if exists set_staff_performance_company_id on public.staff_performance;
create trigger set_staff_performance_company_id
before insert or update on public.staff_performance
for each row execute function public.set_profile_owned_company_id();

drop trigger if exists set_announcement_company_id on public.announcements;
create trigger set_announcement_company_id
before insert or update on public.announcements
for each row execute function public.set_announcement_company_id();

drop trigger if exists set_announcement_read_company_id on public.announcement_reads;
create trigger set_announcement_read_company_id
before insert or update on public.announcement_reads
for each row execute function public.set_announcement_read_company_id();

drop trigger if exists set_reminder_company_id on public.reminders;
create trigger set_reminder_company_id
before insert or update on public.reminders
for each row execute function public.set_task_owned_company_id();

drop trigger if exists set_task_notification_company_id on public.task_notifications;
create trigger set_task_notification_company_id
before insert or update on public.task_notifications
for each row execute function public.set_task_owned_company_id();

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'employees',
    'employee_badge',
    'employee_report',
    'employee_report_summary',
    'hr_roster_cache',
    'skill_matrix',
    'staff_availability',
    'staff_performance',
    'compliance_rules',
    'announcements',
    'announcement_reads',
    'reminders',
    'task_notifications'
  ] loop
    begin
      execute format(
        'alter table public.%I add constraint %I check (company_id is not null) not valid',
        target_table,
        target_table || '_company_id_required'
      );
    exception
      when duplicate_object then null;
    end;
  end loop;
end
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'employees',
    'employee_badge',
    'employee_report',
    'employee_report_summary',
    'hr_roster_cache',
    'skill_matrix',
    'staff_availability',
    'staff_performance',
    'compliance_rules',
    'announcements',
    'announcement_reads',
    'reminders',
    'task_notifications'
  ] loop
    begin
      execute format(
        'alter table public.%I add constraint %I foreign key (company_id) references public.companies(id) on delete cascade not valid',
        target_table,
        target_table || '_company_id_fkey'
      );
    exception
      when duplicate_object then null;
    end;
  end loop;
end
$$;

do $$
begin
  alter table public.employee_badge
    add constraint employee_badge_employee_id_fkey
    foreign key (employee_id) references public.profiles(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.employee_report
    add constraint employee_report_employee_id_fkey
    foreign key (employee_id) references public.profiles(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.employee_report
    add constraint employee_report_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.skill_matrix
    add constraint skill_matrix_employee_id_fkey
    foreign key (employee_id) references public.profiles(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.staff_availability
    add constraint staff_availability_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.staff_performance
    add constraint staff_performance_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.announcements
    add constraint announcements_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.announcement_reads
    add constraint announcement_reads_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.reminders
    add constraint reminders_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.task_notifications
    add constraint task_notifications_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end
$$;

grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.employee_badge to authenticated;
grant select, insert, update, delete on public.employee_report to authenticated;
grant select, insert, update, delete on public.employee_report_summary to authenticated;
grant select, insert, update, delete on public.hr_roster_cache to authenticated;
grant select, insert, update, delete on public.skill_matrix to authenticated;
grant select, insert, update, delete on public.staff_availability to authenticated;
grant select, insert, update, delete on public.staff_performance to authenticated;
grant select, insert, update, delete on public.compliance_rules to authenticated;
grant select, insert, update, delete on public.announcements to authenticated;
grant select, insert, update, delete on public.announcement_reads to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
grant select, insert, update, delete on public.task_notifications to authenticated;

alter table public.employees enable row level security;
alter table public.employee_badge enable row level security;
alter table public.employee_report enable row level security;
alter table public.employee_report_summary enable row level security;
alter table public.hr_roster_cache enable row level security;
alter table public.skill_matrix enable row level security;
alter table public.staff_availability enable row level security;
alter table public.staff_performance enable row level security;
alter table public.compliance_rules enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;
alter table public.reminders enable row level security;
alter table public.task_notifications enable row level security;

drop policy if exists "Authenticated users can manage scoped restored rows" on public.employees;
drop policy if exists "Company members can manage employees" on public.employees;
create policy "Company members can manage employees"
on public.employees
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Authenticated users can manage scoped restored rows" on public.employee_badge;
drop policy if exists "Company members can manage employee badges" on public.employee_badge;
create policy "Company members can manage employee badges"
on public.employee_badge
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.profiles profile
    where profile.id = employee_badge.employee_id
      and profile.company_id = employee_badge.company_id
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.employee_report;
drop policy if exists "Company members can manage employee reports" on public.employee_report;
create policy "Company members can manage employee reports"
on public.employee_report
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    employee_id is null
    or exists (
      select 1
      from public.profiles profile
      where profile.id = employee_report.employee_id
        and profile.company_id = employee_report.company_id
    )
  )
  and (
    created_by is null
    or exists (
      select 1
      from public.profiles profile
      where profile.id = employee_report.created_by
        and profile.company_id = employee_report.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.employee_report_summary;
drop policy if exists "Company members can manage employee report summaries" on public.employee_report_summary;
create policy "Company members can manage employee report summaries"
on public.employee_report_summary
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Authenticated users can manage scoped restored rows" on public.hr_roster_cache;
drop policy if exists "Company members can manage HR roster cache" on public.hr_roster_cache;
create policy "Company members can manage HR roster cache"
on public.hr_roster_cache
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Authenticated users can manage scoped restored rows" on public.skill_matrix;
drop policy if exists "Company members can manage skill matrix" on public.skill_matrix;
create policy "Company members can manage skill matrix"
on public.skill_matrix
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.profiles profile
    where profile.id = skill_matrix.employee_id
      and profile.company_id = skill_matrix.company_id
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.staff_availability;
drop policy if exists "Company members can manage staff availability" on public.staff_availability;
create policy "Company members can manage staff availability"
on public.staff_availability
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.profiles profile
    where profile.id = staff_availability.user_id
      and profile.company_id = staff_availability.company_id
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.staff_performance;
drop policy if exists "Company members can manage staff performance" on public.staff_performance;
create policy "Company members can manage staff performance"
on public.staff_performance
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.profiles profile
    where profile.id = staff_performance.user_id
      and profile.company_id = staff_performance.company_id
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.compliance_rules;
drop policy if exists "Company members can manage compliance rules" on public.compliance_rules;
create policy "Company members can manage compliance rules"
on public.compliance_rules
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Authenticated users can manage scoped restored rows" on public.announcements;
drop policy if exists "Company members can manage announcements" on public.announcements;
create policy "Company members can manage announcements"
on public.announcements
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    created_by is null
    or exists (
      select 1
      from public.profiles profile
      where profile.id = announcements.created_by
        and profile.company_id = announcements.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.announcement_reads;
drop policy if exists "Company members can manage announcement reads" on public.announcement_reads;
create policy "Company members can manage announcement reads"
on public.announcement_reads
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    user_id is null
    or user_id = auth.uid()
    or exists (
      select 1
      from public.profiles profile
      where profile.id = announcement_reads.user_id
        and profile.company_id = announcement_reads.company_id
    )
  )
  and (
    announcement_id is null
    or exists (
      select 1
      from public.announcements announcement
      where announcement.id::text = announcement_reads.announcement_id
        and announcement.company_id = announcement_reads.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.reminders;
drop policy if exists "Company members can manage reminders" on public.reminders;
create policy "Company members can manage reminders"
on public.reminders
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    user_id is null
    or exists (
      select 1
      from public.profiles profile
      where profile.id = reminders.user_id
        and profile.company_id = reminders.company_id
    )
  )
  and (
    task_id is null
    or exists (
      select 1
      from public.tasks task
      where task.id::text = reminders.task_id
        and task.company_id = reminders.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.task_notifications;
drop policy if exists "Company members can manage task notifications" on public.task_notifications;
create policy "Company members can manage task notifications"
on public.task_notifications
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    user_id is null
    or exists (
      select 1
      from public.profiles profile
      where profile.id = task_notifications.user_id
        and profile.company_id = task_notifications.company_id
    )
  )
  and (
    task_id is null
    or exists (
      select 1
      from public.tasks task
      where task.id::text = task_notifications.task_id
        and task.company_id = task_notifications.company_id
    )
  )
);

notify pgrst, 'reload schema';
