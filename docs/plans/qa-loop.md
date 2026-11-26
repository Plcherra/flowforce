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
- **Merged:** [#83](https://github.com/Plcherra/flowforce/pull/83) — company-updates e2e depth (Release gates + Remote deploy readiness + Vercel preview green after Playwright install hardening on `main`).
- **Migrations:** none.
- **Open for Pedro:** unchanged (`TEST_RECIPIENT_*` for two-user DM).
- **Next:** Item 37 Schedule desk publish/assign UI depth; item 38 Messages `messages.manage` channel settings.

37. Schedule — week desk publish and assign depth — done
   - `e2e/schedule-desk-depth.spec.ts`: week grid draft + published shifts, `publish-to-team` issues mocked `publish_schedules_week_with_validation` RPC (writes stubbed), shift details assignment panel; assign-only denies create/edit/publish desk controls while keeping `employee-selector-add`.
38. Messages — channel settings (`messages.manage`) — done
   - `e2e/messages-channel-settings.spec.ts`: injected group channel with membership; `messages.send` alone shows members but hides Group options; send + manage opens Group settings dialog (channel writes blocked).
39. Company Updates — orphaned readiness panel — done
   - Removed unused `CompanyUpdatesReadinessPanel.tsx` (hard-coded English, no imports). Update readiness stays on the main company-updates surface covered in item 36.

### Block wrap-up log (Wed 11 Nov 2026, 9:00 AM–1:00 PM ET) <!-- pragma: allowlist secret -->

- **#84:** items 37–39 — schedule desk + messages channel settings e2e, delete orphan readiness panel. Full e2e on branch before rebase onto `main` (post-#83): **80 passed / 0 failed / 1 skipped** (~6.3m); skipped `e2e/direct-message.spec.ts`.
- **Migrations:** none.

## Saturday 21 Nov 2026, 4:00–6:00 AM America/New_York

Hard stop at 6:00 AM ET. **E2e inventory (Sat AM):** `/app/analytics` hub had no `e2e/` coverage (only `/app/reports` and `/app/ai-insights` in `e2e/analytics-permissions.spec.ts`). Time-off legacy paths only in `tests/playwright`. Forms had permissions but no fill-dialog depth. Performance/Reviews/Goals already have permission specs; Tasks/Schedule/Messages deepened in items 37–38.

**Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar.

**Queue 40+:** Analytics hub, time-off route aliases, forms fill dialog.

40. Analytics hub (`/app/analytics`) — done
   - `e2e/analytics-hub.spec.ts`: Insights pack gate, readiness panel, four tabs (Business KPIs, Form Analytics, Reports Analyzer, Insights). Writes blocked.
   - `AnalyticsReadinessPanel` health cards and owner/manager toggle use locale keys (six locales). `data-testid` on `analytics-page` and readiness panel.
41. Time off legacy routes — done
   - `/app/time-off` and `/app/scheduling/timeoff` redirect to enhanced scheduling time-off panel (`e2e/time-off-routes.spec.ts`).
42. Forms fill dialog depth — done
   - Open E2E open form fill UI, assert `form-fill-list`, stub `form_fields` and block `form_submissions` writes (`e2e/forms-fill-depth.spec.ts`).

### Block wrap-up log (Sat 21 Nov 2026, ~4:00–4:15 AM ET) <!-- pragma: allowlist secret -->

- **Merged:** [#85](https://github.com/Plcherra/flowforce/pull/85) — items 40–42 (analytics hub + readiness i18n, time-off route aliases, forms fill depth). Release gates failed once on analytics-hub Form Analytics strict locator; fixed in `80c7f636` before green merge (~85 e2e passed in CI, 1 skipped `direct-message`).
- **Migrations:** none.
- **Open for Pedro:** unchanged — optional `TEST_RECIPIENT_*` for two-user DM.
- **Next:** Performance goal-progress UI depth; analytics readiness metric rows still use English from `buildAnalyticsReadinessSummary` (deeper i18n follow-up).

## Saturday 21 Nov 2026, 9:00 AM–1:00 PM America/New_York

Hard stop at 1:00 PM ET. **Queue 43+:** goal-progress UI depth; analytics readiness metric i18n.

**Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar.

43. Performance / Goals — goal-progress UI depth — done
   - `e2e/goals-progress-depth.spec.ts`: Team pack performance KPI grid (`performance-kpi-goal-progress`), goal progress card, refresh control, `goals.manage` OR `goals.view` gate, writes blocked.
   - Stable test ids on `performance-kpi-grid`, `performance-kpi-*`, and `performance-refresh`.
44. Analytics readiness metric rows — done
   - `buildAnalyticsReadinessSummary` emits locale keys; panel translates via `displayAnalyticsReadinessSummary` across six locales.
   - `e2e/analytics-readiness-metrics.spec.ts` asserts owner/manager metric rows and toggles view mode. Metric and review rows expose `data-testid`s.

### Block wrap-up log (Sat 21 Nov 2026, 9:00 AM–1:00 PM ET) <!-- pragma: allowlist secret -->

- **Merged:** [#86](https://github.com/Plcherra/flowforce/pull/86) — items 43–44 (goal-progress e2e depth; analytics readiness metric i18n + e2e). Release gates, Remote deploy readiness, and Vercel preview green on branch; merged at `58671824`.
- **Migrations:** none.
- **Open for Pedro:** unchanged — optional `TEST_RECIPIENT_*` for two-user DM.
- **Next:** deepen another thin e2e area (Tasks list depth, Docs getting-started walkthrough, or Settings billing gates).

## Saturday 21 Nov 2026, 2:00 PM–5:00 PM America/New_York

Hard stop at 5:00 PM ET. **Queue 45+:** Tasks list depth (filters, detail dialog, below-list panels); Docs getting-started walkthrough; Settings billing gates.

**Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar.

45. Tasks — list, filters, and detail depth — done
   - `e2e/tasks-list-depth.spec.ts`: My Shift shell, All tasks filters (search no-match, status todo tab, kind filter), first task opens `task-details-dialog`, reminders below list, notifications popover; task writes blocked.
   - `fetchTaskComments` loads profiles in a second query (no `task_comments` → `profiles` FK in PostgREST schema).
   - `data-testid="task-details-dialog"` on task details.
46. Docs — getting-started walkthrough — done
   - Setup steps expose `getting-started-step-*` and `getting-started-next-steps`. `e2e/docs-getting-started-depth.spec.ts` walks four steps and next-step copy (Team pack, English).
47. Settings — billing gates depth — done
   - `e2e/settings-billing-gates.spec.ts`: manager with mocked `billing.manage` still has no Billing tab; owner `billing-manage` mocks `/api/stripe/create-portal-session` without live Stripe.

### Block wrap-up log (Sat 21 Nov 2026, 2:00–5:00 PM ET) <!-- pragma: allowlist secret -->

- **Merged:** [#87](https://github.com/Plcherra/flowforce/pull/87) — items 45–47 at `525b7ec0` (Release gates + Remote deploy readiness + Vercel preview green; round 2 fixed `TaskDetailsDialog` file-length cap and CI-empty tasks search).
- **Local e2e:** new specs 5/5; full Release gates e2e on branch before merge.
- **Migrations:** none (optional follow-up FK `task_comments.user_id` → `profiles.id` for embedded selects).
- **Open for Pedro:** unchanged — optional `TEST_RECIPIENT_*` for two-user DM.
- **Next:** schedule/messages/forms remain candidates for deeper e2e if time remains in block.

48. Forms — submissions dialog depth — done
   - `data-testid` on submissions dialog, list, and export. `e2e/forms-submissions-depth.spec.ts`: empty state + fill CTA, mocked row list + CSV export (writes blocked).

## Sunday 22 Nov 2026, 4:00–6:00 AM America/New_York

Hard stop at 6:00 AM ET. **Queue 49+:** Forms builder/edit depth; Messages conversation list; Schedule shift-edit UI; Time off panel depth; Reviews follow-ups.

**Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar.

49. Forms — builder and edit depth — done
   - `data-testid` `form-edit-{id}` on the list edit action.
   - `e2e/forms-builder-depth.spec.ts`: edit walks basics → questions → who (complete-by off) → preview with blocked publish; create dialog → builder empty questions; `createForms`/`manageForms` gates on edit and new. Writes blocked.

### Block wrap-up log (Sun 22 Nov 2026, ~4:00–6:00 AM ET) <!-- pragma: allowlist secret -->

- **Merged:** [#88](https://github.com/Plcherra/flowforce/pull/88) — item 49 at `176ba2fc` (Release gates, Remote deploy readiness, Vercel preview green on branch; post-merge main Release gates + Deploy Readiness green).
- **Local e2e:** `e2e/forms-builder-depth.spec.ts` 3/3 green (~16s).
- **Migrations:** none (optional `task_comments.user_id` → `profiles.id` FK unchanged).
- **Open for Pedro:** unchanged — optional `TEST_RECIPIENT_*` for two-user DM.
- **Next:** Messages channel list + composer depth; schedule shift editor fields; time-off request form depth.

## Sunday 22 Nov 2026, 9:00 AM–1:00 PM America/New_York

Hard stop at 1:00 PM ET. **Queue 50+:** forms builder window validation; messages conversation depth; schedule shift editor fields; time-off panel; reviews follow-ups.

**Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar.

50. Forms — builder complete-by / midnight defaults — done
   - `clockWindowProblem` treats untouched `00:00` shift-day clocks as unset; legacy editor migration no longer copies due into complete-by.
   - Who step shows inline `form-distribution-time-error` for real ordering issues.
   - `e2e/forms-builder-depth.spec.ts` walks Next without toggling complete-by off; invalid window test added. Unit: `formDistribution.test.ts`.

51. Messages — conversation list and composer — done
   - `e2e/messages-conversation-depth.spec.ts`: roster search, channel transcript, composer send gate (writes blocked), `messages.send` deny.

52. Schedule — shift editor fields — done
   - Root cause for Cloud Agent flakes: mocked shift dates used Monday `weekStartsOn: 1` while the week grid uses Sunday week start, so chips never rendered; stacked `schedules` route handlers could also skip the GET mock. `e2e/schedule-shift-editor-depth.spec.ts` pins shifts to the visible week, merges write-block + GET mock in one handler, and asserts details / tasks / templates tabs plus assign-only save/delete gates. `shift-details-not-found` test id added for fast diagnosis.

53. Time off — request form/panel depth — done
   - `e2e/time-off-panel-depth.spec.ts`: summary tiles, request dialog fields (`timeoff-type`, dates, reason), blocked `time_off_requests` submit.

54. Reviews follow-ups — done
   - `e2e/reviews-followups-depth.spec.ts`: mocked `performance_reviews` row in Recent reviews, refresh control, `goal_id` still omitted from REST select.

### Block wrap-up log (Sun 22 Nov 2026, 2:00–5:00 PM ET) <!-- pragma: allowlist secret -->

- **Merged:** [#90](https://github.com/Plcherra/flowforce/pull/90) at `d3258d4c` — items 52–54; shift editor flake fix + three new e2e depth specs. Release gates, Remote deploy readiness, and Vercel preview green on branch; post-merge main Release gates + Deploy Readiness green.
- **Local e2e:** `schedule-shift-editor-depth` 2/2, `time-off-panel-depth` 1/1, `reviews-followups-depth` 2/2; `schedule-desk-depth` 2/2 regression.
- **Migrations:** none.
- **Open for Pedro:** optional `TEST_RECIPIENT_*` for two-user DM unchanged.
- **Next:** thin e2e in messages/forms/schedule if another block runs; optional shared shift mock helper for desk specs.

## Monday 23 Nov 2026, 4:00–6:00 AM America/New_York

Hard stop at 6:00 AM ET. **Queue 55+:** shared schedule week-shift mocks; employees directory search/tabs; company-updates wizard steps; overview leadership coverage widgets. **Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar.

55. Schedule — shared `e2e/scheduleShiftMock.ts` — done
   - Centralizes week-shift window pinning (Sunday week grid), desk draft/published rows, editor row merge, write-block handlers, and `denyScheduleWritesExcept`. `schedule-desk-depth` and `schedule-shift-editor-depth` import the helper; behavior unchanged from items 37 and 52.
56. Employees — directory search, tabs, filter empty state — done
   - `data-testid` `directory-search` only (`TeamDirectory.tsx` is allowlisted at 533 lines; filter empty state asserted by copy). `e2e/employees-directory-depth.spec.ts` pins English, signs in with the test user, no-match search, Clear filters, and All/Leads/Inactive tabs. Invite writes blocked.
57. Company Updates — create wizard five-step walkthrough — done
   - `e2e/company-updates-wizard-depth.spec.ts` walks Template → Design → Audience → Publish → Review and stubs `company_updates` insert (publish asserted, no prod write).
58. Overview — leadership coverage and list-status cards — done
   - `e2e/overview-leadership-depth.spec.ts` asserts `data-leadership="true"` coverage + list-status widgets for the test owner; skips when the login is not leadership.

### Block wrap-up log (Mon 23 Nov 2026, ~4:00–6:00 AM ET) <!-- pragma: allowlist secret -->

- **Merged:** [#91](https://github.com/Plcherra/flowforce/pull/91) at `13ad68a5` (Vercel preview green). Release Gates failed on PR branch: `TeamDirectory.tsx` grew 533→534 on allowlist (`check:file-length`). **Fix-forward on `main`:** `d6dec968` — keep allowlist line count, `directory-search` test id only, filter empty asserted by copy.
- **Post-fix CI on `main`:** Release Gates **success** (run `45143988898`); Deploy Readiness **success**.
- **Local e2e:** items 55–58 specs 7/7 green (~4m scoped run after fixes); schedule desk/editor regressions included.
- **Product fixes:** directory search test id; no permission or i18n product bugs in this block.
- **Migrations:** none.
- **Open for Pedro:** unchanged — optional `TEST_RECIPIENT_*` for two-user DM.
- **Next:** deeper settings sections-permissions matrix search; messages roster edge cases; analytics Reports Analyzer row click.

## Monday 23 Nov 2026, 9:00 AM–1:00 PM America/New_York

Hard stop at 1:00 PM ET. **Queue 59+:** thin Tasks, Goals, Docs, Forms, Calendar (skip), Time off, Settings/Roles if time remains. **Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar.

59. Settings — sections-permissions matrix depth — done
   - Module filter search on the role matrix (`permission-matrix-search`, row `permission-matrix-module-*`, toggle `permission-toggle-{role}-{module}`).
   - `e2e/settings-permissions-matrix-depth.spec.ts`: search, staff module toggle + unsaved, `systemSettings` deny. Role writes blocked before sign-in.

60. Messages — roster edge cases — done
   - Empty roster copy when search/filter hides all chips (`message-roster-empty`, `messages.noChatsMatchSearch`, six locales).
   - `e2e/messages-roster-edge.spec.ts`: `/teams` and `/unread` filters, direct vs group chip label, no-match search. Channel mocks only; no prod writes.

61. Analytics — Reports Analyzer row click — done
   - Report rows expose `reports-analyzer-row` with `data-selected`; inbox mock for spotlight.
   - `e2e/analytics-reports-analyzer-depth.spec.ts`: row select toggles Co-Pilot context title; document writes blocked.

### Block wrap-up log (Mon 23 Nov 2026, 9:00 AM–1:00 PM ET) <!-- pragma: allowlist secret -->

- **Merged:** [#92](https://github.com/Plcherra/flowforce/pull/92) at `e65ad7ad` — items 59–61. PR branch: Release Gates, Remote deploy readiness, and Vercel preview **success**. Post-merge **main**: Deploy Readiness **success** (`45191254199`); Release Gates **success** (`45191254190`). Vercel production deploy from merge in progress — refresh [flowforce.uk](https://www.flowforce.uk) when ready.
- **Local e2e:** three new depth specs 3/3 green (~40s); no product regressions beyond intentional empty-roster copy and matrix search.
- **Product fixes:** module filter on permissions matrix; `messages.noChatsMatchSearch` empty roster; report row selection test hooks.
- **Migrations:** none.
- **Open for Pedro:** unchanged — optional `TEST_RECIPIENT_*` for two-user DM.
- **Next:** thinnest remaining areas if another block runs (Tasks, Goals, Docs, Forms, Time off, Settings/Roles polish).

## Monday 23 Nov 2026, 2:00 PM–5:00 PM America/New_York

Hard stop at 5:00 PM ET. **Queue 62+:** Tasks, Goals, Docs, Forms, Time off, Settings/Roles polish (thinnest remaining e2e). **Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar.

62. Tasks — task details dialog depth — done
   - `task-details-timeline` test id on `TaskTimeline`; dialog depth asserts workflow, execution, and comments via stable English copy (locale pinned).
   - `e2e/tasks-details-depth.spec.ts`: injected todo task, workflow + blocked comment/status writes, `editTasks` deny hides execution. Writes stubbed.

63. Docs — report inbox search and review sheet — done
   - Report inbox `CardDescription` uses `literals.refreshingData` instead of hard-coded English.
   - `e2e/docs-report-inbox-depth.spec.ts`: mocked inbox row, client search filter, Review opens detail sheet; document writes blocked.

64. Time off — team approve row depth — done
   - `e2e/time-off-team-approve-depth.spec.ts`: mocked pending team request, Approve/Reject visible with `approveTimeOff`, approve click stubbed (no prod write).

### Block wrap-up log (Mon 23 Nov 2026, 2:00–~3:50 PM ET) <!-- pragma: allowlist secret -->

- **Shipped (merged):** [#93](https://github.com/Plcherra/flowforce/pull/93) item 62 (`e2e/tasks-details-depth.spec.ts`, `task-details-timeline` test id); [#94](https://github.com/Plcherra/flowforce/pull/94) item 63 (report inbox depth + `literals.refreshingData` on inbox fetch).
- **Merged:** [#95](https://github.com/Plcherra/flowforce/pull/95) item 64 at `3a2ca027` (Release gates, Remote deploy readiness, Vercel preview green).
- **Post-merge main (item 63):** Release Gates **success** (`45252404761`); Deploy Readiness **success** (`45252404869`).
- **Findings:** PR #93 failed Release gates once — `TaskDetailsDialog.tsx` allowlist is 991 lines (reverted dialog test-id growth). Reports inbox had hard-coded `"Refreshing…"` (fixed via literals catalog).
- **Migrations:** none.
- **Open for Pedro:** optional `TEST_RECIPIENT_*` for `direct-message` (unchanged).
- **Next (if block continues):** Goals performance refresh with mocked rows; Settings/Roles role-class dialog; Forms fill edge cases.

## Tuesday 24 Nov 2026, 4:00–6:00 AM America/New_York

Hard stop at 6:00 AM ET. **Queue 65+:** Goals performance refresh with mocked rows; Settings/Roles role-class dialog; Forms fill edge cases; then thinnest e2e in Tasks, Docs, Time off, Settings. **Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar.

65. Goals — performance refresh with mocked goal rows — done ([#96](https://github.com/Plcherra/flowforce/pull/96) merged)
   - `data-testid` `performance-goal-row-{id}` on goal progress list rows.
   - `e2e/goals-refresh-mock-depth.spec.ts`: injects `goals` + `goal_participants`, asserts row after refresh (writes blocked).

66. Settings/Roles — role-class dialog depth — done ([#97](https://github.com/Plcherra/flowforce/pull/97) merged)
   - `role-management-dialog`, `role-create-class`, and `role-class-edit-{id}` test hooks.
   - `e2e/settings-role-class-dialog-depth.spec.ts`: edit + create class dialogs, Access tab grid, `systemSettings` gate (writes blocked).

67. Forms — fill required-field edge — done (PR [#98](https://github.com/Plcherra/flowforce/pull/98), merge pending)
   - `e2e/forms-fill-edge.spec.ts`: required validation before submit, stubbed submission write (no `FormFillDialog` allowlist growth).

### Block wrap-up log (Tue 24 Nov 2026, ~4:00–~5:50 AM ET) <!-- pragma: allowlist secret -->

- **Merged:** [#96](https://github.com/Plcherra/flowforce/pull/96) item 65; [#97](https://github.com/Plcherra/flowforce/pull/97) item 66; fix-forward `b0ba3bce` on main hardens goals refresh mock per Codex P2.
- **Open:** [#98](https://github.com/Plcherra/flowforce/pull/98) item 67 — fixed Release Gates file-length (`FormFillDialog` allowlist 557; dropped dialog test id).
- **Local e2e:** `goals-refresh-mock-depth` 1/1; `settings-role-class-dialog-depth` 2/2; `forms-fill-edge` 1/1.
- **Migrations:** none.
- **Open for Pedro:** optional `TEST_RECIPIENT_*` for `direct-message` (unchanged).
- **Next:** thinnest remaining e2e polish in Tasks, Docs, Time off if another block runs.

## Tuesday 24 Nov 2026, 9:00 AM–1:00 PM America/New_York

Hard stop at 1:00 PM ET. **Queue 68+:** thinnest remaining e2e in Tasks, Docs, Time off, then Settings and other general areas. **Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar.

68. Tasks — list issues act depth — **open PR [#99](https://github.com/Plcherra/flowforce/pull/99)** (3 CI fix rounds; read-only grant test fails on seeded Playwright user — owner/list-issue act bypass).
69. Docs — resources manual, API, integrations pages — done ([#100](https://github.com/Plcherra/flowforce/pull/100) merged `77d73a15`)
   - `data-testid` hooks on user manual, API, and integration guide pages; `e2e/docs-resources-pages-depth.spec.ts` (Team pack, English).
70. Time off — my request history depth — done ([#101](https://github.com/Plcherra/flowforce/pull/101) merged `d7842b1b`)
   - `time-off-history-list` test id; `e2e/time-off-my-history-depth.spec.ts` mocks personal approved row (writes blocked).

### Block wrap-up log (Tue 24 Nov 2026, 9:00 AM–~10:30 AM ET, in progress) <!-- pragma: allowlist secret -->

- **Worked:** Items 68–70; #98 / item 67 already on `main` at block start.
- **Findings:** CI Playwright user owner bypass breaks read-only list-issue UI test ([#99](https://github.com/Plcherra/flowforce/pull/99)).
- **Merged:** [#100](https://github.com/Plcherra/flowforce/pull/100) item 69; [#101](https://github.com/Plcherra/flowforce/pull/101) item 70 after CI green (rebase).
- **Open:** [#99](https://github.com/Plcherra/flowforce/pull/99).
- **Migrations:** none.
- **Open for Pedro:** optional `TEST_RECIPIENT_*` for `direct-message` (unchanged).
- **Next:** fix or narrow item 68 e2e; Settings / Schedule depth if time before 1:00 PM ET.

## Tuesday 24 Nov 2026, 2:00 PM–5:00 PM America/New_York

Hard stop at 5:00 PM ET. **Queue 71+:** Schedule availability panel (thin vs time-off panel); remaining polish in Schedule/Messages/Settings. **Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar. **Do not touch:** item 68 / PR [#99](https://github.com/Plcherra/flowforce/pull/99).

71. Schedule — availability panel depth — done ([#102](https://github.com/Plcherra/flowforce/pull/102) merged `38eeb0a3`)
   - `e2e/schedule-availability-depth.spec.ts`: personal weekday grid / open notice, team-hours tab with mocked `schedule.edit` + `editSchedules`, deny gate without owner-only assumptions. Availability lock/loading copy i18n (six locales).

### Block wrap-up log (Tue 24 Nov 2026, 2:00–~3:15 PM ET) <!-- pragma: allowlist secret -->

- **Merged:** [#102](https://github.com/Plcherra/flowforce/pull/102) item 71 at `38eeb0a3`; [#103](https://github.com/Plcherra/flowforce/pull/103) item 72 at `5eca7f36` (Release gates, Remote deploy readiness, Vercel preview green).
- **Findings (71):** weekday test ids use `availability-day-mon` not `monday`; hard-coded lock/loading strings on availability path.
- **Migrations:** none.
- **Open:** [#99](https://github.com/Plcherra/flowforce/pull/99) item 68 (untouched). Optional `TEST_RECIPIENT_*` for `direct-message` (unchanged).
- **Next:** item 73+ if another block runs (messages or settings polish).

72. Schedule — desk copy week and empty week — done ([#103](https://github.com/Plcherra/flowforce/pull/103) merged `5eca7f36`)
   - `e2e/schedule-desk-actions-depth.spec.ts`: repeat-previous-week schedules read, empty-this-week delete with mocked `schedule.create` / `schedule.delete` gates. Writes blocked.

## Wednesday 25 Nov 2026, 4:00–6:00 AM America/New_York

Hard stop at 6:00 AM ET. **Queue 73+:** thinnest remaining e2e in Messages, Settings/Roles, Company Updates, Tasks, Forms, Goals, Docs, Reviews, Time off, Analytics, Schedule. **Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar. **Do not touch:** item 68 / PR [#99](https://github.com/Plcherra/flowforce/pull/99).

73. Messages — delete confirm and moderation gate — done ([#104](https://github.com/Plcherra/flowforce/pull/104) merged `d198b1a4`)
   - `e2e/messages-delete-depth.spec.ts`: own-message delete dialog with stubbed REST delete; peer delete gated on `messages.manage` (deny mock, not owner-only). Writes blocked.

74. Settings — departments card depth — done ([#105](https://github.com/Plcherra/flowforce/pull/105) merged `9e0c520c`)
   - `e2e/settings-departments-depth.spec.ts`: mocked department row, `managePositions` + `systemSettings` deny gate hides `department-settings`. Table writes blocked.

75. Settings — personal language cancel — done ([#106](https://github.com/Plcherra/flowforce/pull/106) merged `aedfc157`)
   - `e2e/settings-localization-depth.spec.ts`: cancel after staging Deutsch restores English with no profile write after the panel loads.

### Block wrap-up log (Wed 25 Nov 2026, ~4:00–~4:52 AM ET) <!-- pragma: allowlist secret -->

- **Worked:** Items 73–75 (Messages delete, Settings departments, Settings localization cancel). Item 68 / PR [#99](https://github.com/Plcherra/flowforce/pull/99) untouched.
- **Findings:** Message “own” bubbles need `senderid` + profile id pinned via `TEST_USER_EMAIL`; personal language select needs `select=language` stub when asserting English before cancel.
- **Merged:** [#104](https://github.com/Plcherra/flowforce/pull/104) item 73; [#105](https://github.com/Plcherra/flowforce/pull/105) item 74; [#106](https://github.com/Plcherra/flowforce/pull/106) item 75. Main Release Gates / Deploy Readiness green after each merge.
- **Local e2e:** `messages-delete-depth` 2/2; `settings-departments-depth` 2/2; `settings-localization-depth` 1/1.
- **Migrations:** none.
- **Open:** [#99](https://github.com/Plcherra/flowforce/pull/99) item 68. Optional `TEST_RECIPIENT_EMAIL` / `TEST_RECIPIENT_PASSWORD` for `direct-message` (unchanged).
- **Open for Pedro:** optional `TEST_RECIPIENT_*` (unchanged).
- **Next:** item 76+ thin e2e (Tasks list panels beyond #99, Forms approval gate, Company Updates read detail, Analytics tabs, Time off team approve edges).

## Wednesday 25 Nov 2026, 9:00 AM–1:00 PM America/New_York

Hard stop at 1:00 PM ET. **Queue 76+:** Tasks list panels beyond item 68 / PR [#99](https://github.com/Plcherra/flowforce/pull/99), Forms approval gate, Company Updates read detail, Analytics tabs, Time off team approve edges; then Messages, Settings/Roles, Goals, Docs, Reviews, Schedule. **Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar. **Do not touch:** item 68 / PR [#99](https://github.com/Plcherra/flowforce/pull/99).

76. Tasks — activity feed and execution warnings depth — done ([#107](https://github.com/Plcherra/flowforce/pull/107) merged `999cd7ee`)
   - `task-activity-feed`, `task-activity-empty`, and `task-activity-row-{id}` test hooks on `TaskActivityFeed`.
   - `e2e/tasks-activity-warnings-depth.spec.ts`: mocked overdue task opens warnings panel and detail dialog; mocked `task_activities` row in below-list feed. Writes blocked.

77. Forms — approval / submissions read gate — done ([#108](https://github.com/Plcherra/flowforce/pull/108) merged `e371bdbd`)
   - `e2e/forms-approval-gate.spec.ts`: `approveFormSubmissions` allow-only (role keys stripped) opens submissions; deny override on `forms.submissions.read` hides team submissions even when approve is allowed.

78. Company Updates — read detail — done ([#109](https://github.com/Plcherra/flowforce/pull/109) merged `08b8559d`)
   - `company-update-card-{id}`, `company-update-body` test hooks.
   - `e2e/company-updates-read-detail.spec.ts`: mocked feed publish row, view reaction + comment writes blocked.

79. Analytics — hub tab panels depth — done ([#110](https://github.com/Plcherra/flowforce/pull/110) merged `72be1389`)
   - `analytics-tab-*` and `analytics-panel-*` test hooks on `Analytics.tsx`.
   - `e2e/analytics-tabs-depth.spec.ts`: cycles four hub tabs with Insights pack on.

80. Time off — team approve edges — done ([#111](https://github.com/Plcherra/flowforce/pull/111) merged `ff282bfe`)
   - `e2e/time-off-team-approve-depth.spec.ts`: reject click stubbed; `approveTimeOff` deny flips team tab to staff-only (no mocked team row, no approve actions).

## Wednesday 25 Nov 2026, 2:00–5:00 PM America/New_York

Hard stop at 5:00 PM ET. **Queue 81+:** thinnest remaining e2e in Messages, Settings/Roles, Goals, Docs, Reviews, Schedule, Tasks (beyond item 68), Forms, Company Updates, Time off, Analytics. **Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar. **Do not touch:** item 68 / PR [#99](https://github.com/Plcherra/flowforce/pull/99).

81. Schedule — company policies panel depth — done ([#112](https://github.com/Plcherra/flowforce/pull/112) merged)
   - `e2e/schedule-company-policies-depth.spec.ts`: mocked `company_policies` row, create form save stubbed; `approveTimeOff` deny shows limited card.

82. Tasks — readiness filter chips depth — done ([#113](https://github.com/Plcherra/flowforce/pull/113) merged)
   - `e2e/tasks-readiness-depth.spec.ts`: mocked overdue + unassigned tasks, readiness chip counts and filter toggle.

83. Settings — org permissions card depth — done ([#114](https://github.com/Plcherra/flowforce/pull/114) merged)
   - `e2e/settings-org-permissions-depth.spec.ts`: mocked café `orgSetup` in `system_settings`, save blocked; card hidden when `managePositions` and `systemSettings` denied.

### Block wrap-up log (Wed 25 Nov 2026, 2:00–~3:15 PM ET) <!-- pragma: allowlist secret -->

- **Worked:** Items 81–83 (Schedule company policies panel, Tasks readiness chips, Settings org permissions card). Item 68 / PR [#99](https://github.com/Plcherra/flowforce/pull/99) untouched.
- **Merged:** [#112](https://github.com/Plcherra/flowforce/pull/112) item 81; [#113](https://github.com/Plcherra/flowforce/pull/113) item 82; [#114](https://github.com/Plcherra/flowforce/pull/114) item 83. Release gates, Remote deploy readiness, and Vercel preview green on each PR branch before merge.
- **Local e2e:** item 81 `2/2`, item 82 `1/1`, item 83 `2/2` (~6m scoped total).
- **Findings:** Company policies panel needs explicit `approveTimeOff` allow in CI seed; Playwright route handlers for `company_policies` must merge GET mocks with write stubs (last handler wins); tasks readiness specs need deterministic task mocks and tabular-nums assertions.
- **Migrations:** none.
- **Open:** [#99](https://github.com/Plcherra/flowforce/pull/99) item 68. Optional `TEST_RECIPIENT_*` for `direct-message` (unchanged).
- **Next:** item 84+ thin e2e (Messages group complete, Forms distribution editor, Goals KPI deny, Docs report inbox filters, Analytics business tab rows).

## Thursday 26 Nov 2026, 4:00–6:00 AM America/New_York

Hard stop at 6:00 AM ET. **Queue 84+:** Messages group complete, Forms distribution editor, Goals KPI deny, Docs report inbox filters, Analytics business tab rows; then thinnest remaining areas among Messages, Settings/Roles, Goals, Docs, Reviews, Schedule, Tasks, Forms, Company Updates, Time off, Analytics. **Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar. **Do not touch:** item 68 / PR [#99](https://github.com/Plcherra/flowforce/pull/99).

84. Messages — group create complete flow — done ([#115](https://github.com/Plcherra/flowforce/pull/115) merged `5b166ce4`)
   - `data-testid="new-chat-create-group"` on `NewChatPanel`.
   - `e2e/messages-group-complete-depth.spec.ts`: group mode, disabled Create group until name + member, stubbed channel/member writes, roster chip + transcript after create; cancel without writes.

### Block wrap-up log (Thu 26 Nov 2026, ~4:00–~5:30 AM ET) <!-- pragma: allowlist secret -->

- **Worked:** Item 84 (Messages group create complete). Item 68 / PR [#99](https://github.com/Plcherra/flowforce/pull/99) untouched.
- **Findings:** Roster peer mock must include nullable employee schema fields (`avatar_url`, `hire_date`, `employee_id`, `company_id`) or workspace bootstrap fails; stub `channel_members` GET for post-create transcript load; split roster vs language `profiles` interceptors.
- **Merged:** [#115](https://github.com/Plcherra/flowforce/pull/115) item 84. Release gates, Remote deploy readiness, and Vercel preview green before merge.
- **Local e2e:** `messages-group-complete-depth` 2/2.
- **Migrations:** none.
- **Open:** [#99](https://github.com/Plcherra/flowforce/pull/99) item 68. Optional `TEST_RECIPIENT_*` for `direct-message` (unchanged).
- **Next:** item 85 Forms distribution editor; Goals KPI deny; Docs report inbox filters; Analytics business tab rows.

## Thursday 26 Nov 2026, 9:00 AM–1:00 PM America/New_York

Hard stop at 1:00 PM ET. **Queue 85+:** Forms distribution editor, Goals KPI deny, Docs report inbox filters, Analytics business tab rows; then thinnest remaining areas among Messages, Settings/Roles, Goals, Docs, Reviews, Schedule, Tasks, Forms, Company Updates, Time off, Analytics. **Out of scope:** unchanged — Operations Intelligence, Team pack training/performance modules beyond existing goals/reviews QA, Stock/inventory, AI photo-match, Calendar. **Do not touch:** item 68 / PR [#99](https://github.com/Plcherra/flowforce/pull/99).

85. Forms — distribution editor depth — done ([#116](https://github.com/Plcherra/flowforce/pull/116) merged `d3faf139`)
   - `e2e/forms-distribution-editor-depth.spec.ts`: two-store list picker, incomplete people fill blocks preview with `distributionIncomplete` toast, edit loads mocked list + store + department fill + attached role. Writes blocked.

86. Goals — KPI deny gate — done ([#117](https://github.com/Plcherra/flowforce/pull/117) merged `18ab0d77`)
   - `PerformancePage` drops `goal-progress` KPI tile when both `goals.view` and `goals.manage` are denied (matches goal progress section gate).
   - `e2e/goals-kpi-deny-depth.spec.ts`: deny hides `performance-kpi-goal-progress`; `goals.view` alone keeps tile. Updated `goals-progress-depth` deny expectation. Writes blocked.

87. Docs — report inbox status filters — done ([#118](https://github.com/Plcherra/flowforce/pull/118) merged `46c1ef17`)
   - `ReportInboxStatusFilters`, `useReportInboxFilters`; row `reports-inbox-row-{id}`.
   - `e2e/docs-report-inbox-filters-depth.spec.ts`: ready vs error mocks, status chip filters. Writes blocked.

88. Analytics — business tab rows — in progress ([#119](https://github.com/Plcherra/flowforce/pull/119))
   - `analytics-business-*` test hooks on `BusinessAnalyticsBoard` metrics, breakdown rows, predictions.
   - `e2e/analytics-business-rows-depth.spec.ts`: Insights pack, business tab, asserts rows load from live or fallback snapshot. Writes blocked.
