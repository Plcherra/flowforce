Task ID: R21
Section: Analytics & AI
Category: [BUGFIX]
Priority: Medium

Description

`AIInsightsPanel` stores the interval handle as `NodeJS.Timeout`, which is `number` in browsers and causes type mismatches and SSR hydration warnings.

Affected Areas

src/components/ai/AIInsightsPanel.tsx

Proposed Solution

Switch to `ReturnType<typeof setInterval>` (or `number`) and audit cleanup logic to avoid lingering timers.

Expected Outcome

Builds compile without type hacks and timers cleanly tear down.

Estimated Effort

2h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R21] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
