-- The restore migration left "Authenticated users can manage scoped restored rows"
-- as FOR ALL on many tables. Postgres ORs permissive policies, so that
-- catch-all overrides the permission matrix. Drop it everywhere it remains,
-- then install select/insert/update/delete policies that use
-- current_user_has_permission and the company tenant check.
-- This file is not applied to production from the agent.

alter function public.permission_json_state(jsonb, text) set search_path = public;
alter function public.product_role_default_allows(text, text) set search_path = public;
alter function public.product_role_default_allows_base(text, text) set search_path = public;
alter function public.product_level_allowed_permissions(text) set search_path = public;
alter function public.product_level_allowed_permissions_base(text) set search_path = public;
alter function public.set_task_audience_default() set search_path = public;

revoke all on function public.current_user_can_manage_ops_issue(uuid, uuid) from public, anon;
revoke all on function public.current_user_can_execute_workflow_run(uuid, uuid) from public, anon;
grant execute on function public.current_user_can_manage_ops_issue(uuid, uuid) to authenticated, service_role;
grant execute on function public.current_user_can_execute_workflow_run(uuid, uuid) to authenticated, service_role;

do $drop_catchall$
declare
  target_table text;
begin
  for target_table in
    select cls.relname
    from pg_policy policy
    join pg_class cls on cls.oid = policy.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and policy.polname = 'Authenticated users can manage scoped restored rows'
  loop
    execute format(
      'drop policy if exists "Authenticated users can manage scoped restored rows" on public.%I',
      target_table
    );
  end loop;
end
$drop_catchall$;

-- Workflows, workflow steps, and workflow runs already have matrix policies.
-- Availability and labor had a second "any company member" policy. Replace
-- those so a worker can still file their own row and a scheduler can manage
-- the team.

drop policy if exists "Company members can manage availability exceptions" on public.availability_exception;
drop policy if exists "Company members can manage availability requests" on public.availability_request;
drop policy if exists "Company members can manage labor entries" on public.labor_entries;

create policy "Permissioned users can read availability_request"
on public.availability_request
for select to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    employee_id = auth.uid()
    or public.current_user_has_any_permission(
      company_id,
      array['schedule.view', 'viewTeamSchedules', 'editSchedules', 'approveTimeOff']
    )
  )
);

create policy "Permissioned users can insert availability_request"
on public.availability_request
for insert to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and (
    (
      employee_id = auth.uid()
      and public.current_user_has_any_permission(
        company_id,
        array['viewOwnSchedules', 'timeoff.request']
      )
    )
    or public.current_user_has_any_permission(
      company_id,
      array['schedule.edit', 'editSchedules', 'approveTimeOff']
    )
  )
  and (
    employee_id is null
    or exists (
      select 1
      from public.profiles person
      where person.id = availability_request.employee_id
        and person.company_id = availability_request.company_id
    )
  )
);

create policy "Permissioned users can update availability_request"
on public.availability_request
for update to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    (
      employee_id = auth.uid()
      and public.current_user_has_any_permission(
        company_id,
        array['viewOwnSchedules', 'timeoff.request']
      )
    )
    or public.current_user_has_any_permission(
      company_id,
      array['schedule.edit', 'editSchedules', 'approveTimeOff']
    )
  )
)
with check (
  company_id in (select public.current_user_company_ids())
  and (
    (
      employee_id = auth.uid()
      and public.current_user_has_any_permission(
        company_id,
        array['viewOwnSchedules', 'timeoff.request']
      )
    )
    or public.current_user_has_any_permission(
      company_id,
      array['schedule.edit', 'editSchedules', 'approveTimeOff']
    )
  )
);

create policy "Permissioned users can delete availability_request"
on public.availability_request
for delete to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    employee_id = auth.uid()
    or public.current_user_has_any_permission(
      company_id,
      array['schedule.edit', 'editSchedules', 'approveTimeOff']
    )
  )
);

create policy "Permissioned users can read availability_exception"
on public.availability_exception
for select to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    employee_id = auth.uid()
    or public.current_user_has_any_permission(
      company_id,
      array['schedule.view', 'viewTeamSchedules', 'editSchedules']
    )
  )
);

