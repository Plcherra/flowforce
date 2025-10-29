Task ID: R27
Section: Admin & Setup
Category: [BUGFIX]
Priority: Critical

Description

Admin profile fetches (`useProfiles`, `useCompanyRolesSnapshot`) do not filter by company, so administrators can list every user in the system.

Affected Areas

src/hooks/useRoles.tsx, src/pages/Settings.tsx

Proposed Solution

Scope the queries with the current company id and extend RLS policies if necessary.

Expected Outcome

Admin consoles only enumerate users within the active tenant.

Estimated Effort

4h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R27] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
