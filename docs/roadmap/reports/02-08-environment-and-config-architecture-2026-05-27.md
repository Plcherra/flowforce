# 02.08 Environment And Config Architecture

Date: 2026-05-27

## Completed

- Normalized the environment contract around four scopes: public browser, server-only, test/smoke, and deploy/Supabase.
- Added grouped env exports and validation helpers in `src/lib/env.ts`.
- Added production public-env assertion through `src/lib/config.ts` so missing browser Supabase config fails clearly in production mode.
- Expanded `.env.example` with the normalized local, test, deploy, and CI variable names.
- Added `docs/environment-configuration.md` as the canonical setup reference for local, CI, remote Supabase, and VPS environments.
- Updated the Supabase environment audit to point at the canonical env contract and mark legacy `VITE_*` fallbacks as migration compatibility only.

## Important Decisions

- `NEXT_PUBLIC_*` is reserved for values that can safely appear in the browser bundle.
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `CONNECTEAM_API_KEY`, `CRON_SECRET`, and `LOG_INGEST_TOKEN` are server-only.
- Legacy `VITE_*` fallbacks remain to avoid breaking older local setups, but new implementation should use the normalized names.
- Production builds assert required public config early; service-role config remains lazy so admin-only routes fail clearly when used.

## Verification

- Passed: `npm run typecheck`
- Passed: `npm run check:supabase`
- Passed: `npm run build`

## Next Phase

- 02.09 Build And Test Architecture
