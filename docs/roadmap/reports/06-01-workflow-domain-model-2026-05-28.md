# 06.01 Workflow Domain Model

Date: 2026-05-28

## Scope

Started Plan 06 by turning operations workflows into a first-class execution model instead of treating them as loose forms or generic tasks.

## Changes

- Added `src/services/operations/operationsWorkflowContract.json`.
- Added `docs/operations-workflow-domain-model.md`.
- Added `20260528001200_phase6_workflow_domain_model.sql`.
- Extended `workflows`, `workflow_steps`, `task_workflow_instances`, and `workflow_step_instances` with tenant, evidence, review, assignment, and exception fields.
- Added `workflow_assignments`, `workflow_evidence`, `workflow_reviews`, and `workflow_exceptions`.
- Added tenant inheritance triggers, RLS policies, indexes, and `workflow_domain_model_v`.
- Added `supabase/tests/phase6_workflow_domain_model.test.sql`.
- Added `npm run check:operations-workflow-domain`.

## Acceptance

Workflows now have a clear domain model for templates, steps, assignments, runs, evidence, reviews, and exceptions. Forms remain input schema; tasks remain follow-up work; operational issues remain the issue stream.

## Verification

- `npm run check:operations-workflow-domain`
- `npm run check:local`
- `supabase db reset`
- `npm run test:db:security`

## Next

Phase 06.02: SOP And Checklist Builder.
