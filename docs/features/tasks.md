# Tasks

This file is a manual review of the Tasks page, to decide what the final product will be from what we have now.

Do not edit the Audit section. That includes editing it to pass a check.

## Audit

Starting with 2 buttons to create a task, 1 at the header as create task and 1 more below as new task.

The page has good features, but it seems to be too disorganized. We have the readiness with overdue, unassigned, and due tasks, but it's the same as below in the tab:

All
2

To Do
2

In Progress
0

In Review
0

Blocked
0

Done
0

Cancelled
0

It seems to be a lot of information without definitions, or in a way hard to use.

If it will be a tab instead of a view filter, this tab has to be above the readiness so it controls the readiness.

The tasks will work in this way:

Tasks from shift, like custom recurrent tasks, for example = review the delivery. Vendor visit related tasks could be attached or linked somehow.

Lists/forms as cashier closing, or cashier opening checklist, will be a kind of task interlinked with the forms page, so if someone missed a task inside of any form, or missed a form, or even had some issue inside of a form, it will somehow be shown here.

Custom tasks — bake 3 portions of this new recipe as a test, pack these items to send to the other store.

An extra feature will be the AI action on our help to help forms and reports. A vision of the forms will be having an "additional information" on the end of the form with the option to make a task for tomorrow. For example:

- please place the rubber matts into the bar/cashier space before the day starts
- the fridges are defrosting, milks are in the walk-in

So all that somehow links to the opening on the next day to help the opening if it is the closing form, or even daily.

Of course all of these will be part of the matrix permission, and each person will have the right permission to create each type of task, or not even permission to create tasks for another person, or even themselves.

## Suggestions

These notes are suggestions from the assistant. They are not part of the audit. Do not treat them as the owner's words.

- One create button only. Remove the duplicate header "Create task" and the "New task" button below it. Use the same floating + / create-menu pattern the schedule page uses.
- Status tabs move above the Readiness strip and control it. Readiness counts (overdue, unassigned, due) become tappable filters instead of duplicating the tabs. Hide zero-count statuses such as Cancelled and In Review behind a "More" control. Add a one-line definition, as a tooltip, for every status and every readiness item.
- Three task types, each with a visible source badge, and a filter by type.
  - Shift tasks: recurring custom tasks attached to a shift, for example review the delivery, or a vendor visit.
  - Checklist tasks linked to Forms: cashier opening or closing. A missed form, a missed item, or a reported issue inside a form surfaces here.
  - Custom tasks: one-off work, for example bake 3 test portions, or pack items for the other store.
- Handover notes: an "Additional information" field at the end of a form that can create a task for the next day, linked to the next opening checklist or shift. For example, place rubber mats before opening, or fridges defrosting and milk in the walk-in.
- Permission matrix keys per task type: create for others, create for self, or none.
- An AI suggestion that turns form notes into draft tasks. This is a later phase. It stays blocked by an Open question unless the behavior is clearly specifiable.

## Decisions

These are locked for the auto run. Implement them. Do not edit this section while implementing a phase.

1. The Tasks page has one create control. It is a floating + button with a create menu, using the same fixed placement as the schedule Create button. The menu item is "New custom task". It opens the existing create dialog. Remove the header Create Task button and the readiness New Task button. The empty state does not render a create button. Shift tasks stay created from the shift. This menu does not create a checklist task.
2. Status tabs render above the readiness strip. The selected status is the set of tasks the readiness counts use. All stays in the main row. Any other status whose count is 0 is listed under More. The selected status stays in the main row even when its count is 0. Each status and each readiness item has a one-line tooltip:
   - All: Every task on this page.
   - To Do: Not started yet.
   - In Progress: Someone is working on it.
   - In Review: Waiting to be checked.
   - Blocked: Cannot continue until something else is done.
   - Done: Finished. Includes tasks stored as done or completed.
   - Cancelled: Stopped, and not expected to be finished.
   - Other: A status this page does not name.
   - Overdue: The due date is before today, and the task is not done or cancelled.
   - Unassigned: Nobody is assigned.
   - Due: The due date is today, and the task is not done or cancelled.
