-- Phase 20 forward migration: replace restore-era forms/sections/documents
-- ownership with reviewed tenant contracts.

create extension if not exists pgcrypto with schema extensions;

alter table public.custom_reports add column if not exists company_id uuid;
alter table public.form_access_rules add column if not exists company_id uuid;
alter table public.form_field_locations add column if not exists company_id uuid;
alter table public.form_field_ratings add column if not exists company_id uuid;
alter table public.form_field_scans add column if not exists company_id uuid;
alter table public.form_field_signatures add column if not exists company_id uuid;
alter table public.form_reviewer_rules add column if not exists company_id uuid;
alter table public.form_submission_files add column if not exists company_id uuid;
alter table public.form_submission_reviewers add column if not exists company_id uuid;
alter table public.report_events add column if not exists company_id uuid;

drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_access_rules;
drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_field_locations;
drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_field_ratings;
drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_field_scans;
drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_field_signatures;
drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_reviewer_rules;
drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_submission_files;
drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_submission_reviewers;
drop policy if exists "Authenticated users can manage scoped restored rows" on public.helpdesk_tickets;

do $$
declare
  target_table text;
  target_column text;
begin
  for target_table, target_column in
    select *
    from (values
      ('form_access_rules', 'form_id'),
      ('form_reviewer_rules', 'form_id'),
      ('form_field_locations', 'field_id'),
      ('form_field_locations', 'submission_id'),
      ('form_field_ratings', 'field_id'),
      ('form_field_ratings', 'submission_id'),
      ('form_field_scans', 'field_id'),
      ('form_field_scans', 'submission_id'),
      ('form_field_signatures', 'field_id'),
      ('form_field_signatures', 'submission_id'),
      ('form_submission_files', 'field_id'),
      ('form_submission_files', 'submission_id'),
      ('form_submission_reviewers', 'submission_id'),
      ('form_submission_reviewers', 'assigned_user_id'),
      ('helpdesk_tickets', 'department_id'),
      ('helpdesk_tickets', 'requester_id')
    ) as columns_to_convert(table_name, column_name)
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = target_table
        and column_name = target_column
        and udt_name <> 'uuid'
    ) then
      execute format(
        'alter table public.%I alter column %I type uuid using case when %I ~* %L then %I::uuid else null end',
        target_table,
        target_column,
        target_column,
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        target_column
      );
    end if;
  end loop;
end
$$;

update public.custom_reports report
set company_id = profile.company_id
from public.profiles profile
where report.company_id is null
  and report.created_by = profile.id
  and profile.company_id is not null;

update public.form_access_rules rule
set company_id = form.company_id
from public.forms form
where rule.company_id is null
  and rule.form_id = form.id
  and form.company_id is not null;

update public.form_reviewer_rules rule
set company_id = form.company_id
from public.forms form
where rule.company_id is null
  and rule.form_id = form.id
  and form.company_id is not null;

update public.form_field_locations child
set company_id = submission.company_id
from public.form_submissions submission
where child.company_id is null
  and child.submission_id = submission.id
  and submission.company_id is not null;

update public.form_field_ratings child
set company_id = submission.company_id
from public.form_submissions submission
where child.company_id is null
  and child.submission_id = submission.id
  and submission.company_id is not null;

update public.form_field_scans child
set company_id = submission.company_id
from public.form_submissions submission
where child.company_id is null
  and child.submission_id = submission.id
  and submission.company_id is not null;

update public.form_field_signatures child
set company_id = submission.company_id
from public.form_submissions submission
where child.company_id is null
  and child.submission_id = submission.id
  and submission.company_id is not null;

update public.form_submission_files child
set company_id = submission.company_id
from public.form_submissions submission
where child.company_id is null
  and child.submission_id = submission.id
  and submission.company_id is not null;

update public.form_submission_reviewers child
set company_id = submission.company_id
from public.form_submissions submission
where child.company_id is null
  and child.submission_id = submission.id
  and submission.company_id is not null;

