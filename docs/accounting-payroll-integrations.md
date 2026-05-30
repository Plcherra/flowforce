# Accounting And Payroll Integrations

Date: 2026-05-30
Roadmap phase: 09.07 Accounting And Payroll Integrations

## Goal

FlowForce should let finance data leave cleanly and let payroll/labor actuals come back without corrupting tenant data, duplicating provider records, or hiding failed exports.

09.07 defines the accounting and payroll foundation. It does not perform live provider sync yet.

## Accounting Export Scope

The first accounting export providers are QuickBooks Online and Xero.

Export objects:

- Purchase bills: vendor, bill dates, line item accounts, amounts, and tax codes.
- Expenses: date, merchant, accounting category, amount, and payment account.
- Payments: vendor, payment date, payment account, amount, and approval status.
- Vendor credits: vendor, credit date, reason, line account, and amount.
- Owner summaries: period, net sales, labor cost, waste cost, and controllable expenses.
- Journal entries: posting date, debit account, credit account, amount, and memo.

Each export object has a reconciliation key so FlowForce can match provider acknowledgements back to tenant records.

## Payroll And Labor Import Scope

The first payroll/labor providers are Gusto, ADP, and Paychex.

Import objects:

- Employees: provider employee id, name, email, status, and home location.
- Labor actuals: employee, work date, clocked hours, role, regular pay, and overtime pay.
- Pay periods: period start, period end, pay date, and status.
- Wage rates: employee, effective date, role, and hourly rate.
- Payroll journal summary: period, gross wages, employer taxes, benefits, and total payroll cost.

These imports feed labor variance, schedule profitability, and owner financial overview calculations.

## Export Logs And Retry Behavior

Accounting exports and payroll imports must record:

- Company id and provider.
- Direction.
- Object key.
- Status.
- Attempt count.
- Payload hash.
- Idempotency key.
- Reconciliation id.
- Next retry timestamp.
- Error category.

Retry behavior is replayable and checkpointed. The foundation uses four retry attempts with 5, 30, 120, and 720 minute backoff windows before support or reconciliation review.

## Reconciliation Views

The first reconciliation views are:

- Accounting export reconciliation: compares FlowForce export totals, provider object count, provider ids, and payload hash.
- Payroll labor reconciliation: compares scheduled hours, imported clocked hours, gross payroll cost, and employee/provider mapping gaps.
- Cost of goods reconciliation: compares purchase bills, inventory receipt totals, vendor credits, and cost engine valuation.

## Audit Actions

Accounting and payroll integration audit actions are:

- `integration.accounting_export.queued`
- `integration.accounting_export.completed`
- `integration.accounting_export.failed`
- `integration.payroll_import.validated`
- `integration.reconciliation.viewed`

## Verification

09.07 is complete when:

- `npm run check:accounting-payroll-integrations` passes.
- QuickBooks and Xero export scope is defined.
- Payroll/labor import scope is defined.
- Export logs, retry behavior, and reconciliation views are present.
- The system integration settings panel shows accounting/payroll readiness.