create policy "Permissioned users can insert availability_exception"
on public.availability_exception
for insert to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and (
    (
      employee_id = auth.uid()
      and public.current_user_has_permission(company_id, 'viewOwnSchedules')
    )
    or public.current_user_has_any_permission(
      company_id,
      array['schedule.edit', 'editSchedules']
    )
  )
);

create policy "Permissioned users can update availability_exception"
on public.availability_exception
for update to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    (
      employee_id = auth.uid()
      and public.current_user_has_permission(company_id, 'viewOwnSchedules')
    )
    or public.current_user_has_any_permission(company_id, array['schedule.edit', 'editSchedules'])
  )
)
with check (
  company_id in (select public.current_user_company_ids())
  and (
    (
      employee_id = auth.uid()
      and public.current_user_has_permission(company_id, 'viewOwnSchedules')
    )
    or public.current_user_has_any_permission(company_id, array['schedule.edit', 'editSchedules'])
  )
);

create policy "Permissioned users can delete availability_exception"
on public.availability_exception
for delete to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(company_id, array['schedule.edit', 'editSchedules', 'schedule.delete'])
);

create policy "Permissioned users can read labor_entries"
on public.labor_entries
for select to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    user_id = auth.uid()
    or public.current_user_has_any_permission(
      company_id,
      array['viewTeamSchedules', 'schedule.view', 'editSchedules', 'reports.view']
    )
  )
);

create policy "Permissioned users can insert labor_entries"
on public.labor_entries
for insert to authenticated
with check (
  company_id in (select public.current_user_company_ids())
  and (
    (
      user_id = auth.uid()
      and public.current_user_has_permission(company_id, 'viewOwnSchedules')
    )
    or public.current_user_has_any_permission(company_id, array['schedule.edit', 'editSchedules'])
  )
);

create policy "Permissioned users can update labor_entries"
on public.labor_entries
for update to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and (
    (
      user_id = auth.uid()
      and public.current_user_has_permission(company_id, 'viewOwnSchedules')
    )
    or public.current_user_has_any_permission(company_id, array['schedule.edit', 'editSchedules'])
  )
)
with check (
  company_id in (select public.current_user_company_ids())
  and (
    (
      user_id = auth.uid()
      and public.current_user_has_permission(company_id, 'viewOwnSchedules')
    )
    or public.current_user_has_any_permission(company_id, array['schedule.edit', 'editSchedules'])
  )
);

create policy "Permissioned users can delete labor_entries"
on public.labor_entries
for delete to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(company_id, array['schedule.edit', 'editSchedules', 'schedule.delete'])
);

-- Company-scoped tables that had only the catch-all.
do $matrix_policies$
declare
  spec record;
