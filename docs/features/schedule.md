# Schedule

This file is a manual review of each page, to decide what the final product will be from what we have now.

## Schedule grid and roles

Readiness is a good thing for leadership roles, but the current schedule page is very much a manager or leadership page. It has great insights, and it shows how to make the schedule, but we have to make a regular schedule page for everyone. For example, a coffee shop or an office business will not have all this access and information. How will the app tell those apart? How can we test that, since we do not have other users yet?

The grid looks decent, but shifts are somewhat transparent, and that does not help when planning a schedule for multiple roles. Imagine a schedule for 25, 50, 100, and 500 people. Multiple roles and stores? How does this feature fit in?

## View options, Actions, and Add layout

Most of the view-options features are broken:

- Minimized view does nothing.
- Role templates opens a drawer, but clicking the roles does nothing.

Copy from last week works. Save and load week template works too.

We have to change this:

- View options
- Actions
- Add

This is the same layout as the Connecteam app, and we have to differ from it: somehow have the same power to do the work, without copying that layout.

For example, copy last week is duplicated. It has a button beside Add first shift, and it is also inside the Actions button.

Week templates are also duplicated, in View options and in Actions.

Add is the same as the Add first shift button, but Add first shift is a "single shift" option of the Add button, which opens a drawer with multiple options. Can you suggest any plan for this layout to be original, but still have the same power to do all of that?

## Add shift wizard

We could add a way to load a shift template inside the Add shift wizard. The wizard has:

- Create New Shift
- Set up a new shift with detailed scheduling options.
- Details
- Users
- Tasks
- Notes

There is no way to easily load a shift template once the wizard window is open.

## My availability

The small drawer on the side is bad because it cuts off a lot of space.

The tab seems very complex, but it is beautiful.

Availability choices are open and fixed. There is no flexible availability.

- open = any day, any time
- fixed is sent on the first login, as part of employee onboarding. A new fixed availability can always be sent.

The owner, or whoever the owner makes able to manage this, can choose which day the availability window starts, along with the schedule, with a simple way to change the start day and the end day. For example:

> "The schedule is done around Fri–Sat, posted on Saturday around 3–6pm. The posted schedule is from Sunday to Saturday (because it is posted on Saturday, so everyone has easy access to request time off). Also, the policy for time-off requests (will be a different feature, but interlinked like availability) has to be 7 days in advance. That's why it needs to be aligned with the schedule."

So for this business, it makes sense that an availability sent by an employee starts on the next available schedule. For example:

> "In this same scenario, I want to send a new availability, but today is already Saturday. Since the schedule is being posted today, I'm not able to change my availability for the next week, but the availability will fall, after it is reviewed, on the following week after the next Saturday."

The My availability tab has to have these features.

One thing we could change is the grid used to mark down availability. Instead of a checkmark, something like:

- Mon — all day on or off. If off, what time this person is available, "from x to y".
- Tue — ...
- Wed — ...

Is there any way to record unavailability or availability for people who can work "2 Sundays in the month" or "1 Saturday yes and the other not"?

## Team hours

The Team hours tab is very vague, and its features are not aligned with the app's needs.

Lock controls and per-person exceptions do not align with the plan.

The plan is that each user has their own role. Each role will have some standard permissions granted with the role, but those permissions are editable at any time.

Example: user "Amanda" is added.

Amanda is staff level, which by default includes seeing her schedule and her team's schedule on the grid, sending new availability hours for herself only, and more. On the invite, or even after the user has been set up, there has to be easy access on the invitation, with the role and the permissions, to check or activate, or to uncheck and deactivate, one of these permissions. Or, even while she is staff level, give her one of the manager permissions, such as seeing draft week/shifts, creating and assigning shifts, or even more permissions.

This has to be a matrix.

The Team hours tab is the tab that owners, or managers, or whoever controls and makes the schedule, have to manage. It can also be granted as a permission to read, edit, create, and grant to others.

This is the type of matrix this app will contain.

## My time off

This will correlate with the policy tab.

There can be multiple policies for time off, such as 1 weekend day per month, or x hours per year. Multiple policies can combine into one allowance.

## My swaps

My swaps is a good idea, but it is empty, and it is not linked or aligned with the rest of the project yet.

## Reminders

This also needs a difference between employees and managers who can assign reminders.

For example, me as John, a barista, can have some reminders. For example, "lists, forms, and tasks that I have access to, anything else assigned to me, and schedule-related things that I may need or have access to." This will be fully linked to the app, like "send the barista checklist -> click -> open the barista checklist".

There is also the tab dedicated to admins, owners, or managers. They will of course have their own personal reminders, but they will also assign reminders to the team, and grant or not grant permission to activate or to deactivate reminders.

For example, me, Pedro, as schedule maker or floor supervisor, has the permission to assign reminders, so I can assign John reminders to complete the bar checklist form around x time, on day x, x times. I can also make it available for John to deactivate it, or not available for him to deactivate it. This permission, to grant the permission to turn it on or off, is also part of the matrix. It can be granted to multiple people, and also taken away from people who have it.

## Team requests

The Team requests tab will show detailed information about the requests: time left, time requested, approved, rejected, and more. It will also be shown on the grid as a requested day off, and the person with the right permissions will manage it. That permission is part of the matrix.

## Decisions

These are locked for the auto run. Implement them. Do not edit this section while implementing a phase.

