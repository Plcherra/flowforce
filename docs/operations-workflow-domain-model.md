# Operations Workflow Domain Model

Date: 2026-05-28

Plan: 06 Operations Workflows And Compliance

Phase: 06.01 Workflow Domain Model

## Goal

FlowForce workflows are not loose forms. A workflow is a repeatable operational routine with assignment, execution, evidence, review, exceptions, auditability, and later automation.

## Canonical Model

| Concept | Table | Purpose |
| --- | --- | --- |
| Workflow template | `workflows` | SOP, checklist, inspection, approval, incident-response, training, inventory count, or custom routine. |
| Checklist step | `workflow_steps` | Ordered executable step with evidence policy and optional form field binding. |
| Assignment rule | `workflow_assignments` | Location, role, or person assignment rule with schedule, due window, and escalation metadata. |
| Workflow run | `task_workflow_instances` | Executable occurrence with status, due time, assignment, review state, and source. |
| Step run | `workflow_step_instances` | Per-step execution status, evidence status, notes, and failed reason. |
| Evidence | `workflow_evidence` | Attachment, signature, scan, rating, reading, note, or structured value captured during execution. |
| Review | `workflow_reviews` | Manager review decision with comments and reviewer identity. |
| Exception | `workflow_exceptions` | Failed, missed, unsafe, or out-of-standard condition linked to tasks and operational issues. |

## Reuse Decisions

Forms stay as the field/input schema system. `forms` and `form_fields` can power required fields, attachments, signatures, ratings, scans, and structured values, but they do not own recurring schedules, run state, exceptions, or manager review.

Tasks stay as follow-up work. A task can be created from a failed checklist step, overdue run, incident, or automation hook, but tasks are not the workflow template model.

`ops_issues` stays as the operational issue stream. `workflow_exceptions` can link to `ops_issues` when a failed run or incident should become visible in the operations hub and AI automation system.

`audit_log` stays as the immutable audit destination. Workflow tables hold operational state; audit events record who changed templates, runs, reviews, exceptions, and automation outcomes.

## Required Permissions

- Owners and admins manage templates, assignments, compliance packs, retention policy, and review policy.
- Managers launch runs, approve/reject runs, resolve exceptions, and inspect evidence.
- Employees execute assigned runs, save drafts, complete steps, and upload required evidence.
- Service routes can generate runs, tasks, issues, and notifications only when actions are tenant-scoped and audited.

## Tenant Contract

- Every workflow-owned row carries `company_id`.
- Workflow child rows inherit `company_id` from workflow, run, step, or step-run triggers.
- RLS is enabled for `workflows`, `workflow_steps`, `task_workflow_instances`, `workflow_step_instances`, `workflow_assignments`, `workflow_evidence`, `workflow_reviews`, and `workflow_exceptions`.
- Policies filter by `current_user_company_ids()`.
- Linked forms, tasks, and issues must belong to the same tenant.

## Audit Events

The workflow audit vocabulary is:

- `workflow.template.created`
- `workflow.template.updated`
- `workflow.run.started`
- `workflow.run.completed`
- `workflow.review.approved`
- `workflow.review.rejected`
- `workflow.exception.opened`
- `workflow.exception.resolved`
- `workflow.automation.triggered`

Phase 06.01 defines this vocabulary. Later phases will attach the events to UI mutations and service routes.

## Migration

`20260528001200_phase6_workflow_domain_model.sql` adds the domain primitives, triggers, RLS policies, indexes, and `workflow_domain_model_v`.

## Remaining Work

- Build the SOP/checklist builder on top of `workflows`, `workflow_steps`, and form field bindings.
- Generate recurring runs from `workflow_assignments`.
- Build the mobile run UI over `task_workflow_instances`, `workflow_step_instances`, and `workflow_evidence`.
- Add manager review queue actions and write audit events for every review decision.
