Task ID: R20
Section: Accounting / Finance
Category: [BUGFIX]
Priority: Medium

Description

`clockedInToday` in `useEmployeeFinancialMetrics` only checks the last event for `clock_in`, so users on break or with `break_start` as the latest entry show as not clocked in.

Affected Areas

src/hooks/useFinancialManagement.ts

Proposed Solution

Derive clock-in state by scanning for unmatched `clock_in` vs `clock_out` events and account for interleaved breaks.

Expected Outcome

Employee dashboards correctly reflect live clock-ins even during active breaks.

Estimated Effort

4h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R20] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
