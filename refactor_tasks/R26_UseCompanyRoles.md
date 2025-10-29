Task ID: R26
Section: Admin & Setup
Category: [BUGFIX]
Priority: High

Description

`useCompanyRoles` falls back to permissive default roles when the RPC fails (e.g., due to missing company), granting pseudo-permissions during onboarding.

Affected Areas

src/hooks/useCompanyRoles.tsx

Proposed Solution

Surface an explicit error state instead of injecting defaults, and gate the fallback behind an onboarding flag with minimal permissions.

Expected Outcome

Permission checks no longer assume elevated abilities when role data is unavailable.

Estimated Effort

4h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R26] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
