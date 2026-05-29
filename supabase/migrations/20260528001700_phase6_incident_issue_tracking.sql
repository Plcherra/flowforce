-- Phase 06.06: incident and issue tracking contract.
-- Operational problems become owned, due, linked work with SLA state.

create extension if not exists pgcrypto with schema extensions;

alter table public.ops_issues add column if not exists owner_id uuid;
alter table public.ops_issues add column if not exists due_at timestamptz;
alter table public.ops_issues add column if not exists resolved_at timestamptz;
alter table public.ops_issues add column if not exists resolved_by uuid;
alter table public.ops_issues add column if not exists resolution_notes text;
alter table public.ops_issues add column if not exists task_id uuid;
alter table public.ops_issues add column if not exists workflow_instance_id uuid;
alter table public.ops_issues add column if not exists workflow_exception_id uuid;
alter table public.ops_issues add column if not exists inventory_item_id text;
alter table public.ops_issues add column if not exists ai_suggestion_id uuid;
alter table public.ops_issues add column if not exists priority_rank integer default 50;
alter table public.ops_issues add column if not exists last_status_change_at timestamptz default now();
alter table public.ops_issues add column if not exists source_context jsonb default '{}'::jsonb;

create index if not exists ops_issues_lifecycle_idx
on public.ops_issues (company_id, status, due_at, severity);

create index if not exists ops_issues_owner_idx
on public.ops_issues (company_id, owner_id, status);

create index if not exists ops_issues_workflow_instance_idx
on public.ops_issues (company_id, workflow_instance_id);

