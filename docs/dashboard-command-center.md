# Dashboard Command Center

Date: 2026-05-28

Purpose: define the production dashboard posture for the authenticated FlowForce web app.

## Product Rule

The dashboard is an operator command center. It must answer:

> What needs attention today?

It should not lead with generic vanity metrics, AI panels, charts detached from action, or demo-only activity.

## Primary Signals

The first dashboard screen now prioritizes:

- Schedule coverage and unassigned shifts.
- Scheduled labor hours and estimated scheduled labor cost.
- Open, overdue, and high-priority tasks.
- Active inventory items, low-stock items, and open purchases.
- Time-off, shift, task, inventory, and purchasing risk count.

## Data Sources

The command center reads tenant-scoped data from:

- `schedules`
- `tasks`
- `inv_items`
- `inv_purchases`
- Existing dashboard stats from `get_dashboard_stats` or its legacy tenant-scoped fallback.

The dashboard does not use sample data for the new command center layer. If a query fails, it shows an actionable error state and keeps the surface scoped to the active tenant.

## Manager Actions

The dashboard builds an action queue from current risk:

- Finalize today's schedule.
- Review pending time-off requests.
- Clear overdue or high-priority task blockers.
- Reorder low-stock inventory.
- Track open or overdue purchases.

When no risk is detected, it shows steady-state manager actions that point to schedule review and reports.

## Layout

The first screen is mobile-responsive:

- One-column cards on small screens.
- Two-column cards on tablet widths.
- Five-card command center on wide desktop.
- The manager action queue and cost pulse stack on mobile and split on desktop.

## Deferred

Later web-app phases should deepen the dashboard with:

- True required coverage and labor budget targets.
- Waste cost and count once the waste table is fully tenant-scoped in generated client types.
- Role-specific dashboard views for owner, manager, and staff.
- Real alert acknowledgements and daily closeout workflow.
