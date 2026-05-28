# Analytics And Reports Completion

Date: 2026-05-28

Purpose: define the pilot-ready analytics and reporting surface for owners and managers.

## Product Rule

Analytics must answer real operator questions from tenant data:

- Counts, trends, and report documents must be scoped to the active company.
- Owner views must focus on forecast confidence, margin, export readiness, and AI context.
- Manager views must focus on open shifts, overdue tasks, published forms, and report processing.
- Reports must be exportable without developer help.
- AI insights must receive current analytics/report context rather than static examples.

## Readiness Surface

The analytics page now includes an Analytics Readiness panel with:

- Owner and manager view modes.
- Live data status.
- Export readiness.
- Cost engine signal status.
- AI context status.
- Review items for fallback data, report extraction errors, missing export data, and thin cost-engine data.

## Report Inbox

The report inbox now includes:

- Company-scoped document loading.
- Company-scoped upload context.
- Summary cards for ready reports, processing reports, errors, critical events, and follow-up tasks.
- CSV export for the current filtered report inbox.

## Tenant Data Sources

The analytics and reports surfaces read:

- `profiles`
- `tasks`
- `time_off_requests`
- `forms`
- `form_submissions`
- `documents`
- `document_events`
- `schedules`
- `schedule_assignments`
- `inventory_transactions`
- `expenses`
- `goals`

## Deferred

Later phases should add:

- Scheduled email delivery for saved reports.
- Native PDF report packs.
- Deeper cost-engine reporting once Plan 05 expands inventory, purchasing, waste, and recipe costing.
- More granular permission scopes for report publishing and report schedule management.
