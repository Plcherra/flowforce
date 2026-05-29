# 06.08 Workflow Automation Hooks

Date: 2026-05-29

## Scope

Created the automation hook slice for Plan 06.

## Changes

- Added `workflow_automation_runs`.
- Added idempotent failed-step task creation from workflow exceptions.
- Added inventory review issue creation for inventory/count/waste workflow exceptions.
- Added overdue critical workflow notification RPC.
- Added `operations_workflow_automation_hooks_v`.
- Added `src/services/operations/workflowAutomationHooks.ts`.
- Added `WorkflowAutomationHooksPanel` to the Operations Hub.
- Added `docs/workflow-automation-hooks.md`.
- Added `supabase/tests/phase6_workflow_automation_hooks.test.sql`.
- Added `npm run check:workflow-automation-hooks`.

## Acceptance

Workflows now create operational follow-through: failed steps become tasks, inventory exceptions become review issues, overdue critical runs can notify assignees, and each automated action is logged.

## Verification

- `npm run check:workflow-automation-hooks`
- `supabase db reset`
- `supabase test db --local supabase/tests/phase6_workflow_automation_hooks.test.sql`
- `npm run check:local`
- `npm run test:db:security`
- `npm run build`

## Next

Phase 06.09: Analytics For Execution Quality.
