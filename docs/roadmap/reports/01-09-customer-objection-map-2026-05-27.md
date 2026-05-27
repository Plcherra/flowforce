# Phase 01.09 - Customer Objection Map

Date: 2026-05-27

## Decision

FlowForce should handle buyer objections with proof, not confidence.

The product can be ambitious, but every sales answer must connect to one of these proof types:

- Visible product behavior.
- Demo tenant evidence.
- Automated tests or smoke checks.
- Security, migration, or support documentation.
- Explicit future roadmap item.

## Switching Objections

### "We already use separate tools and spreadsheets."

Answer:

- FlowForce replaces the daily operating loop across staff, tasks, checklists, inventory, purchasing, waste, and reporting.
- The strongest claim is fewer handoffs and one operating picture, not feature-for-feature parity with every mature tool on day one.

Proof needed:

- Replacement-stack map.
- 10-minute demo flow.
- Demo tenant import/reset.
- Migration checklist.

### "My managers will not adopt another system."

Answer:

- The pilot experience should be smaller than the full platform.
- Managers should see only the modules needed to run the week.

Proof needed:

- Pilot sidebar from Phase 01.07.
- Manager workflow demo from Phase 01.08.
- Mobile staff view.
- One-week pilot success metrics.

### "Setup sounds like too much work."

Answer:

- FlowForce should start from restaurant templates and guided onboarding.
- Setup should not require developer intervention.

Proof needed:

- Guided onboarding.
- Default roles and permissions.
- Opening/closing/checklist templates.
- Inventory import path.
- Seeded demo tenant.

### "We cannot risk disrupting the restaurant."

Answer:

- The first rollout can run parallel to existing workflows before becoming the source of truth.

Proof needed:

- Phased rollout plan.
- Read-only or reporting-first pilot option.
- Clear rollback/export path.
- Support response expectations.

## Trust, Uptime, Security, And Mobile Objections

### "Can I trust this with employee and business data?"

Answer:

- FlowForce must prove tenant isolation, controlled access, and recoverable data before serious shipment.

Proof needed:

- RLS audit.
- Tenant isolation tests.
- Role and permission matrix.
- Data retention/export policy.
- Backup and restore plan.

### "What happens if the app is down during a shift?"

Answer:

- The product needs a clear uptime target, incident process, and graceful fallback for shift-critical workflows.

Proof needed:

- Status page plan.
- Incident response runbook.
- Monitoring and alerting.
- Backup/restore verification.
- Mobile fallback behavior for staff-critical screens.

### "Will staff use it on phones?"

Answer:

- Staff workflows must be mobile-first and simple: schedule, messages, tasks, checklists, and profile.

Proof needed:

- Mobile viewport tests.
- Staff demo script.
- PWA install path or native app roadmap.
- Real device QA checklist.

### "Will owners control permissions?"

Answer:

- Owners and admins need clear control over who can see employees, schedules, cost, inventory, purchasing, reports, and settings.

Proof needed:

- Role matrix.
- Permission smoke tests.
- Audit history for sensitive actions.
- Owner/admin settings documentation.

## Integration Objections

### "Will it connect to POS, payroll, accounting, or suppliers?"

Answer:

- FlowForce should be honest: integrations are a roadmap layer, while the pilot can start with import/export and focused manual workflows.

Proof needed:

- Integration priority list.
- Export-first fallback.
- CSV templates.
- Provider credential and sync-scope design.

### "Can we start without every integration?"

Answer:

- Yes, if the pilot scope proves daily operation value before deep automation.

Proof needed:

- Manual import/export flows.
- Pilot workflows that do not require POS, payroll, accounting, or distributor sync.
- Clear integration roadmap.

### "What if we leave later?"

Answer:

- Customers should be able to export their core operating records.

Proof needed:

- Data export policy.
- Downloadable records for employees, schedules, tasks, inventory, purchasing, waste, and reports.

## Product Implication

Future launch work should include a proof checklist for every public claim:

- Security proof.
- Mobile proof.
- Uptime and recovery proof.
- Migration proof.
- Integration proof.
- Support proof.

Claims without proof should become roadmap language, not sales language.

## Acceptance Result

- Switching objections documented.
- Trust, uptime, security, and mobile objections documented.
- Integration objections documented.
- Each objection mapped to product proof.

## Next Phase

Continue to Phase 01.10: positioning freeze for build.
