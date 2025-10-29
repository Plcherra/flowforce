Task ID: R01
Section: Operations
Category: [BUGFIX]
Priority: Critical

Description

`clearWeek` deletes schedules and vendor events without scoping to the active company, so running the action purges data for every tenant.

Affected Areas

src/contexts/SchedulingContext.tsx

Proposed Solution

Add `eq('company_id', companyId)` to the schedule and vendor event delete queries and ensure the guard returns early when `companyId` is falsy; update related tests or add coverage for the tenant guard.

Expected Outcome

Clearing a week only removes the current company's shifts/events and shared environments no longer suffer cross-tenant deletions.

Estimated Effort

4h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R01] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
