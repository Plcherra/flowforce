# Tasks

Queued until Time Off's 9 phases are checked. The remaining work is phases 9–12, and those stay skipped until their open questions are answered. Do not redo the checked phases. Do not open this file from a Theme or Languages run.

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

### Phase 8 — What counts as one list issue

- [x] Turn the three attention cases into one Checklist task draft each.

Rules:

- Files: a new `src/features/tasks/utils/listIssues.ts` with `src/features/tasks/utils/listIssues.test.ts`.
- Follow Owner answer 24. Do not insert a row in this phase.
- A list or form is not done when the shift has ended and the person scheduled on that shift has no submission for that form during the shift. The form ids live on `schedules.requirements.list_form_ids`.
- A required item is missing when the submission's answer for that field is blank. An item is flagged when the answer is the word issue, or an object with `flagged` or `issue` set true.
- One field is one issue. A flagged field is not also a missing-item issue.
- The draft is `source` `form`, status todo, assignee the person on that shift, due the shift's local end date. `links` stores `form_id`, `list_issue_key`, `list_issue_kind`, and the shift id and field id when they exist.

Done when:

- A missed form, a blank required item, and a flagged item are three Checklist drafts, each assigned to the person on that shift.
- A form submitted with every required item answered, and nothing flagged, adds no draft.

Prove: Unit test `src/features/tasks/utils/listIssues.test.ts`. Run it with `node scripts/test-tasks-page.mjs`.

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

- [x] Turn each warning into one row.

Rules:

- Files: `src/features/tasks/components/TaskExecutionReadinessPanel.tsx`.
- Follow Follow-up decision 14.

Done when:

- Ten warnings are ten rows in one list, not ten large cards.
- A page with no warnings does not show a banner.

Prove: Phone steps for Pedro are in the Progress log. This phase is layout.

### Phase 16 — List, then reminders and activity

- [x] Give the list the full width, and place reminders and activity underneath.

Rules:

- Files: `src/features/tasks/pages/Tasks.tsx`.
- Follow Follow-up decision 15. Do not change what reminders or activity load.

Done when:

- On a wide screen the task list is not a left column beside a right rail.
- Reminders and activity are two columns under the list.

Prove: Phone steps for Pedro are in the Progress log. This phase is layout.

### Phase 17 — Start, end, and publish

- [x] Replace estimated hours with a window, and add publish, schedule, and draft.

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

- [x] Store points on a task and use them as that task's leaderboard XP.

Rules:

- Files: `src/features/tasks/utils/taskSchedule.ts`, `src/features/tasks/utils/taskSchedule.test.ts`, `src/features/gamification/leaderboard/calculations.ts`, `src/features/gamification/leaderboard/syncLeaderboard.ts`, `src/features/tasks/components/CreateTaskDialog.tsx`, `src/features/tasks/components/TaskCard.tsx`.
- Follow Follow-up decision 18. Do not write `staff_performance`.

Done when:

- Create can set a whole number of points, and the card shows it.
- A completed task with points contributes that number to task XP. A completed task without points keeps the old priority and estimated-hours XP.

Prove: Extend `taskSchedule.test.ts`, or add the XP cases beside `taskCompletionXp` if that function lives in `calculations.ts`, and run it with `node scripts/test-tasks-page.mjs`.

### Phase 19 — Points and performance

- [x] Show leaderboard task XP as the performance task-points total.

Rules:

- Files: a new `src/features/performance/utils/taskPointsTotal.ts` with `src/features/performance/utils/taskPointsTotal.test.ts`, and `src/features/performance/pages/Performance/PerformancePage.tsx`.
- Follow Owner answer 25. Do not write `staff_performance`. Do not add a second score.
- The number is the sum of leaderboard `xp.tasks` already loaded for the page. The label is Task points. The description says it is the leaderboard task XP.

Done when:

- Performance shows one Task points total, and that total is the leaderboard task XP already on the page.
- Completing a task does not write a different number to `staff_performance`.

Prove: Unit test `src/features/performance/utils/taskPointsTotal.test.ts`. Run it with `node scripts/test-tasks-page.mjs`.

## Shift answers

