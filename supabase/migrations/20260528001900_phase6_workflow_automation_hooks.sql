-- Phase 06.08: workflow automation hooks.
-- Workflow failures now create idempotent operational follow-through:
-- failed-step tasks, inventory review issues, overdue critical notifications,
-- and an auditable automation run ledger.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.workflow_automation_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  automation_key text not null,
  hook_type text not null,
  status text not null default 'completed',
  workflow_id uuid,
  workflow_instance_id uuid,
  step_instance_id uuid,
  workflow_exception_id uuid,
  task_id uuid,
  ops_issue_id uuid,
  inventory_adjustment_id uuid,
  notification_id uuid,
  actor_id uuid,
  action_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, automation_key)
);

do $$
begin
  alter table public.workflow_automation_runs
    add constraint workflow_automation_runs_hook_type_known
    check (
      hook_type in (
        'failed_step_task',
        'inventory_review_issue',
        'overdue_critical_notification'
      )
    ) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.workflow_automation_runs
    add constraint workflow_automation_runs_status_known
    check (status in ('completed', 'skipped', 'failed')) not valid;
exception when duplicate_object then null;
end
$$;

create index if not exists workflow_automation_runs_company_created_idx
  on public.workflow_automation_runs (company_id, created_at desc);

create index if not exists workflow_automation_runs_exception_idx
  on public.workflow_automation_runs (company_id, workflow_exception_id);

drop trigger if exists set_workflow_automation_runs_updated_at on public.workflow_automation_runs;
create trigger set_workflow_automation_runs_updated_at
before update on public.workflow_automation_runs
for each row execute function public.set_updated_at();

alter table public.workflow_automation_runs enable row level security;

drop policy if exists "Company members can manage workflow automation runs" on public.workflow_automation_runs;
create policy "Company members can manage workflow automation runs"
on public.workflow_automation_runs
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

grant select, insert, update, delete on public.workflow_automation_runs to authenticated;

create or replace function public.workflow_is_inventory_or_waste(
  p_workflow_kind text,
  p_template_category text,
  p_source_type text
)
returns boolean
language sql
immutable
as $$
  select coalesce(p_workflow_kind, '') in ('inventory_count')
    or coalesce(p_template_category, '') in (
      'inventory',
      'inventory_count',
      'count',
      'counts',
      'waste',
      'waste_review'
    )
    or coalesce(p_source_type, '') in (
      'inventory_count',
      'inventory_waste',
      'waste',
      'count'
    );
$$;

grant execute on function public.workflow_is_inventory_or_waste(text, text, text) to authenticated, service_role;

