# Phase 02.01 - Architecture Decision Record

Date: 2026-05-27

## Decision

FlowForce should evolve from the current Next.js app instead of starting with a platform rewrite.

The next architecture work should preserve deployability while we define shared boundaries, harden SaaS foundations, complete the visible web product, and later wrap the stable mobile workflows.

## ADR 001: Mobile Path

Decision:

- Use Capacitor-first for v1 mobile.
- Reconsider Expo/native only after the PWA/web mobile experience proves insufficient for pilot-critical workflows.

Reasoning:

- The product is already a Next.js web/PWA-shaped app.
- The roadmap needs web and mobile access, not two separately rebuilt products.
- Capacitor gives the lowest-risk route to app-store packaging once mobile web flows are stable.

Evidence:

- `package.json` defines a Next.js app.
- `next.config.mjs` contains Next redirects and app-level configuration.
- `docs/archive/capacitor.config.ts` is archived and points to an old Lovable build, so it should not be revived blindly.

Constraint:

- Do not start mobile shell work until responsive/mobile QA establishes that pilot workflows are usable in the current app.

## ADR 002: Package Manager And Workspace Strategy

Decision:

- Stay on npm and the current single-app structure for now.
- Defer pnpm/Turbo/monorepo extraction until shared type and data boundaries are mapped.

Reasoning:

- The repo already has `package-lock.json`.
- GitHub Actions uses `npm ci` and npm caching.
- A package-manager migration would add churn before the architecture map and shared boundaries exist.

Constraint:

- Future extraction must be incremental. The app must remain buildable after every step.

## ADR 003: API Strategy

Decision:

- Keep v1 APIs in Next.js route handlers.
- Use Supabase RLS/RPCs for tenant-safe data behavior.
- Keep service-role operations server-only.

Reasoning:

- The app already has route handlers for onboarding, repair, cron, logs, detectors, and automation suggestions.
- Server-only Supabase helpers already exist.
- Creating separate services now would add deployment complexity before the product loop is stable.

Evidence:

- Existing route handlers live under `app/api`.
- Server helpers live under `app/api/_server` and `src/server`.
- Service-role access is centralized through server-only Supabase admin helpers.

Constraint:

- Browser code must not receive service-role keys.
- Sensitive mutations should use server route handlers, RPCs, or audited server helpers.
- AI, integration, billing, and admin writes should have idempotency and audit requirements before becoming production workflows.

## ADR 004: Supabase Strategy

Decision:

- Keep managed Supabase for v1.
- Use local Supabase for CI security tests and migration validation.
- Use remote managed Supabase for production readiness and deployment checks.

Reasoning:

- The project already depends on Supabase migrations, RLS policies, tests, and service-role workflows.
- Managed Supabase reduces infrastructure burden while the product is still being stabilized.
- Self-hosting would increase operational surface area before the SaaS and launch layers are ready.

Evidence:

- `supabase/config.toml` points to the managed project ref.
- Release gates start local Supabase, reset the database, run security tests, typecheck, build, and smoke-test visible modules.
- Deploy readiness checks remote migration drift and Supabase contracts.

Constraint:

- Managed Supabase still needs backup/restore verification, migration drift checks, environment validation, and incident/rollback docs before shipment.

## Accepted Near-Term Architecture

- One Next.js app remains the product runtime for web.
- Next.js route handlers remain the server boundary for v1 application APIs.
- Supabase remains the managed database/auth/storage foundation.
- npm remains the package manager.
- Shared code stays in the current repo until Phase 02 maps route/module/data boundaries.
- Mobile app work starts later with a Capacitor-first path after mobile web workflows are stable.

## Deferred Architecture Changes

- pnpm migration.
- Turbo monorepo.
- `packages/shared` or `packages/core`.
- Expo/native rewrite.
- Separate backend services.
- Self-hosted Supabase.
- Deep offline-first architecture.

## Product Implication

This ADR protects the project from a destabilizing rewrite.

The next phase should map what already exists:

- App routes.
- Feature modules.
- Hooks.
- Services.
- Supabase tables and migrations.
- Tests and release gates.
- Risky legacy/demo areas.
- Deployment/runtime assumptions.

## Acceptance Result

- Mobile path decided.
- Package manager/workspace path decided.
- API route strategy decided.
- Supabase strategy decided.
- Tradeoffs and constraints recorded.

## Next Phase

Continue to Phase 02.02: current architecture map.