These are locked for the phases below. Do not edit this section while implementing one of those phases.

19. The person scheduled on a shift is responsible for the tasks and forms attached to that shift at that store. John, scheduled as barista at store 1, has store 1's barista opening, daily, and closing lists because those lists are attached to his shift. This does not say which unanswered item inside a list becomes a new task.
20. The schedule chooses who receives a handover. When the current person is on a closing shift and may create the task, a note or task is published to the person scheduled tomorrow on that same shift. The same shift is the same template when both have one. Otherwise it is the same store and the same role or position. A shift is closing when its title or role contains the word "close" or "closing". If nobody is scheduled tomorrow, the note is not given to someone else. The form still assigns the note to its author until that form is attached to the closing shift.
21. A task or form stays on the shift it was attached to. It is not copied onto later shifts.
22. The owner receives the day's list information. The owner can grant that access to another person. The grant can let them act, or only read. A day needs that person when the lists have two or more issues, or when the lists are clean and a supervisor recorded something the lists did not catch. Do not call a model until Open question "What counts as one list issue" is answered.
23. The employee directory card is where one person's task create level is edited. Shift, Checklist, and Custom are each None, For myself, or For others. Those six keys are stored on that person. Turning a whole access box on or off does not reset them. A staff person can be granted one of those keys. Their class still starts without them.

## Owner answers

These are locked for the phases below. Do not edit this section while implementing one of those phases.

24. One list issue is anything that needs attention. That is a list or form not done by its shift, a form submitted with a required item missing or unanswered, or an item flagged as an issue. Each issue becomes its own Checklist task for the person scheduled on that shift. The assignee is that shift's person, the same shift-owner rule as shift answer 19. A closing handover still follows shift answer 20 when that path creates the note. This answers "What counts as one list issue".
25. Task points are one number. They are the existing leaderboard task XP. Performance shows that same total. There is no second score, and `staff_performance` is not a second points store.
26. Each permission gets only the access types it needs. The set is decided per permission. Schedule is read, plus create, edit, and delete for shifts. Forms are read, meaning read other people's submitted forms, and create, edit, and delete, meaning create, edit, or delete a form template. The employee card access grid shows those types where a plain on or off is not enough. A grant that is already on stays on. The type set for the registry is:

| Permission | Types on the grid | Stored keys, existing grants stay equivalent |
| --- | --- | --- |
| Own profile | Read, Edit | `viewOwnProfile`, `editOwnProfile` |
| Team profiles | Read, Edit | `viewTeamProfiles`, `editTeamProfiles` |
| Own schedule | Read | `viewOwnSchedules` |
| Team schedule | Read | `viewTeamSchedules` and `schedule.view` move together |
| Shifts | Create, Edit, Delete | `schedule.create`; `schedule.edit` and `editSchedules`; `schedule.delete` |
| Grant schedule access | Grant | `schedule.grant` |
| Assign a reminder | Assign | `schedule.reminders.assign` |
| Let someone turn a reminder off | Grant | `schedule.reminders.grant_deactivate` |
| Own tasks | Read | `viewOwnTasks` |
| Team tasks | Read, Edit | `viewTeamTasks`, `editTasks` |
| Shift, Checklist, and Custom create | None, For myself, For others | The six task create keys stay in their own section |
| List issues | None, Read, Act | `tasks.list_issues.read`, `tasks.list_issues.act`. The class starts without them. The owner can grant them. |
| Own expenses | Read | `viewOwnExpenses` |
| Team expenses | Read | `viewTeamExpenses` |
| Approve expenses | Approve | `approveExpenses` |
| Approve time off | Approve | `approveTimeOff` |
| Submitted forms | Read | `forms.submissions.read`. Owner, admin, manager, and staff start with it on, because the forms page already lists team forms. Turning it off hides other people's submitted forms. |
| Form templates | Create, Edit, Delete | `createForms` is create. `manageForms` is edit and delete together, so those two switches stay aligned and an existing manage grant still means both. |
| Inventory items | Read, Create, Edit, Delete | `inventory.view`; `inventory.create`; `inventory.edit` and `manageInventory`; `inventory.delete` |
| Inventory adjust | Edit | `inventory.adjust` |
| Inventory import | Create | `inventory.import` |
| Inventory export | Export | `inventory.export` |
| Purchasing | Read, Manage | `inventory.purchasing.view`, `inventory.purchasing.manage` |
| Counts | Read, Create, Edit, Approve | `inventory.counts.view`, `inventory.counts.create`, `inventory.counts.edit`, `inventory.counts.approve` |
| Waste | Read, Create | `inventory.waste.view`, `inventory.waste.create` |
| Prep | Read, Edit | `inventory.prep.view`, `inventory.prep.edit` |
| Reports | Read, Export | `reports.view`, `reports.export` |
| AI insights | Read | `viewAIInsights` and `ai.insights.view` |
| AI suggestions | Suggest | `ai.actions.suggest` |
| AI approval | Approve | `ai.actions.approve` |
| AI audit | Read | `ai.audit.view` |
| AI automation | Automate | `ai.actions.automate` |
| AI governance | Manage | `ai.governance.manage` |
| Directory | Read, Edit | `directory.view`, `directory.manage` |
| Positions and classes | Edit | `managePositions`, `admin.roles`, `admin.permissions` |
| People | Create / delete | `manageUsers` is one key, so create and delete stay one switch |
| Billing | Read, Manage | `billing.view`, `billing.manage` |
| Company settings | Edit | `systemSettings`, `admin.settings`, `managePayments` |

