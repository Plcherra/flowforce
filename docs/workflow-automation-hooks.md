# Workflow Automation Hooks

Date: 2026-05-29

## Purpose

Workflow automation hooks make completed execution data create operational follow-through. Failed workflow steps, inventory/count exceptions, and overdue critical workflow runs now create tracked actions without depending on a manager manually scanning every queue.

## Product Contract

- Failed checklist steps create follow-up tasks.
- Inventory count or waste workflow exceptions create inventory review issues.
- Overdue workflow runs with critical exceptions create task notifications.
- Every automation is logged in `workflow_automation_runs`.
- Automation keys are unique per company, so retries are idempotent.
- Hooks remain tenant-scoped through `company_id` and company membership RLS.

## Database Surface

- `workflow_automation_runs` stores every hook execution.
- `apply_workflow_exception_automation(exception_id)` powers the trigger path.
- `run_workflow_exception_automation(company_id, exception_id)` allows manual repair/rerun.
- `run_overdue_critical_workflow_notifications(company_id)` creates overdue critical notifications.
- `operations_workflow_automation_hooks_v` powers the Operations Hub hook ledger.
- `run_workflow_exception_automation_after_insert` fires when workflow exceptions are created.

## UI Surface

The Operations Hub now includes `WorkflowAutomationHooksPanel`, showing recent hook activity and a button to check overdue critical workflow runs.

## Verification

- Contract check: `npm run check:workflow-automation-hooks`
- Database test: `supabase test db --local supabase/tests/phase6_workflow_automation_hooks.test.sql`
- Full local gate: `npm run check:local`
- Full DB gate: `npm run test:db:security`
