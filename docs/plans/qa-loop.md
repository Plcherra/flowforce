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
