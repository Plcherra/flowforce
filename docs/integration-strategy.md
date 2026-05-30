# Integration Strategy

Date: 2026-05-30
Roadmap phase: 09.01 Integration Strategy

## Goal

FlowForce should reduce adoption friction first, then add deeper live integrations only after imports, exports, logging, retry behavior, and credential custody are safe.

The first pilot value is migration, not broad marketplace breadth.

## Priority Order

### Phase-One Integration Work

1. CSV migration framework for employees, inventory items, suppliers, schedules, and tasks.
2. Workforce platform migration path for employees, roles, schedules, tasks, and messages where possible.
3. Checklist platform migration path for checklists, SOPs, forms, locations, and recurring tasks.
4. MarketMan inventory migration for items, units, suppliers, purchases, recipes, counts, and waste.

These reduce switching anxiety and let a restaurant tenant become useful without waiting on vendor API approval.

### Phase-Two Integration Work

1. POS integration foundation for sales, menu items, locations, and labor actuals.
2. Accounting exports for expenses, payments, purchases, and owner summaries.
3. Payroll/time-clock labor imports for actual labor reconciliation.

These should wait until the import framework and integration logging are dependable.

### Phase-Three Integration Work

1. Public API.
2. Webhook subscriptions.
3. Partner/developer integration surfaces.

These require API keys, rate limits, signatures, event catalogs, and support diagnostics before public exposure.

## Mode Separation

- Imports: customer-provided data loads with mapping, preview, validation, audit, and rollback/reporting.
- Exports: FlowForce data leaving the system as files or provider payloads with logs, retry, and reconciliation.
- Syncs: scheduled or manually triggered provider exchange with checkpoints, idempotency, retries, and health status.
- Live APIs: external API/webhook access with scoped credentials, rate limits, signature checks, and audit logs.

## Credential Rules

- Raw API keys, OAuth refresh tokens, webhook signing secrets, and provider credentials must not be stored in browser-readable settings, local storage, or client-rendered metadata.
- Provider credentials must be created, rotated, used, and revoked from server-side routes, edge functions, or a managed secret store with tenant scope.
- Client-visible metadata may store provider id, status, scopes, last four characters, timestamps, health, and setup notes only.
- OAuth flows must use state validation, PKCE when supported, tenant binding, and redirect allowlists.
- API keys and webhook secrets must be tenant-scoped, hashed or encrypted at rest, revocable, and audited.

## Logging And Retry Rules

- Imports record filename, template, row counts, validation errors, user id, company id, status, and rollback/report references.
- Exports record payload hash, destination, attempt count, status, error category, and reconciliation id where available.
- Sync jobs use idempotency keys, provider checkpoints, exponential backoff, and clear failed/warning/success health states.
- Live API and webhook traffic records request ids, signature status, rate-limit decisions, response class, retry schedule, and tenant scope.

## Existing Product Alignment

The current product already has system settings integration surfaces, import concepts, audit categories, inventory cost data, labor entry placeholders, and mobile/offline workflows. Phase 09 should build from those foundations without storing secrets in client-visible settings.

## Verification

09.01 is complete when:

- `npm run check:integration-strategy` passes.
- The roadmap prioritizes migration/import work before live APIs.
- Credential custody rules are documented and reflected in placeholder integration UI.
