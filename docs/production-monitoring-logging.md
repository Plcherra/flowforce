# Production Monitoring And Logging

Phase 10.06 turns the Contabo VPS deployment into an observable production target. The goal is simple: FlowForce should notify us before a pilot customer has to report an outage.

## Signals

| Signal | Source | Alert path | Evidence |
| --- | --- | --- | --- |
| Uptime | `https://${FLOWFORCE_DOMAIN}/healthz` | External monitor to `MONITORING_ALERT_WEBHOOK_URL` | HTTP status and latency check |
| App errors | `/api/logs` and server logger | `public.system_logs` warning/error query, then alert webhook or external tracker | Persisted structured log rows |
| Server metrics | `infrastructure/scripts/collect-server-metrics.sh` | Snapshot review and alert webhook | Disk, memory, container, and health JSON |
| Deploy health | `deploy.sh` and `rollback.sh` | Deploy console and incident runbook | Post-deploy `/healthz` check |
| Supabase health | Supabase dashboard and project API health | Supabase project notifications | Provider health, database, auth, and API status |

## Uptime Checks

Use an external monitor such as Better Stack, Uptime Kuma, Healthchecks.io, or a similar service.

Required check:

```text
GET https://${FLOWFORCE_DOMAIN}/healthz
Interval: 60 seconds
Timeout: 10 seconds
Alert after: 2 failed checks
```

The `/healthz` route is served by Caddy and rewrites to the app `/api/health` route. It verifies the reverse proxy, container, and Next.js runtime path.

## App Error Tracking

FlowForce already has a structured server logger that writes warnings and errors to `public.system_logs`. This phase also makes the remote log endpoint persist accepted client logs:

```text
POST /api/logs
Header: x-log-token: ${LOG_INGEST_TOKEN}
```

Production should keep:

```text
LOG_LEVEL=info
LOG_PERSIST_LEVEL=warn
LOG_PERSISTENCE=true
NEXT_PUBLIC_ENABLE_REMOTE_LOGS=false
```

For paid pilots, enable a dedicated error tracker or a private log ingestion path before turning browser remote logs on broadly. The current endpoint is enough for controlled server-side and smoke-test diagnostics.

## Server Metrics

The VPS script writes point-in-time JSON snapshots:

```bash
FLOWFORCE_ENV_FILE=infrastructure/.env.production \
  infrastructure/scripts/collect-server-metrics.sh
```

It records:

- disk usage for `/`
- memory summary when `free` is available
- Docker Compose service state
- Docker container CPU/memory snapshot
- `/healthz` HTTP status

Recommended cron:

```cron
*/5 * * * * /opt/flowforce/current/infrastructure/scripts/collect-server-metrics.sh >/var/log/flowforce-monitoring.log 2>&1
```

## Alert Test

Before launch, configure `MONITORING_ALERT_WEBHOOK_URL` in `infrastructure/.env.production`, then run:

```bash
infrastructure/scripts/test-monitoring-alert.sh
```

Dry-run mode is available locally:

```bash
FLOWFORCE_DRY_RUN=1 infrastructure/scripts/test-monitoring-alert.sh
```

Result required before paid pilot:

```text
Timestamp: pending live VPS setup
Expected: test alert arrives in the selected ops channel
Evidence: screenshot or incident-tool event link attached to the launch signoff
```

## Log Locations

| Log | Location |
| --- | --- |
| Caddy access logs | `/var/log/caddy/flowforce-access.log` inside the Caddy volume |
| App container logs | `docker compose -f infrastructure/docker-compose.vps.yml logs web` |
| Proxy logs | `docker compose -f infrastructure/docker-compose.vps.yml logs proxy` |
| Structured app logs | Supabase `public.system_logs` |
| Server metric snapshots | `/opt/flowforce/monitoring/server-metrics` |

## Incident Thresholds

Initial pilot thresholds:

- uptime: alert after two failed 60-second checks
- disk: investigate above 80%, urgent above 90%
- memory: investigate above sustained 80%
- app errors: investigate repeated `error` logs within 10 minutes
- deploy: rollback if post-deploy `/healthz` fails after retries

## Current Local Verification

Timestamp: 2026-05-30

Completed locally:

- alert script syntax check
- server metrics script syntax check
- alert dry-run
- server metrics dry-run
- contract check through `npm run check:monitoring-logging`

Live alert delivery still depends on the real VPS env and chosen ops webhook.
