-- Feature access for the tables PR #20 left open to every company member.
-- Depends on public.current_user_has_permission from
-- 20261103002339_permission_matrix_rls.sql.
-- Do not apply this file to production from the agent. It ships in the pull request.

-- Replace the permission lists from PR #20 so the new feature keys
-- match src/features/roles/constants/productRoleContract.json.
-- Owner still allows every key. List-issue keys stay grantable extras.
-- 20261103011618 renamed these to *_base and wrapped them so tasks.view,
-- tasks.update, and tasks.delete stay on the wrapper. Replace the base
-- lists only. Replacing the wrapper would drop per-task audiences.

create or replace function public.product_role_default_allows_base(
  level text,
  permission_key text
)
returns boolean
language sql
immutable
as $$
  select case
    when permission_key is null or btrim(permission_key) = '' then false
    when level = 'owner' then true
    when level = 'admin' then (
      jsonb_build_array(
        'viewOwnProfile', 'editOwnProfile', 'viewTeamProfiles', 'editTeamProfiles',
        'viewOwnSchedules', 'viewTeamSchedules', 'editSchedules', 'schedule.view',
        'schedule.edit', 'schedule.create', 'schedule.delete', 'schedule.grant',
        'schedule.reminders.assign', 'schedule.reminders.grant_deactivate', 'viewOwnTasks', 'viewTeamTasks',
        'editTasks', 'tasks.shift.create_self', 'tasks.shift.create_others', 'tasks.checklist.create_self',
        'tasks.checklist.create_others', 'tasks.custom.create_self', 'tasks.custom.create_others', 'viewOwnExpenses',
        'viewTeamExpenses', 'approveExpenses', 'approveTimeOff', 'manageUsers',
        'systemSettings', 'forms.submissions.read', 'createForms', 'manageForms',
        'approveFormSubmissions', 'managePositions', 'viewAIInsights', 'ai.insights.view',
        'ai.actions.suggest', 'ai.actions.approve', 'ai.actions.automate', 'ai.audit.view',
        'ai.governance.manage', 'manageInventory', 'managePayments', 'directory.view',
        'directory.manage', 'recognition.edit', 'onboarding.create', 'onboarding.delete',
        'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
        'inventory.adjust', 'inventory.import', 'inventory.export', 'inventory.purchasing.view',
        'inventory.purchasing.manage', 'inventory.counts.view', 'inventory.counts.create', 'inventory.counts.edit',
        'inventory.counts.approve', 'inventory.waste.view', 'inventory.waste.create', 'inventory.prep.view',
        'inventory.prep.edit', 'reports.view', 'reports.export', 'billing.view',
        'admin.roles', 'admin.permissions', 'admin.settings', 'forms.submit',
        'messages.send', 'messages.manage', 'goals.view', 'goals.manage',
        'updates.manage', 'documents.view', 'documents.manage', 'reviews.view_own',
        'reviews.manage', 'timeoff.request', 'workflow.evidence', 'workflow.review',
        'workflow.exceptions', 'workflow.assign'
      )
    ) ? permission_key
    when level = 'manager' then (
      jsonb_build_array(
        'viewOwnProfile', 'editOwnProfile', 'viewTeamProfiles', 'editTeamProfiles',
        'viewOwnSchedules', 'viewTeamSchedules', 'editSchedules', 'schedule.view',
        'schedule.edit', 'schedule.create', 'schedule.grant', 'schedule.reminders.assign',
        'schedule.reminders.grant_deactivate', 'viewOwnTasks', 'viewTeamTasks', 'editTasks',
        'tasks.shift.create_self', 'tasks.shift.create_others', 'tasks.checklist.create_self', 'tasks.checklist.create_others',
        'tasks.custom.create_self', 'tasks.custom.create_others', 'viewOwnExpenses', 'viewTeamExpenses',
        'approveExpenses', 'approveTimeOff', 'forms.submissions.read', 'createForms',
        'approveFormSubmissions', 'viewAIInsights', 'ai.insights.view', 'ai.actions.suggest',
        'ai.actions.approve', 'ai.audit.view', 'manageInventory', 'directory.view',
        'recognition.edit', 'onboarding.create', 'onboarding.delete', 'inventory.view',
        'inventory.create', 'inventory.edit', 'inventory.adjust', 'inventory.purchasing.view',
        'inventory.counts.view', 'inventory.counts.create', 'inventory.counts.edit', 'inventory.counts.approve',
        'inventory.waste.view', 'inventory.waste.create', 'inventory.prep.view', 'inventory.prep.edit',
        'reports.view', 'forms.submit', 'messages.send', 'messages.manage',
        'goals.view', 'goals.manage', 'updates.manage', 'documents.view',
        'documents.manage', 'reviews.view_own', 'reviews.manage', 'timeoff.request',
        'workflow.evidence', 'workflow.review', 'workflow.exceptions', 'workflow.assign'
      )
    ) ? permission_key
    when level = 'staff' then (
      jsonb_build_array(
        'viewOwnProfile', 'editOwnProfile', 'viewOwnSchedules', 'viewOwnTasks',
        'viewOwnExpenses', 'forms.submit', 'messages.send', 'goals.view',
        'documents.view', 'reviews.view_own', 'timeoff.request', 'workflow.evidence'
      )
    ) ? permission_key
    else false
  end;
$$;

