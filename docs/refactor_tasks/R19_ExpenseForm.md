Task ID: R19
Section: Accounting / Finance
Category: [BUGFIX]
Priority: Medium

Description

`ExpenseForm` allows submitting empty categories or non-numeric amounts, leading to `NaN` inserts.

Affected Areas

src/components/expenses/ExpenseForm.tsx

Proposed Solution

Add controlled validation (required selects, numeric guarding) and surface user feedback before submission.

Expected Outcome

Expense creation succeeds consistently and Supabase rejects fewer malformed rows.

Estimated Effort

2h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R19] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
