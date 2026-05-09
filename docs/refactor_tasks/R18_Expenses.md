Task ID: R18
Section: Accounting / Finance
Category: [BUGFIX]
Priority: High

Description

Rejecting an expense or payment still sets `approved_at`, producing misleading audit trails.

Affected Areas

src/pages/Expenses.tsx, src/components/payments/PaymentsOverview.tsx

Proposed Solution

Store rejection metadata in dedicated fields (e.g., `rejected_at`, `rejected_by`) and leave approval columns null when status is `rejected`.

Expected Outcome

Approval timelines remain accurate and downstream reports can distinguish rejections from approvals.

Estimated Effort

3h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R18] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
