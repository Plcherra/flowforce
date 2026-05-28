# Tasks And Goals Completion

Date: 2026-05-28

Purpose: define the pilot-ready task and goal execution surface for the authenticated web app.

## Product Rule

Tasks must be the execution layer for FlowForce. A manager should be able to:

- Create real tenant-scoped tasks.
- Assign work to teammates.
- Link tasks to goals.
- Move work through status transitions.
- Add comments and timeline evidence.
- Track estimated and actual hours.
- Add reminders, including repeating reminders for recurring follow-up.
- See what is overdue, blocked, unassigned, or disconnected from an operating workflow.

## Task Readiness Surface

The tasks page now includes an execution readiness panel with these signals:

- Active work.
- Blocked and overdue tasks.
- Unassigned tasks.
- Connected tasks versus standalone work.
- Task reminders and recurring reminders.
- Completion rate.
- Manager review items for overdue, blocked, unassigned, and due-without-reminder tasks.

## Goal Readiness Surface

The goals page now includes a goal execution readiness panel with these signals:

- Active goals.
- Overdue goals.
- Goals without linked tasks.
- Linked task count.
- Average task-weighted progress.
- Goal review items for overdue, taskless, and stalled goals.

## Execution Controls

Task details now support operational edits without leaving the review dialog:

- Priority.
- Due date.
- Estimated hours.
- Actual hours.
- Delete task.

Assignment, goal linking, status transitions, comments, and timeline evidence remain in the same task detail workflow.

## Deferred

Later phases should add:

- Dedicated recurring task templates if reminders are not enough for a customer segment.
- Deeper task connections to forms, inventory counts, purchases, and operations workflows as those modules are completed.
- Push notification delivery beyond local/browser reminder behavior.
- Batch assignment and manager review queues.
