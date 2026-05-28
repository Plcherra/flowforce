# 04.01 Visible Module Inventory

Date: 2026-05-28

## Completed

- Added `src/app-shell/navigation/moduleRouteInventory.json` as the canonical authenticated web-app route inventory.
- Inventoried 61 authenticated app routes across production, beta, hidden, and deprecated statuses.
- Reduced the default sidebar to the production pilot route set.
- Moved broad HR, gamification, AI, operations intelligence, analytics, expenses, calendar, goals, and legacy flat inventory aliases out of default pilot navigation.
- Updated the authenticated visible-module smoke test to read the canonical inventory.
- Added `npm run check:visible-modules` to enforce that production sidebar routes and smoke routes stay aligned.
- Added the visible-module contract to `npm run check:local` and `npm run check:release`.
- Documented the inventory in `docs/web-app-visible-module-inventory.md`.

## Production Sidebar

The default pilot navigation is now:

1. Dashboard: `/app/dashboard`
2. Scheduling: `/app/enhanced-scheduling`
3. Tasks: `/app/tasks`
4. Messages: `/app/messages`
5. Company Updates: `/app/company-updates`
6. Forms: `/app/forms`
7. Inventory: `/app/inventory`
8. Purchasing / Waste: `/app/inventory/purchasing`
9. Reports: `/app/reports`
10. Team: `/app/employees`
11. Settings: `/app/settings`

## Hidden, Beta, And Deprecated Surfaces

The app still contains useful later-stage routes, but they are no longer treated as default pilot navigation.

Beta examples:

- `/app/analytics`
- `/app/ai-insights`
- `/app/operations`
- `/app/calendar`
- `/app/goals`
- `/app/expenses`

Hidden examples:

- Learning, certifications, recognition, leaderboard, performance.
- Admin, permission demo, custom sections, resources, help desk, meetings.
- Inventory child routes that should be reached from the inventory module instead of the global sidebar.

Deprecated examples:

- `/app/inventory-actions`
- `/app/inventory-count-execution/[[...countId]]`
- `/app/items-setup`
- `/app/purchasing`
- `/app/cookbook`
- `/app/invite-employee`
- `/app/availability`
- `/app/availability/manage`

## Demo-Data Findings

Known demo/fallback risk remains concentrated in:

- Scheduling fallback data.
- Analytics and reports.
- Inventory child routes.
- Learning, recognition, leaderboard, certifications, and performance.
- AI insights and operations intelligence.

Plan 04 module phases should resolve those one module at a time before promotion to production navigation.

## Verification

- Passed: `npm run check:visible-modules`
- Passed: `npm run check:local`
- Passed: `npm run typecheck`
- Passed: `npm run build`

## Next Phase

Continue to 04.02 Dashboard Command Center.
