# 09.01 Integration Strategy

Date: 2026-05-30

## Outcome

Phase 09.01 defines FlowForce's integration order: reduce migration friction first, then add monitored syncs, then expose live APIs only after credential custody and observability are safe.

## Delivered

- Added `src/services/integrations/integrationStrategy.ts`.
- Added `docs/integration-strategy.md`.
- Added `npm run check:integration-strategy`.
- Ranked CSV migration, workforce migration, checklist migration, and MarketMan migration as phase-one work.
- Deferred POS, accounting, payroll/time-clock, public API, and webhooks until import/export foundations are safe.
- Defined separate import, export, sync, and live API modes.
- Defined credential custody rules that forbid raw secrets in browser-readable settings.
- Updated the integrations settings placeholder so raw API keys are not persisted in settings metadata.

## Verification

- `npm run check:integration-strategy`
- `npm run typecheck:src`
- `npm run check:local`
- `npm run build`
- `git diff --check`

## Next Phase

Phase 09.02 should implement the generic CSV import framework with mapping, preview, validation, import results, audit logging, and rollback/error reporting.
