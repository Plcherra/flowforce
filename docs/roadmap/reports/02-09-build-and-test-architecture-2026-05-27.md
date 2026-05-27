# 02.09 Build And Test Architecture

Date: 2026-05-27

## Completed

- Preserved the existing Release Gates and Deploy Readiness workflows.
- Added `npm run check:architecture` as a fast boundary check for the architecture files that now exist.
- Added `npm run check:local`, `npm run check:release`, and updated `npm run check:deploy` to make local, release, and deploy check tiers explicit.
- Added the architecture contract to both GitHub workflows before heavier Supabase and build steps.
- Documented fast local checks, full release checks, remote deploy checks, and the mobile build gate policy.

## Important Decisions

- Architecture checks stay lightweight and file-based for now.
- Database, build, E2E, and smoke checks stay in Release Gates as the full shipment gate.
- Mobile checks are deferred until a native/wrapper app path exists or mobile-specific runtime features become release-critical.

## Verification

- Passed: `npm run check:architecture`
- Passed: `npm run check:local`
- Passed: `npm run typecheck`
- Passed: `npm run build`
- Passed: `npm run check:release`

## Next Phase

- 02.10 Architecture Baseline Freeze