3. The readiness strip shows three counts: Overdue, Unassigned, and Due. Due means due today. Each count is a button. Pressing it filters the list. Pressing the active one clears that filter. Counts use the tasks in the selected status tab, and they do not change when a readiness filter is on. Replace the six summary cards in the readiness panel with these three counts. Leave the manager-review issue list in place. Overdue and Due skip tasks whose status is done, completed, or cancelled. Unassigned is any task in the tab with no assignee. Use the same past-due and due-today checks the readiness summary already uses.
4. A task kind comes from the existing `source` column. No new column. Shift when `source` is `schedule`. Checklist when `source` is `form`. Custom for every other value, including a missing source. The badge text is Shift, Checklist, or Custom. The list can filter by that kind. The Schedule badge on a shift task becomes the Shift badge. The shift title and the Open shift link stay.
5. Permission keys stay in `src/features/roles` and `src/lib/permissions/registry.ts`. Do not add a second permission list. Add only these keys: `tasks.shift.create_self`, `tasks.shift.create_others`, `tasks.checklist.create_self`, `tasks.checklist.create_others`, `tasks.custom.create_self`, `tasks.custom.create_others`. They sit on the existing Run lists edit verb. Owner, admin, and manager include all six. Staff includes none, and the staff ceiling does not grant them in this feature. The level for a kind is others when that kind's create_others key resolves on, otherwise self when create_self resolves on, otherwise none. create_others may assign the task to anyone, including yourself. create_self may assign it only to the signed-in user. none cannot create that kind. For custom tasks, `editTasks` still counts as others when both custom keys are off, so a company role that does not have the new keys yet does not lose Create.
6. The last step of filling a form shows Additional information, and a checkbox labeled Make a task for tomorrow. The note is stored on the submission as `additional_information`. When the checkbox is on and the note is not blank, submitting the form also inserts one task: `source` `form`, status todo, due the next local calendar day, title the first line up to 80 characters, description the whole note, `links.form_id` set to that form, assignee the signed-in user. It does not look up an opening shift. Hide the checkbox when the checklist level is none. `editTasks` counts as others for that checkbox when both checklist keys are off, same as Decision 5.
7. Do not turn form notes into draft tasks.
8. Do not add a detector for a missed form, a missed item, or a reported issue.
9. Do not link a handover task to the next opening checklist or shift.
10. Do not add a recurrence engine. A shift task remains the existing row with `source` `schedule`.
11. Ship each implemented phase with the Ship-To-Main rule: one commit on `main`, then push `main`. Do not open a pull request for that phase.

## Phases

Auto run: start at the first unchecked phase that is not blocked and does not depend on an unapplied migration. After that phase is green, continue to the next such phase in the same run if time allows. Each phase is its own commit on `main`. Append the Progress log as you go. Skip a blocked phase and log the skip.

A phase that adds a migration follows the Feature workflow migration rule. If the Progress log has `needs owner: supabase db push <migration>`, skip phases that depend on that migration and continue with phases that do not. `check:supabase:remote-drift` in deploy-readiness fails until the push lands. That is expected.

### Phase 1 — One create button

- [x] Replace the two create buttons with one floating create menu.

Rules:

- Files: `src/features/tasks/pages/Tasks.tsx`, `src/features/tasks/components/TaskExecutionReadinessPanel.tsx`, `src/features/tasks/components/TaskEmptyState.tsx`, and a new `src/features/tasks/components/TaskCreateMenu.tsx`.
- Follow Decision 1. The button uses the schedule Create button's fixed placement and a popover menu. `data-testid="tasks-create-button"` stays on that button. The menu is `data-testid="tasks-create-menu"`.
- "New custom task" opens the existing create dialog. Do not add a shift item or a checklist item.
- Remove `onCreateTask` from the readiness panel when nothing calls it.

Done when:

- The header has no Create Task button, and the readiness strip has no New Task button.
- The empty state has no create button.
- The floating + opens a menu, and New custom task opens the existing create dialog.

Prove: Playwright test using `tests/playwright/helpers/schedulingPlaywrightTenant.ts` opens the Tasks page, asserts one create button, and opens New custom task.

### Phase 2 — Status tabs, definitions, and More