create or replace function public.apply_workflow_exception_automation(
  p_workflow_exception_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  exception_record record;
  failed_step_automation_id uuid;
  inventory_automation_id uuid;
  new_task_id uuid;
  new_issue_id uuid;
  failed_task_created boolean := false;
  inventory_issue_created boolean := false;
  issue_inventory_item_id text;
begin
  select
    exception.id as exception_id,
    exception.company_id,
    exception.workflow_instance_id,
    exception.step_instance_id,
    exception.workflow_id,
    exception.step_id,
    exception.severity,
    exception.status,
    exception.title,
    exception.description,
    exception.owner_id,
    exception.due_at,
    exception.linked_task_id,
    exception.linked_ops_issue_id,
    exception.created_by,
    run.assigned_to,
    run.source_type,
    run.metadata as run_metadata,
    workflow.name as workflow_name,
    workflow.workflow_kind,
    workflow.template_category,
    workflow.created_by as workflow_created_by,
    step.name as step_name
  into exception_record
  from public.workflow_exceptions exception
  left join public.task_workflow_instances run
    on run.id = exception.workflow_instance_id
    and run.company_id = exception.company_id
  left join public.workflows workflow
    on workflow.id = exception.workflow_id
    and workflow.company_id = exception.company_id
  left join public.workflow_steps step
    on step.id = exception.step_id
    and step.company_id = exception.company_id
  where exception.id = p_workflow_exception_id;

  if not found then
    raise exception 'Workflow exception not found'
      using errcode = '22023';
  end if;

  if exception_record.linked_task_id is null then
    insert into public.workflow_automation_runs (
      company_id,
      automation_key,
      hook_type,
      workflow_id,
      workflow_instance_id,
      step_instance_id,
      workflow_exception_id,
      actor_id,
      action_payload
    )
    values (
      exception_record.company_id,
      'failed_step_task:' || exception_record.exception_id::text,
      'failed_step_task',
      exception_record.workflow_id,
      exception_record.workflow_instance_id,
      exception_record.step_instance_id,
      exception_record.exception_id,
      coalesce(auth.uid(), exception_record.created_by),
      jsonb_build_object(
        'severity', exception_record.severity,
        'workflow_name', exception_record.workflow_name,
        'step_name', exception_record.step_name
      )
    )
    on conflict (company_id, automation_key) do nothing
    returning id into failed_step_automation_id;

    if failed_step_automation_id is not null then
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
        exception_record.company_id,
        'Resolve: ' || coalesce(exception_record.title, 'workflow step failure'),
        coalesce(exception_record.description, 'A workflow step failed and needs follow-up.'),
        coalesce(
          exception_record.owner_id,
          exception_record.assigned_to,
          exception_record.workflow_created_by
        ),
        exception_record.due_at::date,
        case coalesce(exception_record.severity, 'warning')
          when 'critical' then 'high'
          when 'warning' then 'medium'
          else 'low'
        end,
        'workflow_automation',
        'open',
        coalesce(auth.uid(), exception_record.created_by),
        exception_record.workflow_instance_id::text,
        jsonb_build_object(
          'workflow_id', exception_record.workflow_id,
          'workflow_instance_id', exception_record.workflow_instance_id,
          'workflow_exception_id', exception_record.exception_id,
          'step_instance_id', exception_record.step_instance_id
        ),
        jsonb_build_array('workflow_automation', 'failed_step', coalesce(exception_record.severity, 'warning'))
      )
      returning id into new_task_id;

      update public.workflow_exceptions
      set linked_task_id = new_task_id
      where id = exception_record.exception_id
        and company_id = exception_record.company_id;

      update public.workflow_automation_runs
      set
        task_id = new_task_id,
        action_payload = action_payload || jsonb_build_object('task_id', new_task_id)
      where id = failed_step_automation_id;

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
        exception_record.company_id,
        coalesce(auth.uid(), exception_record.created_by),
        'workflow.automation.failed_step_task.created',
        'workflow_automation_runs',
        failed_step_automation_id::text,
        jsonb_build_object(
          'workflow_exception_id', exception_record.exception_id,
          'task_id', new_task_id
        ),
        jsonb_build_object('source', 'workflow_automation_hooks')
      );

      failed_task_created := true;
    end if;
  end if;

  if public.workflow_is_inventory_or_waste(
    exception_record.workflow_kind,
    exception_record.template_category,
    exception_record.source_type
  ) and exception_record.linked_ops_issue_id is null then
    insert into public.workflow_automation_runs (
      company_id,
      automation_key,
      hook_type,
      workflow_id,
      workflow_instance_id,
      step_instance_id,
      workflow_exception_id,
      actor_id,
      action_payload
    )
    values (
      exception_record.company_id,
      'inventory_review_issue:' || exception_record.exception_id::text,
      'inventory_review_issue',
      exception_record.workflow_id,
      exception_record.workflow_instance_id,
      exception_record.step_instance_id,
      exception_record.exception_id,
      coalesce(auth.uid(), exception_record.created_by),
      jsonb_build_object(
        'workflow_kind', exception_record.workflow_kind,
        'template_category', exception_record.template_category,
        'source_type', exception_record.source_type
      )
    )
    on conflict (company_id, automation_key) do nothing
    returning id into inventory_automation_id;

    if inventory_automation_id is not null then
      issue_inventory_item_id := coalesce(
        exception_record.run_metadata ->> 'inventory_item_id',
        exception_record.run_metadata ->> 'item_id'
      );

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
        workflow_instance_id,
        workflow_exception_id,
        inventory_item_id,
        priority_rank,
        last_status_change_at
      )
      values (
        exception_record.company_id,
        exception_record.company_id::text,
        'inventory_review',
        'Review inventory impact: ' || coalesce(exception_record.title, 'workflow exception'),
        coalesce(exception_record.description, 'Inventory workflow exception needs review before adjustment.'),
        coalesce(exception_record.severity, 'warning'),
        'open',
        jsonb_build_object('source', 'workflow_automation_hooks'),
        jsonb_build_object(
          'workflow_id', exception_record.workflow_id,
          'workflow_instance_id', exception_record.workflow_instance_id,
          'workflow_exception_id', exception_record.exception_id,
          'automation_run_id', inventory_automation_id
        ),
        coalesce(exception_record.owner_id, exception_record.assigned_to),
        exception_record.due_at,
        exception_record.workflow_instance_id,
        exception_record.exception_id,
        issue_inventory_item_id,
        public.issue_priority_rank(coalesce(exception_record.severity, 'warning')),
        now()
      )
      returning id into new_issue_id;

      update public.workflow_exceptions
      set linked_ops_issue_id = new_issue_id
      where id = exception_record.exception_id
        and company_id = exception_record.company_id;

      update public.workflow_automation_runs
      set
        ops_issue_id = new_issue_id,
        action_payload = action_payload || jsonb_build_object('ops_issue_id', new_issue_id)
      where id = inventory_automation_id;

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
        exception_record.company_id,
        coalesce(auth.uid(), exception_record.created_by),
        'workflow.automation.inventory_review.created',
        'workflow_automation_runs',
        inventory_automation_id::text,
        jsonb_build_object(
          'workflow_exception_id', exception_record.exception_id,
          'ops_issue_id', new_issue_id
        ),
        jsonb_build_object('source', 'workflow_automation_hooks')
      );

      inventory_issue_created := true;
    end if;
  end if;

  return jsonb_build_object(
    'workflow_exception_id', p_workflow_exception_id,
    'failed_step_task_created', failed_task_created,
    'inventory_review_issue_created', inventory_issue_created,
    'task_id', new_task_id,
    'ops_issue_id', new_issue_id
  );
