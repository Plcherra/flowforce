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
   - There is no second Add button and no separate "Add single shift" item.
   - On an empty week, Copy last week is not a second button. Add first shift stays, and it opens the same single-shift wizard.
2. Shift chips are opaque. The role or position name is on the chip. This does not decide how a 25, 50, 100, or 500 person grid works.
3. My availability and Team hours open in a full-width sheet. The other schedule sheets stay as they are.
4. Availability is one row per weekday: all day on, or off. Off stores a from-time and a to-time on the existing `staff_availability` row. There is no checkmark grid.
5. The only availability choices are open and fixed. Delete flexible availability. Do not add a flexible value, label, or branch. The choice lives on `org_prefs`, next to the existing lock columns. Do not reuse `availability_lock_mode` for this. The same row stores the schedule window start weekday, end weekday, and posting weekday. A person who can manage availability edits the choice and those three weekdays. `open` means any day, any time, and no grid is required. `fixed` is sent on the employee's first login, inside employee onboarding. A new fixed availability can always be sent after that. A send does not change the window being posted. After it is approved, it applies to the next window that starts after the next posting weekday. Do not hardcode Friday, Saturday, Sunday, or 7 days.
6. Permissions stay in `src/features/roles` and `src/lib/permissions/registry.ts`. Do not add a second matrix. Staff already default to `viewOwnSchedules`. Also default staff to `viewTeamSchedules` and `schedule.view` so they see their own published shifts and their team's published shifts. Draft weeks, creating shifts, and assigning shifts stay off for staff until those existing keys are turned on for that person (`editSchedules`, `schedule.edit`). Team hours reads and edits those keys. Lock controls and per-person exceptions are not the Team hours screen.
7. If a needed schedule permission key does not exist yet, add it to the existing registry and role matrix. Defaults: owner, admin, and manager on; staff off. Keys to add only when missing: `schedule.grant` (grant or remove another person's schedule permissions), `schedule.reminders.assign` (assign a reminder to someone else), `schedule.reminders.grant_deactivate` (decide whether that person may turn that reminder off).
8. Schedule reminders stay reminders. Do not merge them into tasks.
9. Ship each implemented phase with the Ship-To-Main rule: one commit on `main`, then push `main`. Do not open a pull request for that phase.

## Phases

Auto run: the next phase is the first unchecked phase that is not blocked. Implement that phase only. Then append the Progress log and stop. A blocked phase is skipped and logged, and it does not count as the phase for that run.

### Phase 1 — Minimized view and role-template click

- [ ] Make the two broken view controls do something.

Rules:

- Files: `src/features/scheduling/components/DragDropScheduleCalendar.tsx`, `src/features/scheduling/components/drag-drop/WeekGrid.tsx`, `src/features/scheduling/components/drag-drop/ShiftChip.tsx`, `src/features/scheduling/components/drag-drop/ScheduleTemplatesPanel.tsx`, `src/features/scheduling/components/ShiftWizardDialog.tsx`.
- Minimized view is stored today and never read by the grid. When it is on, the week grid uses shorter rows and each shift chip shows only its title. When it is off, the chip keeps title, time, and duration.
- Role template rows in `ScheduleTemplatesPanel` are drag-only. A click opens the existing shift wizard with title, start, end, and role filled from that template. Dragging onto the grid stays as it is.
- Do not add a template table. Do not change Week templates.

Done when:

- Toggling Minimized view changes the chips on the week grid and turning it off restores the full chip.
- Clicking a role template opens the wizard prefilled from that template, and dragging that template still works.

### Phase 2 — One Add shift button

- [ ] Keep View options and Actions. Replace the Add control with one Add shift button.

Rules:

- Files: `src/features/scheduling/components/calendar/CalendarToolbar.tsx`, `src/features/scheduling/components/ScheduleEmptyState.tsx`, and the props passed from `DragDropScheduleCalendar.tsx`.
- Follow Decision 1. Do not rename View options or Actions. Do not move Copy previous week, Week templates, publish, export, or print.
- The Add shift button calls `onOpenAddShift`. Its menu calls the existing handlers for multiple shifts, import, unavailability, and time off.
- Remove the empty-week Copy last week button. Add first shift stays and calls `onOpenAddShift`.

Done when:

- View options and Actions are still on the toolbar.
- One Add shift button opens the single-shift wizard, and its menu still opens multiple shifts, import, unavailability, and time off.
- An empty week has Add first shift and does not have a Copy last week button. Add first shift opens the same wizard.

### Phase 3 — Load a shift template inside the wizard

- [ ] Load a saved shift template without closing the wizard.

Rules:

- Files: `src/features/scheduling/components/ShiftWizardDialog.tsx`, `src/features/scheduling/components/shift-wizard/DetailsTab.tsx`, `src/features/scheduling/hooks/useShiftTemplates.tsx`.
- The wizard already has Create New Shift, Details, Users, Tasks, and Notes. Add Load shift template on Details.
- The list is `useShiftTemplates()` for the current company. Choosing one copies the template's name, times, position, and headcount into the open form when those fields exist. Fields the template does not have stay as the user left them.
- Do not create the shift until the user saves. Do not add a second wizard.

Done when:

- With the wizard open, choosing a template fills the form and leaves the wizard open on the same shift.

### Phase 4 — Opaque shift chips

- [ ] Make shifts readable when several roles are on one day.

Rules:

- File: `src/features/scheduling/components/drag-drop/ShiftChip.tsx`.
- Assigned chips use an opaque fill from the shift color. The current fill is the color plus `15`, which is what makes them look transparent. Remove that tint.
- The chip shows the role or position name as well as the title.
- Unassigned chips stay visually distinct from assigned chips.
- Do not change row count, paging, or store filters. That is an Open question.

Done when:

- Two shifts of different roles on the same day are both solid colors, and each chip shows its role or position name.

### Phase 5 — Full-width availability sheet

- [ ] Stop opening My availability in the narrow side sheet.

Rules:

- File: `src/features/scheduling/components/SchedulingPanelSheet.tsx`.
- When the panel is availability, personal or team, the sheet is full width.
- Team requests, My time off, My swaps, and Reminders keep `sm:max-w-2xl`.
- Do not change the availability form in this phase.

Done when:

- My availability and Team hours use the full viewport width. The other four panels stay narrow.

### Phase 6 — Weekday availability rows

- [ ] Replace the checkmark availability grid.

Rules:

- Files: `src/features/availability/components/AvailabilityRequestForm.tsx` and the helpers it already uses in `src/features/availability/utils/availabilityUtils.ts`.
- Each weekday is one row: all day on, or off. Off shows from and to times.
- Save through the existing `staff_availability` columns `day_of_week`, `start_time`, `end_time`, and `week_start_date`. All day on stores the full-day range that code already treats as a full day. Do not add a table.
- Do not build "2 Sundays in the month" or alternating Saturdays.

Done when:

- A person can set Monday all day on, Tuesday off from 14:00 to 18:00, save, reload, and see the same rows.

### Phase 7 — Open or fixed, and the schedule window

- [ ] Store the company availability choice and the schedule window. There is no flexible availability.

Rules:

- Follow Decision 5. The stored choice is only `open` or `fixed`.
- Add columns on `org_prefs` for the choice and the three weekdays. Update the generated Supabase types the repo already checks in.
- The editor sits on Team hours, visible only when `canManageAvailability` is true. It offers open and fixed, and no third choice.
- When the company choice is fixed, the employee's first login runs that step inside employee onboarding (`src/features/onboarding`) and sends their fixed availability. My availability keeps a way to send a new fixed availability after that.
- A send creates the existing availability request and does not overwrite the posted window. Use the posting weekday on `org_prefs` for the next-window rule. Do not hardcode a day or a 7-day notice.

Done when:

- A manager can set open or fixed, and the three weekdays, reload, and see them again. Flexible is not a choice.
- With the choice set to open, My availability does not require the grid.
- A new employee's first login sends fixed availability when the company choice is fixed, and that person can send another fixed availability later.
- A send on the posting weekday does not change that window, and after approval it is stored for the following window.

### Phase 8 — Team hours is the schedule matrix

- [ ] Remove locks and per-person exceptions from Team hours.

Rules:

- Files: `src/features/scheduling/components/availability/TeamAvailabilityPanel.tsx`, `src/features/roles`, `src/lib/permissions/registry.ts`, `src/features/employees/components/invites/InvitePersonCard.tsx`.
- Follow Decisions 6 and 7.
- Team hours lists people and their schedule permissions. A person with `schedule.grant` can turn those permissions on or off for someone else, including giving a staff user draft and create-shift permissions.
- Do not render `LockControls` or `ExceptionsTable` on Team hours. Leave those files in the repo.
- The invite card already uses `OperatorAccessGrid`. The scheduling permissions in Decision 6 are on that grid and can be changed for the invited person before and after they are set up.

Done when:

- Team hours does not show lock controls or per-person exceptions.
- A staff invite defaults to own schedule plus the team published grid, with draft and create-shift off, and those can be switched on for that person.
- Turning a permission off for an existing user removes it, and reloading shows the same matrix.

### Phase 9 — My swaps is linked to a shift

- [ ] Let a person request a swap from a shift and see it under My swaps.

Rules:

- Files: `src/features/scheduling/components/ShiftSwapsPanel.tsx`, `src/features/scheduling/repositories/shiftSwapsRepository.ts`, and the shift sheet that already opens from a chip click.
- Add a create function beside `fetchShiftSwaps` and `updateShiftSwapStatus`. Use the existing swap table and columns. Do not add a swap system.
- The shift sheet offers Request swap for a shift the current user is on. My swaps lists swaps they requested or that were offered to them.
- Approving stays on Team requests and keeps the current `canApprove` behavior.

Done when:

- Requesting a swap on a shift creates a row, and that row is visible in My swaps for that user without a manual refresh path other than the panel's existing query.

### Phase 10 — Reminders for the person and for the manager

- [ ] Split personal reminders from assigned reminders, and link an assigned reminder to a real record.

Rules:

- Files: `src/features/scheduling/components/ScheduleRemindersPanel.tsx`, `src/features/scheduling/repositories/scheduleRemindersRepository.ts`, `src/features/scheduling/hooks/usePersonalScheduleReminders.ts`, and the registry in Decision 7.
- Follow Decisions 7 and 8.
- A person sees reminders for tasks, forms, and shifts they can already open. Clicking one opens that record's existing page.
- A person with `schedule.reminders.assign` can assign a reminder to someone else, with the time and how often.
- `allow_deactivate` is stored on that assigned reminder. The assignee can turn it off only when that flag is on. A person with `schedule.reminders.grant_deactivate` can set the flag, and can turn it off later.
- Personal reminders stay the person's own list. Do not copy them into tasks.

Done when:

- A manager can assign a form reminder to a staff user, set whether that user may deactivate it, and the staff user opens the form from the reminder.
- With the flag off, that staff user has no deactivate control. With the flag on, deactivating hides it for them and leaves other people's reminders alone.

### Phase 11 — Team requests on the list and on the grid

- [ ] Show request detail, and show requested time off on the grid.

Rules:

- Files: `src/features/scheduling/components/StaffShiftManagement.tsx`, `src/features/scheduling/components/TimeOffManagementPanel.tsx`, `src/features/scheduling/components/drag-drop/WeekGrid.tsx`.
- Each team request row shows status (pending, approved, rejected), the requested start and end, and the time left until the requested start.
- A pending or approved time-off request renders on that person's day in the week grid as requested off. Do not delete or move their shift in this phase.
- Who can approve stays `approveTimeOff` and the current `canApproveRequests` check. Do not add a permission list.

Done when:

- A pending time-off request appears in Team requests with status, requested times, and time left, and the same request is visible on the week grid as requested off.
- A person without approval permission cannot approve it.

### Phase 12 — Time off policies

- [ ] Blocked by Open question "Time off policies". Skip this phase. Do not invent allowance math or a policy tab.

### Phase 13 — Repeating weekday patterns

- [ ] Blocked by Open question "Repeating weekday patterns". Skip this phase. Do not store "2 Sundays in the month" or alternating Saturdays.

### Phase 14 — Who sees the leadership schedule

- [ ] Blocked by Open question "Who sees the leadership schedule". Skip this phase. Do not add a coffee-shop mode, an office mode, or a large-grid layout.

## Open questions

Do not answer these in a phase. Skip the phase that names the question.

### Time off policies

My time off correlates with a policy tab. That tab is a different feature. How do several policies combine into one allowance, such as 1 weekend day per month and x hours per year? Is the notice period a company number, and where is it edited?

### Repeating weekday patterns

Is there a way to record availability for someone who can work "2 Sundays in the month" or "1 Saturday yes and the other not"?

### Who sees the leadership schedule

How does the schedule differ for a coffee shop or an office that should not see the leadership insights? How do we test that while there are no other users? How does the grid work for 25, 50, 100, and 500 people, with multiple roles and stores?

## Progress log
