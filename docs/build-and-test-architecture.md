# Build And Test Architecture

Last updated: 2026-05-27

This document defines which checks protect FlowForce architecture and when each tier should run.

## Check Tiers

Fast local checks:

```bash
npm run check:local
```

Use this while moving code between architecture layers. It runs the architecture contract and source typecheck only.

Full local release checks:

```bash
npm run check:release
```

Use this before opening or merging larger changes when local Supabase env is available. It runs architecture checks, all typechecks, production build, and the Supabase schema/security contract.

Remote deploy checks:

```bash
npm run check:deploy
```

Use this only when remote Supabase deploy secrets are present. It checks architecture, remote migration drift, and the remote schema/security contract.

## CI Gates

Release Gates must remain the full shipment gate:

- Install dependencies.
- Run `npm run check:architecture`.
- Start local Supabase and rebuild from migrations.
- Run Supabase schema/security contract checks.
- Run database security tests.
- Run TypeScript checks.
- Build the production app.
- Start the production server.
- Run onboarding and visible-module smoke tests.

Deploy Readiness must remain the remote Supabase deploy gate:

- Install dependencies.
- Run `npm run check:architecture`.
- Require deploy secrets.
- Check remote migration drift.
- Run remote Supabase schema/security contract checks.

## Architecture Contract

`npm run check:architecture` verifies only architecture contracts that already exist:

- Shared type, shared data-access, app-shell, server API, and env-contract files exist.
- `tsconfig.json` and `next.config.mjs` expose the migration aliases.
- Service-role/admin Supabase APIs are not referenced from client-visible source surfaces.

Keep this check fast. Add rules only after the corresponding boundary exists in the repo.

## Mobile Build Gate Policy

Mobile build checks are not mandatory yet because the product is still a Next.js PWA/mobile web app.

Mobile checks become mandatory when any of these are true:

- A native app directory is added, such as `apps/mobile`, `mobile`, `ios`, or `android`.
- A Capacitor, React Native, Expo, Flutter, or native wrapper build is added to package scripts.
- Shared packages are consumed by both web and mobile runtimes.
- Offline sync, push notifications, native storage, camera, location, or background jobs become release-critical.

When that happens, Release Gates must add a mobile compile check and a minimal smoke check for the selected app path.
