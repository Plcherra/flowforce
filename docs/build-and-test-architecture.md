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
- Run the Docker image build gate for the VPS artifact.
- Run the Mobile Android build gate for the active Capacitor shell.
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

Mobile build checks are now mandatory because the active Capacitor shell exists in `android/`, `ios/`, and `capacitor.config.ts`.

Release Gates runs:

- `npm run mobile:android:sync`
- `npm run mobile:android:debug`

iOS compile/signing remains outside the Linux Release Gates runner until Apple signing and provisioning are ready for a macOS CI lane.
