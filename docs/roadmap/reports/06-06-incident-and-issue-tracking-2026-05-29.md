# 06.06 Incident And Issue Tracking

Date: 2026-05-29

## Scope

Created the incident and issue lifecycle slice for Plan 06.

## Changes

- Extended `ops_issues` with owner, due date, resolution, task, workflow, inventory, AI, and SLA metadata.
- Added `operations_incident_issue_queue_v`.
- Added `operations_issue_reporting_v`.
- Added `current_user_can_manage_ops_issue(p_company_id, p_issue_id)`.
- Added `create_operational_issue(...)`.
- Added `update_operational_issue_status(...)`.
- Added task creation and workflow exception linking for operational issues.
- Added `src/services/operations/incidentIssueTracking.ts`.
- Updated `IssuesStream` in the Operations Hub to use the lifecycle queue and status RPC.
- Added `docs/incident-issue-tracking.md`.
- Added `supabase/tests/phase6_incident_issue_tracking.test.sql`.
- Added `npm run check:incident-issue-tracking`.

## Acceptance

Operational problems now become tracked work with owners, due dates, follow-up tasks, workflow/inventory/AI links, SLA state, resolution notes, and reporting rollups.

## Verification

- `npm run check:incident-issue-tracking`
- `supabase db reset`
- `supabase test db --local supabase/tests/phase6_incident_issue_tracking.test.sql`
- `npm run check:local`
- `npm run test:db:security`
- `npm run build`

## Next

Phase 06.07: Compliance Packs.
