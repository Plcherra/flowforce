Task ID: R12
Section: Inventory
Category: [BUGFIX]
Priority: Critical

Description

Transfer listing calls return every record because `listTransfers` omits company scoping.

Affected Areas

src/services/inventory.ts, src/hooks/inventory/useInventoryTransfers.tsx

Proposed Solution

Add company-aware filters in the service and ensure the React Query hook passes the current company id.

Expected Outcome

Inventory transfer history is tenant-safe and does not leak other companies' movements.

Estimated Effort

4h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R12] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
