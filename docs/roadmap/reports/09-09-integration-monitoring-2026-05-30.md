# 09.09 Integration Monitoring

Date: 2026-05-30

## Completed

- Added integration monitoring status model for imports, migrations, POS, accounting, payroll, public API, and webhooks.
- Added dashboard rows with status, criticality, last successful sync, consecutive failures, next retry, warnings, and owner.
- Added simulated failure visibility for Toast POS, QuickBooks accounting, MarketMan migration, and webhooks.
- Added critical alert rules for broken critical syncs, webhook failures, and migration warnings.
- Added support-safe diagnostics with evidence and recommended actions.
- Added integration monitoring audit action definitions.
- Added monitoring readiness UI to the integration settings panel.
- Added contract coverage for dashboard status, failure/retry/warning visibility, alerting, support diagnostics, audit actions, and UI presence.

## Files

- `src/services/integrations/integrationMonitoring.ts`
- `src/features/system/components/IntegrationSettingsPanel.tsx`
- `src/services/audit/auditEvents.ts`
- `docs/integration-monitoring.md`
- `scripts/check-integration-monitoring-contract.mjs`

## Product Decision

09.09 prepares the monitoring surface but does not run live monitoring workers yet. Real monitoring should wait for queued provider jobs, persisted run logs, alert delivery, and support tooling links.

## Verification

- `npm run check:integration-monitoring`

## Next

Phase 09.10 should create the customer migration playbook, sample data packs, demo migration flow, and final Plan 09 signoff status.
