# 10.07 Performance And Load Baseline

Date: 2026-05-30

## Completed

- Added the performance/load policy contract in `src/services/infrastructure/productionPerformanceLoadBaseline.ts`.
- Added `scripts/run-performance-load-baseline.mjs` to measure build artifact size and optionally probe page/API latency.
- Defined the first pilot load target: 50 concurrent active users and 600 burst requests per minute.
- Captured the current build baseline in `docs/production-performance-load-baseline.md`.
- Documented database hot query families to watch in Supabase query stats before paid pilot.
- Wired the phase into `check:local` and `check:release` through `npm run check:performance-load-baseline`.
- Updated Plan 10 and the master roadmap to mark 10.07 complete.

## Verification

- `node scripts/run-performance-load-baseline.mjs`
- `npm run check:performance-load-baseline`
- `npm run check:local`
- `npm run build`

## Baseline

- `.next/static`: 10 MB
- `.next/server`: 70 MB
- `.next` total: 2.7 GB local build directory

## Notes

- No Supabase migration was added because we do not yet have production slow-query evidence for a specific index.
- Run the baseline script again with `PERF_BASE_URL` after the VPS or staging URL exists.
- Phase 10.08 should make these checks part of CI/CD release gates.
