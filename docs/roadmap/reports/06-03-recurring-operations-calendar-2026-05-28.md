# 06.03 Recurring Operations Calendar

Date: 2026-05-28

## Scope

Created the recurring workflow generation slice for Plan 06.

## Changes

- Added `generate_recurring_workflow_runs(p_company_id, p_start_date, p_end_date)`.
- Added schedule metadata to `task_workflow_instances`.
- Added idempotent recurring assignment/date uniqueness.
- Added `operations_daily_workload_v`.
- Added `src/services/operations/recurringOperationsCalendar.ts`.
- Added `RecurringOperationsCalendarPanel` to the Operations Hub.
- Added `docs/recurring-operations-calendar.md`.
- Added `supabase/tests/phase6_recurring_operations_calendar.test.sql`.
- Added `npm run check:recurring-operations-calendar`.

## Acceptance

Recurring workflow assignments can generate daily executable runs and step runs without duplicates. Managers now have a daily workload view for scheduled, overdue, and review-pending operational work.

## Verification

- `npm run check:recurring-operations-calendar`
- `supabase db reset`
- `supabase test db --local supabase/tests/phase6_recurring_operations_calendar.test.sql`
- `npm run check:local`
- `npm run test:db:security`
- `npm run build`

## Next

Phase 06.04: Field Execution UI.
