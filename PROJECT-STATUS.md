# Project Status

Scanned 2026-10-25 from the current app routes, `src/features`, `src/data/navigationData.tsx`, and `src/app-shell/navigation/moduleRouteInventory.json` (inventory file still dated 2026-06-30). Status below is what the pages actually render. Production, beta, hidden, and deprecated labels come from that inventory file. The old pilot tracker is not a status source.

## Manual smoke

Sign in at https://www.flowforce.uk. Refresh after the production deploy finishes.

Desktop sidebar, top to bottom:

- Daily Operations: Scheduling, Tasks, Messages, Company Updates, Forms, Operations, Calendar.
- Inventory & Cost: Inventory, Expenses.
- Insights: Reports, Analytics, AI Insights.
- Team & HR: Team Directory, Performance, Recognition, Leaderboard, Learning Center, Certifications, Resources.

Phone icon bar: Dashboard, Scheduling, Tasks, Messages, Team Directory, then More. More holds the rest of those links. There is no Admin icon and no Admin group. On a wide phone the groups read Ops, Inventory, Insights, and Team.

Settings opens from the profile card in the header, at `/app/settings`. It is not in the sidebar or the bottom nav. `/admin` and `/app/admin` open the team directory.

While you click through:

1. Dashboard loads. Recent Activity still says activity tracking is coming soon.
2. Scheduling opens the week. If the schedule query fails, the page says read-only preview mode.
3. Tasks opens on My shift. The tabs are My shift and All tasks. There is no Setup tab. Creating a task has no linked goal.
4. Scheduling week: assigned shifts are solid color blocks. Open shifts are a lighter wash of the same color with a thick bar. A day with an event shows a small notice on that day. That notice opens Calendar on that day and that event. The calendar week shows the event as a color block, like a shift. Events are set up on Calendar, not by dragging a block onto the schedule. Shift details does not repeat the calendar sentence.
5. A shift’s Tasks tab has a simple task: name, description, start, end, and people. There is no priority and no minutes. Under that, Choose a form opens published forms. Link adds the one you pick. On the shift, Fill and send opens the form to submit. Edit and Publish stay on Forms.
6. Forms: New form is one screen, with create, a template on that screen, or import. A template opens with its fields. Save and Publish keep those fields. The form editor has Cancel, and no second close icon. The forms list has Fill, Submissions, and Edit as separate buttons. Submissions is where the answers are. Tasks and Analytics read those same answers. Delete is on the row, including drafts. Closing a new form with no fields removes that draft. On a phone the form table scrolls sideways and the header stays put.
7. Insights → AI Insights loads text. On a phone the chat is a bottom sheet above the icon nav.
8. Team Directory opens. The old Admin page is not a separate item.
9. Profile card → Settings opens.

## 1. Features in code

Public pages outside the module inventory: `/` (marketing), `/features`, `/pricing`, `/templates`, `/templates/[templateId]`, `/auth`, `/register`, `/company-registration`. `/onboarding` only redirects to `/company-registration`. `/app` only redirects to `/app/dashboard`.

### Production

These routes mount real feature pages and are marked production in `moduleRouteInventory.json`. The sidebar (`navigationData.tsx`) is the four groups in the manual smoke section above. Dashboard is on the bottom nav and in the command palette, not in that sidebar list. Settings opens from the header profile card. Items, Counts, Purchasing, Prep, Cookbook, and Inventory Reports are linked from the inventory nav, not the main sidebar.