### Phase 20 — Tomorrow's person on that shift

- [x] Find who is scheduled tomorrow on the same shift.

Rules:

- Files: a new `src/features/scheduling/utils/tomorrowShift.ts` with `src/features/scheduling/utils/tomorrowShift.test.ts`.
- Follow Shift answer 20. Do not change the form. Do not add a migration.

Done when:

- A closing shift resolves to tomorrow's assignee on that same shift.
- An opening shift, a different store, or a tomorrow shift with nobody scheduled does not resolve to a person.

Prove: Unit test `src/features/scheduling/utils/tomorrowShift.test.ts`. Run it with `node scripts/test-tasks-page.mjs`.

### Phase 21 — Task levels on the employee card

- [x] Edit None, For myself, and For others on the employee card.

Rules:

- Files: a new `src/features/roles/constants/taskCreateKeys.ts`, a new `src/features/tasks/utils/taskCreateAccess.ts` with `src/features/tasks/utils/taskCreateAccess.test.ts`, `src/features/roles/constants/operatorBoxes.ts`, `src/features/roles/constants/productRoleContract.json`, `src/features/roles/constants/productLevels.test.ts`, `src/features/tasks/utils/taskCreateLevel.ts`, `src/features/tasks/pages/Tasks.tsx`, `src/features/forms/components/FormFillDialog.tsx`, `src/features/employees/components/users/UserPermissionsTab.tsx`, and a new `src/features/employees/components/users/TaskCreateAccessSection.tsx`.
- Follow Shift answer 23. Do not rebuild the access boxes into read, create, edit, and delete.

Done when:

- The employee card has a Tasks section with None, For myself, and For others for Shift, Checklist, and Custom.
- Saving Checklist as For myself leaves Shift and Custom as they were, and leaves Run lists Edit on when its other keys are on.
- A saved None is none even when the person can still edit tasks. A missing key still falls back to that edit permission.

Prove: Unit test `src/features/tasks/utils/taskCreateAccess.test.ts`, run with `node scripts/test-tasks-page.mjs`. Also run `npm run test:product-roles` and `npm run check:roles`.

### Phase 22 — Insert a Checklist task per list issue

- [x] Insert the phase 8 drafts once each, for the person on that shift.

Rules:

- Files: a new `src/features/tasks/utils/listIssueInsert.ts` with `src/features/tasks/utils/listIssueInsert.test.ts`, a new `src/features/tasks/repositories/listIssueSync.ts`, `src/features/forms/components/FormFillDialog.tsx`, and a new `src/features/tasks/components/ListIssueSync.tsx` mounted from `src/features/tasks/pages/Tasks.tsx`.
- Follow Owner answer 24. Reuse `collectListIssues`. Do not add a migration. Form ids stay on `schedules.requirements.list_form_ids`.
- A draft whose `list_issue_key` is already on a task is not inserted again.
- Submitting a form inserts the missing-required and flagged drafts for that submission. The Tasks page inserts missed-form drafts for shifts that have already ended.
- If an insert fails, the form submission stays saved.

