# 10.06 Monitoring And Logging

Date: 2026-05-30

## Completed

- Added the production monitoring policy contract in `src/services/infrastructure/productionMonitoringLogging.ts`.
- Added a VPS alert test script: `infrastructure/scripts/test-monitoring-alert.sh`.
- Added a VPS server metrics snapshot script: `infrastructure/scripts/collect-server-metrics.sh`.
- Updated `/api/logs` so accepted remote logs persist to `public.system_logs`.
- Added production runbook documentation in `docs/production-monitoring-logging.md`.
- Added env template fields for uptime, alert, and metrics settings.
- Wired the monitoring contract into `check:local` and `check:release`.
- Updated Plan 10 and the master roadmap to mark 10.06 complete.

## Verification

- `bash -n infrastructure/scripts/test-monitoring-alert.sh`
- `bash -n infrastructure/scripts/collect-server-metrics.sh`
- `FLOWFORCE_DRY_RUN=1 infrastructure/scripts/test-monitoring-alert.sh`
- `FLOWFORCE_DRY_RUN=1 infrastructure/scripts/collect-server-metrics.sh`
- `npm run check:monitoring-logging`
- `npm run check:local`

## Notes

- No Supabase migration was needed; the existing `system_logs` table already supports the persisted remote log payload.
- Live alert delivery still requires the real `MONITORING_ALERT_WEBHOOK_URL` after the VPS and ops channel are selected.
- Phase 10.07 should measure capacity and performance against this observable baseline.
