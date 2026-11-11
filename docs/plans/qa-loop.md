# QA loop

Ops v1 block, Friday 6 Nov 2026, 9:00 AM–1:00 PM America/New_York. Do not start a new area once that window ends. Items 1, 2, and 6 shipped in the earlier 4:00–6:00 AM block.

## Ops v1

1. Pack feature-flags stub — done
   - Operations is always available. Team, Insights, and Stock default off.
   - Company override is `system_settings.admin_config.packFlags` (no new table, no migration).
   - Employee directory stays in the Operations nav. `/app/employees` is not pack-blocked.
   - Operations Intelligence is gated with Insights. Inventory and expenses are gated with Stock. Team training, certifications, performance, recognition, leaderboard, and resources are gated with Team.
   - `e2e/pack-flags.spec.ts` passed locally for flag-off and flag-on (English locale, test login).
   - Dev/Playwright override: sessionStorage `flowforce:pack-flags`. Production builds ignore it.
   - Smoke seed turns the three packs on so the visible-module smoke still opens those routes.
2. Store (location) selection on invite, end to end — done
   - The invite form lists the company's active stores from `inv_locations` (`id`, `name`, `is_active`).
   - The chosen store is saved on `company_invites.location_id` and copied onto `profiles.location_id` when access is applied. No new migration.
   - Owners and admins can assign any active store. A manager with a home store can assign only that store. `manageUsers: false` cannot invite.
   - A store is required when the company has an active store.
   - `e2e/invite-location.spec.ts` signs in with the test user, pins English, picks a real store, and stops the invite request before it is stored.
3. Forms and lists attached to roles, with fill and see audiences, plus creator-set due timing — done
   - There are no fixed open, mid, or close time slots. Each form or list has its own optional show-from time and a due time, set by the creator.
   - After the due time passes, it stops showing to fillers. Creators and people who can manage forms still see the row.
   - Stored on the existing `forms.settings.distribution` object (attached company roles, fill audience, see audience, show-from, due). No new table and no migration.
   - `e2e/form-distribution.spec.ts` pins English, signs in with the test user, checks due-time and audience hiding, and stops the save before it is stored.
4. Publishing a schedule produces day-of "My Shift" lists by scheduled role — done
   - A published shift shows the lists attached to that shift's role for the day of the shift. A draft shift does not.
   - The role match uses the shift role name, or the position's company role. Lists past their due time stay hidden.
   - `e2e/my-shift-role-lists.spec.ts` pins English, signs in with the test user, and checks the published shift in the browser response. Nothing is stored.
5. Ops-only invite flow: invite → company basics (welcome, docs, rules; non-blocking) → first shift — done
   - When Team is off, the invite dialog is three steps: invite, company basics, then first shift. When Team is on, the dialog stays the direct send form.
   - Company basics reads the company description, uploaded documents, and scheduling-rule policies. Empty sections stay empty. Skip and Continue both move on. Nothing on this step is required.
   - The first shift is optional. Skip sends the invite without one. Adding a shift sends `firstShift` on the invite. The server stores an unpublished schedule on `schedules.requirements.opsInvite` and assigns it when the invited user exists. No new table and no migration.
   - Creating that shift requires `schedule.create`, `schedule.edit`, or `editSchedules`. `manageUsers: false` still cannot invite.
   - `e2e/ops-invite-flow.spec.ts` pins English and Team off, signs in with the test user, walks the steps, and stops the invite request before it is stored.
6. Employee directory stays in basic Ops (not gated) — done
   - Satisfied by item 1. The directory sits in Daily Operations, stays on the primary nav when Team is off, and `/app/employees` does not show the pack block.
7. Café starter template: Barista role + opening/closing lists — done
   - Forms can add a Barista role plus an opening list and a closing list.
   - Each list uses the existing per-form show-from and due time. There is no fixed open, mid, or close slot.
   - The lists attach to the Barista role. A published Barista shift shows the lists that are still open on My Shift. A draft shift does not.
   - `useCan("createForms")` shows the button. Adding the role also requires `useCan("systemSettings")`. An existing Barista role is reused.
   - No sample people, schedules, inventory, or automations. No new table and no migration.
   - `e2e/cafe-starter.spec.ts` pins English, signs in with the test user, checks both lists, and stops the role and form writes before they are stored.
