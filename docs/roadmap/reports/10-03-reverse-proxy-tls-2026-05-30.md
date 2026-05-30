# 10.03 Reverse Proxy And TLS

Status: Completed on 2026-05-30.

## Completed

- Added a Caddy reverse proxy config for the Contabo VPS deployment path.
- Added automatic HTTPS, HTTP-to-HTTPS behavior, and `www` to apex-domain redirects.
- Added security headers, response compression, JSON access logs, and upstream health checks.
- Added a VPS Compose file that runs `web` behind `proxy` on ports `80` and `443`.
- Added a production env template for domain, ACME email, public build args, and runtime secrets.
- Documented DNS, TLS, headers, health checks, and the Phase 10.04 handoff.
- Added a local contract check for the reverse proxy and TLS baseline.

## Files

- `infrastructure/caddy/Caddyfile`
- `infrastructure/docker-compose.vps.yml`
- `infrastructure/.env.production.example`
- `src/services/infrastructure/reverseProxyTls.ts`
- `docs/production-reverse-proxy-tls.md`
- `scripts/check-reverse-proxy-tls-contract.mjs`

## Verification

- `npm run check:reverse-proxy-tls`
- `npm run check:local`
- Caddy config syntax check through `caddy:2.10-alpine`

## Next

Phase 10.04 should add repeatable VPS setup, deploy, rollback, and production env-file scripts.
