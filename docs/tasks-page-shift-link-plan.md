# Tasks page: show shift tasks and keep them current

**Status:** Ready to execute. Do not redesign the schedule page.

**When this file is the task, implement every unchecked phase in order. Do not ask which phase to do. Do not stop to confirm the decisions below. Stop only when a phase check fails, and then fix that phase before continuing.**

The owner tests on https://www.flowforce.uk. Preview deploys cannot sign in.

Shipping rule for this plan:

1. Work on `main`. Do not open a branch or pull request.
2. One commit per phase, then push `main`.
3. After the last push, say the production deploy is in progress and that a refresh of flowforce.uk shows it when the deploy finishes.
4. Do not force-push `main`.

## Frozen decisions

These are already chosen. Do not offer alternatives while executing.

- A shift task is a normal row in `tasks`. It is not a second task system.
- The join key is `tasks.links.schedule_id`. The shift name is `tasks.links.shift_title`. `tasks.source` is `"schedule"`.
- The Tasks page already loads these rows because `fetchTasksByCompany` has no source filter. The flaw is display and freshness, not missing data.
- Opening a shift task goes to `/app/enhanced-scheduling?shift=<schedule_id>` and opens that shift sheet.
- Moving a shift updates the linked task due date and assignee. It does not rewrite the title, description, priority, or status.
- Deleting a shift cancels the linked tasks. It does not delete the rows.
- `done` and `completed` are one Done tab. New writes keep using `completed`.
- Schedule reminders stay separate. Do not merge them into tasks.
- Do not change task RLS. Company members can still read company tasks.
- Do not change Staff Grid event placement, Smart Fill, or the week-board event rules.

## Current write shape

`ShiftDetailsPanel.handleAddTask` and `ShiftWizardDialog.persistShiftTasks` already insert:

- `source: "schedule"`
- `status: "todo"`
- `tags: ["schedule", shiftId]`
- `links: { schedule_id, shift_title }`
- `due_date`: the shift end date
- `assigned_to`: the first person on the shift, or null

The Tasks card (`TaskCard`) and details dialog (`TaskDetailsDialog`) do not read `source` or `links`. Search in `filterTasks` does not include the shift title. Status tabs list `done` and `completed` separately.

## Phase 1: Read a shift link

- [x] Add `src/features/tasks/utils/scheduleTaskLink.ts`.
- [x] `readScheduleTaskLink(task)` returns `{ scheduleId, shiftTitle, href }` when `source === "schedule"` and `links.schedule_id` is a non-empty string. Otherwise it returns null.
- [x] Accept `links` as an object. Ignore arrays and other shapes.
- [x] `href` is `/app/enhanced-scheduling?shift=<scheduleId>`.
- [x] `shiftTitle` is `links.shift_title` when that is a non-empty string, otherwise `"Shift"`.
- [x] `dueDateFromShiftEnd(endIso)` returns `yyyy-MM-dd` in local time. Return null for a missing or invalid time. Do not use `toISOString().slice(0, 10)`.
- [x] Add `src/features/tasks/utils/scheduleTaskLink.test.ts` and run it with the same jiti style as `scripts/test-move-shift.mjs`.

Acceptance: a schedule task with a shift id produces a link. A normal task returns null. An overnight end keeps the local calendar date.

## Phase 2: Show the shift on the Tasks page

Files:

- `src/features/tasks/pages/Tasks.tsx`
- `src/features/tasks/components/TaskCard.tsx`
- `src/features/tasks/components/TaskDetailsDialog.tsx`
- `src/features/tasks/utils/taskFiltering.ts`

- [x] Replace the page subtitle with: `Today's work, including tasks that came from a shift.`
- [x] On a linked task, the card shows a `Schedule` badge and the shift title.
- [x] The details dialog shows the same badge, the shift title, and a link labeled `Open shift` to `href`.
- [x] Search matches the shift title as well as the title, description, goal, and assignee.
- [x] Tasks with no schedule link look the same as they do now.

Acceptance: a schedule task is recognizable in the list and the dialog. A manual task has no Schedule badge and no Open shift link.

## Phase 3: One Done tab

Files:

- `src/features/tasks/utils/statusTabs.ts`
- `src/features/tasks/utils/taskStats.ts`
- `src/features/tasks/utils/taskFiltering.ts`
- `src/features/tasks/types/filters.ts` only if the tab value list needs a comment

- [ ] The status tabs show one Done tab, not both Done and Completed.
- [ ] That tab's count is the number of tasks whose status is `done` or `completed`.
- [ ] Selecting Done shows both statuses.
- [ ] Badges still say Done for `completed`. Keep writing `completed` from the status buttons.
- [ ] Do not rename stored `done` rows.

Acceptance: a list with one `done` task and one `completed` task shows a Done count of 2 and no second completed tab.

## Phase 4: Open the shift from the task

Files:

- `src/features/scheduling/components/EnhancedCalendarView.tsx`
- `src/features/scheduling/pages/EnhancedScheduling.tsx` only if the query param is read higher up

- [ ] `?shift=<id>` opens `ShiftDetailsPanel` for that id.
- [ ] Closing the sheet removes `shift` from the URL and leaves `panel` and `availability` alone.
- [ ] If that shift is already in the loaded week, open it directly.
- [ ] If it is not in the loaded week, read that schedule's `start_time` and move the week to the week that contains it, then open the sheet.
- [ ] An unknown id does not trap the page. Drop the param and stay on the schedule.

Acceptance: from a task, Open shift lands on the schedule with that shift sheet open. Closing the sheet leaves the week board usable.

## Phase 5: Keep the task current when the shift changes

Add `src/features/tasks/repositories/scheduleTaskSync.ts`.

- [ ] `refreshTasksForShift(shiftId)` loads that schedule's `end_time` and assignment `user_id`s. It updates rows where `source` is `schedule` and `links->>schedule_id` equals the shift id.
- [ ] The update sets `due_date` from `dueDateFromShiftEnd` and `assigned_to` to the first assignee, or null when the shift has nobody. It does not change title, description, priority, or status.
- [ ] `cancelTasksForShift(shiftId)` sets those same rows to `status: "cancelled"`. It does not delete them.
- [ ] Call `refreshTasksForShift` after a successful drag move in `useShiftDragDrop`, and after a successful save in `ShiftDetailsPanel.handleSave`.
- [ ] Call `cancelTasksForShift` before `deleteSchedule` removes the shift. If the cancel fails, do not delete the shift.
- [ ] A shift with no linked tasks is a no-op.
- [ ] Failure to refresh after a move shows a warning toast: `The shift moved, but its tasks still have the old day.` The shift move itself still stands.
- [ ] Do not add a success toast for the task sync.

Acceptance: moving a shift to another day changes the linked task due date. Moving it onto one person sets that person. Removing the last person clears the assignee. Deleting the shift marks the task cancelled and the task remains on the Tasks page under Cancelled.

## Phase 6: Check and ship

- [ ] `npm run typecheck:src`
- [ ] The new node tests for the link helper, the Done tab count, and the due-date helper.
- [ ] Do not restore a schedule UI preview harness.
- [ ] Do not require a signed-in browser pass in this environment. Say that the live check is a refresh of flowforce.uk.
- [ ] Push `main`.

## Out of scope

- Task RLS, so staff still see company tasks.
- Schedule reminders and the Tasks page reminder panel.
- Staff Grid versus Week event placement.
- Rewriting `TasksTab` or the shift wizard. They already insert the right row.
- Goals, comments, and activity feed.
