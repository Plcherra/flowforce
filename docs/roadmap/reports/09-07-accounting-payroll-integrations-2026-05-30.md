# 09.07 Accounting And Payroll Integrations

Date: 2026-05-30

## Completed

- Defined QuickBooks Online and Xero as the first accounting export targets.
- Defined accounting export scope for purchase bills, expenses, payments, vendor credits, owner summaries, and journal entries.
- Defined payroll/labor import scope for employees, labor actuals, pay periods, wage rates, and payroll journal summaries.
- Added replayable export/import log shape with payload hashes, idempotency keys, reconciliation ids, retry timestamps, and error categories.
- Added retry policy foundations for accounting exports and payroll imports.
- Added reconciliation view definitions for accounting exports, payroll labor, and cost-of-goods mismatch review.
- Added accounting/payroll audit action definitions.
- Added accounting and payroll readiness UI to the integration settings panel.
- Added contract coverage for provider scope, payload shape, retry behavior, reconciliation views, audit actions, and UI presence.

## Files

- `src/services/integrations/accountingPayrollIntegrations.ts`
- `src/features/system/components/IntegrationSettingsPanel.tsx`
- `src/services/audit/auditEvents.ts`
- `docs/accounting-payroll-integrations.md`
- `scripts/check-accounting-payroll-integrations-contract.mjs`

## Product Decision

09.07 prepares exports and imports but does not call live accounting or payroll provider APIs. Real provider sync should wait for server-side credential custody, provider OAuth setup, queued jobs, integration monitoring, and reconciliation screens.

## Verification

- `npm run check:accounting-payroll-integrations`

## Next

Phase 09.08 should define public API keys, webhook subscriptions, event catalog, rate limits, retries, and audit logs.
