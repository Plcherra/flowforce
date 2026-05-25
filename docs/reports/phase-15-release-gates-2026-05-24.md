# Phase 15 - Release Gates

Date: 2026-05-24

## Goal

Make the Phase 1-14 readiness checks enforceable in CI so migrations, RLS/security contracts, account creation, production builds, and authenticated app smoke cannot regress silently.

## Completed

- Added `.github/workflows/release-gates.yml`.
- The workflow runs on `pull_request`, `push` to `main`, and manual dispatch.
- CI pins Supabase CLI to `2.101.0` and Node.js to `22`.
- CI starts local Supabase, rebuilds the database from source-controlled migrations, exports local Supabase credentials into the job environment, then runs the release gates.
- CI starts only the local Supabase services required by the gate and retries startup to reduce hosted-runner image-pull flakiness.
- CI uploads the authenticated smoke JSON and production server log as artifacts for failed investigations.
- Fixed a production-only inventory route regression exposed by the new gate: `InventoryNav` still linked to legacy `/inventory/...` paths, which caused production RSC 404 fetches from `/app/inventory-actions`.
- Added real `/app/inventory/...` route wrappers for dashboard, cookbook, items, counts, count detail, prep, purchasing, actions, and reports.

## CI Gate Order

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `supabase start`
4. `supabase db reset`
5. `npm run check:supabase`
6. `npm run test:db:security`
7. `npm run typecheck:src`
8. `npm run typecheck`
9. `npm run build`
10. Production `next start`
11. `npm run test:e2e:onboarding`
12. `npm run test:smoke`

## Verification

- Workflow YAML parses.
- `env -u DOCKER_HOST npx supabase db reset` passed.
- `npm run check:supabase` passed with 0 missing relations, 0 relation errors, 0 missing RPCs, 0 anon exposures, and 0 security contract errors.
- `npm run test:db:security` passed all Phase 3-14 pgTAP suites.
- `npm run typecheck:src` passed.
- `npm run typecheck` passed app, tests, and Supabase function scopes.
- `npm run build` passed and now includes the `/app/inventory/...` route family.
- `npm run test:e2e:onboarding` passed against the production server.
- `npm run test:smoke` passed 11/11 against the production server.
- Smoke cleanup verified: 0 `module-smoke-%` companies remain.
- Smoke report token scan found no unredacted JWT, bearer token, or Supabase `apikey` values.

## Remaining Risk

- GitHub Actions has not run remotely yet; the workflow is locally validated but still needs the first hosted CI run after push.
- The CI gate uses local Supabase. A separate protected-deploy gate should still verify remote migration drift before production deployment.
- The pinned Supabase CLI should be updated intentionally as part of release tooling maintenance.
