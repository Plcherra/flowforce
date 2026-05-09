Task ID: R28
Section: Admin & Setup
Category: [BUGFIX]
Priority: High

Description

`useSaveUserPermissions` deletes overrides before inserting replacements without a transaction; a failure leaves the user with no overrides.

Affected Areas

src/hooks/useUserPermissions.tsx

Proposed Solution

Wrap delete/insert in a single Supabase RPC or use `upsert` semantics with temporary storage, and add audit tests.

Expected Outcome

Permission overrides update atomically and users do not lose settings on partial failures.

Estimated Effort

6h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R28] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
