# Production Performance And Load Baseline

Phase 10.07 defines the first measurable capacity target for FlowForce pilots. This is not the final scale target; it is the minimum baseline we need before controlled paid pilots on the Contabo VPS deployment path.

## Pilot Load Target

Initial pilot capacity target:

- 3 pilot companies
- 25 employees per company
- 50 concurrent active users across all pilot tenants
- 600 burst requests per minute
- `/api/health` p95 below 500 ms during a basic load probe
- critical page p95 below 2.5 seconds on production VPS

## Current Build Baseline

Measured from the current Next.js production build on 2026-05-30:

| Artifact | Size | Notes |
| --- | ---: | --- |
| `.next/static` | 10 MB | Browser static chunks; under the 25 MB pilot budget. |
| `.next/server` | 70 MB | Server-rendered app artifacts; under the 150 MB pilot budget. |
| `.next` total | 2.7 GB | Includes generated/cache/build internals; deployment image size is tracked separately by Docker phase. |

Largest static chunks seen in the local build were under 600 KB each. That is acceptable for pilot, but Phase 10.07 keeps the page-load budget explicit so we can catch regressions when real production URLs exist.

## API And Page Latency

The repeatable baseline command is:

```bash
PERF_BASE_URL=https://your-domain.example \
PERF_LOAD_REQUESTS=100 \
PERF_LOAD_CONCURRENCY=10 \
node scripts/run-performance-load-baseline.mjs
```

Without `PERF_BASE_URL`, the script still records build artifact size and marks network probes as skipped. With `PERF_BASE_URL`, it probes:

- `/api/health`
- `/`
- `/auth`
- `/app`

It also runs a simple concurrent load pass against `/api/health`.

## Database Hot Query Families

The current schema already has broad tenant-scoped indexes from prior SaaS and domain phases. Before paid pilot, check these families in the Supabase dashboard or query stats:

- company-scoped list pages ordered by `created_at` or `updated_at`
- user-scoped task, notification, and scheduling lookups
- inventory item/unit/stock joins scoped by `company_id`
- workflow instance and evidence lookups scoped by `company_id` and `status`
- `system_logs` warning/error lookups ordered by `created_at desc`

No new index migration was added in this phase because we do not yet have production query stats showing a specific slow path. The correct next move is to measure on staging/VPS, then add targeted indexes in a follow-up migration if a query family crosses the budget.

## Script Output

Default output:

```text
docs/test-results/performance-load-baseline.json
```

The JSON includes:

- build artifact sizes
- largest static/server files
- page/API probe durations when a base URL is provided
- `/api/health` load probe p50/p95/max/failure counts
- the hot query families to inspect

## Current Local Verification

Timestamp: 2026-05-30

Completed locally:

- build artifact size scan
- performance baseline script syntax/runtime check without `PERF_BASE_URL`
- contract check through `npm run check:performance-load-baseline`
- `npm run build`

Live page latency, API latency, and database query stats still require the real VPS/staging URL.