- [x] Move the status tabs above readiness, and explain each status.

Rules:

- Files: `src/features/tasks/pages/Tasks.tsx`, `src/features/tasks/components/TaskStatusTabs.tsx`, and a new `src/features/tasks/utils/statusTabLayout.ts` with `src/features/tasks/utils/statusTabLayout.test.ts`.
- Follow Decision 2 for order, More, and the status tooltips. Readiness tooltips land in Phase 3.
- All stays visible. A status with count 0 goes under More unless it is the selected status.
- Do not change which tasks a status tab includes. Done still includes `done` and `completed`.

Done when:

- The status tabs render above the readiness strip.
- A zero-count status such as Cancelled is under More, and choosing it shows that status's tasks.
- Every visible status has the Decision 2 tooltip.

Prove: Unit test `src/features/tasks/utils/statusTabLayout.test.ts` covers More, the selected zero-count tab, and the definition text. Run it with the same jiti style as `scripts/test-schedule-task-link.mjs`.

### Phase 3 — Readiness counts filter the list

- [x] Make overdue, unassigned, and due into filters the status tab controls.

Rules:

- Files: `src/features/tasks/pages/Tasks.tsx`, `src/features/tasks/components/TaskExecutionReadinessPanel.tsx`, and a new `src/features/tasks/utils/readinessFilters.ts` with `src/features/tasks/utils/readinessFilters.test.ts`.
- Follow Decision 3. Pass the status-filtered tasks into the readiness counts. Apply the readiness filter only to the list.
- Each of the three counts shows its Decision 2 tooltip.
- Reset filters clears the readiness filter as well as status, priority, and search.
- Leave `TaskMetricsCards` in place.

Done when:

- Overdue, Unassigned, and Due are buttons. The counts match the selected status tab.
- Pressing Overdue shows only those tasks. Pressing it again shows the tab's tasks again.
- A zero overdue count is still visible and does not duplicate a status tab.

Prove: Unit test `src/features/tasks/utils/readinessFilters.test.ts` covers the three counts, the due-today case, and filtering. Run it with the same jiti style as `scripts/test-schedule-task-link.mjs`.

### Phase 4 — Shift, Checklist, and Custom badges

- [x] Show the task kind and filter the list by it.

Rules:

- Files: `src/features/tasks/utils/taskKind.ts`, `src/features/tasks/utils/taskKind.test.ts`, `src/features/tasks/utils/taskFiltering.ts`, `src/features/tasks/components/TaskCard.tsx`, `src/features/tasks/components/TaskDetailsDialog.tsx`, `src/features/tasks/components/TaskFilters.tsx`, `src/features/tasks/pages/Tasks.tsx`.
- Follow Decision 4. Do not add a column or a migration.
- The filter values are all, shift, checklist, and custom. Default is all.

Done when:

- A schedule task shows a Shift badge and its shift title. A form task shows Checklist. Any other task shows Custom.
- The type filter limits the list to that kind.
- Open shift is still on a shift task.

Prove: Unit test `src/features/tasks/utils/taskKind.test.ts` covers the three kinds and the filter. Run it with the same jiti style as `scripts/test-schedule-task-link.mjs`.

### Phase 5 — Task-type permission keys

- [x] Add the six create keys to the existing matrix.

Rules:

- Files: `src/lib/permissions/registry.ts`, `src/features/roles/constants/productRoleContract.json`, `src/features/roles/constants/productLevels.test.ts`.
- Follow Decision 5 for the key names, who has them, and the Run lists edit verb. Do not add a screen in this phase. Do not change `editTasks`.
- Staff default and the staff ceiling stay without these keys.

Done when:

- The registry and the product role contract include the six keys.
- Owner, admin, and manager resolve them on. Staff resolves them off, and staff cannot be granted them through the ceiling.
- Run lists edit still classifies every registry key. No second permission list exists.

Prove: `npm run check:roles` and `npm run test:product-roles`. The product-level test asserts the six keys are on for owner, admin, and manager, and off for staff.

### Phase 6 — Custom create follows the permission level

- [x] Hide custom create when the level is none, and keep it for someone who can already edit tasks.

Rules:

