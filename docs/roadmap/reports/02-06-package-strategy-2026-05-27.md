# Phase 02.06 - Package Strategy

Date: 2026-05-27

## Summary

FlowForce should stay as a single Next.js app with npm for the next execution cycle.

The project is large, but it is not ready for a package-manager migration or monorepo extraction yet. The right move is to create package-like boundaries inside `src` first, then extract only after imports and ownership are stable.

## Decision

Keep now:

- Single Next.js app.
- npm.
- `package-lock.json`.
- `src/shared` as the shared boundary.
- `src/app-shell` as the shell boundary.
- `src/features` as the module boundary.
- `src/server` as the server-only boundary.

Defer:

- `packages/shared`.
- `packages/core`.
- pnpm.
- Turbo.
- native/mobile package split.
- separate backend package or service split.

## Why

Current evidence:

- The repo has `package-lock.json` and no `pnpm-lock.yaml`, `yarn.lock`, or `turbo.json`.
- GitHub Actions uses `npm ci` and npm caching.
- The current app is still being stabilized around shared types, data access, app shell, route ownership, Supabase contracts, and pilot module scope.
- A monorepo now would create churn before boundaries are ready.

## Migration-Safe Aliases Added

Added TypeScript paths in `tsconfig.json`:

- `@app-shell/*` -> `src/app-shell/*`
- `@features/*` -> `src/features/*`
- `@server/*` -> `src/server/*`
- `@shared/*` -> `src/shared/*`

Added matching Next webpack/Turbopack aliases in `next.config.mjs`.

Added:

- `src/shared/index.ts`

## Alias Usage Rule

New cross-boundary imports should prefer:

- `@app-shell/*` for app shell architecture, guards, navigation, and tenant shell code.
- `@features/*` for feature-to-feature imports that are intentionally public.
- `@shared/*` for shared components, utilities, data-access helpers, and cross-module primitives.
- `@server/*` for server-only code imported by server runtime code.
- `@/*` remains allowed for existing code and local low-risk imports.

Avoid:

- Deep feature imports from unrelated modules unless exported by a feature index or service boundary.
- Importing `@server/*` from client components.
- Creating `packages/*` until the source boundary has been proven.

## Future Extraction Rule

Only extract to `packages/*` after all are true:

- The source folder has a stable public barrel.
- Imports already use a migration-safe alias.
- The boundary has no accidental client/server leakage.
- `npm run typecheck` passes.
- `npm run build` passes.
- Supabase contract checks pass.
- The extraction can be done without changing product behavior.

## Verification

Commands run:

```bash
npm run typecheck
npm run build
npm run check:supabase
```

Results:

- Full scoped typecheck passed for app, tests, and Supabase scopes.
- Production build passed.
- Supabase contract check passed with 0 missing relations, 0 relation errors, 0 missing RPCs, 0 anon exposures, and 0 security contract errors.

## Acceptance Result

- Package strategy decided.
- Monorepo deferred.
- Migration-safe aliases added.
- Build/typecheck/Supabase verification passed.
- Current app remains deployable.

## Next Phase

Continue to Phase 02.07: API strategy.
