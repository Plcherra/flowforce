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
5. Forms — todo
6. Calendar — skipped. Removed in #47. Do not bring it back.
7. Goals — todo
8. Docs — todo
9. Reviews — todo
10. Time off — todo
11. Analytics — todo
12. Settings and roles — todo