do $$
begin
  alter table public.ops_issues
    add constraint ops_issues_task_id_fkey
    foreign key (task_id) references public.tasks(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.ops_issues
    add constraint ops_issues_workflow_instance_id_fkey
    foreign key (workflow_instance_id) references public.task_workflow_instances(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.ops_issues
    add constraint ops_issues_workflow_exception_id_fkey
    foreign key (workflow_exception_id) references public.workflow_exceptions(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.ops_issues
    add constraint ops_issues_ai_suggestion_id_fkey
    foreign key (ai_suggestion_id) references public.ops_automation_suggestions(id) on delete set null not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.ops_issues
    add constraint ops_issues_status_known
    check (status in ('open', 'acknowledged', 'in_progress', 'blocked', 'resolved', 'cancelled')) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.ops_issues
    add constraint ops_issues_severity_known
    check (severity in ('info', 'warning', 'critical')) not valid;
exception when duplicate_object then null;
end
$$;

drop trigger if exists set_ops_issues_updated_at on public.ops_issues;
create trigger set_ops_issues_updated_at
before update on public.ops_issues
for each row execute function public.set_updated_at();

create or replace function public.issue_priority_rank(p_severity text)
returns integer
language sql
immutable
as $$
  select case coalesce(p_severity, 'warning')
    when 'critical' then 10
    when 'warning' then 30
    else 60
  end;
$$;

create or replace view public.operations_incident_issue_queue_v
with (security_invoker = true)
as
select
  issue.company_id,
  issue.id as issue_id,
  issue.title,
  issue.description,
  issue.issue_type,
  coalesce(issue.severity, 'warning') as severity,
  coalesce(issue.status, 'open') as status,
  issue.owner_id,
  owner.first_name || case when owner.last_name is null then '' else ' ' || owner.last_name end as owner_name,
  issue.due_at,
  issue.resolved_at,
  issue.resolved_by,
  issue.resolution_notes,
  issue.task_id,
  task.title as task_title,
  task.status as task_status,
  issue.workflow_instance_id,
  run.status as workflow_run_status,
  workflow.name as workflow_name,
  issue.workflow_exception_id,
  exception.severity as workflow_exception_severity,
  exception.status as workflow_exception_status,
  issue.inventory_item_id,
  issue.ai_suggestion_id,
  suggestion.status as ai_suggestion_status,
  issue.source,
  issue.source_context,
  issue.created_at,
  issue.updated_at,
  issue.last_status_change_at,
  public.issue_priority_rank(issue.severity) as priority_rank,
  case
    when coalesce(issue.status, 'open') in ('resolved', 'cancelled') then 'resolved'
    when issue.due_at is null then 'unscheduled'
    when issue.due_at < now() then 'overdue'
    when issue.due_at <= now() + interval '4 hours' then 'due_soon'
    else 'on_track'
  end as sla_status,
  greatest(0, floor(extract(epoch from (now() - coalesce(issue.created_at, now()))) / 60))::integer as open_for_minutes
from public.ops_issues issue
left join public.profiles owner
  on owner.id = issue.owner_id
  and owner.company_id = issue.company_id
left join public.tasks task
  on task.id = issue.task_id
  and task.company_id = issue.company_id
left join public.task_workflow_instances run
  on run.id = issue.workflow_instance_id
  and run.company_id = issue.company_id
left join public.workflows workflow
  on workflow.id::text = run.workflow_id
  and workflow.company_id = run.company_id
left join public.workflow_exceptions exception
  on exception.id = issue.workflow_exception_id
  and exception.company_id = issue.company_id
left join public.ops_automation_suggestions suggestion
  on suggestion.id = issue.ai_suggestion_id
  and suggestion.company_id = issue.company_id
where issue.company_id in (select public.current_user_company_ids());

grant select on public.operations_incident_issue_queue_v to authenticated;

create or replace view public.operations_issue_reporting_v
with (security_invoker = true)
as
select
  company_id,
  coalesce(issue_type, 'general') as issue_type,
  coalesce(severity, 'warning') as severity,
  count(*)::integer as total_issues,
  count(*) filter (where coalesce(status, 'open') not in ('resolved', 'cancelled'))::integer as open_issues,
  count(*) filter (where coalesce(status, 'open') in ('resolved', 'cancelled'))::integer as closed_issues,
  count(*) filter (
    where coalesce(status, 'open') not in ('resolved', 'cancelled')
      and due_at < now()
  )::integer as overdue_issues,
  avg(extract(epoch from (resolved_at - created_at)) / 3600) filter (
    where resolved_at is not null and created_at is not null
  )::numeric(12,2) as avg_resolution_hours
from public.ops_issues
where company_id in (select public.current_user_company_ids())
group by company_id, coalesce(issue_type, 'general'), coalesce(severity, 'warning');

grant select on public.operations_issue_reporting_v to authenticated;

create or replace function public.current_user_can_manage_ops_issue(
  p_company_id uuid,
  p_issue_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_company_id in (select public.current_user_company_ids())
    and exists (
      select 1
      from public.ops_issues issue
      where issue.id = p_issue_id
        and issue.company_id = p_company_id
    );
$$;

revoke all on function public.current_user_can_manage_ops_issue(uuid, uuid) from public;
grant execute on function public.current_user_can_manage_ops_issue(uuid, uuid) to authenticated, service_role;

create or replace function public.create_operational_issue(
  p_company_id uuid,
  p_title text,
  p_description text default null,
  p_issue_type text default 'general',
  p_severity text default 'warning',
  p_owner_id uuid default null,
  p_due_at timestamptz default null,
  p_workflow_instance_id uuid default null,
  p_workflow_exception_id uuid default null,
  p_inventory_item_id text default null,
  p_create_task boolean default true,
  p_source_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  normalized_severity text := coalesce(nullif(trim(p_severity), ''), 'warning');
  new_issue_id uuid;
  new_task_id uuid;
begin
  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to create issues for this company'
      using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_title, '')), '') is null then
    raise exception 'Issue title is required'
      using errcode = '22023';
  end if;

  if normalized_severity not in ('info', 'warning', 'critical') then
    raise exception 'Issue severity must be info, warning, or critical'
      using errcode = '22023';
  end if;

  if p_owner_id is not null and not exists (
    select 1
    from public.company_members member
    where member.company_id = p_company_id
      and member.user_id = p_owner_id
  ) then
    raise exception 'Issue owner must belong to the company'
      using errcode = '42501';
  end if;

  if p_create_task then
    insert into public.tasks (
      company_id,
      title,
      description,
      assigned_to,
      due_date,
      priority,
      source,
      status,
      created_by,
      workflow_id,
      links,
      tags
    )
    values (
      p_company_id,
      p_title,
      p_description,
      p_owner_id,
      p_due_at::date,
      case normalized_severity when 'critical' then 'high' when 'warning' then 'medium' else 'low' end,
      'ops_issue',
      'open',
      auth.uid(),
      p_workflow_instance_id::text,
      jsonb_build_object(
        'workflow_instance_id', p_workflow_instance_id,
        'workflow_exception_id', p_workflow_exception_id,
        'inventory_item_id', p_inventory_item_id
      ),
      jsonb_build_array('ops_issue', coalesce(p_issue_type, 'general'))
    )
    returning id into new_task_id;
  end if;

  insert into public.ops_issues (
    company_id,
    org_id,
    issue_type,
    title,
    description,
    severity,
    status,
    source,
    source_context,
    owner_id,
    due_at,
    task_id,
    workflow_instance_id,
    workflow_exception_id,
    inventory_item_id,
    priority_rank,
    last_status_change_at
  )
  values (
    p_company_id,
    p_company_id::text,
    coalesce(nullif(trim(p_issue_type), ''), 'general'),
    nullif(trim(p_title), ''),
    nullif(trim(coalesce(p_description, '')), ''),
    normalized_severity,
    'open',
    coalesce(p_source_context, '{}'::jsonb),
    coalesce(p_source_context, '{}'::jsonb),
    p_owner_id,
    p_due_at,
    new_task_id,
    p_workflow_instance_id,
    p_workflow_exception_id,
    p_inventory_item_id,
    public.issue_priority_rank(normalized_severity),
    now()
  )
  returning id into new_issue_id;

  if p_workflow_exception_id is not null then
    update public.workflow_exceptions
    set
      linked_ops_issue_id = new_issue_id,
      linked_task_id = coalesce(new_task_id, linked_task_id)
    where id = p_workflow_exception_id
      and company_id = p_company_id;
  end if;

  insert into public.audit_log (
    company_id,
    actor_id,
    action,
    table_name,
    record_id,
    new_values,
    metadata
  )
  values (
    p_company_id,
    auth.uid(),
    'ops.issue.created',
    'ops_issues',
    new_issue_id::text,
    jsonb_build_object(
      'title', p_title,
      'severity', normalized_severity,
      'task_id', new_task_id,
      'workflow_instance_id', p_workflow_instance_id,
      'workflow_exception_id', p_workflow_exception_id
    ),
    jsonb_build_object('source', 'incident_issue_tracking')
  );

  return jsonb_build_object(
    'issue_id', new_issue_id,
    'task_id', new_task_id,
    'status', 'open'
  );
end;
$$;

grant execute on function public.create_operational_issue(uuid, text, text, text, text, uuid, timestamptz, uuid, uuid, text, boolean, jsonb) to authenticated;

create or replace function public.update_operational_issue_status(
  p_company_id uuid,
  p_issue_id uuid,
  p_status text,
  p_owner_id uuid default null,
  p_due_at timestamptz default null,
  p_resolution_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  normalized_status text := coalesce(nullif(trim(p_status), ''), 'open');
  previous_issue record;
begin
  select *
  into previous_issue
  from public.ops_issues
  where id = p_issue_id
    and company_id = p_company_id;

  if not found or not public.current_user_can_manage_ops_issue(p_company_id, p_issue_id) then
    raise exception 'Not allowed to update this issue'
      using errcode = '42501';
  end if;

  if normalized_status not in ('open', 'acknowledged', 'in_progress', 'blocked', 'resolved', 'cancelled') then
    raise exception 'Unknown issue status'
      using errcode = '22023';
  end if;

  if p_owner_id is not null and not exists (
    select 1
    from public.company_members member
    where member.company_id = p_company_id
      and member.user_id = p_owner_id
  ) then
    raise exception 'Issue owner must belong to the company'
      using errcode = '42501';
  end if;

  update public.ops_issues
  set
    status = normalized_status,
    owner_id = coalesce(p_owner_id, owner_id),
    due_at = coalesce(p_due_at, due_at),
    resolution_notes = case
      when normalized_status in ('resolved', 'cancelled') then nullif(trim(coalesce(p_resolution_notes, '')), '')
      else resolution_notes
    end,
    resolved_at = case
      when normalized_status in ('resolved', 'cancelled') then coalesce(resolved_at, now())
      else null
    end,
    resolved_by = case
      when normalized_status in ('resolved', 'cancelled') then auth.uid()
      else null
    end,
    last_status_change_at = case
      when coalesce(status, 'open') <> normalized_status then now()
      else last_status_change_at
    end
  where id = p_issue_id
    and company_id = p_company_id;

  update public.tasks
  set
    status = case
      when normalized_status in ('resolved', 'cancelled') then 'completed'
      when normalized_status = 'blocked' then 'blocked'
      when normalized_status = 'in_progress' then 'in_progress'
      else status
    end,
    completed_at = case
      when normalized_status in ('resolved', 'cancelled') then coalesce(completed_at, now())
      else completed_at
    end
  where id = previous_issue.task_id
    and company_id = p_company_id;

  insert into public.audit_log (
    company_id,
    actor_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    metadata
  )
  values (
    p_company_id,
    auth.uid(),
    'ops.issue.status.updated',
    'ops_issues',
    p_issue_id::text,
    jsonb_build_object('status', previous_issue.status, 'owner_id', previous_issue.owner_id, 'due_at', previous_issue.due_at),
    jsonb_build_object('status', normalized_status, 'owner_id', coalesce(p_owner_id, previous_issue.owner_id), 'due_at', coalesce(p_due_at, previous_issue.due_at)),
    jsonb_build_object('source', 'incident_issue_tracking')
  );

  return jsonb_build_object(
    'issue_id', p_issue_id,
    'status', normalized_status,
    'task_id', previous_issue.task_id
  );
end;
$$;

grant execute on function public.update_operational_issue_status(uuid, uuid, text, uuid, timestamptz, text) to authenticated;
