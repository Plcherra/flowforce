-- Phase 06.07: compliance packs.
-- Compliance-oriented workflows become installable packs with retention,
-- dashboard rollups, and exportable audit snapshots from real runs/evidence.

create extension if not exists pgcrypto with schema extensions;

alter table public.workflows add column if not exists compliance_category text;
alter table public.workflows add column if not exists compliance_retention_days integer;
alter table public.workflow_evidence add column if not exists compliance_pack text;
alter table public.workflow_evidence add column if not exists retention_class text default 'operational_record';

create table if not exists public.workflow_compliance_packs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  pack_key text not null,
  name text not null,
  category text not null,
  description text,
  retention_days integer not null default 365,
  evidence_policy jsonb not null default '{}'::jsonb,
  template_config jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, pack_key)
);

create table if not exists public.workflow_compliance_audit_exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  pack_key text not null,
  period_start date not null,
  period_end date not null,
  export_status text not null default 'ready',
  snapshot jsonb not null default '{}'::jsonb,
  generated_by uuid,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workflow_compliance_packs_company_idx
on public.workflow_compliance_packs (company_id, status, pack_key);

create index if not exists workflow_compliance_audit_exports_company_idx
on public.workflow_compliance_audit_exports (company_id, pack_key, generated_at desc);

create index if not exists workflows_compliance_pack_idx
on public.workflows (company_id, compliance_pack, compliance_category);

create index if not exists workflow_evidence_compliance_idx
on public.workflow_evidence (company_id, compliance_pack, retention_until);

drop trigger if exists set_workflow_compliance_packs_updated_at on public.workflow_compliance_packs;
create trigger set_workflow_compliance_packs_updated_at
before update on public.workflow_compliance_packs
for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_compliance_audit_exports_updated_at on public.workflow_compliance_audit_exports;
create trigger set_workflow_compliance_audit_exports_updated_at
before update on public.workflow_compliance_audit_exports
for each row execute function public.set_updated_at();

alter table public.workflow_compliance_packs enable row level security;
alter table public.workflow_compliance_audit_exports enable row level security;

drop policy if exists "Company members can manage workflow compliance packs" on public.workflow_compliance_packs;
create policy "Company members can manage workflow compliance packs"
on public.workflow_compliance_packs
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage workflow compliance audit exports" on public.workflow_compliance_audit_exports;
create policy "Company members can manage workflow compliance audit exports"
on public.workflow_compliance_audit_exports
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

grant select, insert, update, delete on public.workflow_compliance_packs to authenticated;
grant select, insert, update, delete on public.workflow_compliance_audit_exports to authenticated;

create or replace function public.compliance_pack_definition(p_pack_key text)
returns jsonb
language sql
immutable
as $$
  select case p_pack_key
    when 'food_safety' then jsonb_build_object(
      'pack_key', 'food_safety',
      'name', 'Food Safety',
      'category', 'food_safety',
      'description', 'Temperature, storage, sanitation, and manager signoff routines.',
      'retention_days', 2555,
      'steps', jsonb_build_array('Record critical temperatures', 'Inspect storage and labeling', 'Capture manager signoff')
    )
    when 'labor_compliance' then jsonb_build_object(
      'pack_key', 'labor_compliance',
      'name', 'Labor Compliance',
      'category', 'labor',
      'description', 'Break, hours, minor labor, and schedule exception checks.',
      'retention_days', 1095,
      'steps', jsonb_build_array('Verify required breaks', 'Confirm weekly hour limits', 'Resolve schedule exceptions')
    )
    when 'training' then jsonb_build_object(
      'pack_key', 'training',
      'name', 'Training',
      'category', 'training',
      'description', 'Role training, competency observation, and acknowledgment evidence.',
      'retention_days', 1095,
      'steps', jsonb_build_array('Confirm training assignment', 'Observe role competency', 'Capture employee acknowledgment')
    )
    when 'cleaning' then jsonb_build_object(
      'pack_key', 'cleaning',
      'name', 'Cleaning',
      'category', 'cleaning',
      'description', 'Opening, closing, station, and chemical safety cleaning evidence.',
      'retention_days', 730,
      'steps', jsonb_build_array('Complete assigned cleaning zone', 'Attach photo or note evidence', 'Log chemical and safety checks')
    )
    when 'equipment' then jsonb_build_object(
      'pack_key', 'equipment',
      'name', 'Equipment',
      'category', 'equipment',
      'description', 'Equipment inspection, preventive maintenance, and repair escalation.',
      'retention_days', 1825,
      'steps', jsonb_build_array('Inspect equipment condition', 'Record maintenance reading', 'Escalate repair if needed')
    )
    else '{}'::jsonb
  end;
