# 06.04 Field Execution UI

Date: 2026-05-28

## Scope

Created the mobile-first field execution slice for Plan 06.

## Changes

- Added `operations_field_execution_queue_v`.
- Added `operations_workflow_run_steps_v`.
- Added `current_user_can_execute_workflow_run(company_id, workflow_instance_id)`.
- Added `start_workflow_run(p_company_id, p_workflow_instance_id)`.
- Added `save_workflow_step_draft(p_company_id, p_step_instance_id, p_evidence_payload, p_notes)`.
- Added `complete_workflow_step(p_company_id, p_step_instance_id, p_step_status, p_evidence_payload, p_notes, p_failed_reason)`.
- Added `complete_workflow_run(p_company_id, p_workflow_instance_id)`.
- Added `src/services/operations/fieldExecution.ts`.
- Added `FieldExecutionPanel` to the Operations Hub.
- Added `docs/field-execution-ui.md`.
- Added `supabase/tests/phase6_field_execution_ui.test.sql`.
- Added `npm run check:field-execution-ui`.

## Acceptance

Staff can execute assigned workflows from a mobile-first panel, save draft progress, complete evidence-required steps, fail steps with escalation reasons, and submit completed runs into manager review when the workflow requires it.

## Verification

- `npm run check:field-execution-ui`
- `supabase db reset`
- `supabase test db --local supabase/tests/phase6_field_execution_ui.test.sql`
- `npm run check:local`
- `npm run test:db:security`
- `npm run build`

## Note

Phase 06.05 Manager Review Queue was implemented first and remains complete. With this backfill, Plan 06 now moves to Phase 06.06.

## Next

Phase 06.06: Incident And Issue Tracking.
