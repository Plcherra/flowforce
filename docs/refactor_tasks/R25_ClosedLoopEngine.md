Task ID: R25
Section: Analytics & AI
Category: [AI-LOGIC]
Priority: Critical

Description

`buildClosedLoopState` scopes events and schedules by company but leaves tasks, time-off requests, and shift swaps unfiltered, pulling other tenants' records into AI insights.

Affected Areas

src/services/intelligence/closedLoopEngine.ts

Proposed Solution

Apply company filters to every supporting query and add regression coverage for mixed-tenant datasets.

Expected Outcome

Closed-loop analytics only analyse the active company’s operations.

Estimated Effort

6h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R25] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
