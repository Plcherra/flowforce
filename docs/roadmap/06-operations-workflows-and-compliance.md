# 06 Operations Workflows And Compliance

## Goal

Build Jolt-style execution: checklists, SOPs, inspections, incidents, recurring workflows, approvals, compliance history, and manager review.

## Phases

### Phase 1: Workflow Domain Model

- [ ] Define workflow, checklist, step, assignment, run, evidence, review, and exception models.
- [ ] Map existing forms/tasks to workflow concepts.
- [ ] Decide what is reused versus newly modeled.
- [ ] Define permissions and audit needs.

Acceptance:

- Workflows are not just loose forms.

Verification:

- Domain model maps to current and new tables.

### Phase 2: SOP And Checklist Builder

- [ ] Create template builder for opening, closing, cleaning, safety, and inventory routines.
- [ ] Support required fields, attachments, signatures, ratings, and scans.
- [ ] Support location/role assignment.
- [ ] Add preview mode.

Acceptance:

- Managers can create repeatable operational routines.

Verification:

- Builder creates executable workflows.

### Phase 3: Recurring Operations Calendar

- [ ] Schedule recurring workflow runs.
- [ ] Assign by location, role, or person.
- [ ] Add due windows and escalation rules.
- [ ] Show daily manager workload.

Acceptance:

- Daily operations can be planned automatically.

Verification:

- Recurring runs are generated idempotently.

### Phase 4: Field Execution UI

- [ ] Build mobile-first run interface.
- [ ] Support save-draft and resume.
- [ ] Support required evidence.
- [ ] Support failed step notes and escalation.

Acceptance:

- Staff can complete workflows quickly on mobile.

Verification:

- Mobile viewport QA passes.

### Phase 5: Manager Review Queue

- [ ] Add review states.
- [ ] Add approve/reject/comment actions.
- [ ] Add exception prioritization.
- [ ] Add audit trail.

Acceptance:

- Managers can inspect what happened without chasing messages.

Verification:

- Review actions are permission-gated and audited.

### Phase 6: Incident And Issue Tracking

- [ ] Model incidents, issues, severity, owner, due date, and resolution.
- [ ] Connect issues to tasks, workflows, inventory, and AI suggestions.
- [ ] Add status and SLA indicators.
- [ ] Add reporting.

Acceptance:

- Operational problems become tracked work.

Verification:

- Issue lifecycle tests pass.

### Phase 7: Compliance Packs

- [ ] Create templates for food safety, labor compliance, training, cleaning, and equipment.
- [ ] Add evidence retention rules.
- [ ] Add compliance dashboard.
- [ ] Add exportable audit reports.

Acceptance:

- FlowForce can support compliance-oriented customers.

Verification:

- Compliance reports generate from real runs/evidence.

### Phase 8: Workflow Automation Hooks

- [ ] Trigger tasks from failed checklist steps.
- [ ] Trigger inventory adjustments or reviews from count/waste workflows.
- [ ] Trigger notifications for overdue critical runs.
- [ ] Log every automated action.

Acceptance:

- Workflows create operational follow-through.

Verification:

- Automation tests cover idempotence and permissions.

### Phase 9: Analytics For Execution Quality

- [ ] Track completion, overdue, exception, and repeat-failure metrics.
- [ ] Show trends by location, department, and role.
- [ ] Connect results to performance and training.
- [ ] Add manager coaching insights.

Acceptance:

- Execution quality becomes measurable.

Verification:

- Dashboard/report data matches workflow records.

### Phase 10: Operations Workflow Signoff

- [ ] Seed demo workflows.
- [ ] Add smoke coverage.
- [ ] Update sales/demo script.
- [ ] Update roadmap status.

Acceptance:

- FlowForce can credibly replace operational checklist tools.

Verification:

- Workflow demo works on desktop and mobile.

