# Tasks page launch audit (coffee shops)

**Date:** 2026-11-27  
**Branch:** `cursor/tasks-audit-f289`  
**Scope:** `/app/tasks` end to end — owner, manager, and staff flows. Audit only (no product code changes in this PR).  
**Out of scope:** PR #99 (mark-done depth). Production data; migrations; deploy.

## Method

| Activity | Result |
| --- | --- |
| Code review | `src/features/tasks/**`, `app/app/tasks/page.tsx`, RLS in `migrations/20261104020910_task_visibility_audiences.sql` (tasks visibility), role matrix in `src/features/roles/constants/productRoleContract.json` |
| Unit tests | `node scripts/test-tasks-page.mjs` — **passed** |
| E2E (Playwright, test owner via env) | `e2e/task-create.spec.ts`, `e2e/tasks-permissions.spec.ts`, `e2e/tasks-list-depth.spec.ts`, `e2e/tasks-details-depth.spec.ts`, `e2e/tasks-activity-warnings-depth.spec.ts`, `e2e/tasks-readiness-depth.spec.ts` — **8/8 passed** |
| i18n gate | `npm run check:i18n` — six locales aligned (7912 keys each); baseline hard-coded literals unchanged |
| Phone layout | iPhone 13 viewport, signed in as test owner — screenshots in `docs/plans/tasks-audit-screenshots/` |

### Role expectations (launch baseline)

| Role | See tasks | Create custom | Edit/delete fields | Team list | Shift / checklists |
| --- | --- | --- | --- | --- | --- |
| **Owner / Admin** | All (`viewTeamTasks`, `editTasks`) | Yes (all six `tasks.*.create_*` keys + legacy `editTasks`) | Yes (`editTasks`, `tasks.update`, `tasks.delete`) | Yes | Full |
| **Manager (default)** | All | Yes | Yes | Yes + list issues | Full + `TodayShiftMonitor` when `editTasks` |
| **Staff (default)** | Own + audience (`viewOwnTasks`, `tasks.view`) | No (no custom/shift/checklist create keys) | Own tasks only via RLS (`viewOwnTasks` + on-task); no `editTasks` | No | **My shift** board (opening/daily/closing lists, shift tasks) |

Server enforcement: task `SELECT`/`UPDATE`/`DELETE` use `current_user_can_view_task` / `current_user_can_edit_task_audience` / `current_user_can_delete_task` (see migration above). Client also filters with `canSeeTask` in `Tasks.tsx`.

---

## Phone screenshots

| State | File |
| --- | --- |
| Default **My shift** | `docs/plans/tasks-audit-screenshots/tasks-phone-my-shift.png` |
| **All tasks** (filters + list) | `docs/plans/tasks-audit-screenshots/tasks-phone-all-tasks.png` |

---

## Findings (prioritized)

### P0 — Broken / security

#### T-P0-1 — Status workflow is not enforced on the server

| | |
| --- | --- |
| **Where** | `src/features/tasks/hooks/useTasks.tsx` (`TASK_STATUS_TRANSITIONS`, `updateStatus`); `src/features/tasks/repositories/tasksRepository.ts` (`updateTaskRow`); RLS policy `Permissioned users can update tasks` |
| **Reproduce** | As a user who can update a task (assignee with `viewOwnTasks`, or `tasks.update`, or `editTasks`), issue a direct `PATCH` on the `tasks` row with `status` jumping e.g. `todo` → `completed` while skipping `in_progress`, or `completed` → `cancelled`. UI enforces transitions; the API does not. |
| **Café impact** | Closing/opening checklists that rely on status for accountability can be bypassed by anyone with edit access on the row. |
| **Fix scope (batch A)** | DB trigger or RPC `update_task_status(task_id, next_status)` that validates against the same graph as `TASK_STATUS_TRANSITIONS`; wire `updateStatus` / direct updates through it. Add one SQL test in a pgTAP SQL test file in the repo + extend `scripts/test-tasks-page.mjs` or a small repository test. |

#### T-P0-2 — Task notification inserts omit `company_id` while RLS policies assume it

