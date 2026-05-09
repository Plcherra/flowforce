Task ID: R15
Section: Inventory
Category: [REFACTOR]
Priority: Medium

Description

`useInventoryTransactions` returns `any[]` and lacks tenant filtering, hindering type safety and data isolation.

Affected Areas

src/hooks/inventory/useInventoryTransactions.tsx

Proposed Solution

Introduce typed DTOs, add company-aware filters within the query, and propagate the hook contract to consumers.

Expected Outcome

Inventory transaction consumers gain reliable types and only see in-company records.

Estimated Effort

4h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R15] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
