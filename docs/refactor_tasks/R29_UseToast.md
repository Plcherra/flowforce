Task ID: R29
Section: Admin & Setup
Category: [BUGFIX]
Priority: Medium

Description

The `useToast` effect depends on `state`, causing repeated listener registration and memory growth.

Affected Areas

src/hooks/use-toast.ts

Proposed Solution

Change the `useEffect` dependency array to `[]` (and reference a stable setter) so the listener registers only once.

Expected Outcome

Toast subscriptions remain bounded and hooks stop issuing ESLint warnings.

Estimated Effort

2h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R29] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