create or replace function public.product_level_allowed_permissions_base(level text)
returns jsonb
language plpgsql
immutable
as $$
begin
  if level = 'owner' then
    return null;
  end if;

  if level = 'admin' then
    return jsonb_build_array(
        'viewOwnProfile', 'editOwnProfile', 'viewTeamProfiles', 'editTeamProfiles',
        'viewOwnSchedules', 'viewTeamSchedules', 'editSchedules', 'schedule.view',
        'schedule.edit', 'schedule.create', 'schedule.delete', 'schedule.grant',
        'schedule.reminders.assign', 'schedule.reminders.grant_deactivate', 'viewOwnTasks', 'viewTeamTasks',
        'editTasks', 'tasks.shift.create_self', 'tasks.shift.create_others', 'tasks.checklist.create_self',
        'tasks.checklist.create_others', 'tasks.custom.create_self', 'tasks.custom.create_others', 'viewOwnExpenses',
        'viewTeamExpenses', 'approveExpenses', 'approveTimeOff', 'manageUsers',
        'systemSettings', 'forms.submissions.read', 'createForms', 'manageForms',
        'approveFormSubmissions', 'managePositions', 'viewAIInsights', 'ai.insights.view',
        'ai.actions.suggest', 'ai.actions.approve', 'ai.actions.automate', 'ai.audit.view',
        'ai.governance.manage', 'manageInventory', 'managePayments', 'directory.view',
        'directory.manage', 'recognition.edit', 'onboarding.create', 'onboarding.delete',
        'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
        'inventory.adjust', 'inventory.import', 'inventory.export', 'inventory.purchasing.view',
        'inventory.purchasing.manage', 'inventory.counts.view', 'inventory.counts.create', 'inventory.counts.edit',
        'inventory.counts.approve', 'inventory.waste.view', 'inventory.waste.create', 'inventory.prep.view',
        'inventory.prep.edit', 'reports.view', 'reports.export', 'billing.view',
        'admin.roles', 'admin.permissions', 'admin.settings', 'forms.submit',
        'messages.send', 'messages.manage', 'goals.view', 'goals.manage',
        'updates.manage', 'documents.view', 'documents.manage', 'reviews.view_own',
        'reviews.manage', 'timeoff.request', 'workflow.evidence', 'workflow.review',
        'workflow.exceptions', 'workflow.assign', 'tasks.list_issues.read', 'tasks.list_issues.act'
    );
  end if;

  if level = 'manager' then
    return jsonb_build_array(
        'viewOwnProfile', 'editOwnProfile', 'viewTeamProfiles', 'editTeamProfiles',
        'viewOwnSchedules', 'viewTeamSchedules', 'editSchedules', 'schedule.view',
        'schedule.edit', 'schedule.create', 'schedule.grant', 'schedule.reminders.assign',
        'schedule.reminders.grant_deactivate', 'viewOwnTasks', 'viewTeamTasks', 'editTasks',
        'tasks.shift.create_self', 'tasks.shift.create_others', 'tasks.checklist.create_self', 'tasks.checklist.create_others',
        'tasks.custom.create_self', 'tasks.custom.create_others', 'viewOwnExpenses', 'viewTeamExpenses',
        'approveExpenses', 'approveTimeOff', 'forms.submissions.read', 'createForms',
        'approveFormSubmissions', 'viewAIInsights', 'ai.insights.view', 'ai.actions.suggest',
        'ai.actions.approve', 'ai.audit.view', 'manageInventory', 'directory.view',
        'recognition.edit', 'onboarding.create', 'onboarding.delete', 'inventory.view',
        'inventory.create', 'inventory.edit', 'inventory.adjust', 'inventory.purchasing.view',
        'inventory.counts.view', 'inventory.counts.create', 'inventory.counts.edit', 'inventory.counts.approve',
        'inventory.waste.view', 'inventory.waste.create', 'inventory.prep.view', 'inventory.prep.edit',
        'reports.view', 'forms.submit', 'messages.send', 'messages.manage',
        'goals.view', 'goals.manage', 'updates.manage', 'documents.view',
        'documents.manage', 'reviews.view_own', 'reviews.manage', 'timeoff.request',
        'workflow.evidence', 'workflow.review', 'workflow.exceptions', 'workflow.assign',
        'tasks.list_issues.read', 'tasks.list_issues.act'
    );
  end if;

  return jsonb_build_array(
        'viewOwnProfile', 'editOwnProfile', 'viewOwnSchedules', 'viewOwnTasks',
        'viewOwnExpenses', 'forms.submit', 'messages.send', 'goals.view',
        'documents.view', 'reviews.view_own', 'timeoff.request', 'workflow.evidence',
        'viewTeamProfiles', 'viewTeamSchedules', 'schedule.view', 'editSchedules',
        'schedule.edit', 'viewTeamTasks', 'directory.view', 'recognition.edit',
        'onboarding.create', 'onboarding.delete', 'tasks.shift.create_self', 'tasks.shift.create_others',
        'tasks.checklist.create_self', 'tasks.checklist.create_others', 'tasks.custom.create_self', 'tasks.custom.create_others',
        'tasks.list_issues.read', 'tasks.list_issues.act', 'forms.submissions.read'
  );
end;
$$;

alter table public.performance_reviews
  add column if not exists employee_id uuid,
  add column if not exists reviewerid uuid;

create index if not exists performance_reviews_employee_id_idx
  on public.performance_reviews (employee_id);

create or replace function public.current_user_is_channel_member(target_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select target_channel_id is not null
    and exists (
      select 1
      from public.channel_members member
      where member.channel_id = target_channel_id
        and member.user_id = auth.uid()
    );
$$;

revoke all on function public.current_user_is_channel_member(uuid) from public, anon, authenticated;
grant execute on function public.current_user_is_channel_member(uuid) to authenticated, service_role;

do $$
declare
  target_table text;
  pol record;
begin
  foreach target_table in array array[
    'forms', 'form_fields', 'form_submissions', 'form_access_rules', 'form_reviewer_rules',
    'form_field_locations', 'form_field_ratings', 'form_field_scans', 'form_field_signatures',
    'form_submission_files', 'form_submission_reviewers',
    'message_channels', 'channel_members', 'messages', 'message_reactions',
    'goals', 'goal_tasks', 'goal_milestones', 'goal_participants', 'goal_rewards',
    'company_updates', 'company_update_comments', 'company_update_reactions', 'company_update_engagement',
    'documents', 'performance_reviews',
    'time_off_requests', 'user_unavailability',
    'workflow_assignments', 'workflow_evidence', 'workflow_reviews', 'workflow_exceptions',
    'inv_adjustments', 'inv_count_events', 'inv_count_lines', 'inv_count_locations',
    'inv_count_scans', 'inv_counts', 'inv_items', 'inv_item_units', 'inv_locations',
    'inv_par_overrides', 'inv_par_profiles', 'inv_prep_batches', 'inv_prep_plans',
    'inv_production_approvals', 'inv_production_events', 'inv_production_materials',
    'inv_purchase_lines', 'inv_purchases', 'inv_recipes', 'inv_stock_lots',
    'inv_suppliers', 'inv_transfer_audit', 'inv_transfer_items', 'inv_transfers',
    'inv_units', 'inv_waste'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
    for pol in
      select policy.polname
      from pg_policy policy
      join pg_class cls on cls.oid = policy.polrelid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
      where nsp.nspname = 'public'
        and cls.relname = target_table
    loop
      execute format('drop policy %I on public.%I', pol.polname, target_table);
    end loop;
  end loop;
end
$$;

-- Forms. Published forms are visible to the company. Drafts are the author or a form editor.

create policy "Company members can read forms"
on public.forms
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    status is distinct from 'draft'
    or created_by = auth.uid()
    or public.current_user_has_any_permission(company_id, array['createForms', 'manageForms'])
  )
);

