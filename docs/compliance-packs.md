# Compliance Packs

Date: 2026-05-29

## Purpose

Compliance packs turn repeatable operational workflows into installable, evidence-retained programs. FlowForce now has pack definitions for food safety, labor compliance, training, cleaning, and equipment operations.

## Product Contract

- Compliance packs are tenant-scoped through `company_id`.
- Installing a pack creates or refreshes an active template workflow.
- Pack workflow steps require evidence.
- Evidence attached to pack workflows inherits `compliance_pack`.
- Evidence retention is extended to the pack retention window.
- Compliance dashboards summarize runs, pending reviews, overdue runs, evidence records, expiring evidence, and open exceptions.
- Audit exports generate a point-in-time JSON snapshot from real workflow runs, evidence, and exceptions.

## Database Surface

- `workflow_compliance_packs` stores installed pack metadata.
- `workflow_compliance_audit_exports` stores export snapshots.
- `compliance_pack_definition(pack_key)` returns the supported pack catalog.
- `install_compliance_pack(company_id, pack_key)` installs templates and evidence-required steps.
- `set_workflow_evidence_compliance_retention()` enforces pack retention on workflow evidence.
- `operations_compliance_dashboard_v` powers dashboard rollups.
- `create_compliance_audit_export(company_id, pack_key, period_start, period_end)` generates export snapshots.

## UI Surface

The Operations Hub now includes `CompliancePacksPanel`, where managers can install packs, monitor score/overdue/exception state, and create audit exports for installed packs.

## Verification

- Contract check: `npm run check:compliance-packs`
- Database test: `supabase test db --local supabase/tests/phase6_compliance_packs.test.sql`
- Full local gate: `npm run check:local`
- Full DB gate: `npm run test:db:security`
