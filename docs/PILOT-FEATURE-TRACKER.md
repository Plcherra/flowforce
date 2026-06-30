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
| **Auth** | Sign in, sign up, session sync, protected `/app/*` routes, sign-out | 🟢 Built | Email-confirm tenants may still need explicit sign-in after signup |
| **Tenant / company setup** | New owner completes `/company-registration` → profile row with `company_id` → dashboard | 🟢 Hardened | Requires Supabase onboarding API + service role in env |
| **Profile context** | Reliable load of `profiles` row before shell renders | 🟢 Fixed | Waits for `loading`; reloads when tenant metadata changes |
| **App shell + layout** | Sidebar, top nav, error boundaries, mobile viewport shell | 🟢 Built | Guard chain: `ErrorBoundary` → `Suspense` → `NavigationGuard` → `ProtectedRoute` → `AppShell` |
| **Navigation** | All built modules visible in sidebar; Goals and Help Desk removed | 🟢 Reorganized | `navigationData.tsx` + `moduleRouteInventory.json` (2026-06-30 nav cleanup) |
| **Settings shell** | `/app/settings` loads for admin/owner without schema errors | 🟡 Unverified | Route exists; verify in Wave 1 |
| **Build / typecheck** | `npm run verify` passes | 🟢 Passing | Cleanup regressions from `_`-prefixed unused vars fixed (2026-06-30) |

**Wave 0 overall:** 🟢 **~95% — foundation path hardened; manual onboarding E2E still recommended before Wave 1.**

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
| 7 | Inventory | `/app/inventory` | 3 | ⬜ Not verified | Sidebar includes child routes (items, counts, prep, etc.) |
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

## Sidebar Navigation (2026-06-30)

Source: `src/data/navigationData.tsx` + header Dashboard button in `DashboardNavigation.tsx`. All built feature routes are visible (beta modules included). Goals and Help Desk were removed.

| Section | Items |
|---------|-------|
| **Dashboard** (header) | Dashboard → `/app/dashboard` |
| **Daily Operations** | Scheduling, Tasks, Messages, Company Updates, Forms, Operations |
| **Inventory & Cost** | Inventory, Items Setup, Counts, Purchasing / Waste, Prep, Cookbook, Inventory Reports, Expenses |
| **Reports & Intelligence** | Reports, Analytics, AI Insights |
| **Team & HR** | Team Directory, Performance, Recognition, Leaderboard, Learning Center, Certifications |
| **Calendar & Events** | Calendar, Events, Meetings |
| **Administration** | Settings, Admin, Resources |

**Removed modules (no routes, no sidebar):**

- **Goals** — redundant with Tasks; deleted `/app/goals`, `src/features/goals/`, related hooks/services/tests
- **Help Desk** — redundant with Messages; deleted `/app/help-desk`, `src/features/helpdesk/`, tickets hooks/repository, messages helpdesk panel

**Still not in sidebar (by design):** child/detail routes, deprecated aliases, internal routes (`/app/permission-demo`, `/app/add-section`), profile, legacy redirects.

---

## Success Metrics

- [ ] Can complete full 5-minute demo path without errors
- [ ] No console errors on dashboard load (schema, RLS, or fetch failures)
- [ ] Real tenant data throughout — not dev placeholder profile or demo-only fallbacks
- [ ] New user can sign up → complete company registration → land on dashboard without developer intervention
- [x] `npm run typecheck` and `npm run build:local` pass after nav cleanup (verified 2026-06-30)
- [ ] Visible-module smoke (`npm run test:smoke`) passes for all 11 pilot routes

---

## Audit Log

| Date | Scope | Finding |
|------|-------|---------|
| 2026-06-30 | Wave 0 code audit | Auth/shell/navigation architecture present; profile loading race and post-cleanup build verification are top blockers |
| 2026-06-30 | Wave 0 fixes | AppShell profile gate, onboarding refresh chain, ProfileContext loading/metadata reload; `npm run verify` green |
| 2026-06-30 | Post-login UX | Profile initial vs background load (stops shell/dashboard refresh loop); SidebarInset layout; employees department FK fix |
| 2026-06-30 | Navigation cleanup | Removed Goals + Help Desk; expanded sidebar to all built modules; `moduleRouteInventory.json` updated; typecheck + build:local green |
