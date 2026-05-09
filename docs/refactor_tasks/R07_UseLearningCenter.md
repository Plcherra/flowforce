Task ID: R07
Section: HR & Development
Category: [BUGFIX]
Priority: High

Description

`fetchAllEnrollments` returns the last 200 enrollments globally, leaking learning progress for other organisations.

Affected Areas

src/hooks/learning/useLearningCenter.ts

Proposed Solution

Require a company identifier (or admin guard) before running the query and apply the company filter; restrict non-admin users entirely.

Expected Outcome

Admin enrollment dashboards respect tenant boundaries and non-admins cannot enumerate foreign enrollments.

Estimated Effort

4h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R07] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
