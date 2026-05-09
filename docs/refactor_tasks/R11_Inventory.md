Task ID: R11
Section: Inventory
Category: [BUGFIX]
Priority: Critical

Description

`InventoryService.listItems` lacks a company filter, so the inventory UI can display items from other tenants.

Affected Areas

src/services/inventory.ts

Proposed Solution

Accept a company identifier parameter (or resolve from profile) and apply `.eq('company_id', …)` across list queries; update hooks to provide the context.

Expected Outcome

Inventory lists and analytics only show items owned by the active company.

Estimated Effort

4h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R11] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
