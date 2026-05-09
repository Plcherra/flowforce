Task ID: R14
Section: Inventory
Category: [BUGFIX]
Priority: High

Description

Transfer line payloads allow empty `unit_id` strings, which Supabase rejects and yields generic errors; the UI gives no feedback.

Affected Areas

src/components/inventory/InventoryTransfersPanel.tsx

Proposed Solution

Enforce a valid unit selection before building the payload, show field-level validation, and prevent submission until resolved.

Expected Outcome

Users receive clear guidance on missing unit selections and transfers succeed without silent failures.

Estimated Effort

4h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R14] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
