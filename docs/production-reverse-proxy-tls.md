# Production Reverse Proxy And TLS

FlowForce uses Caddy as the first production reverse proxy for the Contabo VPS path. Caddy terminates TLS, renews certificates automatically, redirects HTTP to HTTPS, compresses responses, adds security headers, and forwards application traffic to the Dockerized Next.js server.

## Runtime Shape

- Reverse proxy: Caddy 2
- Config: `infrastructure/caddy/Caddyfile`
- VPS Compose file: `infrastructure/docker-compose.vps.yml`
- Env template: `infrastructure/.env.production.example`
- Public ports: `80` and `443`
- Upstream app: `web:3000`
- App health endpoint: `/api/health`
- Proxy health endpoint: `/healthz`

## DNS And TLS

Point DNS records to the Contabo VPS public IP:

```text
A     example.com      <VPS IPv4>
AAAA  example.com      <VPS IPv6, if enabled>
CNAME www.example.com  example.com
```

Set these values on the VPS:

```bash
FLOWFORCE_DOMAIN=example.com
ACME_EMAIL=ops@example.com
```

Caddy obtains and renews certificates automatically when ports `80` and `443` are reachable from the public internet. Caddy also performs HTTP-to-HTTPS redirects for the configured domain. The `www` host redirects permanently to the apex domain.

## Security Headers

The Caddy baseline adds:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- Removes the default `Server` response header.

## Compression And Routing

The proxy enables `zstd` and `gzip` compression. All web and API traffic routes to the same Next.js container because FlowForce is currently a single Next.js app with app routes and API routes together.

Health checks:

```bash
curl -fsS https://example.com/healthz
curl -fsS https://example.com/api/health
```

## Local Syntax Check

After Docker or Colima is available:

```bash
export DOCKER_HOST=unix:///Users/pedromartins/.colima/flowforce/docker.sock
docker run --rm -v "$PWD/infrastructure/caddy/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.10-alpine caddy validate --config /etc/caddy/Caddyfile
```

## VPS Handoff

Phase 10.04 will add setup, deploy, rollback, and env-file scripts. For now, the VPS production shape is:

```bash
cd /opt/flowforce/current
cp infrastructure/.env.production.example infrastructure/.env.production
docker compose --env-file infrastructure/.env.production -f infrastructure/docker-compose.vps.yml up -d --build
```

Do not run the production Compose file with example secrets. Fill real Supabase, support, AI, and cron values on the VPS only.
