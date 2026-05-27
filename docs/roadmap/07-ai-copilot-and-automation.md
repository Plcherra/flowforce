# 07 AI Copilot And Automation

## Goal

Make AI useful, safe, auditable, and tied to FlowForce's operational data. AI should recommend and assist before it writes; writes must be approved, scoped, and logged.

## Phases

### Phase 1: AI Governance Model

- [ ] Define read-only insight, suggested action, approved action, and automated action.
- [ ] Define AI permissions.
- [ ] Define audit log requirements.
- [ ] Define data that AI may and may not access.

Acceptance:

- AI cannot become an uncontrolled side door.

Verification:

- AI rules appear in security and product docs.

### Phase 2: AI Context Layer

- [ ] Build tenant-scoped context fetchers.
- [ ] Add module summaries for scheduling, inventory, tasks, forms, employees, and cost.
- [ ] Redact sensitive data where possible.
- [ ] Add freshness timestamps.

Acceptance:

- AI receives structured context instead of raw random dumps.

Verification:

- Context tests enforce tenant scoping.

### Phase 3: Prompt Contracts

- [ ] Create prompts for scheduling, inventory, waste, compliance, and manager briefing.
- [ ] Require structured JSON output.
- [ ] Add schema validation.
- [ ] Add failure and fallback behavior.

Acceptance:

- AI output is predictable enough for product use.

Verification:

- Invalid output is rejected safely.

### Phase 4: Manager Briefing

- [ ] Build "today's operations briefing."
- [ ] Include staffing risks, inventory risks, overdue tasks, workflow exceptions, and cost anomalies.
- [ ] Add evidence links.
- [ ] Add refresh/logging behavior.

Acceptance:

- Managers get actionable daily guidance.

Verification:

- Briefing only references records the user can access.

### Phase 5: Scheduling Assistant

- [ ] Suggest shifts based on demand, availability, roles, and labor cost.
- [ ] Detect understaffing/overstaffing.
- [ ] Suggest replacements for absence or conflicts.
- [ ] Require manager approval before writes.

Acceptance:

- AI helps schedule, but does not silently publish schedules.

Verification:

- Suggested schedule writes are audited and permission-gated.

### Phase 6: Inventory And Waste Assistant

- [ ] Detect repeated stockouts.
- [ ] Suggest reorder quantities.
- [ ] Detect waste outliers.
- [ ] Suggest prep or purchasing adjustments.

Acceptance:

- AI makes inventory/cost engine more useful.

Verification:

- Recommendations cite source metrics.

### Phase 7: Compliance And Workflow Assistant

- [ ] Detect overdue recurring workflows.
- [ ] Summarize failed checklist patterns.
- [ ] Suggest corrective tasks.
- [ ] Suggest training follow-ups.

Acceptance:

- AI supports operational discipline.

Verification:

- AI-created suggestions can be approved into tasks.

### Phase 8: Learning Loop

- [ ] Track accepted/rejected recommendations.
- [ ] Capture reason codes.
- [ ] Improve future suggestions from user feedback.
- [ ] Keep tenant-specific learning separated.

Acceptance:

- AI improves without leaking tenant data.

Verification:

- Feedback records are tenant-scoped and auditable.

### Phase 9: AI Observability And Cost Controls

- [ ] Log model, tokens, latency, errors, and user.
- [ ] Add tenant/model budget controls.
- [ ] Add retry and timeout behavior.
- [ ] Add admin AI usage dashboard.

Acceptance:

- AI cost and reliability are visible.

Verification:

- Failed AI calls degrade gracefully.

### Phase 10: AI Copilot Signoff

- [ ] Add release gates for AI contract tests.
- [ ] Add safety review checklist.
- [ ] Add demo workflow.
- [ ] Update roadmap status.

Acceptance:

- AI is a controlled product capability, not a fragile novelty.

Verification:

- AI demos work with seeded data and pass audit expectations.

