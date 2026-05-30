# 09.08 Webhooks And Public API

Date: 2026-05-30

## Completed

- Defined tenant-scoped public API key model with hashed secret storage, scopes, expiry, revocation, and shown-once custody.
- Defined webhook subscription model with endpoint URLs, signing secret references, event keys, status, attempts, and timeout settings.
- Added the first webhook event catalog for employee, schedule, inventory count, purchase order, workflow, and incident events.
- Added public API and webhook delivery rate limit rules.
- Added webhook delivery log shape with request id, payload hash, signature version, response status, and retry timestamp.
- Added public API and webhook audit action definitions.
- Added public API and webhook readiness UI to the integration settings panel.
- Added contract coverage for API key shape, webhook subscriptions, event catalog, rate limits, delivery retries, audit actions, and UI presence.

## Files

- `src/services/integrations/publicApiWebhooks.ts`
- `src/features/system/components/IntegrationSettingsPanel.tsx`
- `src/services/audit/auditEvents.ts`
- `docs/public-api-webhooks.md`
- `scripts/check-public-api-webhooks-contract.mjs`

## Product Decision

09.08 prepares the platform surface but does not expose live public API routes yet. Real external access should wait for server-side API key issuance routes, hashed key validation, request signing, webhook workers, rate-limit enforcement, and integration monitoring.

## Verification

- `npm run check:public-api-webhooks`

## Next

Phase 09.09 should add integration monitoring: sync status dashboard, last successful sync, failures, retries, warnings, alerting, and support diagnostics.
