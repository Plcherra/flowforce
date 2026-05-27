# 10 Production Infrastructure And Launch

## Goal

Make FlowForce deployable, observable, recoverable, secure, and ready for pilot customers on the chosen production infrastructure.

## Phases

### Phase 1: Production Runtime Decision

- [ ] Confirm hosting target: Contabo VPS, managed platform, or hybrid.
- [ ] Confirm Supabase managed versus self-hosted database.
- [ ] Confirm domain, SSL, CDN, and backup approach.
- [ ] Document runtime diagram.

Acceptance:

- Deployment target is not ambiguous.

Verification:

- Infrastructure docs match actual env.

### Phase 2: Docker Baseline

- [ ] Add production Dockerfile for Next.js.
- [ ] Add `.dockerignore`.
- [ ] Add local production build/run instructions.
- [ ] Verify env injection.

Acceptance:

- App can run from a container.

Verification:

- Container health check passes locally.

### Phase 3: Reverse Proxy And TLS

- [ ] Add Nginx or Caddy config.
- [ ] Add HTTP to HTTPS behavior.
- [ ] Add headers and compression.
- [ ] Add domain routing for web/API if needed.

Acceptance:

- Production traffic is routed securely.

Verification:

- SSL and health endpoints work on staging.

### Phase 4: VPS Deploy Scripts

- [ ] Add setup script.
- [ ] Add deploy script.
- [ ] Add rollback script.
- [ ] Add env file template.

Acceptance:

- A new VPS can be prepared repeatably.

Verification:

- Dry-run or staging deploy succeeds.

### Phase 5: Database Backup And Restore

- [ ] Define backup schedule.
- [ ] Add backup script or Supabase backup docs.
- [ ] Add restore drill.
- [ ] Add retention and encryption notes.

Acceptance:

- Data recovery is tested, not theoretical.

Verification:

- Restore drill is documented with timestamp and result.

### Phase 6: Monitoring And Logging

- [ ] Add uptime checks.
- [ ] Add app error tracking.
- [ ] Add server metrics.
- [ ] Add deploy and Supabase health visibility.

Acceptance:

- Failures are visible before customers report them.

Verification:

- Test alert triggers to the chosen channel.

### Phase 7: Performance And Load Baseline

- [ ] Measure build size, page load, API latency, and database hot queries.
- [ ] Add indexes/RPC improvements where needed.
- [ ] Define acceptable pilot load.
- [ ] Add basic load test script.

Acceptance:

- The app has known capacity for pilots.

Verification:

- Load baseline report is stored in docs.

### Phase 8: CI/CD Release Gates

- [ ] Keep Supabase drift and security gates.
- [ ] Keep build/typecheck/smoke gates.
- [ ] Add Docker build gate.
- [ ] Add mobile build gate when mobile is active.

Acceptance:

- Broken deploys cannot quietly reach production.

Verification:

- GitHub workflows pass on main.

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