begin
  for spec in
    select *
    from (
      values
        ('departments', array['viewOwnProfile', 'directory.view', 'managePositions', 'viewTeamProfiles'], array['managePositions', 'onboarding.create'], array['managePositions', 'onboarding.delete']),
        ('company_settings', array['viewOwnProfile', 'admin.settings', 'systemSettings'], array['admin.settings', 'systemSettings'], array['admin.settings', 'systemSettings']),
        ('app_rules', array['admin.settings', 'systemSettings', 'admin.permissions'], array['admin.settings', 'systemSettings'], array['admin.settings']),
        ('app_rule_audits', array['admin.settings', 'systemSettings', 'admin.permissions'], array['admin.settings', 'systemSettings'], array['admin.settings']),
        ('attachments', array['viewOwnProfile', 'documents.view'], array['documents.manage'], array['documents.manage']),
        ('certifications', array['viewOwnProfile', 'recognition.edit'], array['recognition.edit'], array['recognition.edit']),
        ('codex_auto_tasks', array['viewAIInsights', 'ai.insights.view', 'ai.audit.view'], array['ai.actions.approve', 'ai.actions.automate'], array['ai.governance.manage']),
        ('copilot_actions', array['viewAIInsights', 'ai.insights.view', 'ai.actions.suggest'], array['ai.actions.approve', 'ai.actions.automate'], array['ai.governance.manage']),
        ('copilot_action_events', array['viewAIInsights', 'ai.audit.view'], array['ai.actions.suggest', 'ai.actions.approve'], array['ai.governance.manage']),
        ('coverage_templates', array['viewOwnSchedules', 'viewTeamSchedules', 'schedule.view'], array['schedule.edit', 'editSchedules', 'schedule.create'], array['schedule.delete', 'editSchedules']),
        ('events', array['reports.view', 'admin.settings', 'viewOwnProfile'], array['admin.settings', 'systemSettings'], array['admin.settings']),
        ('learning_courses', array['viewOwnProfile', 'recognition.edit'], array['recognition.edit'], array['recognition.edit']),
        ('operations_checklists', array['viewOwnTasks', 'viewTeamTasks', 'editTasks'], array['editTasks'], array['editTasks']),
        ('operations_tasks', array['viewOwnTasks', 'viewTeamTasks', 'editTasks'], array['editTasks'], array['editTasks']),
        ('performance_goal_reviews', array['reviews.manage'], array['reviews.manage'], array['reviews.manage']),
        ('permission_audit_logs', array['admin.permissions', 'admin.roles'], array['admin.permissions'], array['admin.permissions']),
        ('position_assignments', array['viewOwnProfile', 'directory.view', 'managePositions', 'viewTeamProfiles'], array['managePositions', 'onboarding.create'], array['managePositions', 'onboarding.delete']),
        ('sales_ledger', array['reports.view', 'managePayments', 'billing.view'], array['managePayments', 'billing.manage'], array['managePayments']),
        ('supervisor_schedule', array['viewOwnSchedules', 'viewTeamSchedules', 'schedule.view'], array['schedule.edit', 'editSchedules'], array['schedule.delete', 'editSchedules']),
        ('training_modules', array['viewOwnProfile', 'recognition.edit'], array['recognition.edit'], array['recognition.edit']),
        ('vendor_sync_logs', array['admin.settings', 'systemSettings'], array['admin.settings', 'systemSettings'], array['admin.settings']),
        ('work_schedules', array['viewOwnSchedules', 'viewTeamSchedules', 'schedule.view'], array['schedule.edit', 'editSchedules', 'schedule.create'], array['schedule.delete', 'editSchedules'])
    ) as policy_spec(table_name, read_keys, write_keys, delete_keys)
  loop
    execute format('drop policy if exists %I on public.%I', 'Permissioned users can read ' || spec.table_name, spec.table_name);
    execute format('drop policy if exists %I on public.%I', 'Permissioned users can insert ' || spec.table_name, spec.table_name);
    execute format('drop policy if exists %I on public.%I', 'Permissioned users can update ' || spec.table_name, spec.table_name);
    execute format('drop policy if exists %I on public.%I', 'Permissioned users can delete ' || spec.table_name, spec.table_name);

    execute format(
      'create policy %I on public.%I for select to authenticated using (company_id in (select public.current_user_company_ids()) and public.current_user_has_any_permission(company_id, %L::text[]))',
      'Permissioned users can read ' || spec.table_name,
      spec.table_name,
      spec.read_keys
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (company_id in (select public.current_user_company_ids()) and public.current_user_has_any_permission(company_id, %L::text[]))',
      'Permissioned users can insert ' || spec.table_name,
      spec.table_name,
      spec.write_keys
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (company_id in (select public.current_user_company_ids()) and public.current_user_has_any_permission(company_id, %L::text[])) with check (company_id in (select public.current_user_company_ids()) and public.current_user_has_any_permission(company_id, %L::text[]))',
      'Permissioned users can update ' || spec.table_name,
      spec.table_name,
      spec.write_keys,
      spec.write_keys
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (company_id in (select public.current_user_company_ids()) and public.current_user_has_any_permission(company_id, %L::text[]))',
      'Permissioned users can delete ' || spec.table_name,
      spec.table_name,
      spec.delete_keys
    );
  end loop;
end
$matrix_policies$;

-- Learning rows name the person. That person can keep their own row.
-- recognition.edit covers the rest of the company.
do $own_rows$
declare
  spec record;
