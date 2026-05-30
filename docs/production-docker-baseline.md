# Production Docker Baseline

FlowForce runs as a Dockerized Next.js standalone server for the Contabo VPS path. The image contains only the production server bundle, static assets, public assets, and the dependencies copied by Next.js standalone output.

## Runtime Shape

- Image: `flowforce-web`
- Dockerfile: `Dockerfile`
- Local production compose file: `infrastructure/docker-compose.production-local.yml`
- Container port: `3000`
- Health endpoint: `/api/health`
- Node image: `node:22-bookworm-slim`
- Next.js output mode: `standalone`
- Runtime user: `nextjs`
- Builder memory cap: `NODE_OPTIONS=--max-old-space-size=2048`

## Environment Injection

Public browser variables are build-time inputs because they are compiled into the browser bundle:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_LOG_LEVEL=info
NEXT_PUBLIC_REMOTE_LOG_LEVEL=warn
NEXT_PUBLIC_ENABLE_REMOTE_LOGS=false
NEXT_PUBLIC_REMOTE_LOG_ENDPOINT=/api/logs
NEXT_PUBLIC_ENABLE_AI_INSIGHTS=false
NEXT_PUBLIC_DEFAULT_COMPANY_ID=
NEXT_PUBLIC_FLOWFORCE_AUTOMATIONS_ENDPOINT=
```

Server-only variables are runtime inputs through `.env.production.local` or the VPS secret file:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
CRON_SECRET=
LOG_INGEST_TOKEN=
LOG_LEVEL=info
LOG_PERSIST_LEVEL=warn
LOG_PERSISTENCE=true
SUPPORT_ADMIN_TOKEN=
```

Do not bake `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`, `LOG_INGEST_TOKEN`, or `SUPPORT_ADMIN_TOKEN` into the image.

## Colima Local Production Run

Use the FlowForce Colima profile before running Docker commands:

```bash
export DOCKER_HOST=unix:///Users/pedromartins/.colima/flowforce/docker.sock
docker ps
```

If the first production image build is killed during `next build`, increase the local Colima profile before retrying:

```bash
colima stop flowforce
colima start flowforce --cpu 4 --memory 8 --disk 40 --runtime docker
export DOCKER_HOST=unix:///Users/pedromartins/.colima/flowforce/docker.sock
```

Create a local production env file from the template and fill real local/managed Supabase values:

```bash
cp .env.example .env.production.local
```

Run the container through Compose:

```bash
docker compose --env-file .env.production.local -f infrastructure/docker-compose.production-local.yml up --build
```

Or build and run directly:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -t flowforce-web:local .

docker run --rm --env-file .env.production.local -p 3000:3000 flowforce-web:local
```

Verify health:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

## VPS Handoff

The Contabo VPS should run this same image behind the reverse proxy added in Phase 10.03. The reverse proxy should route HTTPS traffic to `web:3000` and use `/api/health` for upstream health checks.

Phase 10.04 will add repeatable VPS setup, deploy, rollback, and env-file management scripts. Until then, do not place real production secrets in this repository.
