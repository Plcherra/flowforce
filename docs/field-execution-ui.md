# Field Execution UI

Date: 2026-05-28

## Purpose

The field execution UI gives staff a mobile-first console for assigned workflow runs. It turns scheduled SOP/checklist runs into simple actions: start, save draft, complete steps with required evidence, fail a step with a reason, and submit a completed run for manager review when required.

## Product Contract

- Staff see only workflow runs from their company and only runs assigned to them or left unassigned for the tenant.
- Staff can start or resume a run without creating duplicate runs.
- Step drafts preserve notes and partial evidence so mobile work can be interrupted safely.
- Evidence-required steps cannot be completed without an evidence payload.
- Failed steps require a reason and create an open workflow exception.
- Completing a review-required workflow moves the run into manager review.

## Database Surface

- `operations_field_execution_queue_v` exposes scheduled, draft, and in-progress runs.
- `operations_workflow_run_steps_v` exposes ordered step instances for executable runs.
- `current_user_can_execute_workflow_run(company_id, workflow_instance_id)` gates RPC access.
- `start_workflow_run(company_id, workflow_instance_id)` starts or resumes a run.
- `save_workflow_step_draft(company_id, step_instance_id, evidence_payload, notes)` stores interrupted progress.
- `complete_workflow_step(company_id, step_instance_id, step_status, evidence_payload, notes, failed_reason)` completes or fails a step.
- `complete_workflow_run(company_id, workflow_instance_id)` closes the run and sets review state.

## UI Surface

`FieldExecutionPanel` is embedded in the Operations Hub. It shows assigned runs, progress, ordered steps, draft/evidence inputs, and action buttons for start, draft, complete, fail, and complete run.

## Verification

- Contract check: `npm run check:field-execution-ui`
- Database test: `supabase test db --local supabase/tests/phase6_field_execution_ui.test.sql`
- Full local gate: `npm run check:local`
- Full DB gate: `npm run test:db:security`