$$;

grant execute on function public.compliance_pack_definition(text) to authenticated, service_role;

create or replace function public.install_compliance_pack(
  p_company_id uuid,
  p_pack_key text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  definition jsonb;
  pack_id uuid;
  template_workflow_id uuid;
  step_label text;
  step_index integer := 0;
begin
  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to install compliance packs for this company'
      using errcode = '42501';
  end if;

  definition := public.compliance_pack_definition(p_pack_key);

  if definition = '{}'::jsonb then
    raise exception 'Unknown compliance pack'
      using errcode = '22023';
  end if;

  insert into public.workflow_compliance_packs (
    company_id,
    pack_key,
    name,
    category,
    description,
    retention_days,
    evidence_policy,
    template_config,
    created_by
  )
  values (
    p_company_id,
    definition ->> 'pack_key',
    definition ->> 'name',
    definition ->> 'category',
    definition ->> 'description',
    (definition ->> 'retention_days')::integer,
    jsonb_build_object(
      'retention_days', (definition ->> 'retention_days')::integer,
      'requires_evidence', true,
      'exportable', true
    ),
    definition,
    auth.uid()
  )
  on conflict (company_id, pack_key) do update
  set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    retention_days = excluded.retention_days,
    evidence_policy = excluded.evidence_policy,
    template_config = excluded.template_config,
    status = 'active'
  returning id into pack_id;

  select id
  into template_workflow_id
  from public.workflows
  where company_id = p_company_id
    and compliance_pack = p_pack_key
    and coalesce(is_template, false)
  order by created_at asc
  limit 1;

  if template_workflow_id is null then
    insert into public.workflows (
      company_id,
      name,
      description,
      workflow_kind,
      template_category,
      compliance_pack,
      compliance_category,
      compliance_retention_days,
      retention_policy,
      audit_config,
      review_required,
      is_template,
      status,
      created_by
    )
    values (
      p_company_id,
      (definition ->> 'name') || ' Compliance Checklist',
      definition ->> 'description',
      'inspection',
      definition ->> 'category',
      p_pack_key,
      definition ->> 'category',
      (definition ->> 'retention_days')::integer,
      jsonb_build_object('retention_days', (definition ->> 'retention_days')::integer),
      jsonb_build_object('audit_export', true, 'compliance_pack_id', pack_id),
      true,
      true,
      'active',
      auth.uid()
    )
    returning id into template_workflow_id;
  else
    update public.workflows
    set
      name = (definition ->> 'name') || ' Compliance Checklist',
      description = definition ->> 'description',
      workflow_kind = 'inspection',
      template_category = definition ->> 'category',
      compliance_category = definition ->> 'category',
      compliance_retention_days = (definition ->> 'retention_days')::integer,
      retention_policy = jsonb_build_object('retention_days', (definition ->> 'retention_days')::integer),
      audit_config = jsonb_build_object('audit_export', true, 'compliance_pack_id', pack_id),
      review_required = true,
      status = 'active'
    where id = template_workflow_id
      and company_id = p_company_id;

    delete from public.workflow_steps
    where company_id = p_company_id
      and workflow_id = template_workflow_id::text;
  end if;

  for step_label in
    select step_value
    from jsonb_array_elements_text(definition -> 'steps') as step(step_value)
  loop
    step_index := step_index + 1;

    insert into public.workflow_steps (
      company_id,
      workflow_id,
      name,
      description,
      step_number,
      step_type,
      required,
      evidence_required,
      evidence_schema,
      exception_policy,
      failure_escalation
    )
    values (
      p_company_id,
      template_workflow_id::text,
      step_label,
      'Compliance pack step for ' || (definition ->> 'name'),
      step_index,
      'compliance_evidence',
      true,
      true,
      jsonb_build_object('required', true, 'retention_days', (definition ->> 'retention_days')::integer),
      jsonb_build_object('severity', case when p_pack_key in ('food_safety', 'labor_compliance') then 'critical' else 'warning' end),
      jsonb_build_object('due_minutes', 60)
    );
  end loop;

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
    'workflow.compliance_pack.installed',
    'workflow_compliance_packs',
    pack_id::text,
    jsonb_build_object('pack_key', p_pack_key, 'workflow_id', template_workflow_id),
    jsonb_build_object('source', 'compliance_packs')
  );

  return jsonb_build_object(
    'pack_id', pack_id,
    'pack_key', p_pack_key,
    'workflow_id', template_workflow_id,
    'status', 'active'
  );
