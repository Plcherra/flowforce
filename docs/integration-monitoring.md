# Integration Monitoring

Date: 2026-05-30
Roadmap phase: 09.09 Integration Monitoring

## Goal

FlowForce integrations should be observable and supportable before live provider jobs expand. Operators and support need clear sync status, last successful sync, failures, retries, warnings, alerts, and diagnostics.

09.09 defines the monitoring foundation. It does not start live monitoring workers yet.

## Sync Status Dashboard

The monitoring dashboard tracks:

- CSV imports.
- Workforce migration.
- Checklist migration.
- MarketMan migration.
- Toast POS.
- QuickBooks accounting.
- Xero accounting.
- Gusto payroll.
- Public API.
- Webhooks.

Each dashboard row includes status, criticality, last successful sync, consecutive failures, next retry timestamp, warnings, and owner.

## Failure, Retry, And Warning Visibility

The sample dashboard intentionally includes simulated failures:

- Toast POS is failing with four consecutive failures and stale sales data.
- QuickBooks accounting has rate-limit retry warnings.
- MarketMan migration has unit conversion warnings.
- Webhooks have delivery retry warnings.

This makes failure states visible before live provider jobs exist.

## Critical Sync Alerting

The first alert rules are:

- Critical sync failure: Toast POS, QuickBooks accounting, or Gusto payroll has three or more consecutive failures or stale critical data.
- Webhook delivery warning: webhook delivery has two or more failures before terminal failure.
- Migration warning: migration/import warnings require operator review before final signoff.

Critical alerts notify tenant admins and support.

## Support Diagnostics

Support-safe diagnostics include:

- Last successful sync.
- Consecutive failure count.
- Next retry timestamp.
- Warning count.
- Recommended action.

Diagnostics must not include raw provider credentials, raw API keys, OAuth refresh tokens, signing secrets, or sensitive payload bodies.

## Audit Actions

Integration monitoring audit actions are:

- `integration.monitoring.health_checked`
- `integration.monitoring.alert_triggered`
- `integration.monitoring.diagnostics_generated`

## Verification

09.09 is complete when:

- `npm run check:integration-monitoring` passes.
- Sync status dashboard rows cover all integration categories.
- Last success, failures, retries, and warnings are represented.
- Critical alerting exists for broken critical syncs.
- Support diagnostics are safe and visible.
- Simulated failures appear in the settings-panel monitoring surface.
