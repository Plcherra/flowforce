-- Phase 06.01: tenant-safe operations workflow domain model.
-- Existing forms and tasks stay usable, while workflows gain the primitives
-- needed for SOP/checklist execution, evidence, review, and exceptions.

create extension if not exists pgcrypto with schema extensions;

alter table public.workflows add column if not exists company_id uuid;
alter table public.workflows add column if not exists workflow_kind text default 'checklist';
alter table public.workflows add column if not exists template_category text;
alter table public.workflows add column if not exists location_id uuid;
alter table public.workflows add column if not exists role_id uuid;
alter table public.workflows add column if not exists source_form_id uuid;
alter table public.workflows add column if not exists compliance_pack text;
alter table public.workflows add column if not exists retention_policy jsonb default '{}'::jsonb;
alter table public.workflows add column if not exists review_required boolean default false;
alter table public.workflows add column if not exists audit_config jsonb default '{}'::jsonb;

alter table public.workflow_steps add column if not exists company_id uuid;
alter table public.workflow_steps add column if not exists form_field_id uuid;
alter table public.workflow_steps add column if not exists evidence_required boolean default false;
alter table public.workflow_steps add column if not exists evidence_schema jsonb default '{}'::jsonb;
alter table public.workflow_steps add column if not exists failure_escalation jsonb default '{}'::jsonb;
alter table public.workflow_steps add column if not exists exception_policy jsonb default '{}'::jsonb;

alter table public.task_workflow_instances add column if not exists company_id uuid;
alter table public.task_workflow_instances add column if not exists assigned_to uuid;
alter table public.task_workflow_instances add column if not exists assigned_role text;
alter table public.task_workflow_instances add column if not exists location_id uuid;
alter table public.task_workflow_instances add column if not exists due_at timestamptz;
alter table public.task_workflow_instances add column if not exists review_status text default 'not_required';
alter table public.task_workflow_instances add column if not exists exception_count integer default 0;
alter table public.task_workflow_instances add column if not exists source_type text default 'manual';
alter table public.task_workflow_instances add column if not exists source_id uuid;
alter table public.task_workflow_instances add column if not exists metadata jsonb default '{}'::jsonb;

alter table public.workflow_step_instances add column if not exists company_id uuid;
alter table public.workflow_step_instances add column if not exists evidence_status text default 'not_required';
alter table public.workflow_step_instances add column if not exists failed_reason text;
alter table public.workflow_step_instances add column if not exists exception_status text default 'none';
alter table public.workflow_step_instances add column if not exists evidence_payload jsonb default '{}'::jsonb;

