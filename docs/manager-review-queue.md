# Manager Review Queue

Date: 2026-05-28

Plan: 06 Operations Workflows And Compliance

Phase: 06.05 Manager Review Queue

## Goal

Managers can inspect workflow runs that require approval, see exception priority, and record approve/reject/needs-changes decisions with an audit trail.

## Review Contract

`review_workflow_run(p_company_id, p_workflow_instance_id, p_review_status, p_comments)`:

- Requires the user to be a tenant owner, admin, manager, or supervisor.
- Accepts `approved`, `rejected`, or `needs_changes`.
- Updates `task_workflow_instances.review_status`.
- Recounts open exceptions for the run.
- Inserts a `workflow_reviews` decision record.
- Inserts an immutable `audit_log` row with old and new review state.

## Queue Contract

`operations_manager_review_queue_v` exposes:

- Workflow run identity and workflow template name.
- Review status and run status.
- Scheduled date, due time, escalation time, and completion time.
- Open exception count.
- Severe exception count.
- Latest review comment.
- Prioritized review state.

Priority order:

1. Critical or high-severity exceptions.
2. Open exceptions.
3. Overdue pending review.
4. Rejected.
5. Needs changes.
6. Pending.

## UI Surface

`ManagerReviewQueuePanel` appears in the Operations Hub. It shows queue counts, top priority runs, latest review comments, and approve/reject/needs-changes actions.

## Verification

- `npm run check:manager-review-queue`
- `supabase/tests/phase6_manager_review_queue.test.sql`
- `npm run check:local`
- `npm run test:db:security`

## Remaining Work

- Add full-screen review detail with all step evidence.
- Add comment entry instead of fixed queue action comments.
- Add role-specific filters and bulk review.
- Connect review rejections to follow-up tasks in Phase 06.08.
