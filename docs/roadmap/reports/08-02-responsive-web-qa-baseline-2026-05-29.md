# 08.02 Responsive Web QA Baseline

Date: 2026-05-29

## Outcome

Plan 8 now has a formal responsive web QA baseline for the current Next.js PWA/mobile web app. The existing authenticated visible-module smoke runner is the executable route baseline, and it now records mobile touch-target warnings in addition to failing horizontal overflow.

The app shell also has the first mobile platform hardening needed before Capacitor: viewport metadata, `viewport-fit=cover`, a `100dvh` app container, safe-area inset handling, and global page-level horizontal overflow containment.

## In Scope

The baseline covers production sidebar modules in desktop and mobile viewports:

- Dashboard, Scheduling, Tasks, Messages, Company Updates, Forms, Inventory, Purchasing / Waste, Reports, Team, and Settings.

## Artifacts

- Baseline: [Mobile Responsive QA Baseline](../../mobile-responsive-qa-baseline.md)
- Contract: `src/services/mobile/mobileResponsiveBaseline.ts`
- Smoke runner: `scripts/smoke-visible-modules.mjs`
- Checker: `npm run check:mobile-responsive-baseline`

## Verification

- `TEST_URL=http://localhost:3100 npm run test:smoke` passed: 22/22 visible module routes across desktop and mobile.
- `npm run check:mobile-responsive-baseline`
- `npm run check:local`
- `npm run build`

The latest smoke report is `docs/test-results/visible-modules-smoke.json`. It has no route failures, horizontal overflow errors, or mobile touch-target warnings.

## Next

Phase 08.03 should add the Capacitor shell only after this responsive PWA baseline remains green.
