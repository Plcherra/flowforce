# Critical Fixes Checklist

These are the technical issues that need to be fixed before the project can be considered stable. Work through them in priority order.

## 1. Production Build Verification

- [x] Run `npm run build` and confirm the previous production build failure is no longer reproducible.
- [x] Verify the `useSearchParams()` prerender error on `/app/resources/docs/integrations` is resolved.
- [x] Audit `NavigationGuard` because it calls `useLocation`, which uses Next `useSearchParams`.
- [x] Audit `src/lib/router-adapter.tsx` for all wrappers around `useSearchParams`.
- [x] Confirm `/app/*` routes are covered by the Suspense boundary in `app/app/AppLayoutClient.tsx`.
- [x] Confirm the fix does not simply move the same error to another `/app/*` route.
- [x] Re-run `npm run build` until the production build completes successfully.

## 2. TypeScript Validation

- [x] Make `npm run typecheck` complete in a reasonable amount of time.
  - Current runtime: about 42 seconds with scoped checks.
- [x] Investigate why `tsc --noEmit` hangs or runs for many minutes without diagnostics.
  - Root cause: one huge project check plus stale/generated Supabase types creating deep generic/schema errors.
- [x] Check whether generated files, `.next` types, or large database types are slowing typecheck.
  - `.next` types are small; the generated Supabase schema and app schema drift were the main slowdown.
- [x] Split typecheck into smaller scopes if needed: app, src, tests, Supabase types.
  - Added scoped configs and `scripts/typecheck-scopes.mjs`.
- [x] Record the actual TypeScript error count once typecheck finishes.
  - Final count: 0 errors across app, tests, and Supabase scopes.
- [x] Fix TypeScript errors in priority order: build blockers first, shared types second, feature-specific issues last.
  - Completed shared router/logger/UI prop issues, stale root hook wrappers, Supabase public type stabilization, Playwright test type errors, and build-only Next.js type blockers.
- [x] Remove `typescript.ignoreBuildErrors: true` from `next.config.mjs`.
  - Removed after app/test/Supabase typecheck reached 0 errors.
- [x] Confirm `npm run build` still passes after TypeScript validation is re-enabled.
  - Confirmed with `npm run build`; production build completes with TypeScript enforced.

## 3. Next.js Configuration And Workspace Root

- [x] Fix the warning where Next.js infers `/Users/pedromartins` as the workspace root.
- [x] Move the stray parent `/Users/pedromartins/package-lock.json` out of Next's lockfile detection path.
- [x] Ensure Next uses `/Users/pedromartins/Documents/flowforce` as the project root.
- [x] Re-run `npm run dev` and confirm the workspace-root warning is gone.
- [x] Re-run `npm run build` and confirm the same warning is gone in production builds.
- [x] Check that `.next` cache and dependency resolution still behave correctly.

## 4. Supabase Connection And Environment

- [x] Audit `.env.example` against actual environment usage.
  - Expanded `.env.example` to include Supabase, OpenAI, cron, logging, operations defaults, and validation-script variables.
- [x] Confirm required variables are documented: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and any OpenAI/API keys.
  - Required and optional variables are documented in `.env.example` and `docs/supabase-environment-audit.md`.
- [x] Confirm local Supabase connection works or document that the project uses a remote Supabase instance.
  - Local Supabase does not run because Docker is unavailable. Current documented target is remote project `vncapxfubgqaibhjwtoy`.
- [x] Validate `src/integrations/supabase/client.ts` points to the expected project.
  - `.env`, `supabase/.temp/project-ref`, and `supabase/config.toml` now point to `vncapxfubgqaibhjwtoy`.
- [x] Validate server-side Supabase admin clients do not run without required service-role keys.
  - `app/api/_server/supabaseAdmin.ts` uses lazy initialization and clear errors; `src/services/supabase/admin.ts` now re-exports that safe client.
- [x] Add clear error handling for missing Supabase environment variables.
  - Client config now warns with Next.js env names; server admin access throws a clear service-role configuration error when used.
- [x] Run or document the required Supabase migrations for a fresh setup.
  - Remote migration list now matches local migrations `20260509000100` and `20260513000100`; the second migration restores the feature-schema surface required by the app.
- [x] Verify `supabase/database.types.ts` matches the active database schema.
  - Regenerated from the linked remote after restoring feature migrations. `npm run check:supabase` reports 0 missing relations and `npm run typecheck` passes with 0 errors.
- [x] Confirm seed data creates at least one usable demo tenant and demo user.
  - Added `supabase/seed.sql` with `FlowForce Demo Company` and `demo.owner@flowforce.local` / `FlowForceDemo123!`.

## 5. Authentication Flow

