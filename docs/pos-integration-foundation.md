# POS Integration Foundation

Date: 2026-05-30
Roadmap phase: 09.06 POS Integration Foundation

## Goal

FlowForce should not start live POS sync until the provider target, sync objects, credential custody, health state, and audit expectations are explicit.

09.06 chooses Toast as the first POS target and creates the foundation for future live sync. This is not a live sync implementation yet.

## First Target

Toast is the first POS target.

Reason: restaurant operators need sales, menu, location, and labor actuals to complete FlowForce cost, scheduling, and owner reporting. Toast is a natural first target for restaurant pilots before broad POS marketplace work.

## Sync Needs

The first POS sync streams are:

- Sales: daily net sales, tender totals, discounts, taxes, service charges, and business date.
- Menu items: provider menu item id, name, category, price, active state, and recipe mapping hooks.
- Labor actuals: clocked hours, role, employee identity, pay-period date, regular/overtime split, and source checkpoint.
- Locations: provider location id, name, timezone, active state, and FlowForce location mapping.

All four streams are provider-to-FlowForce for the foundation phase.

## Credential Model

The canonical contract lives in `src/services/integrations/posIntegrationFoundation.ts`.

Credential rules:

- POS credentials are tenant-scoped with explicit `company_id` custody.
- Raw POS API keys, OAuth refresh tokens, and provider secrets must never be stored in browser-readable settings, local storage, or client-visible metadata.
- Credential material is stored only in server-side secret custody.
- Browser metadata may expose provider id, setup status, scopes, last four characters, health state, and timestamps only.
- Creation, rotation, revocation, health checks, and sync attempts are audit events.
- Every POS stream must use idempotency keys, provider checkpoints, retry state, and last successful sync timestamps.

## Audit Actions

POS audit actions are:

- `integration.pos.credential_pending`
- `integration.pos.credential_connected`
- `integration.pos.credential_revoked`
- `integration.pos.health_checked`
- `integration.pos.sync_attempted`

## Health UI

The system settings integration panel now includes POS sync health for Toast. It shows:

- Overall POS health status.
- Sales/menu/labor/location stream readiness.
- Last successful sync.
- Failure count.
- Last error code.

The UI intentionally reads non-secret metadata only. It does not display or store credential material.

## Verification

09.06 is complete when:

- `npm run check:pos-integration-foundation` passes.
- Toast is documented as the first target.
- Sales, menu items, labor actuals, and locations are defined.
- Credential custody rules are documented and reflected in the placeholder UI.
- POS health UI is present in system integration settings.
