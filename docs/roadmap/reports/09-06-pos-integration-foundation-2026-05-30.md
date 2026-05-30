# 09.06 POS Integration Foundation

Date: 2026-05-30

## Completed

- Chose Toast as the first POS integration target.
- Defined the first POS sync streams: sales, menu items, labor actuals, and locations.
- Added a tenant-scoped POS credential custody model that keeps raw secrets out of browser-readable settings.
- Added POS audit action definitions for credential lifecycle, health checks, and sync attempts.
- Added POS health metadata and readiness helpers.
- Added POS sync health UI to the system integration settings panel.
- Added contract coverage for sync needs, credential metadata, audit actions, and UI presence.

## Files

- `src/services/integrations/posIntegrationFoundation.ts`
- `src/features/system/components/IntegrationSettingsPanel.tsx`
- `docs/pos-integration-foundation.md`
- `scripts/check-pos-integration-foundation-contract.mjs`

## Product Decision

09.06 prepares live sync but does not perform live POS sync yet. Real provider calls should wait for server-side credential custody, retry queues, checkpoints, and integration monitoring.

## Verification

- `npm run check:pos-integration-foundation`

## Next

Phase 09.07 should define accounting and payroll integration scopes, export logs, retry behavior, and reconciliation views.