update public.report_events event
set company_id = profile.company_id
from public.profiles profile
where event.company_id is null
  and event.user_id = profile.id
  and profile.company_id is not null;

create index if not exists custom_reports_company_id_idx on public.custom_reports (company_id);
create index if not exists custom_reports_created_by_idx on public.custom_reports (created_by);
create index if not exists form_access_rules_company_id_idx on public.form_access_rules (company_id);
create index if not exists form_access_rules_form_id_idx on public.form_access_rules (form_id);
create index if not exists form_field_locations_company_id_idx on public.form_field_locations (company_id);
create index if not exists form_field_locations_submission_id_idx on public.form_field_locations (submission_id);
create index if not exists form_field_locations_field_id_idx on public.form_field_locations (field_id);
create index if not exists form_field_ratings_company_id_idx on public.form_field_ratings (company_id);
create index if not exists form_field_ratings_submission_id_idx on public.form_field_ratings (submission_id);
create index if not exists form_field_ratings_field_id_idx on public.form_field_ratings (field_id);
create index if not exists form_field_scans_company_id_idx on public.form_field_scans (company_id);
create index if not exists form_field_scans_submission_id_idx on public.form_field_scans (submission_id);
create index if not exists form_field_scans_field_id_idx on public.form_field_scans (field_id);
create index if not exists form_field_signatures_company_id_idx on public.form_field_signatures (company_id);
create index if not exists form_field_signatures_submission_id_idx on public.form_field_signatures (submission_id);
create index if not exists form_field_signatures_field_id_idx on public.form_field_signatures (field_id);
create index if not exists form_reviewer_rules_company_id_idx on public.form_reviewer_rules (company_id);
create index if not exists form_reviewer_rules_form_id_idx on public.form_reviewer_rules (form_id);
create index if not exists form_submission_files_company_id_idx on public.form_submission_files (company_id);
create index if not exists form_submission_files_submission_id_idx on public.form_submission_files (submission_id);
create index if not exists form_submission_files_field_id_idx on public.form_submission_files (field_id);
create index if not exists form_submission_reviewers_company_id_idx on public.form_submission_reviewers (company_id);
create index if not exists form_submission_reviewers_submission_id_idx on public.form_submission_reviewers (submission_id);
create index if not exists form_submission_reviewers_assigned_user_id_idx on public.form_submission_reviewers (assigned_user_id);
create index if not exists helpdesk_tickets_requester_id_idx on public.helpdesk_tickets (requester_id);
create index if not exists helpdesk_tickets_assigned_to_idx on public.helpdesk_tickets (assigned_to);
create index if not exists helpdesk_tickets_department_id_idx on public.helpdesk_tickets (department_id);
create index if not exists report_events_company_id_idx on public.report_events (company_id);

create or replace function public.set_created_by_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  created_by_id uuid;
begin
  if new.company_id is null
    and to_jsonb(new) ? 'created_by'
    and (to_jsonb(new) ->> 'created_by') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    created_by_id := (to_jsonb(new) ->> 'created_by')::uuid;

    select profile.company_id
    into new.company_id
    from public.profiles profile
    where profile.id = created_by_id
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.set_form_related_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  form_uuid uuid;
  submission_uuid uuid;
  field_uuid uuid;