8. Packs discovery and self-serve purchase — done
   - Packs are not on Overview. The **+** next to OPS in the bottom nav (desktop and mobile) lists Team, Insights, and Stock and what each unlocks. Opening one goes to `/app/packs/:pack` with a buy button.
   - Locked prices, USD, per company, monthly, quantity 1: Ops $59, Team $19, Insights $19, Stock $29. Team, Insights, and Stock are à la carte add-ons on Ops. One Stripe account. Price ids stay in `STRIPE_PRICE_OPS`, `STRIPE_PRICE_PACK_TEAM`, `STRIPE_PRICE_PACK_INSIGHTS`, and `STRIPE_PRICE_PACK_STOCK`.
   - Cards show those amounts. When a pack env var is unset, that pack shows "Pricing coming soon" and does not call Stripe. A yearly Stripe price is refused.
   - When a monthly test price is set, `POST /api/packs/checkout` creates a Stripe test-mode subscription Checkout Session. Live keys are refused. `checkout.session.completed` (paid) sets that pack's flag in `system_settings.admin_config.packFlags`. Subscription cancel clears it. Manage or cancel uses the Stripe customer portal. No new table and no migration.
   - A new company stores basic Ops flags: Operations on, Team, Insights, and Stock off.
   - `e2e/packs-discovery.spec.ts` and `e2e/landing-packs.spec.ts` pin English, mock Stripe, and do not write settings.
   - Stripe test prices were not created in this run: no `STRIPE_SECRET_KEY` was available. Dashboard steps and amounts are in `docs/billing-readiness.md`. The three env vars stay unset in the repo.

## After Ops v1

Real-store locations (Pedro-approved after Ops v1) — done
- Migration `20261107085004_company_stores` was applied to production. Shops live in `public.stores` with name, address, and hours. The Walk-in inventory row is hidden and was not deleted. No store rows were backfilled, because only Walk-in existed.
- Ops v1 items 1–8 are done. Pack prices are the locked amounts in item 8: Ops $59, Team $19, Insights $19, Stock $29.

## Sunday 8 Nov 2026, 4:00–6:00 AM America/New_York

Invite and onboarding follow-up — done in this block
- Sending an invite saves the Company basics hiring blocks. The hire sees the shared welcome page. A required collect step, including a file, blocks "I'm ready for the floor".
- The directory shows the company job role apart from the access level. Status is "Invited, not signed in yet" until activation, then "Active", with last sign-in written by the app after a password sign-in.
- Production already has `hire_followup` as version `20261108023544` and `security_invoker_views` as version `20261108085636`. Both files are in the repo under those versions. They were applied by Patron. This block does not apply SQL.

