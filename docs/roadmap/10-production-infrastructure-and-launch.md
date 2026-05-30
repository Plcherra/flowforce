# 10 Production Infrastructure And Launch

## Goal

Make FlowForce deployable, observable, recoverable, secure, and ready for pilot customers on the chosen production infrastructure.

## Phases

### Phase 1: Production Runtime Decision

- [x] Confirm hosting target: Contabo VPS, managed platform, or hybrid.
- [x] Confirm Supabase managed versus self-hosted database.
- [x] Confirm domain, SSL, CDN, and backup approach.
- [x] Document runtime diagram.

Acceptance:

- Deployment target is not ambiguous.

Verification:

- Infrastructure docs match actual env.

Status:

- Completed on 2026-05-30.
- Decision: [Production Runtime Decision](../production-runtime-decision.md)
- Contract: `src/services/infrastructure/productionRuntimeDecision.ts`
- Checker: `npm run check:production-runtime`
- Phase report: [10.01 Production Runtime Decision](./reports/10-01-production-runtime-decision-2026-05-30.md)

### Phase 2: Docker Baseline

- [x] Add production Dockerfile for Next.js.
- [x] Add `.dockerignore`.
- [x] Add local production build/run instructions.
- [x] Verify env injection.

Acceptance:

- App can run from a container.

Verification:

- Container health check passes locally.

Status:

- Completed on 2026-05-30.
- Runtime guide: [Production Docker Baseline](../production-docker-baseline.md)
- Contract: `src/services/infrastructure/dockerBaseline.ts`
- Checker: `npm run check:docker-baseline`
- Phase report: [10.02 Docker Baseline](./reports/10-02-docker-baseline-2026-05-30.md)

### Phase 3: Reverse Proxy And TLS

- [x] Add Nginx or Caddy config.
- [x] Add HTTP to HTTPS behavior.
- [x] Add headers and compression.
- [x] Add domain routing for web/API if needed.

Acceptance:

- Production traffic is routed securely.

Verification:

- SSL and health endpoints work on staging.

Status:

- Completed on 2026-05-30.
- Runtime guide: [Production Reverse Proxy And TLS](../production-reverse-proxy-tls.md)
- Contract: `src/services/infrastructure/reverseProxyTls.ts`
- Checker: `npm run check:reverse-proxy-tls`
- Phase report: [10.03 Reverse Proxy And TLS](./reports/10-03-reverse-proxy-tls-2026-05-30.md)

### Phase 4: VPS Deploy Scripts

- [x] Add setup script.
- [x] Add deploy script.
- [x] Add rollback script.
- [x] Add env file template.

Acceptance:

- A new VPS can be prepared repeatably.

Verification:

- Dry-run or staging deploy succeeds.

Status:

- Completed on 2026-05-30.
- Runtime guide: [Production VPS Deploy Scripts](../production-vps-deploy.md)
- Contract: `src/services/infrastructure/vpsDeployScripts.ts`
- Checker: `npm run check:vps-deploy-scripts`
- Phase report: [10.04 VPS Deploy Scripts](./reports/10-04-vps-deploy-scripts-2026-05-30.md)

### Phase 5: Database Backup And Restore

- [x] Define backup schedule.
- [x] Add backup script or Supabase backup docs.
- [x] Add restore drill.
- [x] Add retention and encryption notes.

Acceptance:

- Data recovery is tested, not theoretical.

Verification:

- Restore drill is documented with timestamp and result.

Status:

- Completed on 2026-05-30.
- Runtime guide: [Production Database Backup And Restore](../production-database-backup-restore.md)
- Contract: `src/services/infrastructure/databaseBackupRestore.ts`
- Checker: `npm run check:database-backup-restore`
- Phase report: [10.05 Database Backup And Restore](./reports/10-05-database-backup-restore-2026-05-30.md)

### Phase 6: Monitoring And Logging

- [x] Add uptime checks.
- [x] Add app error tracking.
- [x] Add server metrics.
- [x] Add deploy and Supabase health visibility.

Acceptance:

- Failures are visible before customers report them.

Verification:

- Test alert triggers to the chosen channel.

Status:

- Completed on 2026-05-30.
- Runtime guide: [Production Monitoring And Logging](../production-monitoring-logging.md)
- Contract: `src/services/infrastructure/productionMonitoringLogging.ts`
- Checker: `npm run check:monitoring-logging`
- Phase report: [10.06 Monitoring And Logging](./reports/10-06-monitoring-logging-2026-05-30.md)

### Phase 7: Performance And Load Baseline

- [x] Measure build size, page load, API latency, and database hot queries.
- [x] Add indexes/RPC improvements where needed.
- [x] Define acceptable pilot load.
- [x] Add basic load test script.

Acceptance:

- The app has known capacity for pilots.

Verification:

- Load baseline report is stored in docs.

Status:

- Completed on 2026-05-30.
- Runtime guide: [Production Performance And Load Baseline](../production-performance-load-baseline.md)
- Contract: `src/services/infrastructure/productionPerformanceLoadBaseline.ts`
- Checker: `npm run check:performance-load-baseline`
- Runner: `npm run perf:baseline`
- Phase report: [10.07 Performance And Load Baseline](./reports/10-07-performance-load-baseline-2026-05-30.md)

### Phase 8: CI/CD Release Gates

- [x] Keep Supabase drift and security gates.
- [x] Keep build/typecheck/smoke gates.
- [x] Add Docker build gate.
- [x] Add mobile build gate when mobile is active.

Acceptance:

- Broken deploys cannot quietly reach production.

Verification:

- GitHub workflows pass on main.

Status:

- Completed on 2026-05-30.
- Runtime guide: [Production CI/CD Release Gates](../production-ci-cd-release-gates.md)
- Contract: `src/services/infrastructure/productionReleaseGates.ts`
- Checker: `npm run check:release-gates`
- Phase report: [10.08 CI/CD Release Gates](./reports/10-08-ci-cd-release-gates-2026-05-30.md)

### Phase 9: Pilot Launch Checklist

- [ ] Create final launch checklist.
- [ ] Include onboarding, data import, training, support, monitoring, rollback, and billing readiness.
- [ ] Create pilot customer setup script.
- [ ] Create known limitations list.

Acceptance:

- First customers can be onboarded deliberately.

Verification:

- Internal pilot rehearsal completes.

### Phase 10: Launch Readiness Signoff

- [ ] Run full release gate.
- [ ] Run production smoke.
- [ ] Verify backup and rollback.
- [ ] Update master roadmap status.

Acceptance:

- FlowForce is ready for controlled paid pilots.

Verification:

- Launch signoff report exists with links to checks.