end;
$$;

revoke all on function public.apply_workflow_exception_automation(uuid) from public;
grant execute on function public.apply_workflow_exception_automation(uuid) to service_role;

create or replace function public.run_workflow_exception_automation(
  p_company_id uuid,
  p_workflow_exception_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to run workflow automation for this company'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.workflow_exceptions exception
    where exception.id = p_workflow_exception_id
      and exception.company_id = p_company_id
  ) then
    raise exception 'Workflow exception not found for this company'
      using errcode = '22023';
  end if;

  return public.apply_workflow_exception_automation(p_workflow_exception_id);
end;
$$;

grant execute on function public.run_workflow_exception_automation(uuid, uuid) to authenticated;

create or replace function public.run_workflow_exception_automation_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.apply_workflow_exception_automation(new.id);
  return new;
exception when others then
  insert into public.workflow_automation_runs (
    company_id,
    automation_key,
    hook_type,
    status,
    workflow_id,
    workflow_instance_id,
    step_instance_id,
    workflow_exception_id,
    actor_id,
    action_payload,
    error_message
  )
  values (
    new.company_id,
    'failed_step_task:error:' || new.id::text,
    'failed_step_task',
    'failed',
    new.workflow_id,
    new.workflow_instance_id,
    new.step_instance_id,
    new.id,
    coalesce(auth.uid(), new.created_by),
    jsonb_build_object('trigger', 'workflow_exception_after_insert'),
    sqlerrm
  )
  on conflict (company_id, automation_key) do nothing;

  return new;
end;
$$;

drop trigger if exists run_workflow_exception_automation_after_insert on public.workflow_exceptions;
create trigger run_workflow_exception_automation_after_insert
after insert on public.workflow_exceptions
for each row execute function public.run_workflow_exception_automation_trigger();

