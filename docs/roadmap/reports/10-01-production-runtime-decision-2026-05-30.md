# 10.01 Production Runtime Decision

Date: 2026-05-30

## Completed

- Confirmed Contabo VPS as the production hosting target.
- Confirmed managed Supabase as the production database, auth, storage, migration, and backup baseline.
- Confirmed Dockerized Next.js as the app runtime.
- Confirmed reverse proxy/TLS direction with Caddy or Nginx on the VPS.
- Documented domain, SSL, optional CDN, and layered backup approach.
- Added a runtime diagram for users, DNS/CDN, VPS reverse proxy, Next.js container, managed Supabase, and GitHub Actions.
- Added a contract checker so the runtime decision remains VPS-first and does not drift back to Vercel assumptions.

## Files

- `src/services/infrastructure/productionRuntimeDecision.ts`
- `docs/production-runtime-decision.md`
- `scripts/check-production-runtime-contract.mjs`

## Product Decision

FlowForce will deploy to a Contabo VPS, while Supabase remains managed for production. Self-hosting Supabase is deferred because it would increase operational risk before pilot launch.

## Verification

- `npm run check:production-runtime`

## Next

Phase 10.02 should add the Docker baseline: production Dockerfile, `.dockerignore`, local production build/run instructions, and environment injection verification.