- Files: a new `src/features/tasks/utils/taskCreateLevel.ts` with `src/features/tasks/utils/taskCreateLevel.test.ts`, `src/features/tasks/pages/Tasks.tsx`, `src/features/tasks/components/CreateTaskDialog.tsx`.
- Follow Decision 5. Use `useCan`. Explicit custom keys win over `editTasks`.
- When the level is none, do not render the floating create button.
- When the level is self, the create dialog assigns the task to the signed-in user and does not offer another assignee.
- When the level is others, the existing assignee field stays.
- While permission is loading, leave the button in place.

Done when:

- A person with both custom keys off and no `editTasks` has no create button.
- A person with `editTasks` and both custom keys off still has the create button.
- A person with only `tasks.custom.create_self` can create, and the assignee is themselves.

Prove: Unit test `src/features/tasks/utils/taskCreateLevel.test.ts`. Run it with the same jiti style as `scripts/test-schedule-task-link.mjs`.

### Phase 7 — Additional information on a form

- [x] Let a form note create a task for tomorrow.

Rules:

- Files: a new `src/features/forms/utils/handoverTask.ts` with `src/features/forms/utils/handoverTask.test.ts`, a new `src/features/forms/components/HandoverNotesField.tsx`, and `src/features/forms/components/FormFillDialog.tsx`.
- Follow Decision 6. Put the field on the review step, after the answers. Do not add a form-builder field type and do not add a migration.
- Create the task only after the submission succeeds. If the task insert fails, the submission stays saved and the toast says the form was saved but the task was not.
- Reuse `taskCreateLevel` for the checklist keys. Hide the checkbox when that level is none. The text field stays.

Done when:

- The review step shows Additional information and, when the person may create a checklist task, Make a task for tomorrow.
- A filled note with the checkbox on inserts one checklist task due the next local day, linked to that form.
- A blank note does not insert a task. The checkbox off does not insert a task.

Prove: Unit test `src/features/forms/utils/handoverTask.test.ts` covers the title, the next local day, the form link, and the blank note. Run it with the same jiti style as `scripts/test-schedule-task-link.mjs`.

### Phase 8 — Missed form, missed item, or reported issue

- [x] Blocked by Open question "Missed form, missed item, or reported issue". Skip this phase. Do not add a detector and do not insert checklist tasks from a form result.

Prove: Skip. Do not add a test until the Open question "Missed form, missed item, or reported issue" is answered.

### Phase 9 — Link a handover task to the next opening

- [x] Blocked by Open question "Next opening checklist or shift". Skip this phase. Do not look up an opening checklist or a shift for a handover task.

Prove: Skip. Do not add a test until the Open question "Next opening checklist or shift" is answered.

### Phase 10 — Recurring shift-task template

- [x] Blocked by Open question "Recurring shift tasks". Skip this phase. Do not copy a task onto future shifts.

Prove: Skip. Do not add a test until the Open question "Recurring shift tasks" is answered.

### Phase 11 — AI draft tasks from form notes

- [x] Blocked by Open question "AI draft tasks from form notes". Skip this phase. Do not call a model and do not insert a draft task from a note.

Prove: Skip. Do not add a test until the Open question "AI draft tasks from form notes" is answered.

### Phase 12 — Per-person Others, Self, or None

- [x] Blocked by Open question "Where the task-type level is edited". Skip this phase. Do not add a second permission screen.

Prove: Skip. Do not add a test until the Open question "Where the task-type level is edited" is answered.

## Follow-up

Do not edit this section. That includes editing it to pass a check.

We can optimize almost everything.

All
2
Every task on this page. Every task on this page.

To Do
2

Can have in progress, in review, blocked, cancelled, the search box, and view filters. It seems we have a lot of buttons and functions all spread along the page without organization or a section.

Big chunks of cards for simple alerts of tasks. Imagine 5 or 10 roles, and each of them has 1 warning alert or any issue. We need to make this visually greater and more pleasant for users to use.

Reminders and activity, for example, take the right side only, leaving the screen on the left empty. The layout is bad in spacing each thing.

Let's change the "estimate time" for a starting time and an end time. For example, this task will start Thursday 22 at 7am and finish Friday at 7am. The task can be published now, scheduled to be published tomorrow at the starting time, or even draft only.