create policy "Form editors can insert forms"
on public.forms
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.current_user_has_any_permission(company_id, array['createForms', 'manageForms'])
);

create policy "Form editors can update forms"
on public.forms
for update
to authenticated
using (public.current_user_has_any_permission(company_id, array['createForms', 'manageForms']))
with check (public.current_user_has_any_permission(company_id, array['createForms', 'manageForms']));

create policy "Form managers can delete forms"
on public.forms
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'manageForms'));

create policy "Readers can read form fields"
on public.form_fields
for select
to authenticated
using (
  exists (
    select 1
    from public.forms form
    where form.id::text = form_fields.form_id::text
      and form.company_id = form_fields.company_id
  )
);

create policy "Form editors can insert form fields"
on public.form_fields
for insert
to authenticated
with check (
  public.current_user_has_any_permission(company_id, array['createForms', 'manageForms'])
  and exists (
    select 1
    from public.forms form
    where form.id::text = form_fields.form_id::text
      and form.company_id = form_fields.company_id
  )
);

create policy "Form editors can update form fields"
on public.form_fields
for update
to authenticated
using (public.current_user_has_any_permission(company_id, array['createForms', 'manageForms']))
with check (
  public.current_user_has_any_permission(company_id, array['createForms', 'manageForms'])
  and exists (
    select 1
    from public.forms form
    where form.id::text = form_fields.form_id::text
      and form.company_id = form_fields.company_id
  )
);

create policy "Form managers can delete form fields"
on public.form_fields
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'manageForms'));

create policy "Readers can read form rules"
on public.form_access_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.forms form
    where form.id::text = form_access_rules.form_id::text
  )
);

create policy "Form editors can insert form rules"
on public.form_access_rules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.forms form
    where form.id::text = form_access_rules.form_id::text
      and public.current_user_has_any_permission(form.company_id, array['createForms', 'manageForms'])
  )
);

create policy "Form editors can update form rules"
on public.form_access_rules
for update
to authenticated
using (
  exists (
    select 1
    from public.forms form
    where form.id::text = form_access_rules.form_id::text
      and public.current_user_has_any_permission(form.company_id, array['createForms', 'manageForms'])
  )
)
with check (
  exists (
    select 1
    from public.forms form
    where form.id::text = form_access_rules.form_id::text
      and public.current_user_has_any_permission(form.company_id, array['createForms', 'manageForms'])
  )
);

create policy "Form managers can delete form rules"
on public.form_access_rules
for delete
to authenticated
using (
  exists (
    select 1
    from public.forms form
    where form.id::text = form_access_rules.form_id::text
      and public.current_user_has_permission(form.company_id, 'manageForms')
  )
);

create policy "Readers can read form reviewer rules"
on public.form_reviewer_rules
for select
to authenticated
using (
  exists (
    select 1 from public.forms form
    where form.id::text = form_reviewer_rules.form_id::text
  )
);

create policy "Form editors can insert form reviewer rules"
on public.form_reviewer_rules
for insert
to authenticated
with check (
  exists (
    select 1 from public.forms form
    where form.id::text = form_reviewer_rules.form_id::text
      and public.current_user_has_any_permission(form.company_id, array['createForms', 'manageForms'])
  )
);

create policy "Form editors can update form reviewer rules"
on public.form_reviewer_rules
for update
to authenticated
using (
  exists (
    select 1 from public.forms form
    where form.id::text = form_reviewer_rules.form_id::text
      and public.current_user_has_any_permission(form.company_id, array['createForms', 'manageForms'])
  )
)
with check (
  exists (
    select 1 from public.forms form
    where form.id::text = form_reviewer_rules.form_id::text
      and public.current_user_has_any_permission(form.company_id, array['createForms', 'manageForms'])
  )
);

create policy "Form managers can delete form reviewer rules"
on public.form_reviewer_rules
for delete
to authenticated
using (
  exists (
    select 1 from public.forms form
    where form.id::text = form_reviewer_rules.form_id::text
      and public.current_user_has_permission(form.company_id, 'manageForms')
  )
);

create policy "Readers can read form submissions"
on public.form_submissions
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    submitted_by::text = auth.uid()::text
    or public.current_user_has_any_permission(
      company_id,
      array['forms.submissions.read', 'approveFormSubmissions', 'manageForms']
    )
  )
);

create policy "Submitters can insert own form submissions"
on public.form_submissions
for insert
to authenticated
with check (
  submitted_by::text = auth.uid()::text
  and public.current_user_has_permission(company_id, 'forms.submit')
  and exists (
    select 1
    from public.forms form
    where form.id::text = form_submissions.form_id::text
      and form.company_id = form_submissions.company_id
      and (
        form.status is distinct from 'draft'
        or public.current_user_has_any_permission(form.company_id, array['createForms', 'manageForms'])
      )
  )
);

create policy "Submitters can update form submissions"
on public.form_submissions
for update
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    (
      submitted_by::text = auth.uid()::text
      and public.current_user_has_permission(company_id, 'forms.submit')
    )
    or public.current_user_has_any_permission(
      company_id,
      array['approveFormSubmissions', 'manageForms']
    )
  )
)
with check (
  company_id in (select public.current_user_company_ids())
  and (
    (
      submitted_by::text = auth.uid()::text
      and public.current_user_has_permission(company_id, 'forms.submit')
    )
    or public.current_user_has_any_permission(
      company_id,
      array['approveFormSubmissions', 'manageForms']
    )
  )
);

create policy "Form managers can delete form submissions"
on public.form_submissions
for delete
to authenticated
using (
  public.current_user_has_permission(company_id, 'manageForms')
  or (
    submitted_by::text = auth.uid()::text
    and public.current_user_has_permission(company_id, 'forms.submit')
  )
);

-- Submission children follow the parent submission.

