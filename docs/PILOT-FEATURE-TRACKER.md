# FlowForce Pilot Feature Tracker

> Living document. Update status as waves complete. Source of truth: `docs/roadmap/00-master-roadmap.md`, `docs/roadmap/01-product-positioning-and-scope.md`, `docs/roadmap/04-web-app-product-completion.md`, `src/app-shell/navigation/moduleRouteInventory.json`.

Last updated: 2026-06-30

---

## North Star (from roadmap)

FlowForce is the restaurant operations command center for independent and small multi-location food-service operators. It replaces fragmented checklist, workforce, inventory, spreadsheet, and messaging tools with one tenant-safe workspace that connects staff scheduling, daily execution, inventory, purchasing, waste, cost visibility, and AI-assisted recommendations — so owners and managers can run the shift, control cost, and see the whole operation from one place.

---

## Target User

- **Primary buyer:** Independent restaurant owner/operator and general manager
- **Daily users:**
  - **Owner/operator** — profit, control, combined labor + inventory + waste visibility
  - **General manager** — schedule, tasks, checklists, inventory counts, daily execution
  - **Shift lead** — checklist runs, task assignment, exception reporting
  - **Staff** — schedule, messages, tasks, assigned forms/checklists
  - **Admin/bookkeeper** — setup, roles, purchasing, reports, settings

---

## 5-Minute Demo Path

1. **Sign in** → `/auth` → lands on `/app/dashboard` (command center briefing)
2. **Dashboard** → today's labor, task, checklist, and stock risk cards load with real tenant data
3. **Team** → `/app/employees` → roster with roles and departments visible
4. **Schedule** → `/app/enhanced-scheduling` → one week of shifts with a coverage gap
5. **Tasks** → `/app/tasks` → assigned and overdue items for manager follow-up
6. **Forms** → `/app/forms` → opening/closing checklist template visible
7. **Settings** → `/app/settings` → company profile, roles, and pilot module config

*(Inventory, purchasing, messages, and reports are Wave 2–3 — not required for the 5-minute foundation demo.)*

---

## Wave 0: Platform Foundation (Must be rock solid)

Foundation only: auth, tenant/company context, app shell, navigation, settings shell. No feature-module work here.

| Area | What "done" means | Status | Blockers |
|------|-------------------|--------|----------|
| **Auth** | Sign in, sign up, session sync, protected `/app/*` routes, sign-out | 🟡 Mostly built | Email-confirm tenants may not get a session immediately after signup; dual redirect in `NavigationGuard` + `ProtectedRoute` (harmless but noisy) |
| **Tenant / company setup** | New owner completes `/company-registration` → profile row with `company_id` → dashboard | 🟡 Mostly built | `TenantSetupRequired` shown when profile lacks company; repair depends on `company_name` in user metadata; onboarding API must succeed server-side |
| **Profile context** | Reliable load of `profiles` row before shell renders | 🔴 Needs fix | `AppShell` does not wait for `profileState.loading` — can flash or stick on "No company detected" while profile is still fetching |
| **App shell + layout** | Sidebar, top nav, error boundaries, mobile viewport shell | 🟢 Built | Guard chain: `ErrorBoundary` → `Suspense` → `NavigationGuard` → `ProtectedRoute` → `AppShell` |
| **Navigation** | 11 pilot modules in sidebar; beta/hidden routes excluded | 🟢 Built | `navigationData.tsx` + `moduleRouteInventory.json` aligned; paths normalized to `/app/*` in `useActiveNavigation` |
| **Settings shell** | `/app/settings` loads for admin/owner without schema errors | 🟡 Unverified | Depends on profile + permissions resolving; not re-tested after recent cleanup |

**Wave 0 overall:** 🟡 **~75% — architecture is in place; reliability gaps block a clean new-user path.**

---

## Wave 1–4 Checklist

Eleven pilot sidebar modules from `moduleRouteInventory.json`. Status reflects **current assumption post-cleanup** — verify each module before marking green.

| # | Module | Route | Wave | Status | Notes |
|---|--------|-------|------|--------|-------|
| 1 | Dashboard | `/app/dashboard` | 1 | ⬜ Not verified | Command center; depends on Wave 0 profile |
| 2 | Scheduling | `/app/enhanced-scheduling` | 2 | ⬜ Not verified | Pilot calendar surface |
| 3 | Tasks | `/app/tasks` | 2 | ⬜ Not verified | Execution layer |
| 4 | Messages | `/app/messages` | 2 | ⬜ Not verified | Team communication |
| 5 | Company Updates | `/app/company-updates` | 2 | ⬜ Not verified | Announcements |
| 6 | Forms | `/app/forms` | 2 | ⬜ Not verified | Checklists / SOPs |
| 7 | Inventory | `/app/inventory` | 3 | ⬜ Not verified | Hidden child routes until setup complete |
| 8 | Purchasing / Waste | `/app/inventory/purchasing` | 3 | ⬜ Not verified | Canonical purchasing entry |
| 9 | Reports | `/app/reports` | 3 | ⬜ Not verified | Pilot reporting (not beta `/app/analytics`) |
| 10 | Team | `/app/employees` | 1 | ⬜ Not verified | Directory + invites |
| 11 | Settings | `/app/settings` | 1 | ⬜ Not verified | Company config, roles, feature gates |

**Wave grouping (execution order after Wave 0):**

- **Wave 1:** Dashboard, Team, Settings
- **Wave 2:** Scheduling, Tasks, Messages, Company Updates, Forms
- **Wave 3:** Inventory, Purchasing / Waste, Reports
- **Wave 4:** Cross-module cost/connected operations (deferred — see roadmap Phase 05)

---

## Success Metrics

- [ ] Can complete full 5-minute demo path without errors
- [ ] No console errors on dashboard load (schema, RLS, or fetch failures)
- [ ] Real tenant data throughout — not dev placeholder profile or demo-only fallbacks
- [ ] New user can sign up → complete company registration → land on dashboard without developer intervention
- [ ] `npm run typecheck:src` and `npm run build` pass after cleanup
- [ ] Visible-module smoke (`npm run test:smoke`) passes for all 11 pilot routes

---

## Audit Log

| Date | Scope | Finding |
|------|-------|---------|
| 2026-06-30 | Wave 0 code audit | Auth/shell/navigation architecture present; profile loading race and post-cleanup build verification are top blockers |