Done when:

- Each new issue becomes one Checklist task for the person scheduled on that shift.
- Saving the same result again does not add a second task.

Prove: Unit test `src/features/tasks/utils/listIssueInsert.test.ts`. Run it with `node scripts/test-tasks-page.mjs`.

### Phase 23 — Copilot gather

- [x] Gather the list issues for the owner, and for a person the owner grants act or read.

Rules:

- Files: a new `src/features/tasks/utils/listIssueGather.ts` with `src/features/tasks/utils/listIssueGather.test.ts`, a new `src/features/tasks/components/ListIssueGather.tsx`, `src/features/tasks/pages/Tasks.tsx`, `src/lib/permissions/registry.ts`, `src/features/roles/constants/productRoleContract.json`, `src/features/roles/constants/operatorBoxes.ts`, `src/features/roles/constants/productLevels.test.ts`, and a new `src/features/employees/components/users/ListIssueAccessSection.tsx` used from `UserPermissionsTab.tsx`.
- Follow Owner answer 24. Do not call a model. The gather is the list of Checklist tasks whose `links.list_issue_kind` is set.
- The owner sees them. `tasks.list_issues.read` sees them. `tasks.list_issues.act` sees them and can mark one done. Nobody else sees the gather. The person on the shift still sees their own task in the normal list.
- Owner, admin, and manager classes start without the two keys, except the owner wildcard. A staff person can be granted one. Turning a whole access box on or off does not reset them.

Done when:

- The owner, and a person granted read or act, sees the gathered issues. A person without that grant does not.
- Act can mark a gathered issue done. Read cannot.

Prove: Unit test `src/features/tasks/utils/listIssueGather.test.ts`. Run it with `node scripts/test-tasks-page.mjs`. Also run `npm run check:roles` and `npm run test:product-roles`.

### Phase 24 — Access types on the employee card

- [x] Replace plain on or off with the types each permission needs.

Rules:

- Files: a new `src/features/roles/constants/permissionAccessTypes.ts` with `src/features/roles/constants/permissionAccessTypes.test.ts`, `src/features/roles/components/OperatorAccessGrid.tsx`, `src/features/employees/components/users/UserPermissionsTab.tsx`, `src/features/employees/components/invites/InvitePersonCard.tsx`, `src/features/roles/components/RoleManagementDialog.tsx`, `src/lib/permissions/registry.ts`, and `src/features/roles/constants/productRoleContract.json`.
- Follow Owner answer 26. Do not add a second permission list. Add `forms.submissions.read` only. Staff, manager, admin, and the owner wildcard include it.
- The grid shows the types in the decision table. Task create levels and list-issue None / Read / Act stay their own sections.
- Saving a card without a change keeps the same keys. A manager who already has shift edit still has shift edit.

Done when:

- The employee card shows Read, Create, Edit, and Delete, or the smaller set that permission needs, instead of one on or off where the table lists more than one type.
- An existing manager grant round-trips to the same keys.

Prove: Unit test `src/features/roles/constants/permissionAccessTypes.test.ts`. Run it with `npm run test:product-roles`. Also run `npm run check:roles`.

## Open questions

None. Owner answers 24, 25, and 26 record the three questions that were here.

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

### 2026-10-22 — Phase 15 Compact warnings

Shipped: Each warning is one row: the reason, then the task title. The rows stack in one list. There is no large card per warning, and a page with no warnings shows nothing in that spot. The summary no longer caps the list at a handful of rows, so ten warnings stay ten rows.

Proven: `npm run typecheck` passed. ESLint passed on the files this phase changed. This phase is layout.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Tasks.
2. If a task is overdue, blocked, or unassigned, it should be one short row under Warnings, not a large coloured card.
3. Several warnings should stack in one list. Open one by tapping its row.
4. On a page with nothing overdue, blocked, or unassigned, and no due task missing a reminder, Warnings should be absent. There should be no green "no blockers" banner.

