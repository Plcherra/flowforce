# 08.10 Native Future Evaluation

Date: 2026-05-30

## Outcome

Phase 08.10 completes Plan 8 with a clear decision: Capacitor remains the v1 app-store path, and a native rewrite is deferred until pilot evidence justifies it.

## Delivered

- Added `src/services/mobile/mobileNativeFutureEvaluation.ts`.
- Added `docs/mobile-native-future-evaluation.md`.
- Defined measurable triggers for selective native screens.
- Limited native candidates to field-heavy workflows: inventory counts, forms/evidence, and task/workflow execution.
- Defined shared contracts required before future native work.
- Added `npm run check:mobile-native-future`.
- Updated Plan 8 and the master roadmap.

## Decision

Do not start Expo, React Native, Flutter, or a broad native rewrite now. Ship the Capacitor v1 path through internal testing and pilot usage first.

## Verification

- `npm run check:mobile-native-future`
- `npm run check:mobile-app-store-readiness`
- `npm run typecheck:src`
- `npm run check:local`
- `npm run build`
- `git diff --check`

## Next Plan

Plan 8 is now complete. The next roadmap plan is `09 Integrations And Migration Tools`.