begin
  for spec in
    select *
    from (
      values
        ('learning_enrollments', 'employee_id'),
        ('learning_progress', 'user_id'),
        ('learning_progress_events', 'employee_id'),
        ('v_training_completion_events', 'employee_id')
    ) as own_spec(table_name, own_column)
  loop
    execute format('drop policy if exists %I on public.%I', 'Permissioned users can read ' || spec.table_name, spec.table_name);
    execute format('drop policy if exists %I on public.%I', 'Permissioned users can insert ' || spec.table_name, spec.table_name);
    execute format('drop policy if exists %I on public.%I', 'Permissioned users can update ' || spec.table_name, spec.table_name);
    execute format('drop policy if exists %I on public.%I', 'Permissioned users can delete ' || spec.table_name, spec.table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (company_id in (select public.current_user_company_ids()) and (%I = auth.uid() or public.current_user_has_permission(company_id, ''recognition.edit'')))',
      'Permissioned users can read ' || spec.table_name, spec.table_name, spec.own_column
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (company_id in (select public.current_user_company_ids()) and (%I = auth.uid() or public.current_user_has_permission(company_id, ''recognition.edit'')))',
      'Permissioned users can insert ' || spec.table_name, spec.table_name, spec.own_column
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (company_id in (select public.current_user_company_ids()) and (%I = auth.uid() or public.current_user_has_permission(company_id, ''recognition.edit''))) with check (company_id in (select public.current_user_company_ids()) and (%I = auth.uid() or public.current_user_has_permission(company_id, ''recognition.edit'')))',
      'Permissioned users can update ' || spec.table_name, spec.table_name, spec.own_column, spec.own_column
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (company_id in (select public.current_user_company_ids()) and (%I = auth.uid() or public.current_user_has_permission(company_id, ''recognition.edit'')))',
      'Permissioned users can delete ' || spec.table_name, spec.table_name, spec.own_column
    );
  end loop;
end
$own_rows$;

-- Personal rows have no company_id. The signed-in person is the boundary.
-- Certification and course progress also open to recognition.edit in that person's company.
do $personal_rows$
declare
  spec record;
  command text;
  expression text;
begin
  for spec in
    select *
    from (
      values
        ('budgets', 'user_id', false),
        ('investment_plans', 'user_id', false),
        ('ooda_cycles', 'user_id', false),
        ('ooda_responses', 'user_id', false),
        ('certification_progress', 'employee_id', true),
        ('learning_course_progress', 'employee_id', true)
    ) as personal_spec(table_name, own_column, manager_too)
  loop
    expression := format('%I = auth.uid()', spec.own_column);
    if spec.manager_too then
      expression := expression || format(
        ' or exists (select 1 from public.profiles person where person.id = public.%I.%I and public.current_user_has_permission(person.company_id, ''recognition.edit''))',
        spec.table_name,
        spec.own_column
      );
    end if;

    foreach command in array array['select', 'insert', 'update', 'delete'] loop
      execute format(
        'drop policy if exists %I on public.%I',
        'Owners can ' || command || ' ' || spec.table_name,
        spec.table_name
      );
      if command = 'insert' then
        execute format(
          'create policy %I on public.%I for insert to authenticated with check (%s)',
          'Owners can insert ' || spec.table_name, spec.table_name, expression
        );
      elsif command = 'update' then
        execute format(
          'create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
          'Owners can update ' || spec.table_name, spec.table_name, expression, expression
        );
      elsif command = 'delete' then
        execute format(
          'create policy %I on public.%I for delete to authenticated using (%s)',
          'Owners can delete ' || spec.table_name, spec.table_name, expression
        );
      else
        execute format(
          'create policy %I on public.%I for select to authenticated using (%s)',
          'Owners can select ' || spec.table_name, spec.table_name, expression
        );
      end if;
    end loop;
  end loop;
end
$personal_rows$;

-- shift_assignments and time_entries have a person, not a company_id.
-- The company is the person's profile company.

create policy "Permissioned users can read shift_assignments"
on public.shift_assignments
for select to authenticated
using (
  (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles person
      where person.id = auth.uid()
        and public.current_user_has_permission(person.company_id, 'viewOwnSchedules')
    )
  )
  or exists (
    select 1 from public.profiles person
    where person.id = shift_assignments.user_id
      and public.current_user_has_any_permission(
        person.company_id,
        array['viewTeamSchedules', 'schedule.view', 'schedule.edit', 'editSchedules']
      )
  )
);

create policy "Permissioned users can insert shift_assignments"
on public.shift_assignments
for insert to authenticated
with check (
  exists (
    select 1 from public.profiles person
    where person.id = shift_assignments.user_id
      and public.current_user_has_any_permission(
        person.company_id,
        array['schedule.edit', 'editSchedules', 'schedule.create']
      )
  )
);

