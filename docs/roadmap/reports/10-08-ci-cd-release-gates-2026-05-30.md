# 10.08 CI/CD Release Gates

Date: 2026-05-30

## Completed

- Added the production release-gate policy contract in `src/services/infrastructure/productionReleaseGates.ts`.
- Updated Release Gates to keep Supabase/security/typecheck/build/smoke gates.
- Added a Docker image build gate for the VPS artifact: `flowforce-web:ci`.
- Added Android Capacitor build scripts and wired the active mobile shell into Release Gates.
- Documented the release/deploy gate model in `docs/production-ci-cd-release-gates.md`.
- Added `npm run check:release-gates` and wired it into local/release checks.
- Updated Plan 10 and the master roadmap to mark 10.08 complete.

## Verification

- `npm run check:release-gates`
- `npm run check:local`
- `npm run build`

## Notes

- iOS build/signing is intentionally not part of the Linux Release Gates runner yet.
- GitHub Actions still needs to run both workflows on `main` after these files are pushed.
- Phase 10.09 should convert the infrastructure and release evidence into the pilot launch checklist.