create policy "Readers can read form field locations"
on public.form_field_locations for select to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_locations.submission_id::text
  )
);
create policy "Submitters can insert form field locations"
on public.form_field_locations for insert to authenticated
with check (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_locations.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(
          submission.company_id,
          array['approveFormSubmissions', 'manageForms']
        )
      )
  )
);
create policy "Submitters can update form field locations"
on public.form_field_locations for update to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_locations.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(
          submission.company_id,
          array['approveFormSubmissions', 'manageForms']
        )
      )
  )
)
with check (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_locations.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(
          submission.company_id,
          array['approveFormSubmissions', 'manageForms']
        )
      )
  )
);
create policy "Form managers can delete form field locations"
on public.form_field_locations for delete to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_locations.submission_id::text
      and (
        public.current_user_has_permission(submission.company_id, 'manageForms')
        or (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
      )
  )
);

create policy "Readers can read form field ratings"
on public.form_field_ratings for select to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_ratings.submission_id::text
  )
);
create policy "Submitters can insert form field ratings"
on public.form_field_ratings for insert to authenticated
with check (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_ratings.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(submission.company_id, array['approveFormSubmissions', 'manageForms'])
      )
  )
);
create policy "Submitters can update form field ratings"
on public.form_field_ratings for update to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_ratings.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(submission.company_id, array['approveFormSubmissions', 'manageForms'])
      )
  )
)
with check (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_ratings.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(submission.company_id, array['approveFormSubmissions', 'manageForms'])
      )
  )
);
create policy "Form managers can delete form field ratings"
on public.form_field_ratings for delete to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_ratings.submission_id::text
      and (
        public.current_user_has_permission(submission.company_id, 'manageForms')
        or (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
      )
  )
);

create policy "Readers can read form field scans"
on public.form_field_scans for select to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_scans.submission_id::text
  )
);
create policy "Submitters can insert form field scans"
on public.form_field_scans for insert to authenticated
with check (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_scans.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(submission.company_id, array['approveFormSubmissions', 'manageForms'])
      )
  )
);
create policy "Submitters can update form field scans"
on public.form_field_scans for update to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_scans.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(submission.company_id, array['approveFormSubmissions', 'manageForms'])
      )
  )
)
with check (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_scans.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(submission.company_id, array['approveFormSubmissions', 'manageForms'])
      )
  )
);
create policy "Form managers can delete form field scans"
on public.form_field_scans for delete to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_scans.submission_id::text
      and (
        public.current_user_has_permission(submission.company_id, 'manageForms')
        or (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
      )
  )
);

create policy "Readers can read form field signatures"
on public.form_field_signatures for select to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_signatures.submission_id::text
  )
);
create policy "Submitters can insert form field signatures"
on public.form_field_signatures for insert to authenticated
with check (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_signatures.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(submission.company_id, array['approveFormSubmissions', 'manageForms'])
      )
  )
);
create policy "Submitters can update form field signatures"
on public.form_field_signatures for update to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_signatures.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(submission.company_id, array['approveFormSubmissions', 'manageForms'])
      )
  )
)
with check (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_signatures.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(submission.company_id, array['approveFormSubmissions', 'manageForms'])
      )
  )
);
create policy "Form managers can delete form field signatures"
on public.form_field_signatures for delete to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_field_signatures.submission_id::text
      and (
        public.current_user_has_permission(submission.company_id, 'manageForms')
        or (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
      )
  )
);

create policy "Readers can read form submission files"
on public.form_submission_files for select to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_submission_files.submission_id::text
  )
);
create policy "Submitters can insert form submission files"
on public.form_submission_files for insert to authenticated
with check (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_submission_files.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(submission.company_id, array['approveFormSubmissions', 'manageForms'])
      )
  )
);
create policy "Submitters can update form submission files"
on public.form_submission_files for update to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_submission_files.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(submission.company_id, array['approveFormSubmissions', 'manageForms'])
      )
  )
)
with check (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_submission_files.submission_id::text
      and (
        (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
        or public.current_user_has_any_permission(submission.company_id, array['approveFormSubmissions', 'manageForms'])
      )
  )
);
create policy "Form managers can delete form submission files"
on public.form_submission_files for delete to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_submission_files.submission_id::text
      and (
        public.current_user_has_permission(submission.company_id, 'manageForms')
        or (
          submission.submitted_by::text = auth.uid()::text
          and public.current_user_has_permission(submission.company_id, 'forms.submit')
        )
      )
  )
);

create policy "Readers can read form submission reviewers"
on public.form_submission_reviewers for select to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_submission_reviewers.submission_id::text
  )
);
create policy "Reviewers can insert form submission reviewers"
on public.form_submission_reviewers for insert to authenticated
with check (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_submission_reviewers.submission_id::text
      and public.current_user_has_any_permission(
        submission.company_id,
        array['approveFormSubmissions', 'manageForms']
      )
  )
);
create policy "Reviewers can update form submission reviewers"
on public.form_submission_reviewers for update to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_submission_reviewers.submission_id::text
      and public.current_user_has_any_permission(
        submission.company_id,
        array['approveFormSubmissions', 'manageForms']
      )
  )
)
with check (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_submission_reviewers.submission_id::text
      and public.current_user_has_any_permission(
        submission.company_id,
        array['approveFormSubmissions', 'manageForms']
      )
  )
);
create policy "Form managers can delete form submission reviewers"
on public.form_submission_reviewers for delete to authenticated
using (
  exists (
    select 1 from public.form_submissions submission
    where submission.id::text = form_submission_reviewers.submission_id::text
      and public.current_user_has_permission(submission.company_id, 'manageForms')
  )
);

-- Messages. Only participants can read the thread.

create policy "Participants can read message channels"
on public.message_channels
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    created_by = auth.uid()
    or public.current_user_is_channel_member(id::uuid)
  )
);

create policy "Senders can insert message channels"
on public.message_channels
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.current_user_has_permission(company_id, 'messages.send')
);

create policy "Channel owners can update message channels"
on public.message_channels
for update
to authenticated
using (
  created_by = auth.uid()
  or public.current_user_has_permission(company_id, 'messages.manage')
)
with check (
  public.current_user_has_permission(company_id, 'messages.send')
  or public.current_user_has_permission(company_id, 'messages.manage')
);

create policy "Channel owners can delete message channels"
on public.message_channels
for delete
to authenticated
using (
  created_by = auth.uid()
  or public.current_user_has_permission(company_id, 'messages.manage')
);

