# Operations Workflow Signoff

Date: 2026-05-29

Plan: 06 Operations Workflows And Compliance

Phase: 06.10 Operations Workflow Signoff

## Product Positioning

FlowForce can now credibly replace operational checklist tools for a paid pilot: managers can build routines, schedule them, staff can execute them on mobile web, failed work creates tracked follow-up, compliance evidence is retained, and execution quality becomes measurable. This closes the Plan 06 operations workflow system.

The sellable sentence:

> FlowForce turns daily operating routines into assigned work, evidence, manager follow-up, and measurable coaching signals.

## What Is Signed Off

- Workflow domain model for checklists, SOPs, inspections, reviews, evidence, exceptions, assignments, and runs.
- SOP/checklist builder that creates executable workflow templates.
- Recurring operations calendar that generates daily runs idempotently.
- Mobile-first field execution surface for draft, resume, evidence, failed-step notes, and escalation.
- Manager review queue with approve, reject, needs-changes, priority, and audit trail.
- Incident/issue tracking connected to tasks, workflows, inventory, and AI suggestions.
- Compliance packs with food-safety, labor, training, cleaning, equipment, retention, dashboard, and export hooks.
- Workflow automation hooks for failed checklist steps, inventory/waste reviews, overdue critical notifications, and action logs.
- Execution quality analytics for completion, overdue, exceptions, repeat failures, training, and coaching.

## Demo Installer

The signoff migration `20260528002100_phase6_operations_workflow_signoff.sql` adds:

- `install_operations_workflow_demo(company_id)` for tenant-scoped demo setup.
- `operations_workflow_demo_readiness_v` for demo smoke readiness.

The demo installer creates sample-labeled operational data:

- Demo Opening Checklist
- Demo Closing Checklist
- Demo Cleaning Routine
- Demo Food Safety Check

It also creates opening, closing, cleaning, and food-safety workflows with same-day runs, step runs, sample evidence, a pending review, a food-safety exception, and automation follow-up. The installer is idempotent: running it again should not duplicate demo workflows.

## Smoke Coverage

`supabase/tests/phase6_operations_workflow_signoff.test.sql` verifies:

- Demo installation succeeds for a tenant member.
- Four demo workflows are created.
- Assignments, runs, and step runs exist.
- Completed, pending-review, exception, automation, and execution quality signals are present.
- The demo readiness view marks the tenant ready.
- Re-running the installer does not duplicate workflows.
- Cross-tenant demo installation is blocked.

## Demo Script Update

The 10-minute demo now has a signed-off operations workflow beat:

1. Open `/app/operations`.
2. Show the Operations hub with checklist widgets and execution quality.
3. Show opening/cleaning runs as completed evidence-backed work.
4. Show the food-safety failed step creating a manager review item and follow-up automation.
5. Show execution quality analytics explaining completion, overdue, exception, and coaching signals.

The same route is used for desktop and mobile web. Native mobile remains a later roadmap phase, but the current PWA/mobile-web path is now credible for staff execution during paid pilots.

## Release Gates

The signoff is wired into:

- `npm run check:operations-workflow-signoff`
- `npm run check:local`
- `npm run check:release`
- `npm run test:db:security`

## Remaining Risks

- Native offline mode is still Plan 08.
- Industry-specific compliance packs beyond the v1 templates need customer validation.
- Demo tenant reset UX is not yet a visible admin button; the installer is an RPC and testable migration contract.
