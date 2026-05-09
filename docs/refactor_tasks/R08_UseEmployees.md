Task ID: R08
Section: HR & Development
Category: [BUGFIX]
Priority: High

Description

`useEmployees` silently swallows errors when resolving the current profile, then queries the profiles table without a company filter, exposing every active employee on failure.

Affected Areas

src/hooks/useEmployees.tsx

Proposed Solution

Handle the `currentProfile` error explicitly, short-circuit until company context exists, and add a fallback that enforces `.eq('company_id', …)` even when context lookup fails.

Expected Outcome

Employee rosters remain scoped to the company and transient Supabase errors no longer escalate into data leaks.

Estimated Effort

4h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R08] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