end;
$$;

grant execute on function public.install_compliance_pack(uuid, text) to authenticated;

create or replace function public.set_workflow_evidence_compliance_retention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workflow_pack text;
  workflow_retention_days integer;
begin
  select
    workflow.compliance_pack,
    coalesce(workflow.compliance_retention_days, pack.retention_days)
  into workflow_pack, workflow_retention_days
  from public.workflows workflow
  left join public.workflow_compliance_packs pack
    on pack.company_id = workflow.company_id
    and pack.pack_key = workflow.compliance_pack
  where workflow.id = new.workflow_id
    and workflow.company_id = new.company_id
  limit 1;

  if workflow_pack is not null then
    new.compliance_pack := coalesce(new.compliance_pack, workflow_pack);

    if new.retention_class is null or new.retention_class = 'operational_record' then
      new.retention_class := 'compliance_record';
    end if;

    if workflow_retention_days is not null
      and (
        new.retention_until is null
        or new.retention_until < current_date + workflow_retention_days
      )
    then
      new.retention_until := current_date + workflow_retention_days;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists set_workflow_evidence_compliance_retention on public.workflow_evidence;
create trigger set_workflow_evidence_compliance_retention
before insert or update on public.workflow_evidence
for each row execute function public.set_workflow_evidence_compliance_retention();

create or replace view public.operations_compliance_dashboard_v
with (security_invoker = true)
as
with run_stats as (
  select
    workflow.company_id,
    workflow.compliance_pack as pack_key,
    count(run.id)::integer as total_runs,
    count(run.id) filter (where run.status = 'completed')::integer as completed_runs,
    count(run.id) filter (where run.review_status = 'pending')::integer as pending_review_runs,
    count(run.id) filter (where run.status <> 'completed' and run.due_at < now())::integer as overdue_runs,
    max(run.completed_at) as last_completed_at
  from public.workflows workflow
  left join public.task_workflow_instances run
    on run.company_id = workflow.company_id
    and run.workflow_id = workflow.id::text
  where workflow.compliance_pack is not null
  group by workflow.company_id, workflow.compliance_pack
),
evidence_stats as (
  select
    evidence.company_id,
    coalesce(evidence.compliance_pack, workflow.compliance_pack) as pack_key,
    count(evidence.id)::integer as evidence_count,
    count(evidence.id) filter (
      where evidence.retention_until is not null
        and evidence.retention_until <= current_date + 30
    )::integer as expiring_evidence_count
  from public.workflow_evidence evidence
  left join public.workflows workflow
    on workflow.company_id = evidence.company_id
    and workflow.id = evidence.workflow_id
  group by evidence.company_id, coalesce(evidence.compliance_pack, workflow.compliance_pack)
),
exception_stats as (
  select
    exception.company_id,
    workflow.compliance_pack as pack_key,
    count(exception.id) filter (where exception.status <> 'resolved')::integer as open_exceptions
  from public.workflow_exceptions exception
  join public.workflows workflow
    on workflow.company_id = exception.company_id
    and workflow.id = exception.workflow_id
  where workflow.compliance_pack is not null
  group by exception.company_id, workflow.compliance_pack
)
select
  pack.company_id,
  pack.id as pack_id,
  pack.pack_key,
  pack.name as pack_name,
  pack.category,
  pack.description,
  pack.retention_days,
  pack.status,
  coalesce(run_stats.total_runs, 0) as total_runs,
  coalesce(run_stats.completed_runs, 0) as completed_runs,
  coalesce(run_stats.pending_review_runs, 0) as pending_review_runs,
  coalesce(run_stats.overdue_runs, 0) as overdue_runs,
  coalesce(evidence_stats.evidence_count, 0) as evidence_count,
  coalesce(evidence_stats.expiring_evidence_count, 0) as expiring_evidence_count,
  coalesce(exception_stats.open_exceptions, 0) as open_exceptions,
  run_stats.last_completed_at,
  greatest(
    0,
    100
      - coalesce(run_stats.overdue_runs, 0) * 10
      - coalesce(run_stats.pending_review_runs, 0) * 5
      - coalesce(exception_stats.open_exceptions, 0) * 15
      - coalesce(evidence_stats.expiring_evidence_count, 0) * 3
  )::integer as compliance_score