create policy "Participants can read channel members"
on public.channel_members
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    user_id = auth.uid()
    or public.current_user_is_channel_member(channel_id::uuid)
    or public.current_user_has_permission(company_id, 'messages.manage')
  )
);

create policy "Creators can insert channel members"
on public.channel_members
for insert
to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.profiles person
    where person.id = channel_members.user_id
      and person.company_id = channel_members.company_id
  )
  and (
    public.current_user_has_permission(company_id, 'messages.manage')
    or (
      public.current_user_has_permission(company_id, 'messages.send')
      and exists (
        select 1
        from public.message_channels channel
        where channel.id = channel_members.channel_id
          and channel.created_by = auth.uid()
          and channel.company_id = channel_members.company_id
      )
    )
  )
);

create policy "Managers can update channel members"
on public.channel_members
for update
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_has_permission(company_id, 'messages.manage')
)
with check (
  user_id = auth.uid()
  or public.current_user_has_permission(company_id, 'messages.manage')
);

create policy "Managers can delete channel members"
on public.channel_members
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_has_permission(company_id, 'messages.manage')
);

create policy "Participants can read messages"
on public.messages
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and public.current_user_is_channel_member(channel_id::uuid)
);

create policy "Participants can insert messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.current_user_has_permission(company_id, 'messages.send')
  and public.current_user_is_channel_member(channel_id::uuid)
);

create policy "Senders can update messages"
on public.messages
for update
to authenticated
using (
  sender_id = auth.uid()
  or public.current_user_has_permission(company_id, 'messages.manage')
)
with check (
  (
    sender_id = auth.uid()
    and public.current_user_has_permission(company_id, 'messages.send')
  )
  or public.current_user_has_permission(company_id, 'messages.manage')
);

create policy "Senders can delete messages"
on public.messages
for delete
to authenticated
using (
  sender_id = auth.uid()
  or public.current_user_has_permission(company_id, 'messages.manage')
);

create policy "Participants can read message reactions"
on public.message_reactions
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.messages message
    where message.id::text = message_reactions.message_id::text
      and public.current_user_is_channel_member(message.channel_id::uuid)
  )
);

create policy "Participants can insert message reactions"
on public.message_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.current_user_has_permission(company_id, 'messages.send')
  and exists (
    select 1
    from public.messages message
    where message.id::text = message_reactions.message_id::text
      and message.company_id = message_reactions.company_id
      and public.current_user_is_channel_member(message.channel_id::uuid)
  )
);

create policy "Participants can delete message reactions"
on public.message_reactions
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_has_permission(company_id, 'messages.manage')
);

-- Goals.

create policy "Viewers can read goals"
on public.goals
for select
to authenticated
using (
  public.current_user_has_any_permission(company_id, array['goals.view', 'goals.manage'])
);

create policy "Managers can insert goals"
on public.goals
for insert
to authenticated
with check (public.current_user_has_permission(company_id, 'goals.manage'));

create policy "Managers can update goals"
on public.goals
for update
to authenticated
using (
  public.current_user_has_permission(company_id, 'goals.manage')
  or (
    created_by = auth.uid()
    and public.current_user_has_permission(company_id, 'goals.view')
  )
)
with check (
  public.current_user_has_permission(company_id, 'goals.manage')
  or (
    created_by = auth.uid()
    and public.current_user_has_permission(company_id, 'goals.view')
  )
);

create policy "Managers can delete goals"
on public.goals
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'goals.manage'));

create policy "Viewers can read goal tasks"
on public.goal_tasks for select to authenticated
using (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_tasks.goal_id::text
  )
);
create policy "Managers can insert goal tasks"
on public.goal_tasks for insert to authenticated
with check (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_tasks.goal_id::text
      and public.current_user_has_permission(goal.company_id, 'goals.manage')
  )
);
create policy "Managers can update goal tasks"
on public.goal_tasks for update to authenticated
using (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_tasks.goal_id::text
      and public.current_user_has_permission(goal.company_id, 'goals.manage')
  )
)
with check (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_tasks.goal_id::text
      and public.current_user_has_permission(goal.company_id, 'goals.manage')
  )
);
create policy "Managers can delete goal tasks"
on public.goal_tasks for delete to authenticated
using (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_tasks.goal_id::text
      and public.current_user_has_permission(goal.company_id, 'goals.manage')
  )
);

create policy "Viewers can read goal milestones"
on public.goal_milestones for select to authenticated
using (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_milestones.goal_id::text
  )
);
create policy "Managers can insert goal milestones"
on public.goal_milestones for insert to authenticated
with check (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_milestones.goal_id::text
      and public.current_user_has_permission(goal.company_id, 'goals.manage')
  )
);
create policy "Managers can update goal milestones"
on public.goal_milestones for update to authenticated
using (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_milestones.goal_id::text
      and (
        public.current_user_has_permission(goal.company_id, 'goals.manage')
        or (
          goal.created_by = auth.uid()
          and public.current_user_has_permission(goal.company_id, 'goals.view')
        )
      )
  )
)
with check (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_milestones.goal_id::text
      and (
        public.current_user_has_permission(goal.company_id, 'goals.manage')
        or (
          goal.created_by = auth.uid()
          and public.current_user_has_permission(goal.company_id, 'goals.view')
        )
      )
  )
);
create policy "Managers can delete goal milestones"
on public.goal_milestones for delete to authenticated
using (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_milestones.goal_id::text
      and public.current_user_has_permission(goal.company_id, 'goals.manage')
  )
);

create policy "Viewers can read goal participants"
on public.goal_participants for select to authenticated
using (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_participants.goal_id::text
  )
);
create policy "Managers can insert goal participants"
on public.goal_participants for insert to authenticated
with check (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_participants.goal_id::text
      and public.current_user_has_permission(goal.company_id, 'goals.manage')
  )
);
create policy "Managers can update goal participants"
on public.goal_participants for update to authenticated
using (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_participants.goal_id::text
      and public.current_user_has_permission(goal.company_id, 'goals.manage')
  )
)
with check (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_participants.goal_id::text
      and public.current_user_has_permission(goal.company_id, 'goals.manage')
  )
);
create policy "Managers can delete goal participants"
on public.goal_participants for delete to authenticated
using (
  exists (
    select 1 from public.goals goal
    where goal.id::text = goal_participants.goal_id::text
      and public.current_user_has_permission(goal.company_id, 'goals.manage')
  )
);