- [ ] Create or document a working demo login account.
- [ ] Verify `/auth` can sign in successfully with the demo account.
- [ ] Verify unauthenticated users are redirected from protected `/app/*` routes.
- [ ] Verify authenticated users are redirected away from `/auth` and `/register`.
- [ ] Verify auth state survives page refresh.
- [ ] Verify logout works and clears React Query cache/session state.
- [ ] Check that `ProtectedRoute` and `NavigationGuard` are not duplicating or fighting each other.
- [ ] Confirm protected pages do not get stuck on `Preparing your workspace...`.

## 6. Routing And Public/Protected Page Boundaries

- [ ] Fix `/resources` redirect behavior.
- [ ] Decide whether `/resources` should be public or protected.
- [ ] Audit all redirects in `next.config.mjs`.
- [ ] Remove stale redirects to routes that do not exist.
- [ ] Verify every public navbar link resolves to a public page.
- [ ] Verify every `/app/*` route either renders authenticated content or redirects cleanly.
- [ ] Fix routes that currently respond slowly or hang in dev probes.
- [ ] Add a route smoke test with realistic timeouts and clear auth expectations.

## 7. App Route Performance

- [ ] Profile cold loads for slow routes such as `/app/cookbook`, `/app/purchasing`, `/app/leaderboard`, `/app/ai-insights`, `/app/position-management`, and `/app/sections-permissions`.
- [ ] Identify oversized imports in slow route entrypoints.
- [ ] Move heavy feature code behind dynamic imports where appropriate.
- [ ] Remove unnecessary barrel imports that pull entire feature folders into a route.
- [ ] Check whether icon, chart, rich-text, or analytics libraries are being imported too broadly.
- [ ] Re-run the page test after warm and cold starts.
- [ ] Set acceptable route response targets for local dev and production.

## 8. Data And Feature Verification

- [ ] Verify dashboard loads real or clearly labeled demo data.
- [ ] Verify employees page can list, invite, and update employees.
- [ ] Verify scheduling page can load shifts, availability, and time-off data.
- [ ] Verify messages page can load channels and conversations.
- [ ] Verify tasks and goals pages can create/update records.
- [ ] Verify forms page can create and submit forms.
- [ ] Verify analytics/reports pages do not crash when data is empty.
- [ ] Verify inventory, purchasing, and expenses pages use real data or clearly labeled demo data.
- [ ] Add empty-state handling for every feature that depends on Supabase data.

## 9. Permission And Tenant Isolation

- [ ] Confirm every Supabase query is scoped by company/tenant where required.
- [ ] Verify RLS policies are enabled for production tables.
- [ ] Run existing tenant-isolation Playwright tests.
- [ ] Audit role/permission helpers in `src/lib/permissions` and `src/features/roles`.
- [ ] Verify admin-only pages cannot be accessed by normal users.
- [ ] Verify employee-level users only see their own allowed records.
- [ ] Add regression tests for the highest-risk permission boundaries.

## 10. Test Suite Recovery

- [ ] Use the supported Next.js validation gates: `npm run lint`, `npm run build`, `npm run check:supabase`, and `npm run test:smoke`.
- [ ] Run Playwright smoke tests with valid `E2E_EMAIL` and `E2E_PASSWORD`.
- [ ] Separate tests that require Supabase credentials from tests that can run locally.
- [ ] Remove or quarantine obsolete tests that reference old routes/components.
- [ ] Add a reliable smoke test for public pages.
- [ ] Add a reliable smoke test for authenticated app shell.
- [ ] Make CI run build, typecheck, unit tests, and a small route smoke test.

## 11. Architecture Cleanup

- [ ] Decide whether `src/features/*` is the canonical app architecture.
- [ ] Reduce dependence on `src/screens/*` compatibility wrappers.
- [ ] Move active page logic from `src/screens/*` into feature page modules over time.
- [ ] Remove duplicate concepts across `src/services`, `src/repositories`, and `src/features/*/services`.
- [ ] Keep shared UI in `src/components/ui`.
- [ ] Keep cross-feature utilities in `src/shared` or `src/lib`, not scattered across feature folders.
- [ ] Document import rules so new code does not deepen the current architecture mess.

## 12. Release Readiness

- [ ] Add a single current stabilization report after the above fixes are complete.
- [ ] Confirm `npm run dev` starts cleanly.
- [x] Confirm `npm run build` passes cleanly.
- [x] Confirm `npm run typecheck` passes cleanly.
- [ ] Confirm the demo account can access the core app.
- [ ] Confirm no secrets are committed.
- [ ] Confirm `.env.example` is complete.
- [ ] Confirm README setup instructions work on a fresh machine.
