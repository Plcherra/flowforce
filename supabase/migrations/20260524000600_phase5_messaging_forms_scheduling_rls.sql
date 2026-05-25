-- Phase 5 forward migration: give messaging, forms, and scheduling support
-- tables first-class tenant ownership, then enforce it through RLS.

alter table public.message_channels add column if not exists company_id uuid;
alter table public.channel_members add column if not exists company_id uuid;
alter table public.messages add column if not exists company_id uuid;
alter table public.message_reactions add column if not exists company_id uuid;

alter table public.forms add column if not exists company_id uuid;
alter table public.form_fields add column if not exists company_id uuid;
alter table public.form_submissions add column if not exists company_id uuid;

alter table public.schedule_assignments add column if not exists company_id uuid;
alter table public.time_off_requests add column if not exists company_id uuid;
alter table public.user_unavailability add column if not exists company_id uuid;

update public.message_channels mc
set company_id = p.company_id
from public.profiles p
where mc.company_id is null
  and mc.created_by = p.id
  and p.company_id is not null;

update public.channel_members cm
set company_id = mc.company_id
from public.message_channels mc
where cm.company_id is null
  and cm.channel_id = mc.id::text
  and mc.company_id is not null;

update public.messages msg
set company_id = mc.company_id
from public.message_channels mc
where msg.company_id is null
  and msg.channel_id = mc.id::text
  and mc.company_id is not null;

update public.message_reactions reaction
set company_id = msg.company_id
from public.messages msg
where reaction.company_id is null
  and reaction.message_id = msg.id::text
  and msg.company_id is not null;

update public.forms f
set company_id = p.company_id
from public.profiles p
where f.company_id is null
  and f.created_by = p.id
  and p.company_id is not null;

update public.form_fields field
set company_id = f.company_id
from public.forms f
where field.company_id is null
  and field.form_id = f.id::text
  and f.company_id is not null;

update public.form_submissions submission
set company_id = f.company_id
from public.forms f
where submission.company_id is null
  and submission.form_id = f.id::text
  and f.company_id is not null;

update public.schedule_assignments assignment
set company_id = s.company_id
from public.schedules s
where assignment.company_id is null
  and assignment.schedule_id = s.id::text
  and s.company_id is not null;

update public.time_off_requests request
set company_id = p.company_id
from public.profiles p
where request.company_id is null
  and request.user_id = p.id
  and p.company_id is not null;

update public.user_unavailability unavailable
set company_id = p.company_id
from public.profiles p
where unavailable.company_id is null
  and unavailable.user_id = p.id
  and p.company_id is not null;

create index if not exists message_channels_company_id_idx on public.message_channels (company_id);
create index if not exists channel_members_company_id_idx on public.channel_members (company_id);
create index if not exists messages_company_id_idx on public.messages (company_id);
create index if not exists message_reactions_company_id_idx on public.message_reactions (company_id);
create index if not exists forms_company_id_idx on public.forms (company_id);
create index if not exists form_fields_company_id_idx on public.form_fields (company_id);
create index if not exists form_submissions_company_id_idx on public.form_submissions (company_id);
create index if not exists schedules_company_id_idx on public.schedules (company_id);
create index if not exists schedule_assignments_company_id_idx on public.schedule_assignments (company_id);
create index if not exists schedule_rulebooks_company_id_idx on public.schedule_rulebooks (company_id);
create index if not exists schedule_shifts_company_id_idx on public.schedule_shifts (company_id);
create index if not exists schedule_workflow_criteria_company_id_idx on public.schedule_workflow_criteria (company_id);
create index if not exists schedule_workflow_steps_company_id_idx on public.schedule_workflow_steps (company_id);
create index if not exists shift_templates_company_id_idx on public.shift_templates (company_id);
create index if not exists time_off_requests_company_id_idx on public.time_off_requests (company_id);
create index if not exists user_unavailability_company_id_idx on public.user_unavailability (company_id);
create index if not exists week_templates_company_id_idx on public.week_templates (company_id);

create or replace function public.set_message_channel_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.created_by is not null then
    select p.company_id
    into new.company_id
    from public.profiles p
    where p.id = new.created_by
    limit 1;
  end if;

  return new;
end;
$$;

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
    where mc.id::text = new.channel_id
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.set_message_reaction_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.message_id is not null then
    select msg.company_id
    into new.company_id
    from public.messages msg
    where msg.id::text = new.message_id
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.set_form_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.created_by is not null then
    select p.company_id
    into new.company_id
    from public.profiles p
    where p.id = new.created_by
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
    where f.id::text = new.form_id
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.set_schedule_assignment_company_id()
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
    where s.id::text = new.schedule_id
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.set_profile_owned_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.user_id is not null then
    select p.company_id
    into new.company_id
    from public.profiles p
    where p.id = new.user_id
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists set_message_channel_company_id on public.message_channels;
create trigger set_message_channel_company_id
before insert or update on public.message_channels
for each row execute function public.set_message_channel_company_id();

drop trigger if exists set_channel_member_company_id on public.channel_members;
create trigger set_channel_member_company_id
before insert or update on public.channel_members
for each row execute function public.set_channel_child_company_id();

drop trigger if exists set_message_company_id on public.messages;
create trigger set_message_company_id
before insert or update on public.messages
for each row execute function public.set_channel_child_company_id();

drop trigger if exists set_message_reaction_company_id on public.message_reactions;
create trigger set_message_reaction_company_id
before insert or update on public.message_reactions
for each row execute function public.set_message_reaction_company_id();

