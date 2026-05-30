# Production VPS Deploy Scripts

Phase 10.04 makes the Contabo VPS path repeatable. The scripts assume Ubuntu on the VPS, managed Supabase for data/auth/storage, Docker for the Next.js app, and Caddy for TLS/reverse proxy.

## Files

- Setup: `infrastructure/scripts/setup-vps.sh`
- Deploy: `infrastructure/scripts/deploy.sh`
- Rollback: `infrastructure/scripts/rollback.sh`
- Compose: `infrastructure/docker-compose.vps.yml`
- Env template: `infrastructure/.env.production.example`
- Caddy config: `infrastructure/caddy/Caddyfile`

## First VPS Setup

After the repository is present on the VPS:

```bash
sudo FLOWFORCE_APP_DIR=/opt/flowforce/current infrastructure/scripts/setup-vps.sh
```

Dry-run:

```bash
sudo FLOWFORCE_DRY_RUN=1 infrastructure/scripts/setup-vps.sh
```

The setup script:

- installs Docker Engine and the Docker Compose plugin when Docker is missing;
- creates the `flowforce` system user;
- creates `/opt/flowforce/current`, `/opt/flowforce/backups`, and `/opt/flowforce/releases`;
- adds the app user to the `docker` group;
- opens SSH, HTTP, and HTTPS in `ufw` when `ufw` exists;
- creates `infrastructure/.env.production` from `infrastructure/.env.production.example` if missing.

## Production Env File

Fill this file on the VPS only:

```bash
infrastructure/.env.production
```

Required values:

```bash
FLOWFORCE_DOMAIN=
ACME_EMAIL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

The deploy script rejects missing values and obvious template placeholders.

## Deploy

```bash
FLOWFORCE_APP_ROOT=/opt/flowforce/current infrastructure/scripts/deploy.sh
```

Dry-run:

```bash
FLOWFORCE_DRY_RUN=1 infrastructure/scripts/deploy.sh
```

The deploy script:

- validates `infrastructure/.env.production`;
- validates the Caddyfile with `caddy:2.10-alpine`;
- tags the current `flowforce-web:latest` image as `flowforce-web:rollback` when present;
- builds and starts the production Compose stack;
- verifies `https://${FLOWFORCE_DOMAIN}/healthz`.

The script supports both `docker compose` and legacy `docker-compose`.

## Rollback

```bash
FLOWFORCE_APP_ROOT=/opt/flowforce/current infrastructure/scripts/rollback.sh
```

Dry-run:

```bash
FLOWFORCE_DRY_RUN=1 infrastructure/scripts/rollback.sh
```

The rollback script:

- retags `flowforce-web:rollback` as `flowforce-web:latest`;
- restarts the production Compose stack without rebuilding;
- verifies `https://${FLOWFORCE_DOMAIN}/healthz`.

## Notes Before Paid Pilot

- DNS must point to the Contabo VPS before the first real deploy so Caddy can issue certificates.
- Real secrets stay on the VPS in `infrastructure/.env.production`; never commit that file.
- Phase 10.05 will add database backup and restore drills.
