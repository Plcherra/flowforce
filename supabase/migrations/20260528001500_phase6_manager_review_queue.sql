-- Phase 06.05: manager review queue, decisions, exception priority, and audit.

create extension if not exists pgcrypto with schema extensions;

create index if not exists task_workflow_instances_review_status_idx
on public.task_workflow_instances (company_id, review_status, due_at);

create index if not exists workflow_reviews_reviewed_at_idx
on public.workflow_reviews (company_id, workflow_instance_id, reviewed_at desc);

create or replace function public.current_user_can_review_workflows(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.company_members member
    where member.user_id = auth.uid()
      and member.company_id = target_company_id
      and member.role in (
        'owner',
        'administrator',
        'admin',
        'company_admin',
        'manager',
        'supervisor'
      )
  );
$$;

revoke all on function public.current_user_can_review_workflows(uuid) from public;
grant execute on function public.current_user_can_review_workflows(uuid) to authenticated, service_role;

create or replace view public.operations_manager_review_queue_v
with (security_invoker = true)
as
with latest_review as (
  select distinct on (review.company_id, review.workflow_instance_id)
    review.company_id,
    review.workflow_instance_id,
    review.review_status as latest_review_status,
    review.reviewer_id,
    review.comments,
    review.reviewed_at
  from public.workflow_reviews review
  order by review.company_id, review.workflow_instance_id, review.reviewed_at desc nulls last, review.created_at desc
),
exception_summary as (
  select
    exception.company_id,
    exception.workflow_instance_id,
    count(*) filter (where exception.status <> 'resolved')::integer as open_exception_count,
    count(*) filter (
      where exception.status <> 'resolved'
        and exception.severity in ('critical', 'high')
    )::integer as severe_exception_count,
    min(exception.due_at) filter (where exception.status <> 'resolved') as next_exception_due_at
  from public.workflow_exceptions exception
  where exception.workflow_instance_id is not null
  group by exception.company_id, exception.workflow_instance_id
)
select
  run.company_id,
  run.id as workflow_instance_id,
  run.workflow_id,
  workflow.name as workflow_name,
  workflow.template_category,
  run.status as run_status,
  run.review_status,
  run.assigned_to,
  run.assigned_role,
  run.location_id,
  run.scheduled_for,
  run.started_at,
  run.completed_at,
  run.due_at,
  run.escalation_at,
  coalesce(exception_summary.open_exception_count, 0)::integer as open_exception_count,
  coalesce(exception_summary.severe_exception_count, 0)::integer as severe_exception_count,
  exception_summary.next_exception_due_at,
  latest_review.reviewer_id,
  latest_review.comments as latest_review_comments,
  latest_review.reviewed_at as latest_reviewed_at,
  case
    when coalesce(exception_summary.severe_exception_count, 0) > 0 then 'critical'
    when coalesce(exception_summary.open_exception_count, 0) > 0 then 'exception'
    when run.due_at < now() and run.review_status in ('pending', 'needs_changes') then 'overdue'
    when run.review_status = 'rejected' then 'rejected'
    when run.review_status = 'needs_changes' then 'needs_changes'
    else 'pending'
  end as review_priority
from public.task_workflow_instances run
left join public.workflows workflow
  on workflow.id::text = run.workflow_id
  and workflow.company_id = run.company_id
left join latest_review
  on latest_review.company_id = run.company_id
  and latest_review.workflow_instance_id = run.id
left join exception_summary
  on exception_summary.company_id = run.company_id
  and exception_summary.workflow_instance_id = run.id
where run.review_status in ('pending', 'rejected', 'needs_changes')
  and run.company_id in (select public.current_user_company_ids());

grant select on public.operations_manager_review_queue_v to authenticated;

create or replace function public.review_workflow_run(
  p_company_id uuid,
  p_workflow_instance_id uuid,
  p_review_status text,
  p_comments text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  run_record public.task_workflow_instances%rowtype;
  review_id uuid;
  open_exceptions integer := 0;
begin
  if p_company_id is null then
    raise exception 'Company scope is required for workflow review'
      using errcode = '22023';
  end if;

  if p_review_status not in ('approved', 'rejected', 'needs_changes') then
    raise exception 'Workflow review status must be approved, rejected, or needs_changes'
      using errcode = '22023';
  end if;

  if not public.current_user_can_review_workflows(p_company_id) then
    raise exception 'Not allowed to review workflow runs for this company'
      using errcode = '42501';
  end if;

  select *
  into run_record
  from public.task_workflow_instances run
  where run.id = p_workflow_instance_id
    and run.company_id = p_company_id
  for update;

  if not found then
    raise exception 'Workflow run was not found for this company'
      using errcode = '22023';
  end if;

  select count(*)::integer
  into open_exceptions
  from public.workflow_exceptions exception
  where exception.company_id = p_company_id
    and exception.workflow_instance_id = p_workflow_instance_id
    and exception.status <> 'resolved';

  update public.task_workflow_instances
  set
    review_status = p_review_status,
    exception_count = open_exceptions,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'last_reviewed_at', now(),
      'last_reviewed_by', auth.uid(),
      'last_review_status', p_review_status
    )
  where id = p_workflow_instance_id
    and company_id = p_company_id;

  insert into public.workflow_reviews (
    company_id,
    workflow_instance_id,
    review_status,
    reviewer_id,
    decision,
    comments,
    reviewed_at
  )
  values (
    p_company_id,
    p_workflow_instance_id,
    p_review_status,
    auth.uid(),
    p_review_status,
    nullif(trim(coalesce(p_comments, '')), ''),
    now()
  )
  returning id into review_id;

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
    'workflow.review.' || p_review_status,
    'task_workflow_instances',
    p_workflow_instance_id::text,
    jsonb_build_object(
      'review_status', run_record.review_status,
      'exception_count', run_record.exception_count
    ),
    jsonb_build_object(
      'review_status', p_review_status,
      'exception_count', open_exceptions,
      'review_id', review_id
    ),
    jsonb_build_object(
      'comments_present', nullif(trim(coalesce(p_comments, '')), '') is not null
    )
  );

  return jsonb_build_object(
    'workflow_instance_id', p_workflow_instance_id,
    'review_id', review_id,
    'review_status', p_review_status,
    'open_exception_count', open_exceptions
  );
end;
$$;

grant execute on function public.review_workflow_run(uuid, uuid, text, text) to authenticated;