create policy "Viewers can read goal rewards"
on public.goal_rewards
for select
to authenticated
using (
  public.current_user_has_any_permission(company_id, array['goals.view', 'goals.manage'])
);

create policy "Managers can insert goal rewards"
on public.goal_rewards
for insert
to authenticated
with check (public.current_user_has_permission(company_id, 'goals.manage'));

create policy "Managers can update goal rewards"
on public.goal_rewards
for update
to authenticated
using (public.current_user_has_permission(company_id, 'goals.manage'))
with check (public.current_user_has_permission(company_id, 'goals.manage'));

create policy "Managers can delete goal rewards"
on public.goal_rewards
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'goals.manage'));

-- Company updates. Published posts are company-wide. Publishing is updates.manage.

create policy "Members can read company updates"
on public.company_updates
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    status = 'published'
    or status is null
    or author_id = auth.uid()
    or public.current_user_has_permission(company_id, 'updates.manage')
  )
);

create policy "Managers can insert company updates"
on public.company_updates
for insert
to authenticated
with check (public.current_user_has_permission(company_id, 'updates.manage'));

create policy "Managers can update company updates"
on public.company_updates
for update
to authenticated
using (public.current_user_has_permission(company_id, 'updates.manage'))
with check (public.current_user_has_permission(company_id, 'updates.manage'));

create policy "Managers can delete company updates"
on public.company_updates
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'updates.manage'));

create policy "Members can read company update comments"
on public.company_update_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.company_updates update
    where update.id::text = company_update_comments.update_id::text
      and update.company_id = company_update_comments.company_id
  )
);

create policy "Members can insert own company update comments"
on public.company_update_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.company_updates update
    where update.id::text = company_update_comments.update_id::text
      and update.company_id = company_update_comments.company_id
  )
);

create policy "Authors can update company update comments"
on public.company_update_comments
for update
to authenticated
using (
  author_id = auth.uid()
  or public.current_user_has_permission(company_id, 'updates.manage')
)
with check (
  author_id = auth.uid()
  or public.current_user_has_permission(company_id, 'updates.manage')
);

create policy "Authors can delete company update comments"
on public.company_update_comments
for delete
to authenticated
using (
  author_id = auth.uid()
  or public.current_user_has_permission(company_id, 'updates.manage')
);

create policy "Members can read company update reactions"
on public.company_update_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.company_updates update
    where update.id::text = company_update_reactions.update_id::text
      and update.company_id = company_update_reactions.company_id
  )
);

create policy "Members can insert own company update reactions"
on public.company_update_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.company_updates update
    where update.id::text = company_update_reactions.update_id::text
      and update.company_id = company_update_reactions.company_id
  )
);

create policy "Members can delete own company update reactions"
on public.company_update_reactions
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_has_permission(company_id, 'updates.manage')
);

create policy "Members can read company update engagement"
on public.company_update_engagement
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
);

create policy "Managers can write company update engagement"
on public.company_update_engagement
for insert
to authenticated
with check (public.current_user_has_permission(company_id, 'updates.manage'));

create policy "Managers can update company update engagement"
on public.company_update_engagement
for update
to authenticated
using (public.current_user_has_permission(company_id, 'updates.manage'))
with check (public.current_user_has_permission(company_id, 'updates.manage'));

create policy "Managers can delete company update engagement"
on public.company_update_engagement
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'updates.manage'));

-- Documents. The table has no per-person owner.

create policy "Viewers can read documents"
on public.documents
for select
to authenticated
using (
  public.current_user_has_any_permission(company_id, array['documents.view', 'documents.manage'])
);

create policy "Managers can insert documents"
on public.documents
for insert
to authenticated
with check (public.current_user_has_permission(company_id, 'documents.manage'));

create policy "Managers can update documents"
on public.documents
for update
to authenticated
using (public.current_user_has_permission(company_id, 'documents.manage'))
with check (public.current_user_has_permission(company_id, 'documents.manage'));

create policy "Managers can delete documents"
on public.documents
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'documents.manage'));

-- Performance reviews. Staff see employee_id = themselves.

create policy "Readers can read performance reviews"
on public.performance_reviews
for select
to authenticated
using (
  public.current_user_has_permission(company_id, 'reviews.manage')
  or (
    employee_id = auth.uid()
    and public.current_user_has_permission(company_id, 'reviews.view_own')
  )
);

create policy "Managers can insert performance reviews"
on public.performance_reviews
for insert
to authenticated
with check (public.current_user_has_permission(company_id, 'reviews.manage'));

create policy "Managers can update performance reviews"
on public.performance_reviews
for update
to authenticated
using (public.current_user_has_permission(company_id, 'reviews.manage'))
with check (public.current_user_has_permission(company_id, 'reviews.manage'));

create policy "Managers can delete performance reviews"
on public.performance_reviews
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'reviews.manage'));

-- Time off and availability.

create policy "Requesters can read time off requests"
on public.time_off_requests
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    user_id = auth.uid()
    or public.current_user_has_permission(company_id, 'approveTimeOff')
  )
);

create policy "Requesters can insert time off requests"
on public.time_off_requests
for insert
to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and exists (
    select 1
    from public.profiles person
    where person.id = time_off_requests.user_id
      and person.company_id = time_off_requests.company_id
  )
  and (
    (
      user_id = auth.uid()
      and public.current_user_has_permission(company_id, 'timeoff.request')
      and coalesce(status, 'pending') in ('pending', 'cancelled')
    )
    or public.current_user_has_permission(company_id, 'approveTimeOff')
  )
);

create policy "Requesters can update time off requests"
on public.time_off_requests
for update
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    user_id = auth.uid()
    or public.current_user_has_permission(company_id, 'approveTimeOff')
  )
)
with check (
  company_id in (select public.current_user_company_ids())
  and (
    public.current_user_has_permission(company_id, 'approveTimeOff')
    or (
      user_id = auth.uid()
      and public.current_user_has_permission(company_id, 'timeoff.request')
      and coalesce(status, 'pending') in ('pending', 'cancelled')
    )
  )
);

create policy "Approvers can delete time off requests"
on public.time_off_requests
for delete
to authenticated
using (
  public.current_user_has_permission(company_id, 'approveTimeOff')
  or (
    user_id = auth.uid()
    and public.current_user_has_permission(company_id, 'timeoff.request')
    and coalesce(status, 'pending') = 'pending'
  )
);

