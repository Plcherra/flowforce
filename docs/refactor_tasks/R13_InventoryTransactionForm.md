Task ID: R13
Section: Inventory
Category: [BUGFIX]
Priority: High

Description

`InventoryTransactionForm` calculates `total_amount` with the pre-conversion quantity, so multi-unit adjustments record incorrect costs.

Affected Areas

src/components/inventory/InventoryTransactionForm.tsx

Proposed Solution

Use the normalized (base-unit) quantity when deriving totals and add tests covering converted units.

Expected Outcome

Transaction totals align with the actual stock movement irrespective of the selected unit.

Estimated Effort

3h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R13] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
