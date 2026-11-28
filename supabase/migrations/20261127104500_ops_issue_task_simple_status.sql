-- Linked tasks follow the simple task workflow; issue status may still use in_progress/blocked.
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

notify pgrst, 'reload schema';