Language save and activity sentences — done (#51)
- A language change applies only when the person saves it.
- Activity history names the person and the setting that changed.
- The business-structure snapshot and the high-risk admin cards are removed.

Closing notes and card tint — done (#52)
- Closing notes no longer offer Draft.
- Overview and Tasks cards use the same highlight tint as Schedule and Team Directory, in light and dark.

## General areas

Sunday 8 Nov 2026, 9:00 AM–1:00 PM America/New_York. Do not start a new area after 1:00 PM.

1. Schedule — done
   - Create, edit, assign, and delete are separate switches. The compact access matrix no longer ties edit to draft weeks. Team hours lists the four write keys on their own.
   - The week desk shows add, copy, and templates for create, publish for edit, and empty-week for delete. Moving a shift to another day needs edit. Moving it onto a person needs assign.
   - Draft shifts load for edit or draft-week access. The job title and user metadata no longer decide that.
   - Role templates come from the company's saved shift templates. The sample Barista and Cook pack is not shown.
   - `e2e/schedule-permissions.spec.ts` pins English, signs in with the test user, opens the desk and the new-shift form (role, department, tasks), and checks each write permission on its own. Nothing is stored.
   - `e2e/shift-role-department.spec.ts` and `e2e/my-shift-role-lists.spec.ts` passed again.
2. Messages — done
   - New chat and the group form need `messages.send`. Channel settings need `messages.manage`. Those two stay separate.
   - Empty chat lists, the new-group steps, the creating label, and a file-only message go through all six locales.
   - `e2e/messages-permissions.spec.ts` pins English, signs in with the test user, opens new chat and the group name field, and checks send on and off. Nothing is stored.
   - Production already has `messages_realtime_publication` as version `20261108151539`. The file is in the repo under that version. It was applied outside this block. This block does not apply SQL.
Hire flow, forms layout, and HR readiness on Insights — done (#55)
   - New-hire onboarding uses the same tinted cards as the shop welcome. The owner checklist counts owner blocks, not an empty welcome slot. Invite preview uses `HiringChecklistView`.
   - Form fill is one scrolling field list with submit at the bottom. Submissions empty state says no forms submitted yet. Submissions load profiles without the broken embed join.
   - HR readiness moved from Team Directory to Overview when the Insights pack is on.
   - `e2e/invite-activation.spec.ts`, `tests/playwright/employee-onboarding-preview.spec.ts`, and the onboarding or overview unit scripts passed. No new migration.
3. Company Updates — done
   - Main `/app/company-updates` uses `canManageCompanyUpdates` (`updates.manage`, settings keys, manager role). Dashboard card and custom section table no longer gate on `systemSettings` alone.
   - Section builder opens `CreateUpdateWizard` instead of a dead New Update log. Table badges and priorities use locale keys; unused filter and export buttons are removed.
   - `e2e/company-updates-permissions.spec.ts` pins English, signs in with the test user, opens the wizard, and hides New update when `updates.manage` is denied on a staff role. Nothing is stored.
4. Tasks — done
   - Custom create follows `tasks.custom.create_self` / `create_others`, with `editTasks` as legacy others. The floating + menu is the only create control; self-only shows Assigned to you in the dialog. List issues need `tasks.list_issues.read`.
   - `e2e/task-create.spec.ts` and `e2e/tasks-permissions.spec.ts` pin English, sign in with the test user, walk My shift and All tasks, block writes for the permission run, and exercise create gates. Create/delete in task-create stores one row then removes it.
5. Forms — done
   - Create UI follows `createForms`. `manageForms` is required for delete (not `createForms` alone). Fill uses `forms.submit`. Other people's submissions use `forms.submissions.read` / `approveFormSubmissions` / `manageForms`, with deny override on read hiding team submissions.
   - `e2e/forms-permissions.spec.ts` and `e2e/form-distribution.spec.ts` pin English, sign in with the test user, inject a published open form, block form writes before sign-in, and exercise each gate. Distribution spec still stops save before storing settings.
6. Calendar — skipped. Removed in #47. Do not bring it back.
7. Goals — done
   - `/app/goals` redirects to `/app/tasks`. Goal UX lives on `/app/performance` under Goal progress, gated by `goals.view` or `goals.manage` (`goals.manage` is matrix edit; no standalone Goals module).
   - Performance KPI labels use `performance.kpi*` locale keys across all six locales. `performanceMocks` is not wired into live loads.
   - `e2e/goals-permissions.spec.ts` pins English, signs in with the test user, checks the redirect, blocks goal writes before sign-in, and hides Goal progress when both goal keys are denied.
8. Docs — done
   - Help getting-started uses locale keys; documentation detail drops the English stub. Report inbox status labels and upload use `documents.manage` (`documents.view` paired in the matrix).
   - `e2e/docs-permissions.spec.ts` pins English, signs in with the test user, opens getting started (Team pack), blocks document writes before sign-in, checks report upload when `documents.manage` is denied, and opens onboarding settings documents upload. Nothing is stored.
9. Reviews — done
   - Production `performance_reviews` has only `id`, `company_id`, `employee_id`, `reviewerid`, `created_at`, and `updated_at`. Loads use those columns and `created_at` filtering instead of missing `goal_id` / `review_date` fields. `performance_goal_reviews` returns an empty list when the table has no enriched review columns (no migration).
   - Recent reviews on `/app/performance` gates on `reviews.manage` or `reviews.view_own`. KPI avg score ignores unscored stub rows.
   - `e2e/reviews-permissions.spec.ts` pins English, signs in with the test user, checks the reviews section permission gates, and asserts the reviews REST select omits `goal_id`. Review writes are blocked before sign-in.
10. Time off — done
   - Team time off loads filter `time_off_requests` by `company_id` (not embedded `user.company_id`). Approve/reject gates on `approveTimeOff` only (no manager-role bypass). Request UI gates on `timeoff.request`.
   - My time off and team rows use translated type/status labels; panel summary tiles and `formatRequestedWhen` empty state use locale keys across all six locales.
   - `e2e/time-off-permissions.spec.ts` pins English, signs in with the test user, checks request and approval gates, and asserts the team list REST query uses `company_id`. Writes are blocked before sign-in.
11. Analytics — done
   - Report inbox gates on matrix `reports.view` (not legacy ACL metadata roles). CSV export renders only with `reports.export`.
   - AI insights restricted state uses `data-testid="ai-insights-restricted"`. Engagement upsert writes `update_id` (production column) instead of missing `updateid`.
   - `e2e/analytics-permissions.spec.ts` pins English, insights pack, signs in with the test user, checks reports view/export gates and AI insights permission. Document writes blocked before sign-in.
12. Settings and roles — done
   - Sections & permissions opens role classes, operator grant grid (edit class), and the legacy module matrix. Broken links to `/settings?tab=roles` and `/settings/permissions` now target `/app/sections-permissions`.
   - Settings General shows the audit card behind `systemSettings`. Billing tab stays owner-profile only. Owner clamp in code always restores `approveTimeOff` and `reports.view` (seed contract already grants them for owner `*` and manager defaults).
   - Dashboard role overview smoke stays in `e2e/role-overview.spec.ts`; settings gates in `e2e/settings-roles-permissions.spec.ts`. Writes blocked before sign-in.

## Tuesday 10 Nov 2026, 4:00–6:00 AM America/New_York

Do not start a new area after 6:00 AM ET.

13. Overview / dashboard — done
   - Dashboard company-update type badges use `dashboard.*` locale keys instead of raw stored types.
   - `e2e/overview-permissions.spec.ts` pins English, signs in with the test user, checks My shift and My lists highlight classes in light and dark, gates Insights HR readiness with pack flags, and hides the dashboard Add Update control when `updates.manage` is denied for staff. `e2e/role-overview.spec.ts` and `e2e/overview-role-list.spec.ts` passed again. Nothing is stored.
14. Team Directory and invites — done
   - CSV export and resend invite follow `manageUsers` (export also allows `directory.manage`). Directory table copy uses locale keys for unnamed rows, initials fallback, and unset hire dates.
   - `e2e/employees-permissions.spec.ts` pins English, signs in with the test user, checks `directory.view`, `manageUsers`, invite, CSV export, and resend gates. Invite API writes are blocked. Nothing is stored.
15. Employee onboarding and welcome — done
   - Settings onboarding passes `canManageSteps` into `HiringBuilder`, so managers without `systemSettings` see the hire preview read-only and cannot save hiring blocks.
   - `e2e/employee-onboarding-welcome.spec.ts` pins English, checks the shop welcome layout (`Welcome to the shop` / `Before your first shift`), settings preview, hire checklist, invite activation, and onboarding settings gates. `e2e/invite-activation.spec.ts` passed again. Writes blocked before sign-in.

## Tuesday 10 Nov 2026, 9:00 AM–1:00 PM America/New_York

Do not start a new area after 1:00 PM ET.

16. Activity history — done
   - `describeActivity` covers settings detail sentences, hire onboarding events, invites, role and status changes, and permission overrides. Settings, admin audit, directory hire card, and per-employee audit tab stop showing internal action codes.
   - `e2e/activity-history.spec.ts` pins English, signs in with the test user, checks settings history and directory hire or audit copy, and gates the settings card on `systemSettings`. Writes blocked before sign-in.
17. Packs and billing — done
   - Owner billing tab lists Ops at \$59/mo, Team/Insights/Stock add-on prices, monthly total, and mocked checkout with no `system_settings` or live Stripe network writes. Staff never see the Billing tab.
   - `e2e/packs-billing.spec.ts` complements `e2e/packs-discovery.spec.ts` and `e2e/landing-packs.spec.ts`. Checkout and portal stay mocked; `billing.manage` deny gate remains in discovery spec.
18. Profile, account, and notifications — done
   - Employee drawer overview uses locale keys for department, hire date, and relative times. Profile and notification panels expose stable test ids.
   - `e2e/profile-account-notifications.spec.ts` covers `/app/profile`, personal language select-then-save (writes stubbed), and notification settings. Writes blocked before sign-in.
19. My Shift — done
   - `e2e/my-shift.spec.ts` pins English, signs in with the test user, checks Tasks My Shift for published role lists (no Draft closing labels), dashboard `overview-my-shift` highlight, and blocks submission writes. Complements `e2e/my-shift-role-lists.spec.ts`.

## Tuesday 10 Nov 2026, 2:00–5:00 PM America/New_York

Hard stop at 5:00 PM ET. Route inventory uses `app/**/page.tsx`, `src/data/navigationData.tsx`, and `src/app-shell/navigation/moduleRouteInventory.json` against general areas 1–19.

**In scope for 1–19 or earlier blocks:** pilot sidebar routes (dashboard, scheduling, tasks, messages, company updates, forms, employees, settings, packs), goals redirect, time off on scheduling, reports/docs/help getting-started, analytics permissions, hire onboarding, registration smoke (`e2e/account-setup.spec.ts`, `e2e/signup-stores.spec.ts`, `e2e/signup-org-setup.spec.ts`), landing `/` and `/pricing` (`e2e/landing-packs.spec.ts`).

**Out of scope (do not hide or delete on-hold modules):** Operations Intelligence (`/app/operations`), Team pack modules (performance beyond goals QA, recognition, leaderboard, learning, certifications, resources), Stock/inventory surfaces, AI photo-match, removed Calendar, Prep/Cookbook/Inventory Reports on hold.

**Remaining user-facing areas (20+):**

20. Stores/locations management — done
   - Settings → General uses `StoresSettingsCard` on `public.stores`. Save follows the same manager-or-owner `canEdit` gate as other general settings; `StoreStep` is read-only when `canEdit` is false. Staff roles do not open settings (`RoleGuard`).
   - `e2e/stores-settings.spec.ts` pins English, signs in with the test user, checks the stores card and save control for the owner, blocks `stores` writes, and asserts staff see the settings empty state without the stores card.
21. Auth — done
   - `/auth` sign-in, forgot-password email request (`/auth/v1/recover` stubbed), `?reset=true` new-password form, and `redirectTo` sign-in covered in `e2e/auth-flows.spec.ts`. Invite activation stays in `e2e/invite-activation.spec.ts`.
22. Company registration end-to-end — done
   - `e2e/account-setup.spec.ts`, `e2e/signup-org-setup.spec.ts`, and `e2e/signup-stores.spec.ts` cover the English walk-through, coffee shop org defaults, and store or invite steps.
   - `e2e/company-registration-locale.spec.ts` pins Spanish, lists all six company locales on the company step, scans the permission matrix defaults, and walks through starter without calling onboarding complete.
23. Messages attachments — done
   - `e2e/messages-attachments.spec.ts` pins English, signs in with the test user, stubs storage upload, attaches `e2e/fixtures/tiny-e2e.png` in the composer, and stubs message insert so nothing reaches production.
   - `e2e/direct-message.spec.ts` and `e2e/messages-permissions.spec.ts` stay text and permission coverage.
24. Help desk — done
   - `/app/help-desk` redirects to `/app/messages`; no helpdesk module remains.
   - `e2e/help-desk-redirect.spec.ts` pins English, signs in with the test user, and asserts the messages heading after navigation.
25. Marketing — done
   - `e2e/marketing-routes.spec.ts` covers `/features`, `/hr-development`, `/templates`, and `/register` in English. Complements `e2e/landing-packs.spec.ts` for `/` and `/pricing`.
26. In-app notification center — done
   - `e2e/notification-center.spec.ts` opens the account-cluster inbox versus profile notification prefs, and the Tasks bell popover. Complements `e2e/profile-account-notifications.spec.ts`.
27. Availability — done (with item 28 in `e2e/pilot-route-smoke.spec.ts`)
   - `/app/availability` and `/app/availability/manage` redirect into enhanced scheduling with the availability panel.
28. Schedule lobby — done (with item 27 in `e2e/pilot-route-smoke.spec.ts`)
   - `/app/schedule-lobby` and `/schedule-lobby` land on enhanced scheduling.
29. Custom sections — done (with items 30–32 in `e2e/pilot-route-smoke.spec.ts`)
   - `/app/add-section` and `/app/section/[path]` redirect to dashboard.
30. Standalone invite — done (with items 29–32 in `e2e/pilot-route-smoke.spec.ts`)
   - `/app/invite-employee` client-redirects to `/app/employees?invite=1`.
31. Public previews — done (with items 29–32 in `e2e/pilot-route-smoke.spec.ts`)
   - `/onboarding` → company registration; dev-only `/onboarding-preview` and `/forms-preview` render without writes.
32. Legacy inventory aliases — done (with items 29–31 in `e2e/pilot-route-smoke.spec.ts`)
   - On-hold modules stay visible: owner smoke on `/app/purchasing` and `/app/cookbook` loads signed-in shell without a server error (no redirect).

### Block wrap-up log (Tue 10 Nov 2026, ~3:45–5:00 PM ET) <!-- pragma: allowlist secret -->

- **Merged:** #79 (item 23, `e2e/messages-attachments.spec.ts`) and #80 (items 25–32, marketing/notification/pilot-route specs) after Release gates, Remote deploy readiness, and Vercel preview were green (squash merge).
- **Full e2e on `main` (post-merge, hosted anon client + local dev server):**
  - First run: **73 passed, 2 failed, 1 skipped** (~6.5m). Failures: `e2e/invite-location.spec.ts` (Team-on direct invite no longer auto-selects a role; `data-selected` stayed false) and `e2e/overview-permissions.spec.ts` (`response.json()` after `route.fetch()` threw “Response has been disposed”).
  - After fix PR: **74 passed, 0 failed, 1 skipped** (~5.7m). Skipped: `e2e/direct-message.spec.ts` — `TEST_RECIPIENT_EMAIL` / `TEST_RECIPIENT_PASSWORD` are unset in the Cloud Agent env (no local stack seed; two-user test stays disabled here per QA rules).
- **Fixes shipped:** pick the first `invite-role-option` when no default role is selected; read mocked REST bodies via `response.text()` before `JSON.parse`.
- **Migrations:** none applied or opened.
- **Open for Pedro:** optional Cloud Agent / CI env vars for the second Playwright user so `direct-message` can run outside Release gates’ local seed.

## Wednesday 11 Nov 2026, 4:00–6:00 AM America/New_York

Hard stop at 6:00 AM ET. Cross-area regression and quality sweep; items 33+.

33. Playwright baseline and e2e flakes — done
   - Full suite before fixes: **73 passed, 2 failed, 1 skipped** (~6.3m). Failures: `e2e/invite-location.spec.ts` (first role option was shop-suggested without `data-role-id`, so `data-selected` stayed false) and `e2e/overview-permissions.spec.ts` (`Response has been disposed` while mocking profiles on reload).
   - Added `e2e/routeJson.ts` (`readFetchJson`, `fulfillGetWithJson`) with passthrough on fetch errors; `overview-permissions` uses it and `unrouteAll` after each test; invite role picker targets `[data-role-id]`.
   - After fix PR: **74 passed, 0 failed, 1 skipped** (~5.5m full run; one `activity-history` run hit a trace-artifact ENOENT flake on rerun — spec passed in isolation). Skipped: `e2e/direct-message.spec.ts` (no `TEST_RECIPIENT_*` in this env).
34. Invite phone placeholder i18n — done
   - `InvitePersonCard` and `AddVendorDialog` use `onboarding.userInfo.placeholders.phone` (all six locales already had the key). `data-testid="invite-phone"`; `e2e/invite-location.spec.ts` asserts the English placeholder when locale is pinned.
35. Pilot sidebar manual sweep — done (no code change)
   - Browser pass over dashboard, scheduling, tasks, messages, company updates, forms, employees, settings Billing tab, profile: no new hard-coded UI leaks; “Café starter” is the intentional Ops template control; billing lives on Settings → Billing (`/app/packs/billing` is not a catalog pack and correctly shows pack not found).

### Block wrap-up log (Wed 11 Nov 2026, ~4:00–6:00 AM ET) <!-- pragma: allowlist secret -->

- **Merged:** [#82](https://github.com/Plcherra/flowforce/pull/82) — e2e flake fixes + invite phone i18n (Release gates, Remote deploy readiness, Vercel preview green).
- **Full e2e on branch:** 74 passed / 0 failed / 1 skipped after items 33–34; baseline before fixes 73/2/1.
- **Migrations:** none.
- **Open for Pedro:** unchanged — optional second Playwright user env for `direct-message`.

## Wednesday 11 Nov 2026, 9:00 AM–1:00 PM America/New_York

Hard stop at 1:00 PM ET. Deepen general-area Playwright coverage where specs are thinnest (Ops v1 complete). **E2e inventory (tests per file, Wed AM):** Company Updates 1; Messages 1 (+ attachments); Schedule 1 (+ shift-role, my-shift lists); Analytics/Docs/Reviews/Goals 2 each; Forms/Tasks/Time off stronger (1 spec each but broader asserts). **Weakest pilot module:** Company Updates (permissions only). **Queue 37+:** Schedule desk publish/assign UI, Messages channel settings gate, enhanced scheduling time-off panel.

36. Company Updates — feed, search, staff read filter — done
   - `e2e/company-updates-feed.spec.ts`: Feed/Grid/List `aria-pressed`, no-match search empty state, dashboard View all → `/app/company-updates`, staff `status=eq.published` list query and no manage/new controls. Writes blocked.
   - `e2e/company-updates-permissions.spec.ts`: `routeJson` + `unrouteAll` flake hardening (item 33 pattern).
   - Scoped pass: 3/3 company-updates specs green locally (~18s). No product code changes; orphaned `CompanyUpdatesReadinessPanel` English strings remain out of scope for this item.

### Block wrap-up log (Wed 11 Nov 2026, ~9:00–10:25 AM ET) <!-- pragma: allowlist secret -->

- **Inventory:** Company Updates had the thinnest pilot coverage (1 spec). Messages and Schedule are next in queue (items 37–38).
- **Merged:** none yet — [#83](https://github.com/Plcherra/flowforce/pull/83) open; Vercel preview + Remote deploy readiness green; **Release gates failed twice** on `Install Playwright Chromium` (GitHub runner `apt` DNS to `archive.ubuntu.com` / `security.ubuntu.com`). Empty commit retrigger did not help. Local full e2e: **77 passed / 0 failed / 1 skipped** (`direct-message`).
- **Migrations:** none.
- **Open for Pedro:** unchanged (`TEST_RECIPIENT_*` for two-user DM). Optional: re-run Release gates when GitHub runner apt is healthy, then merge #83.
- **Next:** Item 37 Schedule desk publish/assign UI depth; item 38 Messages `messages.manage` channel settings.

37. Schedule — week desk publish and assign depth — done
   - `e2e/schedule-desk-depth.spec.ts`: week grid draft + published shifts, `publish-to-team` issues mocked `publish_schedules_week_with_validation` RPC (writes stubbed), shift details assignment panel; assign-only denies create/edit/publish desk controls while keeping `employee-selector-add`.
38. Messages — channel settings (`messages.manage`) — done
   - `e2e/messages-channel-settings.spec.ts`: injected group channel with membership; `messages.send` alone shows members but hides Group options; send + manage opens Group settings dialog (channel writes blocked).
39. Company Updates — orphaned readiness panel — done
   - Removed unused `CompanyUpdatesReadinessPanel.tsx` (hard-coded English, no imports). Update readiness stays on the main company-updates surface covered in item 36.

### Block wrap-up log (Wed 11 Nov 2026, 9:00 AM–1:00 PM ET, in progress) <!-- pragma: allowlist secret -->

- **#83:** Release gates re-run in progress after apt DNS flake on earlier attempts; squash-merge when green.
- **#84 (this branch):** items 37–39 — e2e + delete orphan panel. Full e2e on branch: **80 passed / 0 failed / 1 skipped** (~6.3m); skipped `e2e/direct-message.spec.ts`.