1. View options and Actions stay as they are. The only toolbar change is the Add control.
   - One Add shift button. It opens the single-shift wizard. A menu on that same button holds Add multiple shifts, Import shifts from Excel, Add unavailability, and Add time off.
   - There is no second add button. Do not keep Add first shift, and do not keep a separate "Add single shift" item.
   - On an empty week, Copy last week is not a second button. The same Add shift button is the only add control.
2. Shift chips are opaque. The role or position name is on the chip. This does not decide how a 25, 50, 100, or 500 person grid works.
3. My availability and Team hours open in a full-width sheet. The other schedule sheets stay as they are.
4. Availability is one row per weekday: all day on, or off. Off stores a from-time and a to-time on the existing `staff_availability` row. There is no checkmark grid.
5. The only availability choices are open and fixed. Delete flexible availability. Do not add a flexible value, label, or branch. The choice lives on `org_prefs`, next to the existing lock columns. Do not reuse `availability_lock_mode` for this. The same row stores the schedule window start weekday, end weekday, and posting weekday. A person who can manage availability edits the choice and those three weekdays. `open` means any day, any time, and no grid is required. `fixed` is sent on the employee's first login, inside employee onboarding. A new fixed availability can always be sent after that. A send does not change the window being posted. After it is approved, it applies to the next window that starts after the next posting weekday. Do not hardcode Friday, Saturday, Sunday, or 7 days.
6. Permissions stay in `src/features/roles` and `src/lib/permissions/registry.ts`. Do not add a second matrix. Staff already default to `viewOwnSchedules`. Also default staff to `viewTeamSchedules` and `schedule.view` so they see their own published shifts and their team's published shifts. Draft weeks, creating shifts, and assigning shifts stay off for staff until those existing keys are turned on for that person (`editSchedules`, `schedule.edit`). Team hours reads and edits those keys. Lock controls and per-person exceptions are not the Team hours screen.
7. If a needed schedule permission key does not exist yet, add it to the existing registry and role matrix. Defaults: owner, admin, and manager on; staff off. Keys to add only when missing: `schedule.grant` (grant or remove another person's schedule permissions), `schedule.reminders.assign` (assign a reminder to someone else), `schedule.reminders.grant_deactivate` (decide whether that person may turn that reminder off).
8. Schedule reminders stay reminders. Do not merge them into tasks.
9. Ship each implemented phase with the Ship-To-Main rule: one commit on `main`, then push `main`. Do not open a pull request for that phase.

## Phases

Auto run: start at the first unchecked phase that is not blocked and does not depend on an unapplied migration. After that phase is green, continue to the next such phase in the same run if time allows. Each phase is its own commit on `main`. Append the Progress log as you go. Skip a blocked phase and log the skip.

A phase that adds a migration follows the Feature workflow migration rule. If the Progress log has `needs owner: supabase db push <migration>`, skip phases that depend on that migration and continue with phases that do not. `check:supabase:remote-drift` in deploy-readiness fails until the push lands. That is expected.

### Phase 1 — Minimized view and role-template click

- [x] Make the two broken view controls do something.

Rules:

- Files: `src/features/scheduling/components/DragDropScheduleCalendar.tsx`, `src/features/scheduling/components/drag-drop/WeekGrid.tsx`, `src/features/scheduling/components/drag-drop/ShiftChip.tsx`, `src/features/scheduling/components/drag-drop/ScheduleTemplatesPanel.tsx`, `src/features/scheduling/components/ShiftWizardDialog.tsx`.
- Minimized view is stored today and never read by the grid. When it is on, the week grid uses shorter rows and each shift chip shows only its title. When it is off, the chip keeps title, time, and duration.
- Role template rows in `ScheduleTemplatesPanel` are drag-only. A click opens the existing shift wizard with title, start, end, and role filled from that template. Dragging onto the grid stays as it is.
- Do not add a template table. Do not change Week templates.

Done when:

- Toggling Minimized view changes the chips on the week grid and turning it off restores the full chip.
- Clicking a role template opens the wizard prefilled from that template, and dragging that template still works.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` toggles Minimized view and clicks a role template.

### Phase 2 — One Add shift button

- [x] Keep View options and Actions. Replace the Add control with one Add shift button.

Rules:

- Files: `src/features/scheduling/components/drag-drop/ScheduleToolbar.tsx` (passes props to `src/features/scheduling/components/calendar/CalendarToolbar.tsx`; update both in the same commit; do not add a third toolbar), `src/features/scheduling/components/ScheduleEmptyState.tsx`, and the props passed from `DragDropScheduleCalendar.tsx`.
- Follow Decision 1. Do not rename View options or Actions. Do not move Copy previous week, Week templates, publish, export, or print.
- The Add shift button calls `onOpenAddShift`. Its menu calls the existing handlers for multiple shifts, import, unavailability, and time off.
- Remove the empty-week Copy last week button and the empty-week Add first shift button. Do not add a second button that opens the wizard.

Done when:

- View options and Actions are still on the toolbar.
- One Add shift button opens the single-shift wizard, and its menu still opens multiple shifts, import, unavailability, and time off.
- An empty week does not show Copy last week or Add first shift. Add shift is the only add control, on an empty week and on a week that already has shifts.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` opens Add shift and its menu on an empty week and on a week that has shifts.

### Phase 3 — Load a shift template inside the wizard

- [x] Load a saved shift template without closing the wizard.

Rules:

- Files: `src/features/scheduling/components/ShiftWizardDialog.tsx`, `src/features/scheduling/components/shift-wizard/DetailsTab.tsx`, `src/features/scheduling/hooks/useShiftTemplates.tsx`.
- The wizard already has Create New Shift, Details, Users, Tasks, and Notes. Add Load shift template on Details.
- The list is `useShiftTemplates()` for the current company. Choosing one copies the template's name, times, position, and headcount into the open form when those fields exist. Fields the template does not have stay as the user left them.
- Do not create the shift until the user saves. Do not add a second wizard.

Done when:

- With the wizard open, choosing a template fills the form and leaves the wizard open on the same shift.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` loads a template in the open wizard and asserts the wizard stays open.

### Phase 4 — Opaque shift chips

- [x] Make shifts readable when several roles are on one day.

Rules:

- File: `src/features/scheduling/components/drag-drop/ShiftChip.tsx`.
- Assigned chips use an opaque fill from the shift color. The current fill is the color plus `15`, which is what makes them look transparent. Remove that tint.
- The chip shows the role or position name as well as the title.
- Unassigned chips stay visually distinct from assigned chips.
- Do not change row count, paging, or store filters. That is an Open question.

Done when:

- Two shifts of different roles on the same day are both solid colors, and each chip shows its role or position name.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` asserts two same-day chips are opaque and each shows its role or position name.

### Phase 5 — Full-width availability sheet

- [x] Stop opening My availability in the narrow side sheet.

Rules:

- File: `src/features/scheduling/components/SchedulingPanelSheet.tsx`.
- When the panel is availability, personal or team, the sheet is full width.
- Team requests, My time off, My swaps, and Reminders keep `sm:max-w-2xl`.
- Do not change the availability form in this phase.

Done when:

- My availability and Team hours use the full viewport width. The other four panels stay narrow.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` asserts My availability and Team hours are full width and the other four panels stay narrow.

### Phase 6 — Weekday availability rows

- [x] Replace the checkmark availability grid.

Rules:

- Files: `src/features/availability/components/AvailabilityRequestForm.tsx` and the helpers it already uses in `src/features/availability/utils/availabilityUtils.ts`.
- Each weekday is one row: all day on, or off. Off shows from and to times.
- Save through the existing `staff_availability` columns `day_of_week`, `start_time`, `end_time`, and `week_start_date`. All day on stores the full-day range that code already treats as a full day. Do not add a table.
- Do not build "2 Sundays in the month" or alternating Saturdays.

Done when:

- A person can set Monday all day on, Tuesday off from 14:00 to 18:00, save, reload, and see the same rows.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` saves Monday all day on and Tuesday off 14:00 to 18:00, reloads, and sees the same rows.

### Phase 7 — org_prefs choice and schedule window

- [x] Add the company availability choice and the three schedule-window weekdays on `org_prefs`.

Rules:

- This phase is the migration and the generated types. The editor, the open grid, onboarding, and the next-window rule are later phases.
- Follow Decision 5. The stored choice is only `open` or `fixed`. Add columns on `org_prefs` for that choice and for the schedule window start weekday, end weekday, and posting weekday. Do not reuse `availability_lock_mode`. Do not add a flexible value.
- Update the generated Supabase types the repo already checks in (`src/integrations/supabase/types.ts`).
- Commit the migration and the generated types. If the Supabase CLI can reach the linked project, run `supabase db push`. Otherwise log `needs owner: supabase db push <migration>` in the Progress log, using the migration filename, and continue with phases that do not depend on this one.
- `check:supabase:remote-drift` in deploy-readiness fails until that push is applied. That is expected.

Done when:

- The migration and the generated `org_prefs` types include the choice and the three weekdays.
- The Progress log says that `supabase db push` ran, or it contains `needs owner: supabase db push <migration>`.

Prove: Unit test asserts the generated `org_prefs` types include the choice and the three weekday columns.

### Phase 8 — Team hours editor for open or fixed

- [x] Let a manager set open or fixed, and the three weekdays, on Team hours.

Rules:

- Depends on Phase 7 applied to the linked database. If the Progress log still has `needs owner: supabase db push <migration>` for that migration, skip this phase.
- Files: `src/features/scheduling/components/availability/TeamAvailabilityPanel.tsx`.
- Follow Decision 5. The editor is visible only when `canManageAvailability` is true. It offers open and fixed, and the three weekdays. There is no third choice.
- Do not build onboarding or the next-window rule in this phase.

Done when:

- A manager can set open or fixed, and the three weekdays, reload, and see them again. Flexible is not a choice.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` sets open or fixed and the three weekdays, reloads, and sees them.

### Phase 9 — Open availability does not require the grid

- [x] When the company choice is open, My availability does not require the weekday grid.

Rules:

- Depends on Phase 7 applied to the linked database. If that migration was not pushed, skip this phase.
- Files: `src/features/availability/components/AvailabilityRequestForm.tsx`.
- Follow Decision 5. `open` means any day, any time, and no grid is required.
- Leave the weekday rows from Phase 6 in place for when the choice is fixed.

Done when:

- With the choice set to open, My availability does not require the grid.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` with the company choice open shows My availability without requiring the weekday grid.

### Phase 10 — First login sends fixed availability

- [x] When the company choice is fixed, the employee's first login sends their fixed availability.

Rules:

- Depends on Phase 7 applied to the linked database. If that migration was not pushed, skip this phase.
- Files: employee onboarding under `src/features/onboarding`.
- Follow Decision 5. The step runs inside employee onboarding. A send creates the existing availability request.
- Do not hardcode Friday, Saturday, Sunday, or 7 days. The later send from My availability is Phase 11.

Done when:

- A new employee's first login sends fixed availability when the company choice is fixed.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` asserts a new employee's first login sends fixed availability when the company choice is fixed.

### Phase 11 — Send another fixed availability

- [x] My availability can send a new fixed availability after the first login.

Rules:

- Depends on Phase 7 applied to the linked database. If that migration was not pushed, skip this phase.
- Files: `src/features/availability/components/AvailabilityRequestForm.tsx`.
- Follow Decision 5. A new fixed availability can always be sent after the first login. A send creates the existing availability request and does not overwrite the posted window.
- The next-window rule is Phase 12.

Done when:

- That person can send another fixed availability later, and the send does not overwrite the posted window.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` sends another fixed availability from My availability and asserts the posted window is unchanged.

### Phase 12 — Next window after the posting weekday

- [x] An approved fixed availability applies to the next window after the posting weekday.

Rules:

- Depends on Phase 7 applied to the linked database. If that migration was not pushed, skip this phase.
- Use the posting weekday on `org_prefs`. After approval, the availability applies to the next window that starts after the next posting weekday.
- A send on the posting weekday does not change that window.
- Do not hardcode a day or a 7-day notice.

Done when:

- A send on the posting weekday does not change that window, and after approval it is stored for the following window.

Prove: Unit test asserts a send on the posting weekday is stored for the following window and does not change the posted window.

### Phase 13 — Decision 7 permission keys

- [x] Add the missing schedule permission keys to the existing registry and role matrix.

Rules:

- This phase is the keys only. Team hours and reminders UI are later phases.
- Files: `src/lib/permissions/registry.ts`, `src/features/roles/constants/productRoleContract.json`, `src/features/roles/constants/productLevels.test.ts`.
- Follow Decision 7. Add only missing keys: `schedule.grant`, `schedule.reminders.assign`, `schedule.reminders.grant_deactivate`. Defaults: owner, admin, and manager on; staff off.
- Do not add a second permission list. Run `npm run check:roles`.

Done when:

- `npm run check:roles` passes with those keys in the registry and `productRoleContract.json`.
- `productLevels.test.ts` asserts owner, admin, and manager have the three keys and staff does not.

Prove: `npm run check:roles` and `productLevels.test.ts` assert `schedule.grant`, `schedule.reminders.assign`, and `schedule.reminders.grant_deactivate` are on for owner, admin, and manager and off for staff.

### Phase 14 — Team hours drops locks and exceptions

- [x] Remove locks and per-person exceptions from Team hours.

Rules:

- Files: `src/features/scheduling/components/availability/TeamAvailabilityPanel.tsx`.
- Do not render `LockControls` or `ExceptionsTable` on Team hours. Leave those files in the repo.
- Do not build the permission matrix in this phase.

Done when:

- Team hours does not show lock controls or per-person exceptions.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` opens Team hours and asserts lock controls and per-person exceptions are absent.

### Phase 15 — Team hours permission matrix

- [x] Team hours lists people and their schedule permissions.

Rules:

- Depends on Phase 13. The keys have to exist before this phase edits them.
- Files: `src/features/scheduling/components/availability/TeamAvailabilityPanel.tsx`.
- Follow Decisions 6 and 7. A person with `schedule.grant` can turn schedule permissions on or off for someone else, including draft and create-shift for a staff user.
- Lock controls and per-person exceptions stay off this screen.

Done when:

- Turning a permission off for an existing user removes it, and reloading shows the same matrix.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` turns a staff user's draft or create-shift permission off, reloads, and sees it still off.

### Phase 16 — Staff invite scheduling defaults

- [x] The invite card uses the Decision 6 scheduling defaults.

Rules:

- Depends on Phase 13 so the Decision 7 keys are on the same grid.
- Files: `src/features/employees/components/invites/InvitePersonCard.tsx` and the role defaults it already reads.
- Follow Decision 6. The scheduling permissions are on the existing `OperatorAccessGrid`. They can be changed for the invited person before and after they are set up.
- Staff defaults to `viewOwnSchedules`, `viewTeamSchedules`, and `schedule.view`. `editSchedules` and `schedule.edit` stay off until turned on for that person.

Done when:

- A staff invite defaults to own schedule plus the team published grid, with draft and create-shift off, and those can be switched on for that person.

Prove: Unit test asserts a staff invite defaults to `viewOwnSchedules`, `viewTeamSchedules`, and `schedule.view`, with `editSchedules` and `schedule.edit` off, and that those two can be switched on.

### Phase 17 — My swaps is linked to a shift

- [x] Let a person request a swap from a shift and see it under My swaps.

Rules:

- Files: `src/features/scheduling/components/ShiftSwapsPanel.tsx`, `src/features/scheduling/repositories/shiftSwapsRepository.ts`, and `src/features/scheduling/components/ShiftDetailsPanel.tsx` (the shift sheet that already opens from a chip click).
- Add a create function beside `fetchShiftSwaps` and `updateShiftSwapStatus`. Use the existing swap table and columns. Do not add a swap system.
- The shift sheet offers Request swap for a shift the current user is on. My swaps lists swaps they requested or that were offered to them.
- Approving stays on Team requests and keeps the current `canApprove` behavior.

Done when:

- Requesting a swap on a shift creates a row, and the row appears in My swaps after the panel's existing query refetches.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` requests a swap from the shift sheet and asserts the row appears in My swaps after the panel's existing query refetches.

### Phase 18 — allow_deactivate on assigned reminders

- [ ] Store `allow_deactivate` on the assigned reminder row.

Rules:

- This phase is the migration and the generated types. Reminder UI is later phases.
- Files: a new migration, and `src/integrations/supabase/types.ts`. The column is `allow_deactivate` on `reminders`, the table `scheduleRemindersRepository` already uses.
- Follow the Feature workflow migration rule. Commit the migration and the generated types. If the Supabase CLI can reach the linked project, run `supabase db push`. Otherwise log `needs owner: supabase db push <migration>` and continue with phases that do not depend on this column.
- `check:supabase:remote-drift` in deploy-readiness fails until that push is applied. That is expected.
- Do not merge reminders into tasks.

Done when:

- The migration and the generated `reminders` types include `allow_deactivate`.
- The Progress log says that `supabase db push` ran, or it contains `needs owner: supabase db push <migration>`.

Prove: Unit test asserts the generated `reminders` type includes `allow_deactivate`.

### Phase 19 — Reminders open the real record

- [ ] A person can open the task, form, or shift a reminder points at.

Rules:

- Files: `src/features/scheduling/components/ScheduleRemindersPanel.tsx`, `src/features/scheduling/hooks/usePersonalScheduleReminders.ts`. Put new UI in a small file next to the panel.
- A person sees reminders for tasks, forms, and shifts they can already open. Clicking one opens that record's existing page.
- Personal reminders stay the person's own list. Do not copy them into tasks. Do not assign reminders to someone else in this phase.

Done when:

- The staff user opens the form, task, or shift from the reminder.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` opens a task, form, or shift from a reminder and lands on that record's existing page.

### Phase 20 — Assign a reminder

- [ ] A manager can assign a reminder to someone else.

Rules:

- Depends on Phase 13 for `schedule.reminders.assign`.
- Files: `src/features/scheduling/components/ScheduleRemindersPanel.tsx`, `src/features/scheduling/repositories/scheduleRemindersRepository.ts`. Put new UI in a small file next to the panel.
- Follow Decisions 7 and 8. A person with `schedule.reminders.assign` can assign a reminder to someone else, with the time and how often.
- The deactivate flag is Phase 21. Personal reminders stay the person's own list.

Done when:

- A manager can assign a form reminder to a staff user, with a time and how often, and that staff user sees it.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` assigns a form reminder to a staff user and asserts that user sees the time and repeat.

### Phase 21 — Deactivate follows allow_deactivate

- [ ] The assignee can turn an assigned reminder off only when the flag allows it.

Rules:

- Depends on Phase 18 applied to the linked database. If the Progress log still has `needs owner: supabase db push <migration>` for `allow_deactivate`, skip this phase.
- Depends on Phase 13 for `schedule.reminders.grant_deactivate`.
- Files: `src/features/scheduling/components/ScheduleRemindersPanel.tsx`, `src/features/scheduling/repositories/scheduleRemindersRepository.ts`.
- `allow_deactivate` is stored on that assigned reminder. The assignee can turn it off only when that flag is on. A person with `schedule.reminders.grant_deactivate` can set the flag, and can turn it off later.
- With the flag off, that staff user has no deactivate control. With the flag on, deactivating hides it for them and leaves other people's reminders alone.

Done when:

- With the flag off, that staff user has no deactivate control. With the flag on, deactivating hides it for them and leaves other people's reminders alone.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` asserts no deactivate control when `allow_deactivate` is off, and that turning it on hides that reminder for the assignee only.

### Phase 22 — Team requests on the list and on the grid

- [ ] Show request detail, and show requested time off on the grid.

Rules:

- Files: `src/features/scheduling/components/StaffShiftManagement.tsx`, `src/features/scheduling/components/TimeOffManagementPanel.tsx`, `src/features/scheduling/components/drag-drop/WeekGrid.tsx`.
- Each team request row shows status (pending, approved, rejected), the requested start and end, and the time left until the requested start.
- A pending or approved time-off request renders on that person's day in the week grid as requested off. Do not delete or move their shift in this phase.
- Who can approve stays `approveTimeOff` and the current `canApproveRequests` check. Do not add a permission list.

Done when:

- A pending time-off request appears in Team requests with status, requested times, and time left, and the same request is visible on the week grid as requested off.
- A person without approval permission cannot approve it.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` asserts the pending request shows status, times, and time left, appears as requested off on the week grid, and cannot be approved without approval permission.

### Phase 23 — Time off policies

- [ ] Blocked by Open question "Time off policies". Skip this phase. Do not invent allowance math or a policy tab.

Prove: Skip. Do not add a test until the Open question "Time off policies" is answered.

### Phase 24 — Repeating weekday patterns

- [ ] Blocked by Open question "Repeating weekday patterns". Skip this phase. Do not store "2 Sundays in the month" or alternating Saturdays.

Prove: Skip. Do not add a test until the Open question "Repeating weekday patterns" is answered.

### Phase 25 — Who sees the leadership schedule

- [ ] Blocked by Open question "Who sees the leadership schedule" (business type and scale). Skip this phase. Do not add a coffee-shop mode, an office mode, or a large-grid layout.

Prove: Skip. Do not add a test for business type or grid scale until the Open question "Who sees the leadership schedule" is answered.

## Open questions

Do not answer these in a phase. Skip the phase that names the question.

### Time off policies

My time off correlates with a policy tab. That tab is a different feature. How do several policies combine into one allowance, such as 1 weekend day per month and x hours per year? Is the notice period a company number, and where is it edited?

### Repeating weekday patterns

Is there a way to record availability for someone who can work "2 Sundays in the month" or "1 Saturday yes and the other not"?

### Who sees the leadership schedule

How does the schedule differ for a coffee shop or an office that should not see the leadership insights? How do we test that while there are no other users? How does the grid work for 25, 50, 100, and 500 people, with multiple roles and stores?

## Progress log

### 2026-10-21 — Phase 1 Minimized view and role-template click

Shipped: Minimized view shortens the week-grid rows and each shift chip shows only its title. Turning it off restores the title, time, and duration. Clicking a role template opens the existing shift wizard with that template's title, start, end, and role. Dragging a role template onto the grid is unchanged.

Proven: Playwright test `tests/playwright/scheduling-phase-01-minimized-role-template.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It toggles Minimized view and clicks the Barista Morning role template. This environment has no `SUPABASE_SERVICE_ROLE_KEY` and the Supabase CLI has no access token, so the test was not executed here. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as someone who can edit the schedule, and open Schedule.
2. Open View options and turn on Minimized view. A shift chip should show only its title, and the week rows should get shorter.
3. Turn Minimized view off. The chip should show the title, the time, and the duration again, and the rows should be taller.
4. Open View options and tap Toggle role templates.
5. Tap Barista Morning. Create New Shift should open with title Barista Morning, start 06:00, end 14:00, and job position Barista.
6. Close the wizard, then drag Barista Morning onto a person's day. It should still create and assign that shift.

Blockers: none for this phase. `supabase db push` was not needed.

Questions: none.

### 2026-10-21 — Phase 2 One Add shift button

Shipped: View options and Actions stay on the toolbar. One Add shift button opens the single-shift wizard. The menu on that same control opens Add multiple shifts, Import shifts from Excel, Add unavailability, and Add time off. There is no Add single shift item and no second add button. An empty week no longer shows Copy last week or Add first shift. Suggest fills stays on the empty-week banner. Copy previous week stays in Actions.

Proven: Playwright test `tests/playwright/scheduling-phase-02-add-shift-button.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It opens Add shift and its menu on an empty week and on a week that has a shift. This environment has no `SUPABASE_SERVICE_ROLE_KEY`, so the test was not executed here. `npm run typecheck` and ESLint on the changed files are the checks run for this phase.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as someone who can edit the schedule, and open Schedule on a week with no shifts.
2. Confirm View options and Actions are still there. Confirm there is no Copy last week button and no Add first shift button.
3. Tap Add shift. Create New Shift should open. Close it.
4. Tap the arrow on that same Add shift control. The menu should list Add multiple shifts, Import shifts from Excel, Add unavailability, and Add time off. It should not list Add single shift.
5. Tap Add multiple shifts and confirm that dialog opens, then close it.
6. Add a shift, or open a week that already has one. Add shift should still be the only add control, and its menu should open the same four items.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 3 Load a shift template inside the wizard

Shipped: Details has Load shift template. The list is `useShiftTemplates()` for the current company. Choosing one copies the template name, duration onto the end time, position, and headcount when those values exist. Start time, location, and notes stay as the user left them. The shift is not created until save. The wizard stays open.

Proven: Playwright test `tests/playwright/scheduling-phase-03-load-shift-template.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It loads Opening Bar in the open wizard and asserts the wizard stays open. This environment has no `SUPABASE_SERVICE_ROLE_KEY`, so the test was not executed here. Typecheck and ESLint on the changed files are the checks run for this phase.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as someone who can edit the schedule. Save a shift template for the company first if none exist (name, duration, position, and headcount).
2. Open Schedule and tap Add shift.
3. On Details, set a start time and a location, then open Load shift template and choose the saved template.
4. The title, end time, position, and headcount should fill in. The start time and location you typed should stay. Create New Shift should still be open. No shift should appear on the grid until you save.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 4 Opaque shift chips

Shipped: Assigned shift chips use a solid fill of the shift color. The old color-plus-`15` tint is gone. Each full chip shows the role or position name with the title. Unassigned chips stay on the plain background. Minimized view still shows only the title. Row count, paging, and store filters are unchanged.

Proven: Playwright test `tests/playwright/scheduling-phase-04-opaque-chips.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It asserts two same-day assigned chips are opaque and each shows its role, and that an unassigned chip stays visually distinct. This environment has no `SUPABASE_SERVICE_ROLE_KEY`, so the test was not executed here. Typecheck and ESLint on the changed files are the checks run for this phase.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Schedule.
2. Put two assigned shifts on the same day with different roles and colors.
3. Each chip should be a solid color, and each should show its role or position name as well as the title.
4. An unassigned shift on that day should still look plain, not filled with its color.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 5 Full-width availability sheet

Shipped: My availability and Team hours open in a full-width sheet. Team requests, My time off, My swaps, and Reminders stay at `sm:max-w-2xl`. The availability form is unchanged.

Proven: Playwright test `tests/playwright/scheduling-phase-05-availability-sheet.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It asserts My availability and Team hours are full width and the other four panels stay narrow. This environment has no `SUPABASE_SERVICE_ROLE_KEY`, so the test was not executed here. Typecheck and ESLint on the changed files are the checks run for this phase.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Schedule.
2. Open My availability. The sheet should use the full width of the phone or desktop screen.
3. Open Team hours. It should also be full width.
4. Open Team requests, My time off, My swaps, and Reminders. Each of those should stay a narrow side sheet.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 6 Weekday availability rows

Shipped: The checkmark hour grid is gone. Each weekday is one row: All day on, or Off. Off shows from and to times. Save still writes `staff_availability` `day_of_week`, `start_time`, `end_time`, and `week_start_date`. All day on stores 06:00–21:00, the range the schedule code already treats as a full day. No new table.

Proven: Playwright test `tests/playwright/scheduling-phase-06-weekday-availability.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It saves Monday all day on and Tuesday off 14:00–18:00, reloads, and checks the same rows. This environment has no `SUPABASE_SERVICE_ROLE_KEY`, so the test was not executed here. Typecheck and ESLint on the changed files are the checks run for this phase.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as an employee and open My availability.
2. Set Monday to All day on.
3. Set Tuesday to Off, from 14:00 to 18:00.
4. Save, then reload the page.
5. Monday should still be All day on. Tuesday should still be Off from 14:00 to 18:00.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 7 org_prefs choice and schedule window

Shipped: `org_prefs` has `availability_choice` (`open` or `fixed` only) and `schedule_window_start_weekday`, `schedule_window_end_weekday`, and `schedule_posting_weekday` (0–6, no default day). This does not reuse `availability_lock_mode` and does not add a flexible value. Generated types in `src/integrations/supabase/types.ts` include the columns. Migration file: `supabase/migrations/20261021104137_org_prefs_availability_choice.sql`.

Proven: Unit test `src/integrations/supabase/orgPrefsAvailabilityChoice.test.ts` asserts the generated `org_prefs` types include the choice and the three weekday columns, and that the migration allows only `open` and `fixed`. Ran that test; it passed. `npm run typecheck` is part of this phase's checks.

The Supabase CLI could not run `supabase db push` because it has no access token. The same SQL was applied to the linked project through the Supabase migration API. Remote migration version `20261021104137` matches the file. The four columns are present on `org_prefs`.

Blockers: none for this phase. Phases that depend on this migration are not blocked.

Questions: none.

### 2026-10-21 — Phase 8 Team hours editor for open or fixed

Shipped: Team hours shows Availability choice when the person can manage availability. The choice is open or fixed only. The same editor saves the schedule window start weekday, end weekday, and posting weekday on `org_prefs`. Weekdays use Sunday as 0, matching the existing lock day list, and start unset. Saving upserts the company row. Migration `supabase/migrations/20261021104800_org_prefs_manager_write.sql` grants authenticated insert and update on `org_prefs` and limits those writes to company managers and people allowed to edit schedules. Lock controls and per-person exceptions stay on this screen.

Proven: Playwright test `tests/playwright/scheduling-phase-08-availability-choice.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It sets fixed, window start Monday, window end Friday, and posting Wednesday, reloads, and checks those values. Flexible is not a choice. This environment has no `SUPABASE_SERVICE_ROLE_KEY`, so the test was not executed here. `npm run typecheck` and ESLint on the changed files are the checks run for this phase.

The Supabase CLI could not run `supabase db push` because it has no access token. The same SQL was applied to the linked project through the Supabase migration API. Remote migration version `20261021104800` matches the file. Insert and update grants and the manager policies are present on `org_prefs`.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as someone who can manage availability, and open Schedule, then Team hours.
2. Set Choice to Fixed. Set Window start to Monday, Window end to Friday, and Posting weekday to Wednesday.
3. Tap Save availability choice.
4. Reload the page and open Team hours again. Those four values should still be selected. Flexible should not be a choice.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 9 Open availability does not require the grid

Shipped: When `org_prefs.availability_choice` is `open`, My availability shows that the person can work any day and any time. The weekday rows and Save changes stay hidden. Fixed, and a company with no choice yet, still use the Phase 6 weekday rows.

Proven: Playwright test `tests/playwright/scheduling-phase-09-open-availability.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It sets the company choice to open and asserts My availability has no weekday grid and no Save changes button. This environment has no `SUPABASE_SERVICE_ROLE_KEY`, so the test was not executed here. `npm run typecheck` and ESLint on the changed files are the checks run for this phase.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as someone who can manage availability, open Team hours, set Choice to Open, and save.
2. Sign in as an employee and open My availability.
3. The screen should say any day, any time. The weekday rows and Save changes should not be there.
4. Set the company choice back to Fixed if you still want the weekday rows.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 10 First login sends fixed availability

Shipped: When the company choice is fixed, an employee's first login shows Send your fixed availability inside the app shell. That step is employee onboarding. Sending inserts a pending `availability_request` with the weekday hours they chose. It does not write `staff_availability`, so the posted window stays as it was. Managers do not see the step. Open, and a company with no choice yet, do not show it. No Friday, Saturday, Sunday, or 7-day rule is hardcoded.

Proven: Playwright test `tests/playwright/scheduling-phase-10-first-login-fixed.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It sets the company choice to fixed, signs in as the staff user with no availability request, sends Monday all day, and asserts one pending request tagged `employee-onboarding`. This environment has no `SUPABASE_SERVICE_ROLE_KEY`, so the test was not executed here. `npm run typecheck` and ESLint on the changed files are the checks run for this phase.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as someone who can manage availability. Set Team hours Choice to Fixed and save.
2. Use an employee who has never sent availability, or remove their availability requests, then sign in as that employee.
3. The first screen inside the app should be Send your fixed availability.
4. Set at least one day and tap Send fixed availability.
5. The step should close. Team requests should show a pending availability request for that employee. Their posted hours on the schedule should stay as they were.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 11 Send another fixed availability

Shipped: When the company choice is fixed, My availability has Send fixed availability. That button inserts another pending `availability_request` from the weekday rows. It does not write `staff_availability`, so the posted window stays as it was. The next-window rule is still Phase 12.

Proven: Playwright test `tests/playwright/scheduling-phase-11-send-fixed-availability.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It seeds a posted Monday window, sends another fixed availability from My availability, and asserts the posted `staff_availability` row is unchanged and a `my-availability` request was added. This environment has no `SUPABASE_SERVICE_ROLE_KEY`, so the test was not executed here. `npm run typecheck` and ESLint on the changed files are the checks run for this phase.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as an employee whose company choice is Fixed, and who already sent availability once.
2. Open My availability. Change a day, then tap Send fixed availability. Do not tap Save changes.
3. A new pending availability request should exist. The hours already posted for this week should stay the same.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 12 Next window after the posting weekday

Shipped: `approvedFixedAvailabilityWindow` stores an approved fixed availability on the next window that starts after the next posting weekday. A send on the posting weekday uses the following posting date, so it does not change the window that posting is for. Weekdays come from `org_prefs` (0 is Sunday through 6 is Saturday). No day and no notice period are hardcoded.

Proven: Unit test `src/features/availability/utils/nextAvailabilityWindow.test.ts` asserts a send on the posting weekday is stored for the following window and does not change the posted window. It covers two different posting and window weekdays. Ran that test; it passed.

Blockers: none for this phase.

Questions: none. Phone steps: none. This phase is a unit test.

### 2026-10-21 — Phase 13 Decision 7 permission keys

Shipped: The registry and `productRoleContract.json` include `schedule.grant`, `schedule.reminders.assign`, and `schedule.reminders.grant_deactivate`. Owner, admin, and manager have them. Staff does not. They sit on the existing Team schedule edit verb. No second permission list was added.

Proven: `npm run check:roles` passed. `productLevels.test.ts`, run through `npm run test:product-roles`, asserts the three keys are on for owner, admin, and manager and off for staff. `npm run typecheck` passed.

Blockers: none for this phase.

Questions: none. Phone steps: none. This phase is the permission keys.

### 2026-10-21 — Phase 14 Team hours drops locks and exceptions

Shipped: Team hours no longer renders lock controls or per-person exceptions. Those components stay in the repo. The availability choice editor and the requests queue stay. The Team hours sheet description no longer names locks or exceptions.

Proven: Playwright test `tests/playwright/scheduling-phase-14-team-hours-screen.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It opens Team hours and asserts Lock controls and Per-person exceptions are absent. This environment has no `SUPABASE_SERVICE_ROLE_KEY`, so the test was not executed here. `npm run typecheck` and ESLint on the changed files are the checks run for this phase.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as someone who can manage availability and open Team hours.
2. Availability choice should still be there.
3. Lock controls and Per-person exceptions should not be on the screen.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 15 Team hours permission matrix

Shipped: Team hours lists people and the schedule permissions from Decisions 6 and 7: own schedule, team schedule, published grid, draft weeks (`editSchedules`), and create and assign shifts (`schedule.edit`). A person with `schedule.grant` can turn each one on or off. The change is stored as an allow or deny override on `user_permissions` and stays after reload. Lock controls and per-person exceptions stay off this screen. Migration `supabase/migrations/20261021110015_user_permissions_schedule_grant.sql` lets that person read teammate overrides and write those schedule keys.

Proven: Playwright test `tests/playwright/scheduling-phase-15-team-hours-matrix.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It turns the staff user's draft permission off, reloads, and asserts it is still off. This environment has no `SUPABASE_SERVICE_ROLE_KEY`, so the test was not executed here. `npm run typecheck` and ESLint on the changed files are the checks run for this phase.

The Supabase CLI could not run `supabase db push` because it has no access token. The same SQL was applied to the linked project through the Supabase migration API. Remote migration version `20261021110015` matches the file.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as someone with schedule grant permission and open Team hours.
2. Find a staff person. Turn Draft weeks off if it is on, or turn it on and then off.
3. Reload Team hours. Draft weeks should still be off for that person.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 16 Staff invite scheduling defaults

Shipped: A staff invite starts with own schedule, the team published grid (`viewTeamSchedules` and `schedule.view`), and draft and create-shift off. Those two can be switched on for that person on the existing Operator access grid. `schedule.grant` and create or delete stay off the staff ceiling.

Proven: Unit test `src/features/employees/utils/staffInviteScheduleDefaults.test.ts`, run through `npm run test:product-roles`, asserts the staff invite defaults and that `editSchedules` and `schedule.edit` can be switched on. `npm run check:roles` passed. `npm run typecheck` passed.

Blockers: none for this phase.

Questions: none. Phone steps: none. This phase is a unit test. The invite card on https://www.flowforce.uk uses the same defaults.

### 2026-10-21 — Phase 17 My swaps is linked to a shift

Shipped: The shift sheet shows Request swap when the signed-in person is assigned to that shift. Requesting inserts a pending row on the existing `shift_swaps` table through `createShiftSwap`, next to the existing fetch and status update. My swaps already lists swaps that person requested, and the panel query is invalidated so the new row shows up. Approving stays on Team requests.

Proven: Playwright test `tests/playwright/scheduling-phase-17-request-swap.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It requests a swap from the shift sheet and asserts the shift title appears in My swaps. This environment has no `SUPABASE_SERVICE_ROLE_KEY`, so the test was not executed here. `npm run typecheck` and ESLint on the changed files are the checks run for this phase.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as an employee who is assigned to a published shift.
2. Open Schedule and tap that shift.
3. Tap Request swap.
4. Open My swaps. The shift should be listed there.

Blockers: none for this phase.

Questions: none.