Blockers: none for this phase.

Questions: none.

### 2026-10-22 — Phase 16 List, then reminders and activity

Shipped: The task list uses the full width. Reminders and activity sit under the list, two columns on a wide screen and stacked on a narrow one. They are not a rail beside the list. What they load is unchanged.

Proven: `npm run typecheck` passed. ESLint passed on `src/features/tasks/pages/Tasks.tsx`. This phase is layout.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Tasks on a wide screen.
2. The task cards should span the page. Reminders and activity should sit under the list, side by side.
3. Narrow the window. Reminders and activity should stack, still under the list.
4. The left side of the page should not be an empty column beside those two panels.

Blockers: none for this phase.

Questions: none.

### 2026-10-22 — Phase 17 Start, end, and publish

Shipped: Create and task details ask for a start and an end, each a date and a time, instead of estimated hours. Publish now, Schedule for the start, and Draft are saved on `links.publish_state`, with `starts_at` and `ends_at` on the same object. Other link keys stay. `due_date` is the end's local calendar date. A missing publish state stays published. Drafts are listed only for the creator. A scheduled task is listed for other people once the start time is reached. The creator always sees it. The card shows the window, and Draft or Scheduled when that applies. The list and its counts use that viewer rule. No migration.

Proven: Unit test `src/features/tasks/utils/taskSchedule.test.ts`, run with `node scripts/test-tasks-page.mjs`, covers the local due date, preserved link keys, draft visibility, and scheduled visibility. It passed. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Tasks. Tap the round + button, then New custom task.
2. The form should ask for Starts and Ends, not Estimated hours. Set Thursday 22 at 7:00am through Friday at 7:00am.
3. Choose Schedule for the start and create the task. The card should show that window and Scheduled.
4. Create another task as Draft. You should see it. Ask someone else in the company to open Tasks. They should not see the draft, or a scheduled task before its start.
5. Open a task. Execution controls should save a start, an end, and a publish choice, not estimated hours.

Blockers: none for this phase.

Questions: none.

### 2026-10-22 — Phase 18 Points on the leaderboard

Shipped: Create can set a whole number of points, stored on `links.points`. The card shows that number. A completed task with points contributes that number to leaderboard task XP. A completed task without points keeps the priority and estimated-hours XP. `staff_performance` is not written.

Proven: `src/features/tasks/utils/taskSchedule.test.ts`, run with `node scripts/test-tasks-page.mjs`, covers a whole-number points value, zero points, a fractional value, and the old high-priority plus estimated-hours XP. It passed. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Tasks. Create a custom task with Points set to 40.
2. The card should show 40 points.
3. Create another task and leave Points empty. That card should not show a points count.
4. Completing the 40-point task counts 40 toward leaderboard task XP. A completed task with no points still uses the old priority and estimated-hours XP.

Blockers: none for this phase.

Questions: none.

### 2026-10-22 — Phase 19 Points and performance

Skipped. Blocked by Open question "Task points and performance". Task points are not written to `staff_performance`. No test was added.

Questions: The phase needs the Open question "Task points and performance" answered: how those points change `staff_performance`, and whether that number is the same as the leaderboard XP.

### 2026-10-22 — Phase 20 Tomorrow's person on that shift

Shipped: A closing shift resolves to the person scheduled tomorrow on that same shift. The same shift is the same template when both have one, otherwise the same store and the same role or position. Opening, a different store, a different template, and a tomorrow shift with nobody scheduled do not resolve to a person. The form still assigns a handover note to its author until the form is attached to the closing shift. No migration.

Proven: Unit test `src/features/scheduling/utils/tomorrowShift.test.ts`, run with `node scripts/test-tasks-page.mjs`, covers closing, opening, another store, an empty tomorrow shift, the same template, and a different template. It passed. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. This phase does not change a screen yet. The form's Make a task for tomorrow still assigns the task to the person who wrote the note.
2. The next time a form is attached to a closing shift, that task should go to whoever is scheduled tomorrow on that shift.