That means, independently, if the task is meant to take only 1 hour, it has a window of 1 day, or the employee will have from x day and time until that day and time.

Tasks will have points to act on recognition, the leaderboard, and/or performance.

## Follow-up decisions

These are locked for the phases below. Do not edit this section while implementing one of those phases.

12. A status or readiness definition is a `title` hint only. It must not be rendered as visible text. The focused tab must not leave the sentence on the page, and the sentence must not appear twice.
13. One View section holds the status choices, including In Progress, In Review, Blocked, and Cancelled, plus search, type, and priority. A zero-count status still sits under More, inside that section. Overdue, Unassigned, and Due are small counts in that same section. The separate metric cards are not on the page.
14. Each warning is one compact row: the reason and the task title. Rows stack in one list. There is no large card per warning, and no empty "no blockers" banner.
15. The task list uses the full width. Reminders and activity sit under the list, side by side on a wide screen and stacked on a narrow one. They are not a rail beside an empty list.
16. Estimated hours is not on the create form or the task details form. Those forms ask for a start and an end, each a date and a time. The window is when the task is open. It is not how long the work takes. Store `starts_at` and `ends_at` on the existing `links` object. Set `due_date` from the end, in local calendar date, so overdue and due still work. Do not add a column.
17. The create form has Publish now, Schedule for the start, and Draft. Store `links.publish_state` as `published`, `scheduled`, or `draft`. A missing value means published, so older tasks stay visible. A draft is listed only for its creator. A scheduled task is listed for other people only once the start time has passed. The creator always sees it. The card shows Draft or Scheduled when that applies.
18. Points are a whole number on `links.points`. The create form and the card show them. When a completed task has points, the existing leaderboard task XP for that task is that number. When it does not, the leaderboard keeps the priority and estimated-hours XP it already uses. Do not add a points table. Do not write `staff_performance`.

### Phase 13 — Definitions stay off the page

- [x] Keep each status and readiness definition as a hover hint, not as text on the page.

Rules:

- Files: `src/features/tasks/components/TaskStatusTabs.tsx`, `src/features/tasks/components/TaskExecutionReadinessPanel.tsx`.
- Follow Follow-up decision 12. Do not use the tooltip component for these hints. A focused tab must not show the sentence.
- The definition strings stay the ones in decision 2.

Done when:

- All shows its label and count, and "Every task on this page." is not visible text under it.
- Hovering All still offers that sentence once.

Prove: Unit test `src/features/tasks/utils/statusHint.test.ts` renders the status tabs and asserts the definition is the `title` and is not a text node. Run it with `node scripts/test-tasks-page.mjs`.

### Phase 14 — One View section

- [x] Group status, search, and filters into one section, and drop the metric cards.

Rules:

- Files: `src/features/tasks/pages/Tasks.tsx`, `src/features/tasks/components/TaskFilters.tsx`, `src/features/tasks/components/TaskStatusTabs.tsx`, `src/features/tasks/components/TaskExecutionReadinessPanel.tsx`, and a new `src/features/tasks/components/TaskViewSection.tsx` if the page would otherwise grow past the point of the change.
- Follow Follow-up decision 13. Do not delete `TaskMetricsCards.tsx`. Stop rendering it on the Tasks page.

Done when:

- Search, type, priority, the status choices, and the three readiness counts are in one View section.
- The metric cards are not on the page.

Prove: The status-tab unit test still passes. Phone steps for Pedro are in the Progress log. This phase is layout.

### Phase 15 — Compact warnings

- [ ] Turn each warning into one row.

Rules:

- Files: `src/features/tasks/components/TaskExecutionReadinessPanel.tsx`.
- Follow Follow-up decision 14.

Done when:

- Ten warnings are ten rows in one list, not ten large cards.
- A page with no warnings does not show a banner.

Prove: Phone steps for Pedro are in the Progress log. This phase is layout.

### Phase 16 — List, then reminders and activity

- [ ] Give the list the full width, and place reminders and activity underneath.

Rules:

