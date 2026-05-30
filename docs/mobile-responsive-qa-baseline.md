# Mobile Responsive QA Baseline

Date: 2026-05-29
Roadmap phase: 08.02 Responsive Web QA Baseline

## Goal

Before FlowForce is wrapped in Capacitor, the current Next.js PWA/mobile web app must be usable on a staff-sized phone viewport. The baseline is intentionally practical: every production sidebar module must render while authenticated, avoid horizontal document overflow, and keep field workflows reachable with mobile-safe navigation.

## Baseline Viewports

- Desktop control: 1366 x 900.
- Mobile pilot: 390 x 844, mobile emulation enabled.

The active smoke runner is `scripts/smoke-visible-modules.mjs`. It reads `src/app-shell/navigation/moduleRouteInventory.json`, signs in a seeded tenant user, and tests every production sidebar route in both viewports.

## Production Routes In Scope

The responsive baseline covers the current production sidebar routes:

- Dashboard.
- Scheduling.
- Tasks.
- Messages.
- Company Updates.
- Forms.
- Inventory.
- Purchasing / Waste.
- Reports.
- Team.
- Settings.

These routes map to the Plan 8 pilot modules for dashboard, schedule, tasks, messages, operations handoff, forms, inventory counts, and settings.

## Checks

The smoke baseline verifies:

- Authenticated route access does not redirect back to auth/setup.
- Page body is not empty.
- Known application error shells are not rendered.
- Console/page/network errors are collected.
- Desktop and mobile viewports both run.
- Horizontal document overflow fails the route.
- Mobile touch-target warnings are collected for visible controls below the 36px minimum warning threshold.

When running the smoke against a local Next dev server, prefer `localhost` in `TEST_URL` rather than `127.0.0.1`; Next dev blocks cross-origin HMR assets from alternate hostnames by default.

08.02 also adds platform-level mobile hardening:

- Root viewport metadata uses `width=device-width`, `initial-scale=1`, and `viewport-fit=cover`.
- The app shell uses a `100dvh` viewport container instead of relying only on `100vh`.
- The app viewport honors `env(safe-area-inset-*)` for the future Capacitor shell.
- Global document/body styles block accidental page-level horizontal overflow.

## Current Debt

The responsive baseline is now enforceable, but deeper mobile UX polish remains for later Plan 8 phases:

- Some data-dense modules still need workflow-specific mobile simplification instead of merely responsive tables.
- Touch-target warnings are reported by the smoke runner; the latest baseline report has zero mobile touch-target warnings after shared tab, switch, and hidden-control detector hardening.
- Offline behavior is not covered until phases 08.07 and 08.08.
- Native shell auth/session restore is not covered until phase 08.04.
- Push notification routing is not covered until phase 08.06.

## Verification

Run:

```bash
npm run check:mobile-responsive-baseline
npm run test:smoke
```

`npm run check:mobile-responsive-baseline` validates that the codebase has a mobile viewport smoke contract, safe-area handling, a documented route baseline, and roadmap status. `npm run test:smoke` is the executable browser smoke and requires the app server plus Supabase test environment.
