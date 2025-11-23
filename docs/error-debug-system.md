# Error & debug system

This project now has a unified logging pipeline that works on both the client and the Vercel API functions.

## How it works
- **Client logging**: `src/utils/logger.ts` handles log levels, console output, and sends warn/error (configurable) to `/api/logs`.
- **Server logging**: `api/_server/utils/logger.ts` writes structured logs to the new `system_logs` table via the Supabase service role. API routes and detectors use scoped loggers with request/org context.
- **Storage**: Supabase migration `20260322120000_create_system_logs.sql` creates `public.system_logs` with indexes for level, org, request id, and timestamp.
- **Global capture**: Uncaught window errors and unhandled promise rejections are captured and forwarded through the logger.

## Env configuration
- `LOG_LEVEL` / `VITE_LOG_LEVEL` (default `info`): minimum level that prints to console.
- `LOG_PERSIST_LEVEL` (server, default `warn`): minimum level persisted to Supabase.
- `LOG_PERSISTENCE` (server, default `true`): set to `false` to disable persistence.
- `VITE_ENABLE_REMOTE_LOGS` (default `true`): toggle client → `/api/logs` forwarding.
- `VITE_REMOTE_LOG_LEVEL` (default `warn`): minimum level the client forwards.
- `VITE_REMOTE_LOG_ENDPOINT` (default `/api/logs`): override ingest path if needed.
- `LOG_INGEST_TOKEN` / `VITE_LOG_INGEST_TOKEN` (optional): shared token to throttle ingest noise; add both to enforce.

## Usage examples
```ts
import { logger, captureError } from '@/utils/logger';

const featureLogger = logger.child({ scope: 'schedule', orgId });

featureLogger.info('Loaded schedule', { context: { week } });

try {
  // ...
} catch (err) {
  captureError(err, { message: 'Schedule fetch failed', context: { week } });
}
```

## Operational notes
- Cron routes (`api/run-detectors.ts`, `api/run-dev-detectors.ts`) emit structured logs with per-org context; failures surface in `system_logs`.
- Client errors surface in the same table via `/api/logs`, keeping a single place to debug issues.
- `system_logs` can be inspected in Supabase or queried from BI tools to build dashboards/alerts.
