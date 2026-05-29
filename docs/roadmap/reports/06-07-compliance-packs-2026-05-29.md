# 06.07 Compliance Packs

Date: 2026-05-29

## Scope

Created the compliance pack slice for Plan 06.

## Changes

- Added installable compliance pack definitions for food safety, labor compliance, training, cleaning, and equipment.
- Added `workflow_compliance_packs`.
- Added `workflow_compliance_audit_exports`.
- Added workflow/evidence compliance metadata and retention behavior.
- Added `install_compliance_pack(...)`.
- Added `operations_compliance_dashboard_v`.
- Added `create_compliance_audit_export(...)`.
- Added `src/services/operations/compliancePacks.ts`.
- Added `CompliancePacksPanel` to the Operations Hub.
- Added `docs/compliance-packs.md`.
- Added `supabase/tests/phase6_compliance_packs.test.sql`.
- Added `npm run check:compliance-packs`.

## Acceptance

FlowForce can support compliance-oriented customers with installable workflow templates, evidence retention, dashboard visibility, and exportable audit reports.

## Verification

- `npm run check:compliance-packs`
- `supabase db reset`
- `supabase test db --local supabase/tests/phase6_compliance_packs.test.sql`
- `npm run check:local`
- `npm run test:db:security`
- `npm run build`

## Next

Phase 06.08: Workflow Automation Hooks.