begin
  if new.company_id is null
    and to_jsonb(new) ? 'form_id'
    and (to_jsonb(new) ->> 'form_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    form_uuid := (to_jsonb(new) ->> 'form_id')::uuid;

    select form.company_id
    into new.company_id
    from public.forms form
    where form.id = form_uuid
    limit 1;
  end if;

  if new.company_id is null
    and to_jsonb(new) ? 'submission_id'
    and (to_jsonb(new) ->> 'submission_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    submission_uuid := (to_jsonb(new) ->> 'submission_id')::uuid;

    select submission.company_id
    into new.company_id
    from public.form_submissions submission
    where submission.id = submission_uuid
    limit 1;
  end if;

  if new.company_id is null
    and to_jsonb(new) ? 'field_id'
    and (to_jsonb(new) ->> 'field_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    field_uuid := (to_jsonb(new) ->> 'field_id')::uuid;

    select field.company_id
    into new.company_id
    from public.form_fields field
    where field.id = field_uuid
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.set_helpdesk_ticket_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.requester_id is not null then
    select profile.company_id
    into new.company_id
    from public.profiles profile
    where profile.id = new.requester_id
    limit 1;
  end if;

  if new.company_id is null and new.assigned_to is not null then
    select profile.company_id
    into new.company_id
    from public.profiles profile
    where profile.id = new.assigned_to
    limit 1;
  end if;

  if new.company_id is null and new.department_id is not null then
    select department.company_id
    into new.company_id
    from public.departments department
    where department.id = new.department_id
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.set_report_event_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

drop trigger if exists set_custom_report_company_id on public.custom_reports;
create trigger set_custom_report_company_id
before insert or update on public.custom_reports
for each row execute function public.set_created_by_company_id();

drop trigger if exists set_form_access_rule_company_id on public.form_access_rules;
create trigger set_form_access_rule_company_id
before insert or update on public.form_access_rules
for each row execute function public.set_form_related_company_id();

drop trigger if exists set_form_field_location_company_id on public.form_field_locations;
create trigger set_form_field_location_company_id
before insert or update on public.form_field_locations
for each row execute function public.set_form_related_company_id();

drop trigger if exists set_form_field_rating_company_id on public.form_field_ratings;
create trigger set_form_field_rating_company_id
before insert or update on public.form_field_ratings
for each row execute function public.set_form_related_company_id();

drop trigger if exists set_form_field_scan_company_id on public.form_field_scans;
create trigger set_form_field_scan_company_id
before insert or update on public.form_field_scans
for each row execute function public.set_form_related_company_id();

drop trigger if exists set_form_field_signature_company_id on public.form_field_signatures;
create trigger set_form_field_signature_company_id
before insert or update on public.form_field_signatures
for each row execute function public.set_form_related_company_id();

drop trigger if exists set_form_reviewer_rule_company_id on public.form_reviewer_rules;
create trigger set_form_reviewer_rule_company_id
before insert or update on public.form_reviewer_rules
for each row execute function public.set_form_related_company_id();

drop trigger if exists set_form_submission_file_company_id on public.form_submission_files;
create trigger set_form_submission_file_company_id
before insert or update on public.form_submission_files
for each row execute function public.set_form_related_company_id();

drop trigger if exists set_form_submission_reviewer_company_id on public.form_submission_reviewers;
create trigger set_form_submission_reviewer_company_id
before insert or update on public.form_submission_reviewers
for each row execute function public.set_form_related_company_id();

drop trigger if exists set_helpdesk_ticket_company_id on public.helpdesk_tickets;
create trigger set_helpdesk_ticket_company_id
before insert or update on public.helpdesk_tickets
for each row execute function public.set_helpdesk_ticket_company_id();

drop trigger if exists set_report_event_company_id on public.report_events;
create trigger set_report_event_company_id
before insert or update on public.report_events
for each row execute function public.set_report_event_company_id();

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'forms',
    'form_fields',
    'form_submissions',
    'form_access_rules',
    'form_field_locations',
    'form_field_ratings',
    'form_field_scans',
    'form_field_signatures',
    'form_reviewer_rules',
    'form_submission_files',
    'form_submission_reviewers',
    'custom_sections',
    'custom_reports',
    'documents',
    'files',
    'helpdesk_tickets',
    'report_events'
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
    'forms',
    'form_fields',
    'form_submissions',
    'form_access_rules',
    'form_field_locations',
    'form_field_ratings',
    'form_field_scans',
    'form_field_signatures',
    'form_reviewer_rules',
    'form_submission_files',
    'form_submission_reviewers',
    'custom_sections',
    'custom_reports',
    'documents',
    'files',
    'helpdesk_tickets',
    'report_events'
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
declare
  target_table text;
  target_column text;
  referenced_table text;
  on_delete text;
begin
  for target_table, target_column, referenced_table, on_delete in
    select *
    from (values
      ('custom_sections', 'created_by', 'profiles', 'set null'),
      ('custom_reports', 'created_by', 'profiles', 'set null'),
      ('form_access_rules', 'form_id', 'forms', 'cascade'),
      ('form_access_rules', 'created_by', 'profiles', 'set null'),
      ('form_field_locations', 'field_id', 'form_fields', 'cascade'),
      ('form_field_locations', 'submission_id', 'form_submissions', 'cascade'),
      ('form_field_ratings', 'field_id', 'form_fields', 'cascade'),
      ('form_field_ratings', 'submission_id', 'form_submissions', 'cascade'),
      ('form_field_scans', 'field_id', 'form_fields', 'cascade'),
      ('form_field_scans', 'submission_id', 'form_submissions', 'cascade'),
      ('form_field_signatures', 'field_id', 'form_fields', 'cascade'),
      ('form_field_signatures', 'submission_id', 'form_submissions', 'cascade'),
      ('form_reviewer_rules', 'form_id', 'forms', 'cascade'),
      ('form_reviewer_rules', 'created_by', 'profiles', 'set null'),
      ('form_submission_files', 'field_id', 'form_fields', 'set null'),
      ('form_submission_files', 'submission_id', 'form_submissions', 'cascade'),
      ('form_submission_reviewers', 'assigned_user_id', 'profiles', 'set null'),
      ('form_submission_reviewers', 'submission_id', 'form_submissions', 'cascade'),
      ('helpdesk_tickets', 'assigned_to', 'profiles', 'set null'),
      ('helpdesk_tickets', 'department_id', 'departments', 'set null'),
      ('helpdesk_tickets', 'requester_id', 'profiles', 'set null'),
      ('report_events', 'user_id', 'profiles', 'set null')
    ) as fks(table_name, column_name, referenced_table_name, delete_action)
  loop
    begin
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.%I(id) on delete %s not valid',
        target_table,
        target_table || '_' || target_column || '_fkey',
        target_column,
        referenced_table,
        on_delete
      );
    exception
      when duplicate_object then null;
    end;
  end loop;
end
$$;

grant select, insert, update, delete on public.forms to authenticated;
grant select, insert, update, delete on public.form_fields to authenticated;
grant select, insert, update, delete on public.form_submissions to authenticated;
grant select, insert, update, delete on public.form_access_rules to authenticated;
grant select, insert, update, delete on public.form_field_locations to authenticated;
grant select, insert, update, delete on public.form_field_ratings to authenticated;
grant select, insert, update, delete on public.form_field_scans to authenticated;
grant select, insert, update, delete on public.form_field_signatures to authenticated;
grant select, insert, update, delete on public.form_reviewer_rules to authenticated;
grant select, insert, update, delete on public.form_submission_files to authenticated;
grant select, insert, update, delete on public.form_submission_reviewers to authenticated;
grant select, insert, update, delete on public.custom_sections to authenticated;
grant select, insert, update, delete on public.custom_section_pages to authenticated;
grant select on public.section_templates to authenticated;
grant select, insert, update, delete on public.custom_reports to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.files to authenticated;
grant select, insert, update, delete on public.helpdesk_tickets to authenticated;
grant select, insert, update, delete on public.report_events to authenticated;

alter table public.forms enable row level security;
alter table public.form_fields enable row level security;
alter table public.form_submissions enable row level security;
alter table public.form_access_rules enable row level security;
alter table public.form_field_locations enable row level security;
alter table public.form_field_ratings enable row level security;
alter table public.form_field_scans enable row level security;
alter table public.form_field_signatures enable row level security;
alter table public.form_reviewer_rules enable row level security;
alter table public.form_submission_files enable row level security;
alter table public.form_submission_reviewers enable row level security;
alter table public.custom_sections enable row level security;
alter table public.custom_section_pages enable row level security;
alter table public.section_templates enable row level security;
alter table public.custom_reports enable row level security;
alter table public.documents enable row level security;
alter table public.files enable row level security;
alter table public.helpdesk_tickets enable row level security;
alter table public.report_events enable row level security;

drop policy if exists "Authenticated users can manage scoped restored rows" on public.forms;
drop policy if exists "Company members can manage forms" on public.forms;
create policy "Company members can manage forms"
on public.forms
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
      where profile.id = forms.created_by
        and profile.company_id = forms.company_id
    )
  )
  and (
    department_id is null
    or exists (
      select 1
      from public.departments department
      where department.id = forms.department_id
        and department.company_id = forms.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_fields;
drop policy if exists "Company members can manage form fields" on public.form_fields;
create policy "Company members can manage form fields"
on public.form_fields
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.forms form
    where form.id = form_fields.form_id
      and form.company_id = form_fields.company_id
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_submissions;
drop policy if exists "Company members can manage form submissions" on public.form_submissions;
create policy "Company members can manage form submissions"
on public.form_submissions
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.forms form
    where form.id = form_submissions.form_id
      and form.company_id = form_submissions.company_id
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_access_rules;
drop policy if exists "Company members can manage form access rules" on public.form_access_rules;
create policy "Company members can manage form access rules"
on public.form_access_rules
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.forms form
    where form.id = form_access_rules.form_id
      and form.company_id = form_access_rules.company_id
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_reviewer_rules;
drop policy if exists "Company members can manage form reviewer rules" on public.form_reviewer_rules;
create policy "Company members can manage form reviewer rules"
on public.form_reviewer_rules
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.forms form
    where form.id = form_reviewer_rules.form_id
      and form.company_id = form_reviewer_rules.company_id
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_field_locations;
drop policy if exists "Company members can manage form field locations" on public.form_field_locations;
create policy "Company members can manage form field locations"
on public.form_field_locations
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    submission_id is null
    or exists (
      select 1
      from public.form_submissions submission
      where submission.id = form_field_locations.submission_id
        and submission.company_id = form_field_locations.company_id
    )
  )
  and (
    field_id is null
    or exists (
      select 1
      from public.form_fields field
      where field.id = form_field_locations.field_id
        and field.company_id = form_field_locations.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_field_ratings;
drop policy if exists "Company members can manage form field ratings" on public.form_field_ratings;
create policy "Company members can manage form field ratings"
on public.form_field_ratings
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    submission_id is null
    or exists (
      select 1
      from public.form_submissions submission
      where submission.id = form_field_ratings.submission_id
        and submission.company_id = form_field_ratings.company_id
    )
  )
  and (
    field_id is null
    or exists (
      select 1
      from public.form_fields field
      where field.id = form_field_ratings.field_id
        and field.company_id = form_field_ratings.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_field_scans;
drop policy if exists "Company members can manage form field scans" on public.form_field_scans;
create policy "Company members can manage form field scans"
on public.form_field_scans
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    submission_id is null
    or exists (
      select 1
      from public.form_submissions submission
      where submission.id = form_field_scans.submission_id
        and submission.company_id = form_field_scans.company_id
    )
  )
  and (
    field_id is null
    or exists (
      select 1
      from public.form_fields field
      where field.id = form_field_scans.field_id
        and field.company_id = form_field_scans.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_field_signatures;
drop policy if exists "Company members can manage form field signatures" on public.form_field_signatures;
create policy "Company members can manage form field signatures"
on public.form_field_signatures
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    submission_id is null
    or exists (
      select 1
      from public.form_submissions submission
      where submission.id = form_field_signatures.submission_id
        and submission.company_id = form_field_signatures.company_id
    )
  )
  and (
    field_id is null
    or exists (
      select 1
      from public.form_fields field
      where field.id = form_field_signatures.field_id
        and field.company_id = form_field_signatures.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_submission_files;
drop policy if exists "Company members can manage form submission files" on public.form_submission_files;
create policy "Company members can manage form submission files"
on public.form_submission_files
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    submission_id is null
    or exists (
      select 1
      from public.form_submissions submission
      where submission.id = form_submission_files.submission_id
        and submission.company_id = form_submission_files.company_id
    )
  )
  and (
    field_id is null
    or exists (
      select 1
      from public.form_fields field
      where field.id = form_submission_files.field_id
        and field.company_id = form_submission_files.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.form_submission_reviewers;
drop policy if exists "Company members can manage form submission reviewers" on public.form_submission_reviewers;
create policy "Company members can manage form submission reviewers"
on public.form_submission_reviewers
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    submission_id is null
    or exists (
      select 1
      from public.form_submissions submission
      where submission.id = form_submission_reviewers.submission_id
        and submission.company_id = form_submission_reviewers.company_id
    )
  )
  and (
    assigned_user_id is null
    or exists (
      select 1
      from public.profiles profile
      where profile.id = form_submission_reviewers.assigned_user_id
        and profile.company_id = form_submission_reviewers.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.custom_sections;
drop policy if exists "Company members can manage custom sections" on public.custom_sections;
create policy "Company members can manage custom sections"
on public.custom_sections
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
      where profile.id = custom_sections.created_by
        and profile.company_id = custom_sections.company_id
    )
  )
);

drop policy if exists "Company members can manage custom section pages" on public.custom_section_pages;
create policy "Company members can manage custom section pages"
on public.custom_section_pages
for all
to authenticated
using (
  exists (
    select 1
    from public.custom_sections section
    where section.id = custom_section_pages.section_id
      and section.company_id in (select public.current_user_company_ids())
  )
)
with check (
  exists (
    select 1
    from public.custom_sections section
    where section.id = custom_section_pages.section_id
      and section.company_id in (select public.current_user_company_ids())
  )
);

drop policy if exists "Authenticated users can read global restored rows" on public.section_templates;
drop policy if exists "Authenticated users can read section templates" on public.section_templates;
create policy "Authenticated users can read section templates"
on public.section_templates
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.custom_reports;
drop policy if exists "Company members can manage custom reports" on public.custom_reports;
create policy "Company members can manage custom reports"
on public.custom_reports
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
      where profile.id = custom_reports.created_by
        and profile.company_id = custom_reports.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.documents;
drop policy if exists "Company members can manage documents" on public.documents;
create policy "Company members can manage documents"
on public.documents
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Authenticated users can manage scoped restored rows" on public.files;
drop policy if exists "Company members can manage files" on public.files;
create policy "Company members can manage files"
on public.files
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Authenticated users can manage scoped restored rows" on public.helpdesk_tickets;
drop policy if exists "Company members can manage helpdesk tickets" on public.helpdesk_tickets;
create policy "Company members can manage helpdesk tickets"
on public.helpdesk_tickets
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    requester_id is null
    or exists (
      select 1
      from public.profiles profile
      where profile.id = helpdesk_tickets.requester_id
        and profile.company_id = helpdesk_tickets.company_id
    )
  )
  and (
    assigned_to is null
    or exists (
      select 1
      from public.profiles profile
      where profile.id = helpdesk_tickets.assigned_to
        and profile.company_id = helpdesk_tickets.company_id
    )
  )
  and (
    department_id is null
    or exists (
      select 1
      from public.departments department
      where department.id = helpdesk_tickets.department_id
        and department.company_id = helpdesk_tickets.company_id
    )
  )
);

drop policy if exists "Authenticated users can manage scoped restored rows" on public.report_events;
drop policy if exists "Company members can manage report events" on public.report_events;
create policy "Company members can manage report events"
on public.report_events
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
      where profile.id = report_events.user_id
        and profile.company_id = report_events.company_id
    )
  )
);

notify pgrst, 'reload schema';