Blockers: none for this phase.

Questions: none.

### 2026-10-22 — Phase 21 Task levels on the employee card

Shipped: The employee directory card has a Tasks section. Shift, Checklist, and Custom are each None, For myself, or For others. Saving one type does not change the others, and it does not turn Run lists Edit off. A saved None stays none even when the person can still edit tasks. A person whose role never received the new keys still falls back to that edit permission. A staff person can be granted one of the keys. Their class still starts without them.

Proven: Unit test `src/features/tasks/utils/taskCreateAccess.test.ts`, run with `node scripts/test-tasks-page.mjs`, covers Checklist as For myself while Shift and Custom stay For others, and a staff allow for Checklist. It passed. `npm run test:product-roles` passed. `npm run check:roles` passed. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as an owner. Open the employee directory and open one person's card, then Access.
2. A Tasks section should sit above the access boxes, with Shift, Checklist, and Custom.
3. Set Checklist to For myself and save. Shift and Custom should stay as they were.
4. Set Checklist to None and save. Open a form as that person. Additional information should stay, and Make a task for tomorrow should be hidden.
5. Set Custom to None and save. The Tasks page should hide the + button for that person.

Blockers: none for this phase.

Questions: none.

### 2026-10-22 — Phase 22 Missed item inside a list

Skipped. Blocked by Open question "What counts as one list issue". A person scheduled on a shift is responsible for the lists attached to that shift. No task is inserted from an unanswered item. No test was added.

Questions: The phase needs the Open question "What counts as one list issue" answered.

### 2026-10-22 — Phase 23 Copilot gather

Skipped. Blocked by Open question "What counts as one list issue". No model is called. The owner still receives list information through the existing pages, and another person's act or read-only grant is not built until an issue is defined. No test was added.

Questions: The phase needs the Open question "What counts as one list issue" answered: which unanswered item, missed form, or supervisor note counts as one issue.

### 2026-10-22 — Phase 24 Read, create, edit, and delete

Skipped. Blocked by Open question "Which permissions use read, create, edit, and delete". The access boxes stay on or off. Task create levels are the section added on the employee card. No test was added.

Questions: The phase needs the Open question "Which permissions use read, create, edit, and delete" answered.

### 2026-10-22 — Phase 19 Points and performance

Shipped: Performance shows one Task points total. That number is the sum of leaderboard task XP already loaded for the page. It is not written to `staff_performance`, and it is not a second score.

Proven: Unit test `src/features/performance/utils/taskPointsTotal.test.ts`, run with `node scripts/test-tasks-page.mjs`, covers one task's XP, a sum, and a missing value. It passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Performance.
2. Task points should be one of the totals at the top.
3. The line under it should say it is the same total as leaderboard task XP.
4. Open the leaderboard for the month. The task XP across people should add up to that Task points number.

Blockers: none for this phase.

Questions: none.

### 2026-10-22 — Phase 8 What counts as one list issue

Shipped: A missed list, a required item left blank, and an item flagged as an issue are each one Checklist task draft. The draft is assigned to the person scheduled on that shift. A form that was submitted during the shift with every required item answered, and nothing flagged, adds no draft. Nothing is inserted yet.

Proven: Unit test `src/features/tasks/utils/listIssues.test.ts`, run with `node scripts/test-tasks-page.mjs`, covers the missed form, the blank required item, the flagged item, a clean submission, and a shift that has not ended. It passed. ESLint passed on the files this phase changed.

Blockers: none for this phase.

Questions: none. Phone steps: none. This phase is the draft rules. The next phase inserts the tasks.

### 2026-10-22 — Status buttons in one row

Shipped: Every status is one button in the View row. In Progress, In Review, Blocked, Done, and Cancelled stay beside All and To Do, including when their count is zero. The More button is gone. The definition is still a hover hint.

Proven: `src/features/tasks/utils/statusHint.test.ts`, run with `node scripts/test-tasks-page.mjs`, renders Cancelled as a button and asserts More is absent. It passed. `npm run typecheck` passed. ESLint passed on the files this change touched.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Tasks.
2. All, To Do, In Progress, In Review, Blocked, Done, and Cancelled should sit side by side in the View row.
3. There should be no More button, and no empty stretch with one button at the far end.
4. Hover All. The hint should still say Every task on this page, once.

