# 06.05 Manager Review Queue

Date: 2026-05-28

## Scope

Created the manager review queue slice for Plan 06.

## Changes

- Added `current_user_can_review_workflows(company_id)` permission helper.
- Added `operations_manager_review_queue_v`.
- Added `review_workflow_run(p_company_id, p_workflow_instance_id, p_review_status, p_comments)`.
- Added review priority from open and severe workflow exceptions.
- Added audit logging for review decisions.
- Added `src/services/operations/managerReviewQueue.ts`.
- Added `ManagerReviewQueuePanel` to the Operations Hub.
- Added `docs/manager-review-queue.md`.
- Added `supabase/tests/phase6_manager_review_queue.test.sql`.
- Added `npm run check:manager-review-queue`.

## Acceptance

Managers can inspect workflow runs requiring review and record approve, reject, or needs-changes decisions. Review decisions are permission-gated and audited.

## Verification

- `npm run check:manager-review-queue`
- `supabase db reset`
- `supabase test db --local supabase/tests/phase6_manager_review_queue.test.sql`
- `npm run check:local`
- `npm run test:db:security`
- `npm run build`

## Note

Phase 06.04 Field Execution UI was completed and remains complete.

## Next

Phase 06.06: Incident And Issue Tracking.
