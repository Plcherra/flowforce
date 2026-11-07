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
   - Pedro decided the placeholder terms (changeable later): Team $49/mo, Insights $39/mo, Stock $49/mo, USD, per company; monthly; Checkout quantity 1; à la carte; additive add-ons on Operations, not a replacement for starter, growth, or enterprise.
   - Cards show those placeholder prices and say the amount can change. When `STRIPE_PRICE_PACK_TEAM`, `STRIPE_PRICE_PACK_INSIGHTS`, or `STRIPE_PRICE_PACK_STOCK` is unset, that pack shows "Pricing coming soon" and does not call Stripe. A yearly Stripe price is refused.
   - When a monthly test price is set, `POST /api/packs/checkout` creates a Stripe test-mode subscription Checkout Session. Live keys are refused. `checkout.session.completed` (paid) sets that pack's flag in `system_settings.admin_config.packFlags`. Subscription cancel clears it. Manage or cancel uses the Stripe customer portal. No new table and no migration.
   - A new company stores basic Ops flags: Operations on, Team, Insights, and Stock off.
   - `e2e/packs-discovery.spec.ts` and `e2e/landing-packs.spec.ts` pin English, mock Stripe, and do not write settings.
   - Stripe test prices were not created in this run: no `STRIPE_SECRET_KEY` was available. Dashboard steps and amounts are in `docs/billing-readiness.md`. The three env vars stay unset in the repo.

## After Ops v1

Manager shift delete and foreign-key indexes — waiting-on-migration
- Managers can delete shifts by default. An explicit `schedule.delete: false` on a manager class turns it off. Staff still cannot delete shifts.
- Settings → Sections & Access → Role Configuration has **Managers can delete shifts**. It is on unless a manager class has that key set to false. Turning it off writes only that deny. Turning it on writes the key as true.
- Delete Shift and Empty this week follow `schedule.delete`. The schedules DELETE policy already requires `current_user_has_permission(company_id, 'schedule.delete')`.
- Migration `20261107190222_manager_shift_delete_default` updates the default and adds the key only where a manager pack does not mention it.
- Migration `20261107190223_unindexed_foreign_key_indexes` adds 78 covering indexes for public foreign keys from the unindexed_foreign_keys advisor. No drops.
- `e2e/manager-shift-delete.spec.ts` passed locally (English, test login). The toggle request was stopped before it was stored.
- Apply both migrations before relying on the new default in production. Remote deploy readiness stays red until they are applied. Do not merge until then.

Real-store locations (Pedro-approved after Ops v1) — done
- Migration `20261107085004_company_stores` was applied to production. Shops live in `public.stores` with name, address, and hours. The Walk-in inventory row is hidden and was not deleted. No store rows were backfilled, because only Walk-in existed.
- Ops v1 items 1–8 are done. Pack prices are the placeholder amounts in item 8.
