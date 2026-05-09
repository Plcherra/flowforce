Task ID: R16
Section: Accounting / Finance
Category: [BUGFIX]
Priority: Critical

Description

`useManagerFinancialMetrics` aggregates six months of payments/expenses/inventory data without a company filter, exposing global financials.

Affected Areas

src/hooks/useFinancialManagement.ts

Proposed Solution

Thread the active company id through the hook and add `.eq('company_id', …)` (or equivalent) to each query; expand coverage to assert tenant isolation.

Expected Outcome

Financial dashboards reflect only the signed-in company’s ledgers.

Estimated Effort

6h

Execution Notes

- Run this task in Codex using the existing project code.
- Focus only on the files listed under "Affected Areas".
- After completion, test and push a commit titled "[R16] {short_summary}".
- Mark the task complete in /refactor_tasks_progress.md.