| | |
| --- | --- |
| **Where** | `src/features/tasks/hooks/useTaskNotifications.tsx` (`checkDueTasks` → `createTaskNotification`); `src/features/tasks/repositories/taskNotificationsRepository.ts`; RLS `Members can insert task notifications`; trigger `set_task_notification_company_id` in `20260525000200_phase19_people_messages_domain_replacement.sql` |
| **Reproduce** | Sign in, open `/app/tasks`, wait for due/overdue poll (5 min) or trigger assigned tasks with due dates. Watch browser console / logs for `createTaskNotification` / Zod failures. E2E depth runs logged `ZodError` on `id` / `created_at` / `read_at` when insert responses were incomplete (mocked writes). |
| **Café impact** | Managers and baristas may not get due/overdue badge counts in the bell menu when inserts fail; floor misses time-sensitive work (pastries, dairy, cash pull). |
| **Fix scope (batch B)** | Pass `company_id` from task row or profile on every `createTaskNotification`; regenerate types so `task_notifications.company_id` is in `generated client types`; harden `notificationSchema` for nullable DB defaults; Playwright assertion that insert returns full row. |

---

### P1 — UX / business-blocking

#### T-P1-1 — “All tasks” on phone is a compressed desktop layout, not a staff/manager phone workflow

| | |
| --- | --- |
| **Where** | `src/features/tasks/pages/Tasks.tsx`; `TaskViewSection`, `TaskStatusTabs`, `TaskExecutionReadinessPanel`, grid of `RemindersPanel` + `TaskActivityFeed` |
| **Reproduce** | iPhone 13 → `/app/tasks` → **All tasks**. Scroll: board switch, long “View” section (status grid + search + 3 selects + readiness chips), warnings, list, then reminders + activity. See `tasks-phone-all-tasks.png`. |
| **Café impact** | During service, a manager on the floor cannot scan “what’s overdue **now**” without heavy scrolling; reads as back-office software, not a shift tool. |
| **Fix scope (batch C)** | Mobile-only layout: collapse filters behind one sheet; pin readiness counts + sort; move activity/reminders to a second tab or Overview; keep **My shift** as default (already is). Playwright mobile project + screenshot diff. |

#### T-P1-2 — No sort control; list order is always `created_at` descending

| | |
| --- | --- |
| **Where** | `fetchTasksByCompany` in `tasksRepository.ts` (`.order("created_at", { ascending: false })`); `filterTasks` has no sort |
| **Reproduce** | **All tasks** with mixed due dates — order does not change when toggling readiness filters or priority. |
| **Café impact** | Opening rush: “due at 7am” tasks sit under tasks created last night. |
| **Fix scope (batch D)** | Client sort options: due date (nulls last), priority, updated_at; persist in `useTaskFilters`; optional server index if lists grow. Unit test sort helper; Playwright selects “Due soon” sort. |

#### T-P1-3 — Custom tasks created from **My shift** do not appear until the user switches to **All tasks**

| | |
| --- | --- |
| **Where** | `Tasks.tsx` — list renders only when `boardMode === "all"`; FAB create menu visible in both modes |
| **Reproduce** | Stay on **My shift** → + → New custom task → save. No new card until **All tasks** + search (see `e2e/task-create.spec.ts` `expectTaskInList`). |
| **Café impact** | Barista told to “add a task” believes it failed; duplicate work or missed follow-up. |
| **Fix scope (batch E)** | After create: toast with link, auto-switch to **All tasks** filtered to assignee, or show “Your tasks today” strip on My shift. E2E update. |

#### T-P1-4 — Execution UI uses `editTasks` only; granular `tasks.update` is ignored in the dialog

| | |
| --- | --- |
| **Where** | `TaskDetailsDialog.tsx` — `canEdit = can("editTasks")` gates assignment, execution card, delete; workflow buttons are always shown |
| **Reproduce** | Deny `editTasks` but grant `tasks.update` (matrix “Run lists” create_delete). Open task: workflow works; **Execution Controls** hidden (`e2e/tasks-details-depth.spec.ts` second case). Reverse: staff sees workflow without execution (expected for staff). |
| **Café impact** | Shops that grant leads `tasks.update` without full `editTasks` cannot fix titles/due dates from the phone; they use status buttons only. |
| **Fix scope (batch F)** | Derive `canEditExecution` from `editTasks` \|\| `tasks.update` (and audience). Hide workflow actions when update not allowed. Mirror in `CreateTaskDialog` if needed. Permission Playwright matrix. |