| Feature | Route | Code |
| --- | --- | --- |
| Dashboard | `/app/dashboard` | Operator command center reads tenant labor, tasks, and stock. The Recent Activity card is a static “coming soon” stub. |
| Scheduling | `/app/enhanced-scheduling` | Week calendar, assignments, availability, and time off. If the scheduling query fails, the page fills in demo shifts and toasts “preview mode.” |
| Tasks | `/app/tasks` | Tenant tasks, filters, reminders, and activity. The task dialog still offers “Select goal” after the goals feature was removed. |
| Messages | `/app/messages`, `/app/messages/[filter]` | Conversations and channels. The filter path is a child route, not a sidebar item. |
| Company Updates | `/app/company-updates` | Announcement feed and composer. |
| Forms | `/app/forms` | Checklist and form builder, plus fill. The scanner field writes mock scan data. |
| Inventory | `/app/inventory` | Item, stock, and waste totals from tenant queries. |
| Items setup | `/app/inventory/items` | Item and unit setup. Not in the main sidebar. |
| Counts | `/app/inventory/counts`, `/app/inventory/counts/[countId]` | Count list and count detail. Not in the main sidebar. |
| Purchasing | `/app/inventory/purchasing` | Live purchasing UI (`src/features/inventory/components/Purchasing.tsx`). Not in the main sidebar. |
| Waste and actions | `/app/inventory/actions` | Logs waste, adjustments, transfers, and production. Hidden from the main sidebar; linked inside inventory. |
| Reports | `/app/reports` | Pilot reports page under `src/features/analytics`. |
| Team | `/app/employees` | Directory and invites. |
| Settings | `/app/settings` | Company, security, localization, notifications, and feature panels. Marked production in the inventory. |
| Profile | `/app/profile` | User menu page, not a sidebar module. |
| Position management | `/app/position-management` | Hidden admin page. |
| Section permissions | `/app/sections-permissions` | Hidden; also reachable from settings and team. |

**Labeled production, but the page is a shell (abandoned or unfinished):**

- **Prep** `/app/inventory/prep` — `mockPrepItems` is hardcoded to `[]` and the loaded inventory items are discarded. The route stays in the inventory nav.
- **Cookbook (canonical)** `/app/inventory/cookbook` — renders a “Cookbook Coming Soon” card. The working recipe page is the deprecated URL below.
- **Inventory reports** `/app/inventory/reports` — low stock can come from the dashboard hook; waste, variance, and prep tabs read an empty `placeholderReports` object.

### Beta

Marked beta in `moduleRouteInventory.json`. These pages still exist. The ones listed in `navigationData.tsx` are in the sidebar. Admin is not in that list and is not in the inventory. `/admin` and `/app/admin` redirect to `/app/employees`.

| Feature | Route | Flag |
| --- | --- | --- |
| Analytics | `/app/analytics` | Sidebar. Inventory note: still not operator reports. |
| AI Insights | `/app/ai-insights` | Sidebar. Page still has a placeholder insight. |
| Operations | `/app/operations` | Sidebar. KPI hooks return mock summaries when `get_kpi_summary` is missing. |
| Calendar | `/app/calendar` | Sidebar. Google Calendar import is marked coming soon. |
| Expenses | `/app/expenses` | Sidebar. Page lives in `src/features/inventory`, not `src/features/finance`. That folder does not exist; the inventory owner field is stale. |
| Performance | `/app/performance` | Sidebar. |
| Recognition | `/app/recognition` | Sidebar. |
| Leaderboard | `/app/leaderboard` | Sidebar. `src/features/gamification`. |
| Learning Center | `/app/learning-center` | Sidebar. |
| Certifications | `/app/certifications` | Sidebar. |
| Resources | `/app/resources` plus docs, blog, and video child routes | Sidebar. `DocumentationDetail` still says the body is a placeholder. |
| Meetings | `/app/meetings` | Redirects to `/app/calendar`. |
| Events calendar | `/app/events/calendar` | Redirects to `/app/calendar`. |
| HR development | `/hr-development` | Not in the inventory. Public gamification page, outside `/app`. |

**In code, hidden, not beta and not production:** `/app/add-section`, `/app/section/[path]`, `/app/permission-demo`. Permission demo is an internal page with no tenant data.

### Deprecated

Aliases in `moduleRouteInventory.json`, plus two abandoned redirects that are no longer in that file.

