# Production CI/CD Release Gates

Phase 10.08 makes the GitHub Actions gates match the Contabo VPS launch path. The project is not using Vercel for production, so release validation must prove the VPS Docker artifact, managed Supabase contract, mobile shell, and production smoke path. // pragma: allowlist secret

## Required Workflows

| Workflow | Purpose | Required gates |
| --- | --- | --- |
| `.github/workflows/release-gates.yml` | Full release validation on PRs and `main` pushes | local Supabase reset, database tests, typecheck, Next build, Docker build, Android mobile build, onboarding E2E, visible-module smoke | // pragma: allowlist secret
| `.github/workflows/deploy-readiness.yml` | Remote Supabase deploy readiness on `main` pushes and manual dispatch | required secrets, remote migration drift, remote Supabase schema/security contract | // pragma: allowlist secret

## Release Gates

The Release Gates workflow now enforces:

- `npm run lint`
- `npm run check:i18n`
- `npm run check:visible-modules`
- `npm run test:operations-hub`
- `npm run test:grok-provider`
- `npm run test:service-role-auth`
- `npm run test:security-headers`
- `npm run check:architecture`
- local Supabase start/reset from migrations // pragma: allowlist secret
- `npm run check:supabase` // pragma: allowlist secret
- `npm run check:ai-copilot`
- `npm run test:db:security`
- `npm run test:db:ai-copilot`
- `npm run typecheck:src`
- `npm run typecheck`
- `npm run build`
- `docker build --tag flowforce-web:ci .`
- `npm run mobile:android:sync`
- `npm run mobile:android:debug`
- production server start
- `npm run test:pages`
- `npm run test:e2e:onboarding`
- `npm run test:e2e`
- `npm run test:playwright`
- `npm run test:smoke`

This means a broken database contract, broken production build, broken VPS Docker artifact, broken active Android shell, or broken smoke route blocks `main`.

## Mobile Gate Policy

The native shell is active because `android/`, `ios/`, and `capacitor.config.ts` exist. CI runs the Android debug build on Ubuntu as the practical mobile compile gate.

iOS compile/signing remains outside the Linux Release Gates runner. It should be promoted to a macOS CI gate when Apple signing and provisioning are ready.

## Docker Gate Policy

The Docker gate builds the same root `Dockerfile` used by the VPS deployment. It passes the public Supabase build args from the local Supabase environment exported earlier in the workflow and never bakes the service-role key into the image. // pragma: allowlist secret

## Deploy Readiness

Deploy Readiness stays focused on remote Supabase: // pragma: allowlist secret

- `SUPABASE_DB_PASSWORD` // pragma: allowlist secret
- `NEXT_PUBLIC_SUPABASE_URL` // pragma: allowlist secret
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` // pragma: allowlist secret
- `SUPABASE_SERVICE_ROLE_KEY` // pragma: allowlist secret
- `npm run check:supabase:remote-drift` // pragma: allowlist secret
- `npm run check:supabase` // pragma: allowlist secret

Actual VPS SSH deployment remains a controlled operator action until Phase 10.09/10.10 signoff decides the final deploy trigger.

## Current Verification

Timestamp: 2026-05-30

Completed locally:

- workflow contract check through `npm run check:release-gates`
- existing `npm run check:local`
- existing `npm run build`

GitHub must still run both workflows on `main` after these changes are pushed.
