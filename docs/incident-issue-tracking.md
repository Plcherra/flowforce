# Incident And Issue Tracking

Date: 2026-05-29

## Purpose

Incident and issue tracking turns operational problems into owned work. Issues can now carry severity, status, owner, due date, resolution notes, task links, workflow links, inventory references, AI suggestion links, and SLA state.

## Product Contract

- Issues remain tenant-scoped through `company_id` and existing company membership RLS.
- Issues can be created from workflow exceptions, inventory references, manual reports, or detector output.
- Creating an issue can create a linked follow-up task.
- Workflow exceptions can link back to the created issue and task.
- Managers can acknowledge, start, block, resolve, or cancel issues.
- Resolved/cancelled issues store `resolved_at`, `resolved_by`, and optional notes.
- Issue queues expose SLA status: `unscheduled`, `on_track`, `due_soon`, `overdue`, or `resolved`.
- Reporting groups issues by type and severity with open, closed, overdue, and average resolution metrics.

## Database Surface

- `ops_issues` is extended with owner, due date, resolution, task, workflow, inventory, AI, priority, and SLA metadata.
- `operations_incident_issue_queue_v` powers the Operations Hub issue queue.
- `operations_issue_reporting_v` powers issue reporting rollups.
- `create_operational_issue(...)` creates an issue and optional task.
- `update_operational_issue_status(...)` manages status, owner, due date, and resolution fields.
- `current_user_can_manage_ops_issue(company_id, issue_id)` gates lifecycle updates.

## UI Surface

The Operations Hub issue panel now reads `operations_incident_issue_queue_v`, displays SLA and linked work state, and supports acknowledge, start, resolve, and AI suggestion actions.

## Verification

- Contract check: `npm run check:incident-issue-tracking`
- Database test: `supabase test db --local supabase/tests/phase6_incident_issue_tracking.test.sql`
- Full local gate: `npm run check:local`
- Full DB gate: `npm run test:db:security`
