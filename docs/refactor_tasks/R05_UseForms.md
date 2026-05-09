Task ID: R05
Section: Operations
Category: [REFACTOR]
Priority: Medium

Description

`useForms` defines `fetchForms` inline without memoisation, generating ESLint hook warnings and risking stale closures when dependencies change.

Affected Areas

src/hooks/useForms.tsx

Proposed Solution

Wrap the fetcher in `useCallback`, include it in the effect dependencies, and align the hook with React Query for caching; add a regression test to ensure pagination still works.

Expected Outcome

Hook warnings disappear, fetches are predictable, and form data stays fresh without redundant network calls.

Estimated Effort

3h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R05] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
