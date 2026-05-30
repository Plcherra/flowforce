# 08.05 Mobile Core Workflows

Date: 2026-05-30

## Outcome

Plan 8 now has a concrete mobile workflow contract for dashboard, schedule, tasks, messages, forms, inventory counts, and settings. The mobile dashboard also exposes a Daily actions launcher so field users have one-tap entry into the workflows they need during a shift.

## Artifacts

- Contract: [Mobile Core Workflows](../../mobile-core-workflows.md)
- Service: `src/services/mobile/mobileCoreWorkflows.ts`
- Mobile dashboard actions: `src/features/dashboard/components/MobileCoreWorkflowActions.tsx`
- Dashboard integration: `src/features/dashboard/pages/Dashboard.tsx`
- Checker: `npm run check:mobile-core-workflows`

## Verification

- `npm run check:mobile-core-workflows`
- `npm run check:local`
- `npm run build`
- Latest visible-module smoke baseline: `docs/test-results/visible-modules-smoke.json`

The current implementation still uses the web/PWA route surfaces inside Capacitor. Native-specific workflow QA should run after `CAPACITOR_SERVER_URL` points the shell at a reachable dev or production app.

## Next

Phase 08.06 should choose and wire the push notification path now that mobile users can reach the core daily workflows.