create policy "Members can read user unavailability"
on public.user_unavailability
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    user_id = auth.uid()
    or public.current_user_has_any_permission(
      company_id,
      array['schedule.view', 'viewTeamSchedules', 'schedule.edit', 'editSchedules']
    )
  )
);

create policy "Members can insert user unavailability"
on public.user_unavailability
for insert
to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and (
    user_id = auth.uid()
    or public.current_user_has_any_permission(company_id, array['schedule.edit', 'editSchedules'])
  )
);

create policy "Members can update user unavailability"
on public.user_unavailability
for update
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_has_any_permission(company_id, array['schedule.edit', 'editSchedules'])
)
with check (
  user_id = auth.uid()
  or public.current_user_has_any_permission(company_id, array['schedule.edit', 'editSchedules'])
);

create policy "Members can delete user unavailability"
on public.user_unavailability
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_has_any_permission(company_id, array['schedule.edit', 'editSchedules'])
);

-- Workflow evidence, reviews, exceptions, and assignments.

create policy "Members can read workflow assignments"
on public.workflow_assignments
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(
    company_id,
    array['workflow.assign', 'workflow.review', 'viewOwnTasks', 'viewTeamTasks', 'editTasks']
  )
);

create policy "Assigners can insert workflow assignments"
on public.workflow_assignments
for insert
to authenticated
with check (
  public.current_user_has_permission(company_id, 'workflow.assign')
  and exists (
    select 1
    from public.workflows workflow
    where workflow.id = workflow_assignments.workflow_id
      and workflow.company_id = workflow_assignments.company_id
  )
);

create policy "Assigners can update workflow assignments"
on public.workflow_assignments
for update
to authenticated
using (public.current_user_has_permission(company_id, 'workflow.assign'))
with check (
  public.current_user_has_permission(company_id, 'workflow.assign')
  and exists (
    select 1
    from public.workflows workflow
    where workflow.id = workflow_assignments.workflow_id
      and workflow.company_id = workflow_assignments.company_id
  )
);

create policy "Assigners can delete workflow assignments"
on public.workflow_assignments
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'workflow.assign'));

create policy "Workers can read workflow evidence"
on public.workflow_evidence
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    captured_by = auth.uid()
    or public.current_user_has_any_permission(
      company_id,
      array['workflow.review', 'workflow.exceptions', 'viewTeamTasks', 'editTasks']
    )
  )
);

create policy "Workers can insert workflow evidence"
on public.workflow_evidence
for insert
to authenticated
with check (
  (
    captured_by = auth.uid()
    and public.current_user_has_permission(company_id, 'workflow.evidence')
  )
  or public.current_user_has_permission(company_id, 'workflow.review')
);

create policy "Workers can update workflow evidence"
on public.workflow_evidence
for update
to authenticated
using (
  (
    captured_by = auth.uid()
    and public.current_user_has_permission(company_id, 'workflow.evidence')
  )
  or public.current_user_has_permission(company_id, 'workflow.review')
)
with check (
  (
    captured_by = auth.uid()
    and public.current_user_has_permission(company_id, 'workflow.evidence')
  )
  or public.current_user_has_permission(company_id, 'workflow.review')
);

create policy "Reviewers can delete workflow evidence"
on public.workflow_evidence
for delete
to authenticated
using (
  public.current_user_has_permission(company_id, 'workflow.review')
  or (
    captured_by = auth.uid()
    and public.current_user_has_permission(company_id, 'workflow.evidence')
  )
);

create policy "Reviewers can read workflow reviews"
on public.workflow_reviews
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    reviewer_id = auth.uid()
    or public.current_user_has_any_permission(
      company_id,
      array['workflow.review', 'viewTeamTasks', 'editTasks']
    )
  )
);

create policy "Reviewers can insert workflow reviews"
on public.workflow_reviews
for insert
to authenticated
with check (public.current_user_has_permission(company_id, 'workflow.review'));

create policy "Reviewers can update workflow reviews"
on public.workflow_reviews
for update
to authenticated
using (public.current_user_has_permission(company_id, 'workflow.review'))
with check (public.current_user_has_permission(company_id, 'workflow.review'));

create policy "Reviewers can delete workflow reviews"
on public.workflow_reviews
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'workflow.review'));

create policy "Workers can read workflow exceptions"
on public.workflow_exceptions
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    created_by = auth.uid()
    or public.current_user_has_any_permission(
      company_id,
      array['workflow.exceptions', 'workflow.review', 'viewTeamTasks', 'editTasks']
    )
  )
);

create policy "Workers can insert workflow exceptions"
on public.workflow_exceptions
for insert
to authenticated
with check (
  public.current_user_has_permission(company_id, 'workflow.exceptions')
  or (
    created_by = auth.uid()
    and public.current_user_has_permission(company_id, 'workflow.evidence')
    and coalesce(status, 'open') = 'open'
  )
);

create policy "Managers can update workflow exceptions"
on public.workflow_exceptions
for update
to authenticated
using (
  public.current_user_has_permission(company_id, 'workflow.exceptions')
  or (
    created_by = auth.uid()
    and public.current_user_has_permission(company_id, 'workflow.evidence')
  )
)
with check (
  public.current_user_has_permission(company_id, 'workflow.exceptions')
  or (
    created_by = auth.uid()
    and public.current_user_has_permission(company_id, 'workflow.evidence')
    and coalesce(status, 'open') = 'open'
  )
);

create policy "Managers can delete workflow exceptions"
on public.workflow_exceptions
for delete
to authenticated
using (public.current_user_has_permission(company_id, 'workflow.exceptions'));

-- inv_* inventory. Same keys as the inventory screens. The company-match
-- check stays so a permitted write cannot point at another company's item.

do $$
declare
  spec record;