| Route | What the page does now |
| --- | --- |
| `/app/items-setup` | Redirects to `/app/inventory/items`. |
| `/app/availability`, `/app/availability/manage` | Redirect into enhanced scheduling. `src/features/availability` still has its own panels; the routes do not use them. |
| `/app/schedule-lobby` | Redirects to `/app/enhanced-scheduling`. |
| `/app/scheduling/timeoff`, `/app/time-off` | Redirect to the time-off panel. Inventory still lists `/app/time-off` as hidden, not deprecated. |
| `/app/invite-employee` | Client redirect to `/app/employees?invite=1`. |
| `/app/goals` | Redirects to `/app/tasks`. **Abandoned:** `src/features/goals` is gone. |
| `/app/help-desk` | Redirects to `/app/messages`. **Abandoned:** `src/features/helpdesk` is gone. |

**Marked deprecated, but still mount a full page (not a redirect):**

- `/app/cookbook` — the real cookbook UI (`src/features/inventory/pages/Cookbook.tsx`). On error it shows demo recipes. The production URL above is the coming-soon shell.
- `/app/purchasing` — a second purchasing page (`pages/Purchasing.tsx`), separate from the canonical component.
- `/app/inventory-actions` — same actions UI as `/app/inventory/actions`.
- `/app/inventory-count-execution/[[...countId]]` — still renders count execution instead of redirecting to `/app/inventory/counts`.

## 2. How the app works

Sign-in, invite signup, and password reset live at `/auth`. `NavigationGuard` and `ProtectedRoute` send anonymous users away from `/app/*`, and send an existing session from `/auth` or `/` to `/app/dashboard`. A new owner finishes `/company-registration`, which signs them up, calls the server onboarding API, stores `company_id` on the profile, and opens the dashboard; `AppShell` holds the sidebar until that profile is a real company, not a placeholder. The dashboard command center loads that tenant’s labor, tasks, and stock. Scheduling (`/app/enhanced-scheduling`) is the week calendar, with availability and time off as panels on the same page; tasks, messages, and forms are separate tenant-backed pages for assignments, conversations, and checklists. Inventory (`/app/inventory`) reads items, stock, and waste, and its own nav opens items, counts, purchasing, and waste actions. Settings stay on the profile card. The Admin page is gone; both admin URLs open the team directory.

## 3. Top five unfinished items

Ranked by what still blocks a restaurant from running a real pilot. There is no pilot sign-off file in the repo. `docs/test-results/visible-modules-smoke.json` is not in the repo.

1. **The 11-route pilot path has no sign-off record in the repo.** Dashboard, team, settings, scheduling, tasks, messages, company updates, forms, inventory, purchasing, and reports are marked production in `moduleRouteInventory.json`. **Fix:** run visible-module smoke against a seeded company and repair whatever fails on those 11 routes before treating the demo path as done.
2. **Live screens substitute demo data when queries fail.** Scheduling injects fallback shifts, the working cookbook shows demo recipes, and operations returns mock KPIs. **Fix:** on a failed or missing tenant query, show an empty or error state and do not render fallback shifts, recipes, or KPI mocks.
3. **A new owner can still get stuck before the dashboard.** Signup continues without a session when email confirmation blocks `signInWithPassword`, and a permissions failure tells the user to check the onboarding service-role key. **Fix:** make `/company-registration` finish with a session and a `company_id` profile and land on `/app/dashboard` with no second sign-in and no manual env step.
4. **Inventory routes the inventory file calls production are split or empty.** `/app/inventory/prep` is an empty mock, `/app/inventory/cookbook` is a coming-soon card while the real cookbook is only on `/app/cookbook`, and inventory-report waste, variance, and prep tabs are placeholders. The main sidebar does not link items, counts, or purchasing. **Fix:** point the canonical prep, cookbook, and inventory-report routes at the live item, recipe, waste, and count queries, and add Items, Counts, and Purchasing to the pilot sidebar.
5. **Abandoned and beta pages are still one click from the pilot.** Goals and Help Desk are redirect stubs with no feature folders, availability UI is unused, resources docs are placeholders, and analytics, AI, operations, expenses, and the HR modules stay in the default sidebar. Admin is no longer a sidebar or bottom-nav item. **Fix:** remove `/app/goals` and `/app/help-desk`, redirect the flat inventory aliases, and hide beta sidebar entries until the 11 pilot routes are verified.