create or replace function public.run_overdue_critical_workflow_notifications(
  p_company_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  run_record record;
  automation_id uuid;
  new_notification_id uuid;
  created_count integer := 0;
  skipped_count integer := 0;
begin
  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to run overdue workflow notifications for this company'
      using errcode = '42501';
  end if;

  for run_record in
    select
      run.id as workflow_instance_id,
      run.workflow_id::uuid as workflow_id,
      run.assigned_to,
      run.due_at,
      workflow.name as workflow_name,
      count(exception.id)::integer as critical_exception_count
    from public.task_workflow_instances run
    join public.workflows workflow
      on workflow.id::text = run.workflow_id
      and workflow.company_id = run.company_id
    join public.workflow_exceptions exception
      on exception.workflow_instance_id = run.id
      and exception.company_id = run.company_id
      and exception.status <> 'resolved'
      and exception.severity = 'critical'
    where run.company_id = p_company_id
      and run.due_at is not null
      and run.due_at < now()
      and coalesce(run.status, 'scheduled') not in ('completed', 'cancelled')
    group by run.id, run.workflow_id, run.assigned_to, run.due_at, workflow.name
  loop
    automation_id := null;
    new_notification_id := null;

    insert into public.workflow_automation_runs (
      company_id,
      automation_key,
      hook_type,
      workflow_id,
      workflow_instance_id,
      actor_id,
      action_payload
    )
    values (
      p_company_id,
      'overdue_critical:' || run_record.workflow_instance_id::text,
      'overdue_critical_notification',
      run_record.workflow_id,
      run_record.workflow_instance_id,
      auth.uid(),
      jsonb_build_object(
        'workflow_name', run_record.workflow_name,
        'due_at', run_record.due_at,
        'critical_exception_count', run_record.critical_exception_count
      )
    )
    on conflict (company_id, automation_key) do nothing
    returning id into automation_id;

    if automation_id is null then
      skipped_count := skipped_count + 1;
    else
      insert into public.task_notifications (
        company_id,
        user_id,
        task_id,
        title,
        message,
        type,
        metadata
      )
      values (
        p_company_id,
        run_record.assigned_to,
        null,
        'Critical workflow overdue',
        coalesce(run_record.workflow_name, 'Workflow run') || ' is overdue with critical exceptions.',
        'workflow_overdue_critical',
        jsonb_build_object(
          'workflow_id', run_record.workflow_id,
          'workflow_instance_id', run_record.workflow_instance_id,
          'automation_run_id', automation_id,
          'due_at', run_record.due_at
        )
      )
      returning id into new_notification_id;

      update public.workflow_automation_runs
      set
        notification_id = new_notification_id,
        action_payload = action_payload || jsonb_build_object('notification_id', new_notification_id)
      where id = automation_id;

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
        'workflow.automation.overdue_critical.notified',
        'workflow_automation_runs',
        automation_id::text,
        jsonb_build_object(
          'workflow_instance_id', run_record.workflow_instance_id,
          'notification_id', new_notification_id
        ),
        jsonb_build_object('source', 'workflow_automation_hooks')
      );

      created_count := created_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'created_count', created_count,
    'skipped_count', skipped_count
  );
end;
$$;

grant execute on function public.run_overdue_critical_workflow_notifications(uuid) to authenticated;

create or replace view public.operations_workflow_automation_hooks_v
with (security_invoker = true)
as
select
  automation.company_id,
  automation.id as automation_run_id,
  automation.automation_key,
  automation.hook_type,
  automation.status,
  automation.workflow_id,
  workflow.name as workflow_name,
  automation.workflow_instance_id,
  run.status as workflow_run_status,
  automation.step_instance_id,
  automation.workflow_exception_id,
  exception.title as exception_title,
  exception.severity as exception_severity,
  automation.task_id,
  task.title as task_title,
  automation.ops_issue_id,
  issue.title as issue_title,
  automation.notification_id,
  notification.title as notification_title,
  automation.action_payload,
  automation.error_message,
  automation.created_at
from public.workflow_automation_runs automation
left join public.workflows workflow
  on workflow.id = automation.workflow_id
  and workflow.company_id = automation.company_id
left join public.task_workflow_instances run
  on run.id = automation.workflow_instance_id
  and run.company_id = automation.company_id
left join public.workflow_exceptions exception
  on exception.id = automation.workflow_exception_id
  and exception.company_id = automation.company_id
left join public.tasks task
  on task.id = automation.task_id
  and task.company_id = automation.company_id
left join public.ops_issues issue
  on issue.id = automation.ops_issue_id
  and issue.company_id = automation.company_id
left join public.task_notifications notification
  on notification.id = automation.notification_id
  and notification.company_id = automation.company_id
where automation.company_id in (select public.current_user_company_ids());

grant select on public.operations_workflow_automation_hooks_v to authenticated;

notify pgrst, 'reload schema';