- Files: `src/features/tasks/pages/Tasks.tsx`.
- Follow Follow-up decision 15. Do not change what reminders or activity load.

Done when:

- On a wide screen the task list is not a left column beside a right rail.
- Reminders and activity are two columns under the list.

Prove: Phone steps for Pedro are in the Progress log. This phase is layout.

### Phase 17 — Start, end, and publish

- [ ] Replace estimated hours with a window, and add publish, schedule, and draft.

Rules:

- Files: a new `src/features/tasks/utils/taskSchedule.ts` with `src/features/tasks/utils/taskSchedule.test.ts`, `src/features/tasks/components/CreateTaskDialog.tsx`, `src/features/tasks/components/TaskDetailsDialog.tsx`, `src/features/tasks/components/TaskCard.tsx`, `src/features/tasks/pages/Tasks.tsx`.
- Follow Follow-up decisions 16 and 17. Do not add a migration. Keep other keys already stored on `links`.
- The Tasks page list and its counts use the viewer rule. The creator is `created_by`.

Done when:

- Create and details ask for a start and an end, not estimated hours.
- Publish now, Schedule for the start, and Draft save on the task.
- Another person does not see a draft, or a scheduled task before its start. The creator does.
- The card shows the window, and Draft or Scheduled when that applies.

Prove: Unit test `src/features/tasks/utils/taskSchedule.test.ts` covers the window, the local due date, draft visibility, and scheduled visibility. Run it with `node scripts/test-tasks-page.mjs`.

### Phase 18 — Points on the leaderboard

- [ ] Store points on a task and use them as that task's leaderboard XP.

Rules:

- Files: `src/features/tasks/utils/taskSchedule.ts`, `src/features/tasks/utils/taskSchedule.test.ts`, `src/features/gamification/leaderboard/calculations.ts`, `src/features/gamification/leaderboard/syncLeaderboard.ts`, `src/features/tasks/components/CreateTaskDialog.tsx`, `src/features/tasks/components/TaskCard.tsx`.
- Follow Follow-up decision 18. Do not write `staff_performance`.

Done when:

- Create can set a whole number of points, and the card shows it.
- A completed task with points contributes that number to task XP. A completed task without points keeps the old priority and estimated-hours XP.

Prove: Extend `taskSchedule.test.ts`, or add the XP cases beside `taskCompletionXp` if that function lives in `calculations.ts`, and run it with `node scripts/test-tasks-page.mjs`.

### Phase 19 — Points and performance

- [ ] Blocked by Open question "Task points and performance". Skip this phase. Do not write a performance score from task points.

Prove: Skip. Do not add a test until the Open question "Task points and performance" is answered.

## Open questions

Do not answer these in a phase. Skip the phase that names the question.

### Missed form, missed item, or reported issue

What counts as a missed form, a missed item inside a form, or a reported issue? When does that become a checklist task, and who is it assigned to?

### Next opening checklist or shift

How is the next opening checklist or shift chosen for a handover note? The examples are rubber mats before opening, and fridges defrosting with milk in the walk-in. The match rule is not specified.

### Recurring shift tasks

A shift task such as review the delivery or a vendor visit is described as recurrent and attached to a shift. Does it stay the single row already stored on that shift, or does a template copy it onto later shifts?

### AI draft tasks from form notes

The AI action should help forms and reports by turning additional-information notes into draft tasks. Which notes become drafts, who approves them, and when does it run?

### Where the task-type level is edited

Each person should be able to create a task type for others, for themselves, or not at all. The access grid turns a whole verb on or off, so it cannot store Others, Self, and None separately per type. Which existing screen edits that choice for one person?

### Task points and performance

A task can have points that act on recognition, the leaderboard, and/or performance. The leaderboard already turns completed tasks into task XP. How should those points change `staff_performance`, and is that the same number as the leaderboard XP?

## Progress log

### 2026-10-21 — Phase 1 One create button

Shipped: The Tasks page has one floating + button. Its menu item is New custom task, and that opens the existing create dialog. The header Create Task button, the readiness New Task button, and the empty-state create button are gone.

