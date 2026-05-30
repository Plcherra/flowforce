# 08.01 Mobile Strategy Decision

Date: 2026-05-29

## Outcome

FlowForce will move into Plan 8 with a Capacitor-first mobile strategy for v1. The current Next.js PWA/mobile web app remains the source product, and the app-store version should wrap that stabilized experience before any native rewrite is considered.

Expo/native remains a later option only for proven field-workflow pressure. Flutter is not part of the v1 path because it would require a full product rewrite before the web app and operating model are fully shipped.

## Scope Locked

The v1 mobile app must cover auth/session restore, dashboard, schedule, tasks, messages, operations workflows, forms, inventory counts, notification settings, and mobile-safe navigation. Desktop-heavy admin work remains web-only for v1.

The app-store readiness scope now includes developer accounts, bundle IDs, privacy policy, permission explanations, push decisions, deep links, build profiles, and mobile QA.

## Artifacts

- Strategy: [Mobile Strategy Decision](../../mobile-strategy-decision.md)
- Contract: `src/services/mobile/mobileStrategy.ts`
- Checker: `npm run check:mobile-strategy`

## Verification

- `npm run check:mobile-strategy`

## Next

Phase 08.02 should create the responsive web QA baseline for the current Next.js app before adding the Capacitor shell.
