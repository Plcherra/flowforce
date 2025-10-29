# Testing and CI/CD Tasks

## Priority Key
- **P0**: Blocks critical workflows or release readiness.
- **P1**: High leverage improvements that unblock wider coverage or reliability.
- **P2**: Nice-to-have enhancements once higher priorities land.

## E2E Coverage
- Current coverage limited to `tests/playwright/scheduling-smoke.spec.ts`; only smoke scenario runs when `PLAYWRIGHT_SMOKE=1` with Supabase admin creds.
- **P0** TODO: Add deterministic selectors and fixtures so the staff drag-and-drop and vendor link scenarios can move from `test.fixme` to active assertions.
- **P1** TODO: Expand coverage to additional high-traffic flows: authentication, shift creation/publish, vendor management, time-off approvals, and reporting exports.
- **P2** TODO: Integrate Playwright traces/video artifacts for failures inside CI.

## Supabase Migration Testing
- **P0** TODO: Add automated migration smoke checks that run `supabase db diff` against a disposable database before deploy.
- **P0** TODO: Seed Supabase test schema with synthetic data set mirroring required foreign-key relationships used by scheduling flows.
- **P1** TODO: Introduce rollback validation step that re-applies `down` migrations in CI to catch irreversibility issues.
- **P2** TODO: Capture migration timings from CI runs to surface slow statements exceeding agreed thresholds.

## GitHub Actions Deployment Improvements
- **P0** TODO: Add separate job that provisions Supabase service-role secrets and toggles `PLAYWRIGHT_SMOKE` to exercise E2E smoke flow post-build.
- **P0** TODO: Gate production deployment on successful Playwright smoke job and migration verification.
- **P1** TODO: Cache `node_modules`/Playwright browsers with key on `package-lock.json` to reduce pipeline duration.
- **P2** TODO: Publish deployment summary comment (versions, migration status, E2E artifacts) back to the PR using GitHub CLI.

## Playwright Follow-Up Tasks
- **Unlock selectors** (P0): Expose deterministic `data-testid` hooks for staff cards, shift drop zones, and vendor link modal actions in `src/app/enhanced-scheduling` components.
- **Augment seeding** (P0): Extend `seedSchedulingFixtures` to insert a predictable staff member and vendor record tied to the seeded shift to guarantee drag/drop and linking behaves deterministically.
- **Implement drag/drop test** (P1): Replace `test.fixme` with a scripted drag using Playwright's `dragTo` (or pointer API) and assert assignment chips render with staff name.
- **Implement vendor link test** (P1): Automate modal flow to select seeded vendor event and assert the chip surfaces on the shift card.
- **Add cleanup assertions** (P2): After each test, confirm seed data is deleted and no residual assignment records remain to catch leakage.
