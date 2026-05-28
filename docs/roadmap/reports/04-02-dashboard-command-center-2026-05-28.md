# 04.02 Dashboard Command Center

Date: 2026-05-28

## Status

Completed.

## What Changed

- Replaced the primary dashboard stats strip with an operator command center.
- Added tenant-scoped labor, schedule, task, inventory, purchasing, and risk summaries.
- Added an action-first manager queue ranked by daily operational risk.
- Added a cost pulse for scheduled labor plus open purchasing exposure.
- Removed AI chat, AI insights, and performance radar from the dashboard's prime surface.
- Tightened the dashboard header and responsive layout for mobile and desktop use.

## Data Sources

The command center reads:

- `schedules` for today's labor hours, estimated labor cost, draft shifts, and unassigned shifts.
- `tasks` for open, overdue, and high-priority task counts.
- `inv_items` for active inventory and low-stock counts.
- `inv_purchases` for open, overdue, and value-at-risk purchasing.
- Existing dashboard stats for coverage, time off, and task completion.

## Acceptance Check

The dashboard now answers "what needs attention today?" by showing:

- Urgent/watch badges.
- Schedule coverage.
- Labor plan.
- Task execution.
- Inventory posture.
- Manager risk.
- Direct links into the owning product modules.

## Verification

- `npm run typecheck`
- `npm run check:local`
- `npm run build`
- `npm run lint` passes with existing repository warnings and no errors.
- Local Playwright shell check confirmed `/app/dashboard` redirects unauthenticated users to `/auth` with no console errors.

## Follow-Up For Later Phases

- Add real waste exposure once `inv_waste` is fully company-scoped in generated client types.
- Add role-specific dashboards for owner, manager, and staff.
- Add browser console QA in 04.10 after more product surfaces are complete.
