# 10.02 Docker Baseline

Status: Completed on 2026-05-30.

## Completed

- Added a production Dockerfile for the Next.js standalone server.
- Enabled Next.js standalone output.
- Added `.dockerignore` so local artifacts, secrets, mobile native folders, and build output stay out of the image context.
- Added `/api/health` for container and reverse-proxy health checks.
- Added a Colima-friendly local production Compose file.
- Added a Docker builder memory cap and documented the Colima memory bump if local image builds are killed.
- Defaulted Docker builds to local-only browser logging unless remote logging is explicitly enabled.
- Documented build-time public env injection and runtime server-secret injection.
- Added a local contract check for the Docker baseline.

## Files

- `Dockerfile`
- `.dockerignore`
- `infrastructure/docker-compose.production-local.yml`
- `app/api/health/route.ts`
- `src/services/infrastructure/dockerBaseline.ts`
- `docs/production-docker-baseline.md`
- `scripts/check-docker-baseline-contract.mjs`

## Verification

- `npm run check:docker-baseline`
- `npm run typecheck:src`
- `npm run build`
- `docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key -t flowforce-web:phase10-02 .`
- `curl -fsS http://127.0.0.1:3100/api/health`

## Next

Phase 10.03 should add the reverse proxy and TLS layer for the Contabo VPS target.
