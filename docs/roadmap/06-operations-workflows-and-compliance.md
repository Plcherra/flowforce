# 06 Operations Workflows And Compliance

## Goal

Build checklist-driven execution: checklists, SOPs, inspections, incidents, recurring workflows, approvals, compliance history, and manager review.

## Phases

### Phase 1: Workflow Domain Model

- [x] Define workflow, checklist, step, assignment, run, evidence, review, and exception models.
- [x] Map existing forms/tasks to workflow concepts.
- [x] Decide what is reused versus newly modeled.
- [x] Define permissions and audit needs.

Acceptance:

- Workflows are not just loose forms.

Verification:

- Domain model maps to current and new tables.

Status:

- Completed on 2026-05-28.
- Domain model: [docs/operations-workflow-domain-model.md](../operations-workflow-domain-model.md)
- Contract: [src/services/operations/operationsWorkflowContract.json](../../src/services/operations/operationsWorkflowContract.json)
- Migration: [20260528001200_phase6_workflow_domain_model.sql](../../supabase/migrations/20260528001200_phase6_workflow_domain_model.sql)
- Phase report: [06.01 Workflow Domain Model](./reports/06-01-workflow-domain-model-2026-05-28.md)

### Phase 2: SOP And Checklist Builder

- [x] Create template builder for opening, closing, cleaning, safety, and inventory routines.
- [x] Support required fields, attachments, signatures, ratings, and scans.
- [x] Support location/role assignment.
- [x] Add preview mode.

Acceptance:

- Managers can create repeatable operational routines.

Verification:

- Builder creates executable workflows.

Status:

- Completed on 2026-05-28.
- Builder doc: [docs/sop-checklist-builder.md](../sop-checklist-builder.md)
- Builder service: [src/services/operations/sopChecklistBuilder.ts](../../src/services/operations/sopChecklistBuilder.ts)
- Migration: [20260528001300_phase6_sop_checklist_builder.sql](../../supabase/migrations/20260528001300_phase6_sop_checklist_builder.sql)
- Phase report: [06.02 SOP And Checklist Builder](./reports/06-02-sop-and-checklist-builder-2026-05-28.md)

### Phase 3: Recurring Operations Calendar

- [x] Schedule recurring workflow runs.
- [x] Assign by location, role, or person.
- [x] Add due windows and escalation rules.
- [x] Show daily manager workload.

Acceptance:

- Daily operations can be planned automatically.

Verification:

- Recurring runs are generated idempotently.

Status:

- Completed on 2026-05-28.
- Calendar doc: [docs/recurring-operations-calendar.md](../recurring-operations-calendar.md)
- Calendar service: [src/services/operations/recurringOperationsCalendar.ts](../../src/services/operations/recurringOperationsCalendar.ts)
- Migration: [20260528001400_phase6_recurring_operations_calendar.sql](../../supabase/migrations/20260528001400_phase6_recurring_operations_calendar.sql)
- Phase report: [06.03 Recurring Operations Calendar](./reports/06-03-recurring-operations-calendar-2026-05-28.md)

### Phase 4: Field Execution UI

- [x] Build mobile-first run interface.
- [x] Support save-draft and resume.
- [x] Support required evidence.
- [x] Support failed step notes and escalation.

Acceptance:

- Staff can complete workflows quickly on mobile.

Verification:

- Mobile viewport QA passes.

Status:

- Completed on 2026-05-28.
- Execution doc: [docs/field-execution-ui.md](../field-execution-ui.md)
- Execution service: [src/services/operations/fieldExecution.ts](../../src/services/operations/fieldExecution.ts)
- Migration: [20260528001600_phase6_field_execution_ui.sql](../../supabase/migrations/20260528001600_phase6_field_execution_ui.sql)
- Phase report: [06.04 Field Execution UI](./reports/06-04-field-execution-ui-2026-05-28.md)

### Phase 5: Manager Review Queue

- [x] Add review states.
- [x] Add approve/reject/comment actions.
- [x] Add exception prioritization.
- [x] Add audit trail.

Acceptance:

- Managers can inspect what happened without chasing messages.

Verification:

- Review actions are permission-gated and audited.

Status:

- Completed on 2026-05-28.
- Review doc: [docs/manager-review-queue.md](../manager-review-queue.md)
- Review service: [src/services/operations/managerReviewQueue.ts](../../src/services/operations/managerReviewQueue.ts)
- Migration: [20260528001500_phase6_manager_review_queue.sql](../../supabase/migrations/20260528001500_phase6_manager_review_queue.sql)
- Phase report: [06.05 Manager Review Queue](./reports/06-05-manager-review-queue-2026-05-28.md)