from public.workflow_compliance_packs pack
left join run_stats
  on run_stats.company_id = pack.company_id
  and run_stats.pack_key = pack.pack_key
left join evidence_stats
  on evidence_stats.company_id = pack.company_id
  and evidence_stats.pack_key = pack.pack_key
left join exception_stats
  on exception_stats.company_id = pack.company_id
  and exception_stats.pack_key = pack.pack_key
where pack.company_id in (select public.current_user_company_ids());

grant select on public.operations_compliance_dashboard_v to authenticated;

create or replace function public.create_compliance_audit_export(
  p_company_id uuid,
  p_pack_key text,
  p_period_start date,
  p_period_end date
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  export_id uuid;
  snapshot_payload jsonb;
begin
  if p_company_id not in (select public.current_user_company_ids()) then
    raise exception 'Not allowed to export compliance data for this company'
      using errcode = '42501';
  end if;

  if p_period_start is null or p_period_end is null or p_period_end < p_period_start then
    raise exception 'Invalid compliance export period'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.workflow_compliance_packs pack
    where pack.company_id = p_company_id
      and pack.pack_key = p_pack_key
      and pack.status = 'active'
  ) then
    raise exception 'Compliance pack is not installed'
      using errcode = '22023';
  end if;

  select jsonb_build_object(
    'dashboard', coalesce((
      select to_jsonb(dashboard)
      from public.operations_compliance_dashboard_v dashboard
      where dashboard.company_id = p_company_id
        and dashboard.pack_key = p_pack_key
      limit 1
    ), '{}'::jsonb),
    'runs', coalesce((
      select jsonb_agg(to_jsonb(run) order by run.due_at)
      from public.task_workflow_instances run
      join public.workflows workflow
        on workflow.company_id = run.company_id
        and workflow.id::text = run.workflow_id
      where run.company_id = p_company_id
        and workflow.compliance_pack = p_pack_key
        and coalesce(run.due_at::date, run.created_at::date) between p_period_start and p_period_end
    ), '[]'::jsonb),
    'evidence', coalesce((
      select jsonb_agg(to_jsonb(evidence) order by evidence.captured_at)
      from public.workflow_evidence evidence
      left join public.workflows workflow
        on workflow.company_id = evidence.company_id
        and workflow.id = evidence.workflow_id
      where evidence.company_id = p_company_id
        and coalesce(evidence.compliance_pack, workflow.compliance_pack) = p_pack_key
        and evidence.captured_at::date between p_period_start and p_period_end
    ), '[]'::jsonb),
    'exceptions', coalesce((
      select jsonb_agg(to_jsonb(exception) order by exception.created_at)
      from public.workflow_exceptions exception
      join public.workflows workflow
        on workflow.company_id = exception.company_id
        and workflow.id = exception.workflow_id
      where exception.company_id = p_company_id
        and workflow.compliance_pack = p_pack_key
        and exception.created_at::date between p_period_start and p_period_end
    ), '[]'::jsonb)
  )
  into snapshot_payload;

  insert into public.workflow_compliance_audit_exports (
    company_id,
    pack_key,
    period_start,
    period_end,
    snapshot,
    generated_by
  )
  values (
    p_company_id,
    p_pack_key,
    p_period_start,
    p_period_end,
    snapshot_payload,
    auth.uid()
  )
  returning id into export_id;

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
    'workflow.compliance_audit_export.created',
    'workflow_compliance_audit_exports',
    export_id::text,
    jsonb_build_object('pack_key', p_pack_key, 'period_start', p_period_start, 'period_end', p_period_end),
    jsonb_build_object('source', 'compliance_packs')
  );

  return jsonb_build_object(
    'export_id', export_id,
    'pack_key', p_pack_key,
    'status', 'ready'
  );
end;
$$;

grant execute on function public.create_compliance_audit_export(uuid, text, date, date) to authenticated;
