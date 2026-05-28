# Web App Visible Module Inventory

Date: 2026-05-28

Purpose: define the production pilot navigation for the authenticated web app and keep beta, hidden, deprecated, and child routes out of the default customer path.

## Canonical Source

The enforceable inventory lives in:

- `src/app-shell/navigation/moduleRouteInventory.json`

The contract check is:

- `npm run check:visible-modules`

The authenticated smoke test reads the same inventory:

- `npm run test:smoke`

## Production Sidebar

These routes are the default pilot navigation and must stay smoke-tested:

| Module | Route | Owner |
| --- | --- | --- |
| Dashboard | `/app/dashboard` | `src/features/dashboard` |
| Scheduling | `/app/enhanced-scheduling` | `src/features/scheduling` |
| Tasks | `/app/tasks` | `src/features/tasks` |
| Messages | `/app/messages` | `src/features/messages` |
| Company Updates | `/app/company-updates` | `src/features/company-updates` |
| Forms | `/app/forms` | `src/features/forms` |
| Inventory | `/app/inventory` | `src/features/inventory` |
| Purchasing / Waste | `/app/inventory/purchasing` | `src/features/inventory` |
| Reports | `/app/reports` | `src/features/analytics` |
| Team | `/app/employees` | `src/features/employees` |
| Settings | `/app/settings` | `src/features/system` |

## Hidden Or Child Routes

These routes may exist, but should not appear as default sidebar modules:

- Message filters.
- Inventory child routes for actions, counts, items, prep, reports, cookbook, and count detail.
- Profile.
- Admin, sections, permissions, and custom-section routes.
- Scheduling child/redirect routes for availability and time off.
- Resources and resource detail routes.

## Beta Routes

These routes remain out of the pilot sidebar until their later roadmap phases make them production-ready:

- `/app/analytics`
- `/app/ai-insights`
- `/app/operations`
- `/app/calendar`
- `/app/events/calendar`
- `/app/goals`
- `/app/expenses`

## Deprecated Flat Aliases

These routes should not be linked in production navigation:

- `/app/inventory-actions`
- `/app/inventory-count-execution/[[...countId]]`
- `/app/items-setup`
- `/app/purchasing`
- `/app/cookbook`
- `/app/invite-employee`
- `/app/availability`
- `/app/availability/manage`

Canonical inventory routes live under `/app/inventory/*`; scheduling availability lives under `/app/enhanced-scheduling`.

## Demo-Data Dependencies

Demo/fallback risk remains highest in:

- Scheduling fallback data.
- Analytics and reports.
- Inventory child routes.
- Learning, recognition, leaderboard, certifications, and performance.
- AI insights and operations intelligence.

Plan 04 phases should remove or explicitly label these dependencies before each module returns to production navigation.

## Navigation Rule

Default authenticated navigation may expose only `production` routes where `sidebar` is true in `moduleRouteInventory.json`.

Every default sidebar route must be included in authenticated visible-module smoke. Beta, hidden, and deprecated routes can exist, but they must stay out of default pilot navigation until their owning roadmap phase promotes them.