create policy "Permissioned users can update shift_assignments"
on public.shift_assignments
for update to authenticated
using (
  exists (
    select 1 from public.profiles person
    where person.id = shift_assignments.user_id
      and public.current_user_has_any_permission(
        person.company_id,
        array['schedule.edit', 'editSchedules', 'schedule.create']
      )
  )
)
with check (
  exists (
    select 1 from public.profiles person
    where person.id = shift_assignments.user_id
      and public.current_user_has_any_permission(
        person.company_id,
        array['schedule.edit', 'editSchedules', 'schedule.create']
      )
  )
);

create policy "Permissioned users can delete shift_assignments"
on public.shift_assignments
for delete to authenticated
using (
  exists (
    select 1 from public.profiles person
    where person.id = shift_assignments.user_id
      and public.current_user_has_any_permission(
        person.company_id,
        array['schedule.edit', 'editSchedules', 'schedule.delete']
      )
  )
);

create policy "Permissioned users can read time_entries"
on public.time_entries
for select to authenticated
using (
  (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles person
      where person.id = auth.uid()
        and public.current_user_has_permission(person.company_id, 'viewOwnSchedules')
    )
  )
  or exists (
    select 1 from public.profiles person
    where person.id = time_entries.user_id
      and public.current_user_has_any_permission(
        person.company_id,
        array['viewTeamSchedules', 'schedule.view', 'editSchedules']
      )
  )
);

create policy "Permissioned users can insert time_entries"
on public.time_entries
for insert to authenticated
with check (
  (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles person
      where person.id = auth.uid()
        and public.current_user_has_permission(person.company_id, 'viewOwnSchedules')
    )
  )
  or exists (
    select 1 from public.profiles person
    where person.id = time_entries.user_id
      and public.current_user_has_any_permission(person.company_id, array['schedule.edit', 'editSchedules'])
  )
);

create policy "Permissioned users can update time_entries"
on public.time_entries
for update to authenticated
using (
  (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles person
      where person.id = auth.uid()
        and public.current_user_has_permission(person.company_id, 'viewOwnSchedules')
    )
  )
  or exists (
    select 1 from public.profiles person
    where person.id = time_entries.user_id
      and public.current_user_has_any_permission(person.company_id, array['schedule.edit', 'editSchedules'])
  )
)
with check (
  (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles person
      where person.id = auth.uid()
        and public.current_user_has_permission(person.company_id, 'viewOwnSchedules')
    )
  )
  or exists (
    select 1 from public.profiles person
    where person.id = time_entries.user_id
      and public.current_user_has_any_permission(person.company_id, array['schedule.edit', 'editSchedules'])
  )
);

create policy "Permissioned users can delete time_entries"
on public.time_entries
for delete to authenticated
using (
  exists (
    select 1 from public.profiles person
    where person.id = time_entries.user_id
      and public.current_user_has_any_permission(
        person.company_id,
        array['schedule.edit', 'editSchedules', 'schedule.delete']
      )
  )
);

-- Company switching reads the signed-in person's own rows.
-- Linking yourself is allowed for a company you already belong to, or one you own.
-- Changing someone else's link, or the role on a link, needs manageUsers.
-- Company creation itself runs as the service role and does not use these policies.

create policy "Members can read their user_companies"
on public.user_companies
for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_has_permission(company_id, 'manageUsers')
);

create policy "Members can insert their user_companies"
on public.user_companies
for insert to authenticated
with check (
  public.current_user_has_permission(company_id, 'manageUsers')
  or (
    user_id = auth.uid()
    and (
      company_id in (select public.current_user_company_ids())
      or exists (
        select 1 from public.companies company
        where company.id = user_companies.company_id
          and (company.owner_id = auth.uid() or company.created_by = auth.uid())
      )
    )
  )
);

create policy "Managers can update user_companies"
on public.user_companies
for update to authenticated
using (public.current_user_has_permission(company_id, 'manageUsers'))
with check (public.current_user_has_permission(company_id, 'manageUsers'));

create policy "Members can delete their user_companies"
on public.user_companies
for delete to authenticated
using (
  user_id = auth.uid()
  or public.current_user_has_permission(company_id, 'manageUsers')
);