#### T-P1-5 — `TodayShiftMonitor` (floor progress) is manager-only via `editTasks`, not `viewTeamTasks`

| | |
| --- | --- |
| **Where** | `Tasks.tsx` — `boardMode === "shift" && can("editTasks")` |
| **Reproduce** | Manager role with `viewTeamTasks` but `editTasks` off → **My shift** has no monitor strip. |
| **Café impact** | Supervisor cannot see which tills have not finished opening checklist without Schedule or Forms. |
| **Fix scope (batch G)** | Show read-only monitor when `viewTeamTasks` \|\| `tasks.list_issues.read`; keep write actions behind `editTasks`. |

#### T-P1-6 — Full status workflow (In review, Blocked, Cancelled) is heavy for daily café operations

| | |
| --- | --- |
| **Where** | `TaskDetailsDialog.tsx` workflow; `TASK_STATUS_FLOW` in `constants/taskStatus.ts`; status tabs on **All tasks** |
| **Reproduce** | Open any custom task → multiple workflow buttons. Compare to **My shift** → single **Mark done** (`MyShiftTasks.tsx`). |
| **Café impact** | Trainees must learn enterprise workflow; opening/closing is one tap on shift board but multi-step elsewhere — inconsistent muscle memory. |
| **Fix scope (batch H)** | Product: “Simple mode” for custom tasks (Mark done / Undo only) for staff; keep full workflow for managers. Tie to PR #99 mark-done depth. Feature flag or `tasks.simple_workflow` permission. |

#### T-P1-7 — No recurrence on custom tasks (only shift weekday templates + reminders)

| | |
| --- | --- |
| **Where** | `docs/features/tasks.md` Decision 10; `WeekdayTaskSetup.tsx` / `shiftWeekdayTask.ts`; `CreateTaskDialog.tsx` (no repeat fields) |
| **Reproduce** | Create custom task — no repeat. Recurring vendor delivery exists only as shift-linked weekday pattern from schedule side. |
| **Café impact** | “Count safe every Monday” must be recreated manually or live on shift editor — friction for multi-site owners. |
| **Fix scope (batch I)** | Deferred product decision; if launched: `links.recurrence` + cron materializer (separate from Decision 10 engine scope). Document workaround: shift task + weekday pattern. |

#### T-P1-8 — Dual `done` vs `completed` storage still surfaces in filters and labels

| | |
| --- | --- |
| **Where** | `useTasks.tsx` `STATUS_ALIASES`; `filterTasks` treats both as Done tab; DB enum may store `completed` |
| **Reproduce** | Complete task from My shift (`updateStatus(..., "completed")`) vs dialog “Done” — mixed storage. **All** → Done tab includes both (by design). |
| **Café impact** | Reporting and integrations counting “open” tasks may disagree with UI if they filter only `todo`. |
| **Fix scope (batch J)** | Normalize writes to one canonical status; migration to backfill; KPI scripts audit. |

---

### P2 — Polish

#### T-P2-1 — Status tab grid uses `minmax(6.5rem, 1fr)` — tight labels in ES/DE/FR on narrow phones

| | |
| --- | --- |
| **Where** | `TaskStatusTabs.tsx` |
| **Reproduce** | Switch profile language to DE → **All tasks** → status row wrap/truncation. |
| **Café impact** | Minor readability for multilingual crews. |
| **Fix scope** | Increase min width on mobile or vertical stack; visual regression on six locales. |

#### T-P2-2 — Due dates in task details use `date-fns` `format` without locale

| | |
| --- | --- |
| **Where** | `TaskDetailsDialog.tsx` (`completed_at` display); similar in `TaskCard.tsx` |
| **Reproduce** | Non-English locale → month names stay English. |
| **Fix scope** | `format` with `i18n.language` or shared date helper used elsewhere. |

