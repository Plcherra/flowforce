Task ID: R02
Section: Operations
Category: [BUGFIX]
Priority: Critical

Description

Task queries pull every record because there is no company constraint, exposing other tenants' tasks to any authenticated user with read access.

Affected Areas

src/hooks/useTasks.tsx

Proposed Solution

Join tasks to the current profile company (via `profiles.company_id` or stored task company) and gate the select with `.eq('company_id', …)`; create regression tests that confirm other-company tasks are not returned.

Expected Outcome

Task lists contain only records tied to the signed-in company and RLS policies remain enforceable.

Estimated Effort

5h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
Implementation Summary

- `useTasks` now scopes the Supabase select via a combined `or` filter and locally removes any stragglers, logging whenever off-tenant rows are discarded.
- Historical unit coverage for this hook was retired during the Next.js-only cleanup. Rebuild coverage with the current test strategy before changing tenant filtering again.
- See `/refactor_tasks_progress.md` for completion tracking.