Proven: Playwright test `tests/playwright/tasks-phase-01-create-button.spec.ts` uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts`. It opens Tasks, asserts one create button, and opens New custom task. This environment has no `SUPABASE_SERVICE_ROLE_KEY`, so the test was not executed here. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Tasks.
2. The header should not say Create Task, and Execution Readiness should not say New Task.
3. Tap the round + button at the bottom right. The menu should say New custom task.
4. Tap New custom task. The existing create dialog should open.
5. If the list is empty, that empty card should not have its own Create Task button.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 2 Status tabs, definitions, and More

Shipped: Status tabs sit above the readiness strip. All stays visible. A status with a zero count, such as Cancelled or In Review, is under More unless it is the selected tab. Each status has its one-line tooltip. Done still includes tasks stored as done or completed.

Proven: Unit test `src/features/tasks/utils/statusTabLayout.test.ts`, run with `node scripts/test-tasks-page.mjs`, covers More, a selected zero-count tab, and the definition text. It passed. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Tasks.
2. The status tabs should sit above Execution Readiness.
3. Press and hold, or hover, To Do. The tooltip should say Not started yet.
4. Open More. Cancelled and In Review should be there when their counts are 0.
5. Choose Cancelled. That tab should move into the main row, and the list should show cancelled tasks only.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 3 Readiness counts filter the list

Shipped: Execution Readiness shows Overdue, Unassigned, and Due. Each is a button with its definition. The counts use the tasks in the selected status tab, and they stay put when a readiness filter is on. Pressing a count filters the list. Pressing it again clears that filter. Reset filters clears it too. The six summary cards are gone. The manager-review list stays. The metric cards stay.

Proven: Unit test `src/features/tasks/utils/readinessFilters.test.ts`, run with `node scripts/test-tasks-page.mjs`, covers the three counts, due today, a finished task that is not overdue, and filtering. It passed. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Tasks. Leave the status on All.
2. Execution Readiness should show Overdue, Unassigned, and Due, each with a number. Hover or press and hold one. The tooltip should explain it.
3. Tap Overdue. The list should show only overdue tasks. Tap Overdue again. The list should go back to the tab.
4. Switch to To Do. The three numbers should count only To Do tasks.
5. Open More and choose Cancelled if it is there. Overdue and Due should not treat finished or cancelled tasks as due.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 4 Shift, Checklist, and Custom badges

Shipped: Each task shows a Shift, Checklist, or Custom badge from its source. A shift task keeps its shift title and Open shift. The list has a type filter for those three kinds. Readiness counts still follow the status tab.

Proven: Unit test `src/features/tasks/utils/taskKind.test.ts`, run with `node scripts/test-tasks-page.mjs`, covers the three kinds and the filter. It passed. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Tasks.
2. A task that came from a shift should say Shift, and still name the shift. Open it. Open shift should still be there.
3. A task you created yourself should say Custom.
4. Open the type filter and choose Shift. The list should show shift tasks only.
5. Clear filters. All three kinds should be listed again.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 5 Task-type permission keys

Shipped: The registry and the product role contract include create-for-self and create-for-others for shift, checklist, and custom tasks. Owner, admin, and manager have all six. Staff has none, and the staff ceiling does not grant them. They sit on Run lists edit. `editTasks` is unchanged. No new screen.

Proven: `npm run check:roles` passed. `npm run test:product-roles` passed. `productLevels.test.ts` asserts the six keys are on for owner, admin, and manager and off for staff. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Blockers: none for this phase.

Questions: none. Phone steps: none. This phase is the permission keys.

### 2026-10-21 — Phase 6 Custom create follows the permission level

Shipped: The floating create button stays for someone with `editTasks` when the new custom keys are off. It stays for someone with only `tasks.custom.create_self`, and that dialog says Assigned to you and saves the task to them. It is hidden when both custom keys are off and `editTasks` is off. While permissions are loading, the button stays.

Proven: Unit test `src/features/tasks/utils/taskCreateLevel.test.ts`, run with `node scripts/test-tasks-page.mjs`, covers none, the `editTasks` fallback, self winning over that fallback, and others. It passed. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as a manager who can edit tasks. Open Tasks. The + button should still be there.
2. Sign in as a staff person who cannot edit tasks. The + button should not be there.
3. If a person is allowed to create custom tasks only for themselves, open New custom task. It should say Assigned to you, with no list of other people.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 7 Additional information on a form

Shipped: The last step of a form shows Additional information. When the person may create a checklist task, it also shows Make a task for tomorrow. The note is stored on the submission as `additional_information`. A filled note with the checkbox on inserts one checklist task due the next local day, assigned to the signed-in person, with `links.form_id` set to that form. A blank note does not insert a task. If the task insert fails, the submission stays saved and the toast says the form was saved but the task was not. This does not look up an opening shift.

Proven: Unit test `src/features/forms/utils/handoverTask.test.ts`, run with `node scripts/test-tasks-page.mjs`, covers the title, the 80-character limit, the next local day, the form link, and a blank note. It passed. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as someone who can edit tasks. Open a form and go to the last step.
2. Additional information should be at the end, with Make a task for tomorrow.
3. Type "place the rubber mats before opening", turn the checkbox on, and submit.
4. Open Tasks. That note should be a Checklist task due tomorrow.
5. Submit another form with the checkbox off, or with the note empty. It should not add a task.

Blockers: none for this phase.

Questions: none.

### 2026-10-21 — Phase 8 Missed form, missed item, or reported issue

Skipped. Blocked by Open question "Missed form, missed item, or reported issue". No detector was added, and no checklist task is inserted from a form result. No test was added.

Questions: The phase needs the Open question "Missed form, missed item, or reported issue" answered: what counts as a missed form, a missed item, or a reported issue, and who the task is assigned to.

### 2026-10-21 — Phase 9 Link a handover task to the next opening

Skipped. Blocked by Open question "Next opening checklist or shift". A handover task is not matched to an opening checklist or a shift. No test was added.

Questions: The phase needs the Open question "Next opening checklist or shift" answered.

### 2026-10-21 — Phase 10 Recurring shift-task template

Skipped. Blocked by Open question "Recurring shift tasks". A shift task stays the existing row. It is not copied onto later shifts. No test was added.

Questions: The phase needs the Open question "Recurring shift tasks" answered.

### 2026-10-21 — Phase 11 AI draft tasks from form notes

Skipped. Blocked by Open question "AI draft tasks from form notes". No model is called, and a note is not turned into a draft task. No test was added.

Questions: The phase needs the Open question "AI draft tasks from form notes" answered: which notes become drafts, who approves them, and when it runs.

### 2026-10-21 — Phase 12 Per-person Others, Self, or None

Skipped. Blocked by Open question "Where the task-type level is edited". No second permission screen was added. No test was added.

Questions: The phase needs the Open question "Where the task-type level is edited" answered.

### 2026-10-22 — Phase 13 Definitions stay off the page

Shipped: Each status and readiness definition is a `title` hint. The sentence is not rendered as text under the tab. A focused tab does not leave the sentence on the page, and it is not shown twice.

Proven: Unit test `src/features/tasks/utils/statusHint.test.ts`, run with `node scripts/test-tasks-page.mjs`, renders the status tabs and asserts "Every task on this page." is the `title` and is not a text node. It passed. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Tasks.
2. All should show the word All and its count. The sentence "Every task on this page." should not sit under the tab.
3. Hover All. That sentence should appear once, as a hint.
4. Hover Overdue. The hint should say the due date is before today, and the task is not done or cancelled.

Blockers: none for this phase.

Questions: none.

### 2026-10-22 — Phase 14 One View section

Shipped: Status, search, type, priority, and the Overdue, Unassigned, and Due counts sit in one View section. A zero-count status stays under More inside that section. The metric cards are not rendered on the Tasks page. `TaskMetricsCards.tsx` is still in the repo.

Proven: `node scripts/test-tasks-page.mjs` passed, including the status-tab hint test. `npm run typecheck` passed. ESLint passed on the files this phase changed. This phase is layout.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Tasks.
2. One section labelled View should hold the status chips, the search box, the type and priority filters, and the three small readiness counts.
3. In Progress, In Review, Blocked, and Cancelled should be in that section. A status with a zero count should be under More.
4. The old row of metric cards should be gone.

Blockers: none for this phase.

Questions: none.
