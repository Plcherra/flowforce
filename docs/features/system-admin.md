# System and Admin rework

Next week. This file is a review list. Do not change product code from these phases.

Settings the app actually renders live in `src/features/system/pages/SettingsPage.tsx`. The tabs are General, Security, Region, Notifications, AI, Integrations, Billing, and Admin.

## Candidates

Each row is a candidate for review. Nothing here is a decision to remove it.

1. Settings docs still describe `src/modules/system`. `docs/cleanup-progress.md` says that folder was moved to `src/features/system`. The stale docs are `docs/system-settings-architecture.md` and `docs/system-settings-hub.md`.
2. Sidebar links in `src/data/navigationData.tsx` mix `/app/enhanced-scheduling` with bare paths such as `/tasks`, `/messages`, `/forms`, `/inventory`, `/settings`, and `/admin`. Canonical routes in `src/app-shell/navigation/moduleRouteInventory.json` are under `/app/...`. The bare paths work through redirects in `next.config.mjs`.
3. Deprecated aliases are still registered, and several still have redirects: `/app/inventory-actions`, `/app/inventory-count-execution/[[...countId]]`, `/app/items-setup`, `/app/purchasing`, `/app/cookbook`, `/app/invite-employee`, `/app/availability`, `/app/availability/manage`, `/app/schedule-lobby`, `/app/scheduling/timeoff`, and `/app/events/calendar`.
4. Time off has extra entries beside the schedule panel: hidden `/app/time-off`, the `/time-off` redirect, and deprecated `/app/scheduling/timeoff`. The live screen is Schedule.
5. These sidebar entries are marked beta, and several notes say they stay hidden for the pilot, while `sidebar` is true and `navigationData.tsx` still lists them: Analytics, AI Insights, Operations Intelligence, Calendar, Expenses, Performance, Recognition, Leaderboard, Certifications, Learning Center, Admin, and Resources.
6. Admin is both `/app/admin` and the Admin tab on Settings. The inventory note says admin work goes through Team and Settings.
7. `/app/permission-demo` is an internal demo route (`src/features/permissions/pages/PermissionDemo.tsx`), with a redirect from `/permission-demo`.
8. Operations Intelligence (`/app/operations`) is still marked beta "until Plan 06", and the master roadmap already checks that plan. The note looks stale. There is also `src/features/operations/pages/Operations.tsx` beside `OperationsIntelligence.tsx`.
9. Company color fields are still saved from General settings (`companies.primary_color`, `companies.secondary_color`). The later theme file owns that work. Do not start it from this review.

## Phases

Do not change product code. The owner marks keep or drop. Until then, skip the open phase.

### Phase 1 — Candidate list

- [x] Record the systems above as review candidates.

Rules:

- Files: this file only.
- Do not edit application code, migrations, or navigation.

Done when:

- The nine candidates are listed with the file or route that shows the problem.

Prove: This file is the list. No product code changes in the commit that added it.

### Phase 2 — Owner marks keep or drop

- [ ] Blocked by Open question "Which candidates to remove". Skip this phase. Do not change product code.

Prove: Skip. Do not add a test until the Open question "Which candidates to remove" is answered.

## Open questions

- Which candidates to remove? The owner has not marked keep or drop on any row above.

## Progress log

### 2026-10-22 — Candidate list

Shipped: the nine candidates in this file. No product code.

Proven: the list is the proof. Nothing was deleted or rewired.

Blockers: Phase 2 is blocked until the owner marks which candidates to remove.

Questions: Which candidates to remove?