#### T-P2-3 — `TaskMetricsCards` is unused dead code on the page

| | |
| --- | --- |
| **Where** | `src/features/tasks/components/TaskMetricsCards.tsx` (not rendered per `docs/features/tasks.md` phase notes) |
| **Fix scope** | Delete or wire to manager dashboard; keep file-length allowlist clean. |

#### T-P2-4 — Generated DB client types missing `task_notifications.company_id`

| | |
| --- | --- |
| **Where** | `generated DB client types` vs migrations adding `company_id` |
| **Fix scope** | Regenerate types after confirming remote column; no user-facing change. |

#### T-P2-5 — Activity feed + reminders always below the full task list on **All tasks**

| | |
| --- | --- |
| **Where** | `Tasks.tsx` `tasks-below-list` grid |
| **Café impact** | Manager misses recent completions until scroll. |
| **Fix scope** | Collapsible sections or tab with unread count. |

#### T-P2-6 — Handover / “task for tomorrow” from forms is implemented but not surfaced as checklist follow-up on Tasks

| | |
| --- | --- |
| **Where** | `handoverTask.ts`, `docs/features/tasks.md` Decisions 6–9 (no auto-link to next opening) |
| **Café impact** | Closing note creates a task but next opener must find it under custom/filter — not tied to opening list. |
| **Fix scope** | Product follow-up (explicitly deferred in feature doc); optional badge “Handover” on kind filter. |

---

## Suggested PR batches (focused)

| Batch | IDs | Est. touch |
| --- | --- | --- |
| A — Server status graph | T-P0-1 | SQL function + hook swap + test |
| B — Notifications hardening | T-P0-2 | Repository + hook + types regen |
| C — Phone **All tasks** IA | T-P1-1, T-P2-5 | `Tasks.tsx`, new mobile subcomponents |
| D — Sort | T-P1-2 | `taskFiltering.ts`, `TaskFilters.tsx`, locales |
| E — Create feedback | T-P1-3 | `CreateTaskDialog` / toast / E2E |
| F — `tasks.update` UI parity | T-P1-4 | `TaskDetailsDialog`, permission helper |
| G — Shift monitor visibility | T-P1-5 | `Tasks.tsx`, `TodayShiftMonitor` read-only |
| H — Simple workflow / mark-done | T-P1-6 | Coordinate with PR #99 |
| I — Recurrence (if approved) | T-P1-7 | New links schema + cron |
| J — Status normalization | T-P1-8 | Migration + write path |
| K — i18n polish | T-P2-1, T-P2-2 | Tabs + date formatting |

---

## What already looks launch-ready

- **My shift** board: opening/daily/closing lists, inline checklist items, closing notes, shift tasks with **Mark done** — aligned with cashier/barista day (`MyShiftTasks.tsx`, `useMyShiftBoard.ts`).
- **Single FAB create** with permission keys (`TaskCreateMenu`, e2e permissions).
- **Readiness filters** (overdue / unassigned / due today) scoped to status tab (`readinessFilters.ts`, e2e readiness depth).
- **Kind badges** Shift / Checklist / Custom + filter (`taskKind.ts`).
- **List issues** gated on `tasks.list_issues.read` (`ListIssueGather.tsx`).
- **RLS audience model** for view/edit/delete (migration above; SQL visibility test in repo).
- **Six-locale keys** for Tasks strings (`check:i18n` clean).

---

## Summary counts

| Priority | Count |
| --- | --- |
| P0 | 2 |
| P1 | 8 |
| P2 | 6 |
| **Total** | **16** |

### Top 5 to address before calling Tasks “floor-ready”

1. **T-P0-1** — Enforce status transitions on the server.  
2. **T-P0-2** — Reliable due/overdue notifications (`company_id` + insert path).  
3. **T-P1-1** — Phone-native **All tasks** (or steer managers to a lighter overview).  
4. **T-P1-2** — Sort by due date / priority.  
5. **T-P1-3** — Visible confirmation after creating a task from **My shift**.
