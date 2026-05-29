# 06.02 SOP And Checklist Builder

Date: 2026-05-28

## Scope

Created the first executable SOP/checklist builder slice for Plan 06.

## Changes

- Added `create_sop_checklist_template(p_company_id, p_template)`.
- Added `sop_checklist_builder_templates_v`.
- Added `src/services/operations/sopChecklistBuilder.ts` with opening, closing, cleaning, safety, and inventory presets.
- Added `SopChecklistBuilderPanel` to the Operations Hub.
- Added `docs/sop-checklist-builder.md`.
- Added `supabase/tests/phase6_sop_checklist_builder.test.sql`.
- Added `npm run check:sop-checklist-builder`.

## Acceptance

Builder presets now create executable workflow templates, form fields, workflow steps, and assignment rules from one tenant-scoped action.

## Verification

- `npm run check:sop-checklist-builder`
- `npm run check:local`
- `supabase db reset`
- `npm run test:db:security`
- `npm run build`

## Next

Phase 06.03: Recurring Operations Calendar.