### Phase 6: Incident And Issue Tracking

- [x] Model incidents, issues, severity, owner, due date, and resolution.
- [x] Connect issues to tasks, workflows, inventory, and AI suggestions.
- [x] Add status and SLA indicators.
- [x] Add reporting.

Acceptance:

- Operational problems become tracked work.

Verification:

- Issue lifecycle tests pass.

Status:

- Completed on 2026-05-29.
- Issue doc: [docs/incident-issue-tracking.md](../incident-issue-tracking.md)
- Issue service: [src/services/operations/incidentIssueTracking.ts](../../src/services/operations/incidentIssueTracking.ts)
- Migration: [20260528001700_phase6_incident_issue_tracking.sql](../../supabase/migrations/20260528001700_phase6_incident_issue_tracking.sql)
- Phase report: [06.06 Incident And Issue Tracking](./reports/06-06-incident-and-issue-tracking-2026-05-29.md)

### Phase 7: Compliance Packs

- [x] Create templates for food safety, labor compliance, training, cleaning, and equipment.
- [x] Add evidence retention rules.
- [x] Add compliance dashboard.
- [x] Add exportable audit reports.

Acceptance:

- FlowForce can support compliance-oriented customers.

Verification:

- Compliance reports generate from real runs/evidence.

Status:

- Completed on 2026-05-29.
- Compliance doc: [docs/compliance-packs.md](../compliance-packs.md)
- Compliance service: [src/services/operations/compliancePacks.ts](../../src/services/operations/compliancePacks.ts)
- Migration: [20260528001800_phase6_compliance_packs.sql](../../supabase/migrations/20260528001800_phase6_compliance_packs.sql)
- Phase report: [06.07 Compliance Packs](./reports/06-07-compliance-packs-2026-05-29.md)

### Phase 8: Workflow Automation Hooks

- [x] Trigger tasks from failed checklist steps.
- [x] Trigger inventory adjustments or reviews from count/waste workflows.
- [x] Trigger notifications for overdue critical runs.
- [x] Log every automated action.

Acceptance:

- Workflows create operational follow-through.

Verification:

- Automation tests cover idempotence and permissions.

Status:

- Completed on 2026-05-29.
- Automation doc: [docs/workflow-automation-hooks.md](../workflow-automation-hooks.md)
- Automation service: [src/services/operations/workflowAutomationHooks.ts](../../src/services/operations/workflowAutomationHooks.ts)
- Migration: [20260528001900_phase6_workflow_automation_hooks.sql](../../supabase/migrations/20260528001900_phase6_workflow_automation_hooks.sql)
- Phase report: [06.08 Workflow Automation Hooks](./reports/06-08-workflow-automation-hooks-2026-05-29.md)

### Phase 9: Analytics For Execution Quality

- [x] Track completion, overdue, exception, and repeat-failure metrics.
- [x] Show trends by location, department, and role.
- [x] Connect results to performance and training.
- [x] Add manager coaching insights.

Acceptance:

- Execution quality becomes measurable.

Verification:

- Dashboard/report data matches workflow records.

Status:

- Completed on 2026-05-29.
- Analytics doc: [docs/execution-quality-analytics.md](../execution-quality-analytics.md)
- Analytics service: [src/services/operations/executionQualityAnalytics.ts](../../src/services/operations/executionQualityAnalytics.ts)
- Migration: [20260528002000_phase6_execution_quality_analytics.sql](../../supabase/migrations/20260528002000_phase6_execution_quality_analytics.sql)
- Phase report: [06.09 Execution Quality Analytics](./reports/06-09-execution-quality-analytics-2026-05-29.md)

### Phase 10: Operations Workflow Signoff

- [x] Seed demo workflows.
- [x] Add smoke coverage.
- [x] Update sales/demo script.
- [x] Update roadmap status.

Acceptance:

- FlowForce can credibly replace operational checklist tools.

Verification:

- Workflow demo works on desktop and mobile.

Status:

- Completed on 2026-05-29.
- Signoff doc: [docs/operations-workflow-signoff.md](../operations-workflow-signoff.md)
- Signoff service: [src/services/operations/operationsWorkflowSignoff.ts](../../src/services/operations/operationsWorkflowSignoff.ts)
- Migration: [20260528002100_phase6_operations_workflow_signoff.sql](../../supabase/migrations/20260528002100_phase6_operations_workflow_signoff.sql)
- Phase report: [06.10 Operations Workflow Signoff](./reports/06-10-operations-workflow-signoff-2026-05-29.md)
