# Recurring Operations Calendar

Date: 2026-05-28

Plan: 06 Operations Workflows And Compliance

Phase: 06.03 Recurring Operations Calendar

## Goal

Daily operations can be planned automatically from active workflow assignments. A manager should be able to generate the next several days of opening, closing, safety, cleaning, and inventory runs without creating duplicates.

## Calendar Contract

`generate_recurring_workflow_runs(p_company_id, p_start_date, p_end_date)`:

- Reads active `workflow_assignments` for the tenant.
- Expands `daily` and `weekly` `schedule_rule` values into scheduled dates.
- Computes `starts_at`, `due_at`, and `escalation_at` from `due_window` and `escalation_rule`.
- Creates one `task_workflow_instances` row per assignment/date.
- Creates pending `workflow_step_instances` for each generated run.
- Uses a partial unique index on company, assignment, and scheduled date so repeated calls are idempotent.

The RPC is security invoker and requires `p_company_id` to be in `current_user_company_ids()`.

## Assignment Targets

Recurring workflow runs preserve the assignment shape from `workflow_assignments`:

- `location_id` for store/department scoped work.
- `role_id` for role-based work.
- `assigned_to` for person-specific work.

## Manager Workload

`operations_daily_workload_v` summarizes generated runs by tenant and day:

- Total scheduled runs.
- Active runs.
- Completed runs.
- Overdue runs.
- Pending manager review runs.
- First start and last due timestamps.

## UI Surface

`RecurringOperationsCalendarPanel` appears in the Operations Hub. It can generate the next seven days of workflow runs and show the daily workload summary.

## Verification

- `npm run check:recurring-operations-calendar`
- `supabase/tests/phase6_recurring_operations_calendar.test.sql`
- `npm run check:local`
- `npm run test:db:security`

## Remaining Work

- Add live schedule editing for individual assignments.
- Add location and role filters to the workload surface.
- Add notification delivery for escalations.
- Add timezone selection from company settings.