begin
  for spec in
    select *
    from (
      values
        ('inv_items', array['inventory.view', 'manageInventory'], array['inventory.create', 'inventory.edit', 'manageInventory'], array['inventory.delete']),
        ('inv_item_units', array['inventory.view', 'manageInventory'], array['inventory.create', 'inventory.edit', 'manageInventory'], array['inventory.delete']),
        ('inv_locations', array['inventory.view', 'manageInventory'], array['inventory.create', 'inventory.edit', 'manageInventory'], array['inventory.delete']),
        ('inv_suppliers', array['inventory.view', 'manageInventory'], array['inventory.create', 'inventory.edit', 'manageInventory'], array['inventory.delete']),
        ('inv_recipes', array['inventory.view', 'inventory.prep.view', 'manageInventory'], array['inventory.create', 'inventory.edit', 'inventory.prep.edit', 'manageInventory'], array['inventory.delete']),
        ('inv_stock_lots', array['inventory.view', 'manageInventory'], array['inventory.adjust', 'inventory.edit', 'manageInventory'], array['inventory.delete']),
        ('inv_transfers', array['inventory.view', 'manageInventory'], array['inventory.edit', 'inventory.adjust', 'manageInventory'], array['inventory.delete']),
        ('inv_transfer_items', array['inventory.view', 'manageInventory'], array['inventory.edit', 'inventory.adjust', 'manageInventory'], array['inventory.delete']),
        ('inv_transfer_audit', array['inventory.view', 'manageInventory'], array['inventory.edit', 'inventory.adjust', 'manageInventory'], array['inventory.delete']),
        ('inv_counts', array['inventory.counts.view'], array['inventory.counts.create', 'inventory.counts.edit', 'inventory.counts.approve'], array['inventory.counts.edit', 'inventory.delete']),
        ('inv_count_lines', array['inventory.counts.view'], array['inventory.counts.create', 'inventory.counts.edit', 'inventory.counts.approve'], array['inventory.counts.edit', 'inventory.delete']),
        ('inv_count_locations', array['inventory.counts.view'], array['inventory.counts.create', 'inventory.counts.edit', 'inventory.counts.approve'], array['inventory.counts.edit', 'inventory.delete']),
        ('inv_count_scans', array['inventory.counts.view'], array['inventory.counts.create', 'inventory.counts.edit', 'inventory.counts.approve'], array['inventory.counts.edit', 'inventory.delete']),
        ('inv_count_events', array['inventory.counts.view'], array['inventory.counts.create', 'inventory.counts.edit', 'inventory.counts.approve'], array['inventory.counts.edit', 'inventory.delete']),
        ('inv_adjustments', array['inventory.view', 'inventory.adjust', 'inventory.counts.view'], array['inventory.adjust', 'manageInventory'], array['inventory.adjust', 'inventory.delete']),
        ('inv_waste', array['inventory.waste.view'], array['inventory.waste.create'], array['inventory.waste.create', 'inventory.delete']),
        ('inv_prep_batches', array['inventory.prep.view'], array['inventory.prep.edit'], array['inventory.prep.edit', 'inventory.delete']),
        ('inv_prep_plans', array['inventory.prep.view'], array['inventory.prep.edit'], array['inventory.prep.edit', 'inventory.delete']),
        ('inv_par_overrides', array['inventory.prep.view'], array['inventory.prep.edit'], array['inventory.prep.edit', 'inventory.delete']),
        ('inv_par_profiles', array['inventory.prep.view'], array['inventory.prep.edit'], array['inventory.prep.edit', 'inventory.delete']),
        ('inv_purchases', array['inventory.purchasing.view'], array['inventory.purchasing.manage'], array['inventory.purchasing.manage']),
        ('inv_purchase_lines', array['inventory.purchasing.view'], array['inventory.purchasing.manage'], array['inventory.purchasing.manage']),
        ('inv_production_events', array['inventory.prep.view', 'inventory.view'], array['inventory.prep.edit', 'inventory.edit', 'manageInventory'], array['inventory.prep.edit', 'inventory.delete']),
        ('inv_production_materials', array['inventory.prep.view', 'inventory.view'], array['inventory.prep.edit', 'inventory.edit', 'manageInventory'], array['inventory.prep.edit', 'inventory.delete']),
        ('inv_production_approvals', array['inventory.prep.view', 'inventory.view'], array['inventory.prep.edit', 'inventory.counts.approve', 'manageInventory'], array['inventory.prep.edit', 'inventory.delete'])
    ) as inventory_spec(table_name, read_keys, write_keys, delete_keys)
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (company_id in (select public.current_user_company_ids()) and public.current_user_has_any_permission(company_id, %L::text[]))',
      'Permissioned users can read ' || spec.table_name,
      spec.table_name,
      spec.read_keys
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (company_id in (select public.current_user_company_ids()) and public.current_user_has_any_permission(company_id, %L::text[]) and public.inventory_finance_row_matches_company(to_jsonb(%I), company_id))',
      'Permissioned users can insert ' || spec.table_name,
      spec.table_name,
      spec.write_keys,
      spec.table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (company_id in (select public.current_user_company_ids()) and public.current_user_has_any_permission(company_id, %L::text[])) with check (company_id in (select public.current_user_company_ids()) and public.current_user_has_any_permission(company_id, %L::text[]) and public.inventory_finance_row_matches_company(to_jsonb(%I), company_id))',
      'Permissioned users can update ' || spec.table_name,
      spec.table_name,
      spec.write_keys,
      spec.write_keys,
      spec.table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.current_user_has_any_permission(company_id, %L::text[]))',
      'Permissioned users can delete ' || spec.table_name,
      spec.table_name,
      spec.delete_keys
    );
  end loop;
end
$$;

create policy "Authenticated users can read inventory units"
on public.inv_units
for select
to authenticated
using (true);

create policy "Editors can insert inventory units"
on public.inv_units
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_members member
    where member.user_id = auth.uid()
      and public.current_user_has_any_permission(
        member.company_id,
        array['inventory.edit', 'manageInventory']
      )
  )
);

create policy "Editors can update inventory units"
on public.inv_units
for update
to authenticated
using (
  exists (
    select 1
    from public.company_members member
    where member.user_id = auth.uid()
      and public.current_user_has_any_permission(
        member.company_id,
        array['inventory.edit', 'manageInventory']
      )
  )
)
with check (
  exists (
    select 1
    from public.company_members member
    where member.user_id = auth.uid()
      and public.current_user_has_any_permission(
        member.company_id,
        array['inventory.edit', 'manageInventory']
      )
  )
);

create policy "Editors can delete inventory units"
on public.inv_units
for delete
to authenticated
using (
  exists (
    select 1
    from public.company_members member
    where member.user_id = auth.uid()
      and public.current_user_has_any_permission(
        member.company_id,
        array['inventory.edit', 'manageInventory']
      )
  )
);

notify pgrst, 'reload schema';
