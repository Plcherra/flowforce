Task ID: R17
Section: Accounting / Finance
Category: [BUGFIX]
Priority: High

Description

Expense queries in `useExpenses` return every record because company scoping is absent.

Affected Areas

src/hooks/useExpenses.tsx, src/pages/Expenses.tsx

Proposed Solution

Join expenses to the employee’s company, add filters, and ensure new expense mutations set `company_id`.

Expected Outcome

Expense lists and analytics no longer bleed cross-company transactions.

Estimated Effort

4h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R17] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