drop trigger if exists set_form_company_id on public.forms;
create trigger set_form_company_id
before insert or update on public.forms
for each row execute function public.set_form_company_id();

drop trigger if exists set_form_field_company_id on public.form_fields;
create trigger set_form_field_company_id
before insert or update on public.form_fields
for each row execute function public.set_form_child_company_id();

drop trigger if exists set_form_submission_company_id on public.form_submissions;
create trigger set_form_submission_company_id
before insert or update on public.form_submissions
for each row execute function public.set_form_child_company_id();

drop trigger if exists set_schedule_assignment_company_id on public.schedule_assignments;
create trigger set_schedule_assignment_company_id
before insert or update on public.schedule_assignments
for each row execute function public.set_schedule_assignment_company_id();

drop trigger if exists set_time_off_request_company_id on public.time_off_requests;
create trigger set_time_off_request_company_id
before insert or update on public.time_off_requests
for each row execute function public.set_profile_owned_company_id();

drop trigger if exists set_user_unavailability_company_id on public.user_unavailability;
create trigger set_user_unavailability_company_id
before insert or update on public.user_unavailability
for each row execute function public.set_profile_owned_company_id();

grant select, insert, update, delete on public.message_channels to authenticated;
grant select, insert, update, delete on public.channel_members to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.message_reactions to authenticated;
grant select, insert, update, delete on public.forms to authenticated;
grant select, insert, update, delete on public.form_fields to authenticated;
grant select, insert, update, delete on public.form_submissions to authenticated;
grant select, insert, update, delete on public.schedules to authenticated;
grant select, insert, update, delete on public.schedule_assignments to authenticated;
grant select, insert, update, delete on public.schedule_rulebooks to authenticated;
grant select, insert, update, delete on public.schedule_shifts to authenticated;
grant select, insert, update, delete on public.schedule_workflow_criteria to authenticated;
grant select, insert, update, delete on public.schedule_workflow_steps to authenticated;
grant select, insert, update, delete on public.shift_templates to authenticated;
grant select, insert, update, delete on public.time_off_requests to authenticated;
grant select, insert, update, delete on public.user_unavailability to authenticated;
grant select, insert, update, delete on public.week_templates to authenticated;

alter table public.message_channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.forms enable row level security;
alter table public.form_fields enable row level security;
alter table public.form_submissions enable row level security;
alter table public.schedules enable row level security;
alter table public.schedule_assignments enable row level security;
alter table public.schedule_rulebooks enable row level security;
alter table public.schedule_shifts enable row level security;
alter table public.schedule_workflow_criteria enable row level security;
alter table public.schedule_workflow_steps enable row level security;
alter table public.shift_templates enable row level security;
alter table public.time_off_requests enable row level security;
alter table public.user_unavailability enable row level security;
alter table public.week_templates enable row level security;

drop policy if exists "Company members can manage message channels" on public.message_channels;
create policy "Company members can manage message channels"
on public.message_channels
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage channel members" on public.channel_members;
create policy "Company members can manage channel members"
on public.channel_members
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.profiles p
    where p.id = channel_members.user_id
      and p.company_id = channel_members.company_id
  )
);

drop policy if exists "Company members can manage messages" on public.messages;
create policy "Company members can manage messages"
on public.messages
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and sender_id = auth.uid()
);

drop policy if exists "Company members can manage message reactions" on public.message_reactions;
create policy "Company members can manage message reactions"
on public.message_reactions
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and user_id = auth.uid()
);

drop policy if exists "Company members can manage forms" on public.forms;
create policy "Company members can manage forms"
on public.forms
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage form fields" on public.form_fields;
create policy "Company members can manage form fields"
on public.form_fields
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage form submissions" on public.form_submissions;
create policy "Company members can manage form submissions"
on public.form_submissions
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage schedules" on public.schedules;
create policy "Company members can manage schedules"
on public.schedules
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage schedule assignments" on public.schedule_assignments;
create policy "Company members can manage schedule assignments"
on public.schedule_assignments
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    user_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = schedule_assignments.user_id
        and p.company_id = schedule_assignments.company_id
    )
  )
);

drop policy if exists "Company members can manage schedule rulebooks" on public.schedule_rulebooks;
create policy "Company members can manage schedule rulebooks"
on public.schedule_rulebooks
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage schedule shifts" on public.schedule_shifts;
create policy "Company members can manage schedule shifts"
on public.schedule_shifts
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage schedule workflow criteria" on public.schedule_workflow_criteria;
create policy "Company members can manage schedule workflow criteria"
on public.schedule_workflow_criteria
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage schedule workflow steps" on public.schedule_workflow_steps;
create policy "Company members can manage schedule workflow steps"
on public.schedule_workflow_steps
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage shift templates" on public.shift_templates;
create policy "Company members can manage shift templates"
on public.shift_templates
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage time off requests" on public.time_off_requests;
create policy "Company members can manage time off requests"
on public.time_off_requests
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    user_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = time_off_requests.user_id
        and p.company_id = time_off_requests.company_id
    )
  )
);

drop policy if exists "Company members can manage user unavailability" on public.user_unavailability;
create policy "Company members can manage user unavailability"
on public.user_unavailability
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    user_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = user_unavailability.user_id
        and p.company_id = user_unavailability.company_id
    )
  )
);

drop policy if exists "Company members can manage week templates" on public.week_templates;
create policy "Company members can manage week templates"
on public.week_templates
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

notify pgrst, 'reload schema';