create table if not exists public.workflow_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  workflow_id uuid not null,
  assignment_type text not null default 'role',
  location_id uuid,
  role_id uuid,
  assigned_to uuid,
  schedule_rule jsonb not null default '{}'::jsonb,
  due_window jsonb not null default '{}'::jsonb,
  escalation_rule jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_evidence (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  workflow_instance_id uuid,
  step_instance_id uuid,
  workflow_id uuid,
  step_id uuid,
  evidence_type text not null,
  storage_path text,
  value jsonb not null default '{}'::jsonb,
  captured_by uuid,
  captured_at timestamptz not null default now(),
  retention_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  workflow_instance_id uuid not null,
  review_status text not null default 'pending',
  reviewer_id uuid,
  decision text,
  comments text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_exceptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  workflow_instance_id uuid,
  step_instance_id uuid,
  workflow_id uuid,
  step_id uuid,
  severity text not null default 'warning',
  status text not null default 'open',
  title text not null,
  description text,
  owner_id uuid,
  due_at timestamptz,
  resolved_at timestamptz,
  resolution_notes text,
  linked_task_id uuid,
  linked_ops_issue_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update public.workflows workflow
set company_id = profile.company_id
from public.profiles profile
where workflow.company_id is null
  and workflow.created_by = profile.id
  and profile.company_id is not null;

update public.workflows workflow
set company_id = department.company_id
from public.departments department
where workflow.company_id is null
  and workflow.department_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and workflow.department_id::uuid = department.id
  and department.company_id is not null;

update public.workflows workflow
set company_id = form.company_id
from public.forms form
where workflow.company_id is null
  and workflow.source_form_id = form.id
  and form.company_id is not null;

update public.workflow_steps step
set company_id = workflow.company_id
from public.workflows workflow
where step.company_id is null
  and step.workflow_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and step.workflow_id::uuid = workflow.id
  and workflow.company_id is not null;

update public.workflow_steps step
set company_id = field.company_id
from public.form_fields field
where step.company_id is null
  and step.form_field_id = field.id
  and field.company_id is not null;

update public.task_workflow_instances run
set company_id = task.company_id
from public.tasks task
where run.company_id is null
  and run.task_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and run.task_id::uuid = task.id
  and task.company_id is not null;

update public.task_workflow_instances run
set company_id = workflow.company_id
from public.workflows workflow
where run.company_id is null
  and run.workflow_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and run.workflow_id::uuid = workflow.id
  and workflow.company_id is not null;

update public.workflow_step_instances step_run
set company_id = run.company_id
from public.task_workflow_instances run
where step_run.company_id is null
  and step_run.workflow_instance_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and step_run.workflow_instance_id::uuid = run.id
  and run.company_id is not null;

update public.workflow_step_instances step_run
set company_id = step.company_id
from public.workflow_steps step
where step_run.company_id is null
  and step_run.step_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and step_run.step_id::uuid = step.id
  and step.company_id is not null;

create index if not exists workflows_company_id_idx on public.workflows (company_id);
create index if not exists workflows_source_form_id_idx on public.workflows (source_form_id);
create index if not exists workflows_location_id_idx on public.workflows (location_id);
create index if not exists workflow_steps_company_id_idx on public.workflow_steps (company_id);
create index if not exists workflow_steps_form_field_id_idx on public.workflow_steps (form_field_id);
create index if not exists task_workflow_instances_company_id_idx on public.task_workflow_instances (company_id);
create index if not exists task_workflow_instances_due_at_idx on public.task_workflow_instances (due_at);
create index if not exists workflow_step_instances_company_id_idx on public.workflow_step_instances (company_id);
create index if not exists workflow_assignments_company_id_idx on public.workflow_assignments (company_id);
create index if not exists workflow_assignments_workflow_id_idx on public.workflow_assignments (workflow_id);
create index if not exists workflow_evidence_company_id_idx on public.workflow_evidence (company_id);
create index if not exists workflow_evidence_instance_idx on public.workflow_evidence (workflow_instance_id, step_instance_id);
create index if not exists workflow_reviews_company_id_idx on public.workflow_reviews (company_id);
create index if not exists workflow_reviews_instance_idx on public.workflow_reviews (workflow_instance_id);
create index if not exists workflow_exceptions_company_id_idx on public.workflow_exceptions (company_id);
create index if not exists workflow_exceptions_status_due_idx on public.workflow_exceptions (status, due_at);

do $$
begin
  alter table public.workflows
    add constraint workflows_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflows
    add constraint workflows_source_form_id_fkey
    foreign key (source_form_id) references public.forms(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflow_steps
    add constraint workflow_steps_form_field_id_fkey
    foreign key (form_field_id) references public.form_fields(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflow_assignments
    add constraint workflow_assignments_workflow_id_fkey
    foreign key (workflow_id) references public.workflows(id) on delete cascade not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflow_evidence
    add constraint workflow_evidence_workflow_instance_id_fkey
    foreign key (workflow_instance_id) references public.task_workflow_instances(id) on delete cascade not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflow_evidence
    add constraint workflow_evidence_step_instance_id_fkey
    foreign key (step_instance_id) references public.workflow_step_instances(id) on delete cascade not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflow_reviews
    add constraint workflow_reviews_workflow_instance_id_fkey
    foreign key (workflow_instance_id) references public.task_workflow_instances(id) on delete cascade not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflow_exceptions
    add constraint workflow_exceptions_workflow_instance_id_fkey
    foreign key (workflow_instance_id) references public.task_workflow_instances(id) on delete cascade not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflow_exceptions
    add constraint workflow_exceptions_linked_task_id_fkey
    foreign key (linked_task_id) references public.tasks(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflow_exceptions
    add constraint workflow_exceptions_linked_ops_issue_id_fkey
    foreign key (linked_ops_issue_id) references public.ops_issues(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflows
    add constraint workflows_workflow_kind_known
    check (workflow_kind in ('checklist', 'sop', 'inspection', 'incident_response', 'approval', 'training', 'inventory_count', 'custom')) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.task_workflow_instances
    add constraint task_workflow_instances_review_status_known
    check (review_status in ('not_required', 'pending', 'approved', 'rejected', 'needs_changes')) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflow_step_instances
    add constraint workflow_step_instances_evidence_status_known
    check (evidence_status in ('not_required', 'missing', 'partial', 'complete', 'rejected')) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflow_reviews
    add constraint workflow_reviews_status_known
    check (review_status in ('pending', 'approved', 'rejected', 'needs_changes')) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflow_exceptions
    add constraint workflow_exceptions_status_known
    check (status in ('open', 'acknowledged', 'in_progress', 'resolved', 'cancelled')) not valid;
exception when duplicate_object then null;
end
$$;

create or replace function public.set_workflow_company_id()
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

  if new.company_id is null
    and new.department_id is not null
    and new.department_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    select department.company_id
    into new.company_id
    from public.departments department
    where department.id = new.department_id::uuid
    limit 1;
  end if;

  if new.company_id is null and new.source_form_id is not null then
    select form.company_id
    into new.company_id
    from public.forms form
    where form.id = new.source_form_id
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.set_workflow_child_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null
    and to_jsonb(new) ? 'workflow_id'
    and (to_jsonb(new) ->> 'workflow_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    select workflow.company_id
    into new.company_id
    from public.workflows workflow
    where workflow.id = (to_jsonb(new) ->> 'workflow_id')::uuid
    limit 1;
  end if;

  if new.company_id is null
    and to_jsonb(new) ? 'workflow_instance_id'
    and (to_jsonb(new) ->> 'workflow_instance_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    select run.company_id
    into new.company_id
    from public.task_workflow_instances run
    where run.id = (to_jsonb(new) ->> 'workflow_instance_id')::uuid
    limit 1;
  end if;

  if new.company_id is null
    and to_jsonb(new) ? 'step_id'
    and (to_jsonb(new) ->> 'step_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    select step.company_id
    into new.company_id
    from public.workflow_steps step
    where step.id = (to_jsonb(new) ->> 'step_id')::uuid
    limit 1;
  end if;

  if new.company_id is null
    and to_jsonb(new) ? 'step_instance_id'
    and (to_jsonb(new) ->> 'step_instance_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    select step_run.company_id
    into new.company_id
    from public.workflow_step_instances step_run
    where step_run.id = (to_jsonb(new) ->> 'step_instance_id')::uuid
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists set_workflows_updated_at on public.workflows;
create trigger set_workflows_updated_at
before update on public.workflows
for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_steps_updated_at on public.workflow_steps;
create trigger set_workflow_steps_updated_at
before update on public.workflow_steps
for each row execute function public.set_updated_at();

drop trigger if exists set_task_workflow_instances_updated_at on public.task_workflow_instances;
create trigger set_task_workflow_instances_updated_at
before update on public.task_workflow_instances
for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_step_instances_updated_at on public.workflow_step_instances;
create trigger set_workflow_step_instances_updated_at
before update on public.workflow_step_instances
for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_assignments_updated_at on public.workflow_assignments;
create trigger set_workflow_assignments_updated_at
before update on public.workflow_assignments
for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_evidence_updated_at on public.workflow_evidence;
create trigger set_workflow_evidence_updated_at
before update on public.workflow_evidence
for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_reviews_updated_at on public.workflow_reviews;
create trigger set_workflow_reviews_updated_at
before update on public.workflow_reviews
for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_exceptions_updated_at on public.workflow_exceptions;
create trigger set_workflow_exceptions_updated_at
before update on public.workflow_exceptions
for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_company_id on public.workflows;
create trigger set_workflow_company_id
before insert or update on public.workflows
for each row execute function public.set_workflow_company_id();

drop trigger if exists set_workflow_steps_company_id on public.workflow_steps;
create trigger set_workflow_steps_company_id
before insert or update on public.workflow_steps
for each row execute function public.set_workflow_child_company_id();

drop trigger if exists set_task_workflow_instances_company_id on public.task_workflow_instances;
create trigger set_task_workflow_instances_company_id
before insert or update on public.task_workflow_instances
for each row execute function public.set_workflow_child_company_id();

drop trigger if exists set_workflow_step_instances_company_id on public.workflow_step_instances;
create trigger set_workflow_step_instances_company_id
before insert or update on public.workflow_step_instances
for each row execute function public.set_workflow_child_company_id();

drop trigger if exists set_workflow_assignments_company_id on public.workflow_assignments;
create trigger set_workflow_assignments_company_id
before insert or update on public.workflow_assignments
for each row execute function public.set_workflow_child_company_id();

drop trigger if exists set_workflow_evidence_company_id on public.workflow_evidence;
create trigger set_workflow_evidence_company_id
before insert or update on public.workflow_evidence
for each row execute function public.set_workflow_child_company_id();

drop trigger if exists set_workflow_reviews_company_id on public.workflow_reviews;
create trigger set_workflow_reviews_company_id
before insert or update on public.workflow_reviews
for each row execute function public.set_workflow_child_company_id();

drop trigger if exists set_workflow_exceptions_company_id on public.workflow_exceptions;
create trigger set_workflow_exceptions_company_id
before insert or update on public.workflow_exceptions
for each row execute function public.set_workflow_child_company_id();

grant select, insert, update, delete on public.workflows to authenticated;
grant select, insert, update, delete on public.workflow_steps to authenticated;
grant select, insert, update, delete on public.task_workflow_instances to authenticated;
grant select, insert, update, delete on public.workflow_step_instances to authenticated;
grant select, insert, update, delete on public.workflow_assignments to authenticated;
grant select, insert, update, delete on public.workflow_evidence to authenticated;
grant select, insert, update, delete on public.workflow_reviews to authenticated;
grant select, insert, update, delete on public.workflow_exceptions to authenticated;

alter table public.workflows enable row level security;
alter table public.workflow_steps enable row level security;
alter table public.task_workflow_instances enable row level security;
alter table public.workflow_step_instances enable row level security;
alter table public.workflow_assignments enable row level security;
alter table public.workflow_evidence enable row level security;
alter table public.workflow_reviews enable row level security;
alter table public.workflow_exceptions enable row level security;

drop policy if exists "Company members can manage workflows" on public.workflows;
create policy "Company members can manage workflows"
on public.workflows
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage workflow steps" on public.workflow_steps;
create policy "Company members can manage workflow steps"
on public.workflow_steps
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    workflow_id is null
    or exists (
      select 1
      from public.workflows workflow
      where workflow.id::text = workflow_steps.workflow_id::text
        and workflow.company_id = workflow_steps.company_id
    )
  )
);

drop policy if exists "Company members can manage task workflow instances" on public.task_workflow_instances;
create policy "Company members can manage task workflow instances"
on public.task_workflow_instances
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    workflow_id is null
    or exists (
      select 1
      from public.workflows workflow
      where workflow.id::text = task_workflow_instances.workflow_id::text
        and workflow.company_id = task_workflow_instances.company_id
    )
  )
);

drop policy if exists "Company members can manage workflow step instances" on public.workflow_step_instances;
create policy "Company members can manage workflow step instances"
on public.workflow_step_instances
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage workflow assignments" on public.workflow_assignments;
create policy "Company members can manage workflow assignments"
on public.workflow_assignments
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.workflows workflow
    where workflow.id = workflow_assignments.workflow_id
      and workflow.company_id = workflow_assignments.company_id
  )
);

drop policy if exists "Company members can manage workflow evidence" on public.workflow_evidence;
create policy "Company members can manage workflow evidence"
on public.workflow_evidence
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage workflow reviews" on public.workflow_reviews;
create policy "Company members can manage workflow reviews"
on public.workflow_reviews
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage workflow exceptions" on public.workflow_exceptions;
create policy "Company members can manage workflow exceptions"
on public.workflow_exceptions
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

create or replace view public.workflow_domain_model_v
with (security_invoker = true)
as
select
  workflow.company_id,
  workflow.id as workflow_id,
  workflow.name as workflow_name,
  workflow.workflow_kind,
  workflow.template_category,
  workflow.is_template,
  workflow.status,
  workflow.location_id,
  workflow.role_id,
  workflow.source_form_id,
  workflow.review_required,
  count(distinct step.id)::integer as step_count,
  count(distinct assignment.id)::integer as assignment_count,
  count(distinct run.id)::integer as run_count,
  count(distinct exception.id) filter (where exception.status <> 'resolved')::integer as open_exception_count
from public.workflows workflow
left join public.workflow_steps step
  on step.workflow_id::text = workflow.id::text
  and step.company_id = workflow.company_id
left join public.workflow_assignments assignment
  on assignment.workflow_id = workflow.id
  and assignment.company_id = workflow.company_id
left join public.task_workflow_instances run
  on run.workflow_id::text = workflow.id::text
  and run.company_id = workflow.company_id
left join public.workflow_exceptions exception
  on exception.workflow_id = workflow.id
  and exception.company_id = workflow.company_id
group by
  workflow.company_id,
  workflow.id,
  workflow.name,
  workflow.workflow_kind,
  workflow.template_category,
  workflow.is_template,
  workflow.status,
  workflow.location_id,
  workflow.role_id,
  workflow.source_form_id,
  workflow.review_required;

grant select on public.workflow_domain_model_v to authenticated;

notify pgrst, 'reload schema';
