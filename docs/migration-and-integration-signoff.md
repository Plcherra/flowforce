# Migration And Integration Signoff

Date: 2026-05-30
Roadmap phase: 09.10 Migration And Integration Signoff

## Goal

Switching to FlowForce should feel practical, not scary. By the end of Plan 09, a pilot customer should have a clear migration playbook, sample data packs, a demo migration flow, and a test-tenant population plan.

09.10 closes the integrations and migration tools roadmap. It does not perform a live customer cutover yet.

## Customer Migration Playbook

The migration playbook has seven stages:

- Scope source systems.
- Prepare import templates.
- Run migration imports.
- Validate operational data.
- Connect integration foundations.
- Review integration monitoring.
- Customer handoff.

Each stage has an owner, outcome, and required artifacts so the migration does not depend on tribal knowledge.

## Sample Data Packs

The sample data packs are:

- Restaurant starter: employees, inventory items, suppliers, recipes, purchase orders, schedules, and tasks.
- Retail starter: employees, inventory items, suppliers, counts, tasks, and forms.
- Operations workflow demo: checklists, SOPs, workflow steps, incidents, and training assignments.

Together, these packs can populate a realistic test tenant for demo, QA, and customer onboarding.

## Demo Migration Flow

The demo migration flow is:

- Create test tenant.
- Load sample data packs.
- Run import preview.
- Apply import.
- Connect foundation integrations.
- Review monitoring.
- Owner signoff.

Blocking launch checks include tenant baseline, import preview, applied records, monitoring visibility, and owner acceptance.

## Test Tenant Population

The test tenant population plan defines expected record counts across employees, inventory, suppliers, recipes, purchase orders, schedules, tasks, forms, checklists, SOPs, workflow steps, incidents, and training assignments.

Signoff checks include:

- Tenant baseline ready.
- Import preview clean.
- Sample records created.
- Cost engine smoke ready.
- Workflow execution smoke ready.
- Integration monitoring visible.
- Customer acceptance recorded.

## Roadmap Status

Plan 09 is complete when:

- All ten phases are checked.
- The master roadmap marks Integrations and Migration Tools complete.
- `npm run check:migration-integration-signoff` passes.
- `npm run check:local` includes every Plan 09 contract.

## Verification

09.10 is complete when:

- `npm run check:migration-integration-signoff` passes.
- A test tenant can be populated from migration samples in contract form.
- The settings-panel signoff surface shows playbook, sample packs, demo flow, and test-tenant checks.
- Plan 09 is marked complete in the roadmap ledger.
