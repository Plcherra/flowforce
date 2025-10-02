-- Scheduling rulebook & workflow guardrail schema

create extension if not exists "uuid-ossp";

create table if not exists public.schedule_rulebooks (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  description text,
  version text not null default '1.0.0',
  owner_role text not null,
  is_active boolean not null default true,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_rulebook_steps (
  id uuid primary key default uuid_generate_v4(),
  rulebook_id uuid not null references public.schedule_rulebooks(id) on delete cascade,
  slug text not null,
  title text not null,
  purpose text,
  mode text not null check (mode in ('manual', 'assisted', 'automated')),
  display_order integer not null default 0,
  allowed_roles text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(rulebook_id, slug)
);

create table if not exists public.schedule_rulebook_step_criteria (
  id uuid primary key default uuid_generate_v4(),
  step_id uuid not null references public.schedule_rulebook_steps(id) on delete cascade,
  slug text not null,
  label text not null,
  description text,
  evidence_type text not null check (evidence_type in ('checkbox','numeric','document','approval','external')),
  target_value numeric,
  approver_role text,
  data_source text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(step_id, slug)
);

create table if not exists public.schedule_rulebook_step_blockers (
  id uuid primary key default uuid_generate_v4(),
  step_id uuid not null references public.schedule_rulebook_steps(id) on delete cascade,
  message text not null,
  actions text[] not null,
  severity text not null default 'blocking' check (severity in ('blocking','warning')),
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_rulebook_step_followups (
  id uuid primary key default uuid_generate_v4(),
  step_id uuid not null references public.schedule_rulebook_steps(id) on delete cascade,
  description text not null,
  automation_key text,
  notify_roles text[] default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_rulebook_constraints (
  id uuid primary key default uuid_generate_v4(),
  rulebook_id uuid not null references public.schedule_rulebooks(id) on delete cascade,
  slug text not null,
  label text not null,
  description text not null,
  scope text not null check (scope in ('global','action')),
  actions text[] default '{}',
  validator_key text not null,
  severity text not null default 'warning' check (severity in ('warning','blocking')),
  created_at timestamptz not null default now(),
  unique(rulebook_id, slug)
);

create table if not exists public.schedule_workflows (
  id uuid primary key default uuid_generate_v4(),
  rulebook_id uuid not null references public.schedule_rulebooks(id) on delete restrict,
  label text not null,
  location_id uuid,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft','in_progress','ready_for_publish','published','archived')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(rulebook_id, period_start, period_end, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

create table if not exists public.schedule_workflow_steps (
  id uuid primary key default uuid_generate_v4(),
  workflow_id uuid not null references public.schedule_workflows(id) on delete cascade,
  rulebook_step_id uuid not null references public.schedule_rulebook_steps(id) on delete restrict,
  state text not null default 'not_started' check (state in ('not_started','in_progress','complete')),
  completed_at timestamptz,
  completed_by uuid,
  notes text,
  created_at timestamptz not null default now(),
  unique(workflow_id, rulebook_step_id)
);

create table if not exists public.schedule_workflow_criteria (
  id uuid primary key default uuid_generate_v4(),
  workflow_step_id uuid not null references public.schedule_workflow_steps(id) on delete cascade,
  rulebook_criterion_id uuid not null references public.schedule_rulebook_step_criteria(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','satisfied','rejected')),
  evidence_value jsonb,
  evidence_source text,
  approved_by uuid,
  approved_at timestamptz,
  approval_notes text,
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workflow_step_id, rulebook_criterion_id)
);

create table if not exists public.schedule_guardrail_audits (
  id uuid primary key default uuid_generate_v4(),
  workflow_id uuid references public.schedule_workflows(id) on delete set null,
  rulebook_id uuid not null references public.schedule_rulebooks(id) on delete restrict,
  rulebook_step_id uuid references public.schedule_rulebook_steps(id) on delete set null,
  action text not null,
  actor_id uuid,
  actor_role text,
  status text not null check (status in ('allowed','warning','blocked')),
  message text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_schedule_rulebook_steps_rulebook on public.schedule_rulebook_steps(rulebook_id);
create index if not exists idx_schedule_rulebook_criteria_step on public.schedule_rulebook_step_criteria(step_id);
create index if not exists idx_schedule_rulebook_constraints_rulebook on public.schedule_rulebook_constraints(rulebook_id);
create index if not exists idx_schedule_workflows_rulebook on public.schedule_workflows(rulebook_id);
create index if not exists idx_schedule_workflow_steps_workflow on public.schedule_workflow_steps(workflow_id);
create index if not exists idx_schedule_workflow_criteria_step on public.schedule_workflow_criteria(workflow_step_id);
create index if not exists idx_schedule_guardrail_audits_workflow on public.schedule_guardrail_audits(workflow_id);

-- Seed default restaurant scheduling rulebook (idempotent)
do $$
declare
  v_rulebook_id uuid;
  v_step_collect uuid;
  v_step_draft uuid;
  v_step_gm uuid;
  v_step_publish uuid;
begin
  select id into v_rulebook_id from public.schedule_rulebooks where slug = 'restaurant-weekly-schedule';
  if v_rulebook_id is null then
    insert into public.schedule_rulebooks (slug, name, description, version, owner_role)
    values (
      'restaurant-weekly-schedule',
      'Restaurant Weekly Scheduling Playbook',
      'Step-by-step guardrails for producing and publishing a compliant weekly schedule across all locations.',
      '1.0.0',
      'operations_manager'
    )
    returning id into v_rulebook_id;
  end if;

  -- Step: collect staffing signals
  select id into v_step_collect
  from public.schedule_rulebook_steps
  where rulebook_id = v_rulebook_id and slug = 'collect-staffing-signals';

  if v_step_collect is null then
    insert into public.schedule_rulebook_steps (
      rulebook_id, slug, title, purpose, mode, display_order, allowed_roles
    ) values (
      v_rulebook_id,
      'collect-staffing-signals',
      'Collect staffing signals',
      'Ensure upstream changes (time off, new hires, terminations, labor targets) are captured before planning shifts.',
      'assisted',
      1,
      array['operations_manager','schedule_admin']
    ) returning id into v_step_collect;

    insert into public.schedule_rulebook_step_criteria (
      step_id, slug, label, description, evidence_type, target_value, approver_role, data_source, display_order
    ) values
      (v_step_collect, 'pto-reviewed', 'Reviewed PTO requests for the coverage window', 'Every pending PTO request is approved/denied and tagged with coverage notes.', 'approval', null, 'people_ops', 'pto.requests.pending', 1),
      (v_step_collect, 'labor-budget-loaded', 'Loaded week-over-week labor budget', 'Labor target (hours + cost) for each location is entered for the upcoming week.', 'numeric', 1, null, 'finance.laborTargets', 2),
      (v_step_collect, 'roster-updated', 'Roster changes applied', 'New hires, role changes, and terminations are reflected in the employee roster.', 'checkbox', null, null, null, 3);

    insert into public.schedule_rulebook_step_blockers (step_id, message, actions, severity)
    values (v_step_collect, 'Cannot start drafting the schedule until staffing signals are captured.', array['start_schedule_draft'], 'blocking');
  end if;

  -- Step: build shift draft
  select id into v_step_draft
  from public.schedule_rulebook_steps
  where rulebook_id = v_rulebook_id and slug = 'build-shift-draft';

  if v_step_draft is null then
    insert into public.schedule_rulebook_steps (
      rulebook_id, slug, title, purpose, mode, display_order, allowed_roles
    ) values (
      v_rulebook_id,
      'build-shift-draft',
      'Build shift draft',
      'Generate draft shifts that satisfy coverage targets while respecting guardrails.',
      'assisted',
      2,
      array['operations_manager','schedule_admin']
    ) returning id into v_step_draft;

    insert into public.schedule_rulebook_step_criteria (
      step_id, slug, label, description, evidence_type, target_value, approver_role, data_source, display_order
    ) values
      (v_step_draft, 'coverage-targets-met', 'Coverage targets satisfied', 'Draft shifts cover each location/service period within ±5% of labor targets.', 'numeric', 0.95, null, 'scheduling.coverageScore', 1),
      (v_step_draft, 'skill-mix-validated', 'Skill mix validated', 'Each shift has required certifications/roles assigned.', 'checkbox', null, null, null, 2),
      (v_step_draft, 'compliance-check-passed', 'Compliance check passed', 'Labor compliance (breaks, minors, max hours) verified with zero blocking violations.', 'external', null, null, 'compliance.scheduleAudit', 3);

    insert into public.schedule_rulebook_step_blockers (step_id, message, actions, severity)
    values (v_step_draft, 'Publishing is disabled while the draft coverage score is below target.', array['publish_schedule'], 'blocking');

    insert into public.schedule_rulebook_step_followups (step_id, description, automation_key, notify_roles)
    values (v_step_draft, 'Notify General Manager that the draft is ready for review.', 'notifications.sendDraftReady', array['general_manager']);
  end if;

  -- Step: GM review and approval
  select id into v_step_gm
  from public.schedule_rulebook_steps
  where rulebook_id = v_rulebook_id and slug = 'gm-review-approval';

  if v_step_gm is null then
    insert into public.schedule_rulebook_steps (
      rulebook_id, slug, title, purpose, mode, display_order, allowed_roles
    ) values (
      v_rulebook_id,
      'gm-review-approval',
      'GM review and approval',
      'Secure general manager sign-off before publishing to the team.',
      'manual',
      3,
      array['general_manager']
    ) returning id into v_step_gm;

    insert into public.schedule_rulebook_step_criteria (
      step_id, slug, label, description, evidence_type, target_value, approver_role, data_source, display_order
    ) values
      (v_step_gm, 'gm-approval', 'General manager approval recorded', 'GM approves the schedule in the system and adds operational notes.', 'approval', null, 'general_manager', null, 1),
      (v_step_gm, 'swap-requests-addressed', 'Last-minute conflicts resolved', 'Conflicts identified during review are resolved or deferred with mitigation plan.', 'checkbox', null, null, null, 2);

    insert into public.schedule_rulebook_step_blockers (step_id, message, actions, severity)
    values (v_step_gm, 'Schedule cannot be published until the GM approval step is complete.', array['publish_schedule','notify_team'], 'blocking');
  end if;

  -- Step: publish and acknowledge
  select id into v_step_publish
  from public.schedule_rulebook_steps
  where rulebook_id = v_rulebook_id and slug = 'publish-and-acknowledge';

  if v_step_publish is null then
    insert into public.schedule_rulebook_steps (
      rulebook_id, slug, title, purpose, mode, display_order, allowed_roles
    ) values (
      v_rulebook_id,
      'publish-and-acknowledge',
      'Publish and capture acknowledgements',
      'Release the schedule to the team and ensure confirmations before the effective date.',
      'automated',
      4,
      array['operations_manager','schedule_admin']
    ) returning id into v_step_publish;

    insert into public.schedule_rulebook_step_criteria (
      step_id, slug, label, description, evidence_type, target_value, approver_role, data_source, display_order
    ) values
      (v_step_publish, 'schedule-published', 'Schedule published to employees', 'System fired publish action and notifications were sent.', 'external', null, null, 'scheduling.publishAudit', 1),
      (v_step_publish, 'ack-rate', 'Employee acknowledgement rate ≥ 95%', 'Employees confirmed they saw their assignments or manager documented contact attempts.', 'numeric', 0.95, null, 'scheduling.acknowledgements', 2);

    insert into public.schedule_rulebook_step_followups (step_id, description, automation_key, notify_roles)
    values (v_step_publish, 'Send handoff summary to shift leads and post schedule snapshot to the Ops channel.', 'notifications.sendLaunchSummary', array['shift_lead','general_manager']);
  end if;

  -- Constraints
  insert into public.schedule_rulebook_constraints (
    rulebook_id, slug, label, description, scope, actions, validator_key, severity
  ) values
    (v_rulebook_id, 'overtime-approval', 'Overtime requires approval', 'Any action that puts an employee into overtime must be approved by People Ops first.', 'action', array['assign_shift','approve_swap'], 'overtime.guard', 'blocking'),
    (v_rulebook_id, 'minor-hours-limit', 'Minor hour limits', 'Employees marked as minors cannot exceed 20 hours or work past 9 PM.', 'global', null, 'labor.minorLimits', 'warning')
  on conflict (rulebook_id, slug) do nothing;
end $$;