### 2026-10-22 — Phase 22 Insert a Checklist task per list issue

Shipped: Submitting a form inserts one Checklist task for each required item left blank and each item flagged on the review step. The Tasks page also inserts a missed-form task when a shift has ended and its `requirements.list_form_ids` form was not submitted by the person on that shift during the shift. The same issue key is not inserted twice. A failed task insert leaves the form submission saved.

Proven: Unit test `src/features/tasks/utils/listIssueInsert.test.ts`, run with `node scripts/test-tasks-page.mjs`, covers the two field issues and a second pass that inserts nothing. It passed. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open a form. On the last step, flag one item as an issue and submit.
2. Open Tasks. That flag should be its own Checklist task assigned to you. A required item left blank should be another Checklist task.
3. Submit the same result again. It should not add a second copy of those tasks.
4. To try a missed list, put the form id in the shift's requirements under `list_form_ids`, schedule yourself, let the shift end, and open Tasks. The missed list should be a Checklist task for you.

Blockers: none for this phase. No migration.

Questions: none.

### 2026-10-22 — Phase 23 Copilot gather

Shipped: List issues gather on the Tasks page for the owner, and for a person granted Read or Act. Act can mark one done. Read cannot. No model is called. The employee card has List issues: None, Read, or Act. Those two keys are not in the class defaults, and turning an access box on or off does not reset them. A staff person can be granted one.

Proven: Unit test `src/features/tasks/utils/listIssueGather.test.ts`, run with `node scripts/test-tasks-page.mjs`, covers the owner, read, act, and a person with neither. It passed. `npm run check:roles` passed. `npm run test:product-roles` passed. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as the owner and open Tasks. If a list issue exists, it should be listed under List issues, with Mark done.
2. Open an employee's card, Access. List issues should offer None, Read, and Act.
3. Set it to Read and save. Sign in as that person. They should see the list, without Mark done.
4. Set it to Act. Mark done should be there, and tapping it should finish that task.

Blockers: none for this phase.

Questions: none.

### 2026-10-22 — Phase 24 Access types on the employee card

Shipped: The employee card, the invite card, and the class editor show the access types from Owner answer 26. Schedule read stays one switch. Shifts are Create, Edit, and Delete. Submitted forms are Read. Form template edit and delete stay on the same `manageForms` grant. Task create levels and list-issue None, Read, and Act stay their own sections. Saving a class no longer folds those types back into See, Edit, and Create / delete. `forms.submissions.read` starts on for staff, manager, admin, and the owner wildcard. An explicit deny hides other people's forms on the Forms page. A role that never received the key still shows them.

Proven: Unit test `src/features/roles/constants/permissionAccessTypes.test.ts`, run with `npm run test:product-roles`, covers the owner, admin, manager, and staff round trip, a manager shift edit that stays on while delete stays off, and a deny that hides submitted forms. It passed. `npm run check:roles` passed. `npm run typecheck` passed. ESLint passed on the files this phase changed.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk as the owner. Open the employee directory, open one person, then Access.
2. Shifts should show Create, Edit, and Delete as separate switches. Team schedule should show Read.
3. Submitted forms should show Read, already on. Form templates should show Create, Edit, and Delete.
4. Turn Submitted forms Read off and save. Sign in as that person and open Forms. Team Forms should be hidden. Their own forms should stay.
5. Turn it back on. Team Forms should return. A manager who could edit shifts should still be able to edit shifts, and still not delete them if that switch was off.

Blockers: none for this phase. No migration.

Questions: none.

### 2026-10-22 — Phases 9–12 still skipped

Skipped. Time Off is done, so this run opened Tasks. Phases 9–12 are already checked as skipped, and their open questions are still unanswered. No unchecked Tasks phase remains. No product code.

Questions: Phase 9 still needs "Next opening checklist or shift". Phase 10 still needs "Recurring shift tasks". Phase 11 still needs "AI draft tasks from form notes". Phase 12 still needs "Where the task-type level is edited".
