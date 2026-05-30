# 09.04 Checklist Platform Migration Path

Date: 2026-05-30

## Completed

- Defined imported checklist-platform data: checklists, SOPs, forms, locations, and recurring tasks.
- Added template and step mapping documentation.
- Added a provider-neutral checklist migration adapter.
- Converted sample checklist exports into executable `create_sop_checklist_template` payloads.
- Added validation for missing names, missing steps, unsupported field types, and location review.
- Added post-import workflow review requirements before activation.
- Added contract coverage for valid and invalid checklist exports.

## Files

- `src/services/integrations/checklistMigrationPath.ts`
- `docs/checklist-platform-migration.md`
- `scripts/check-checklist-migration-contract.mjs`

## Product Decision

Imported checklist templates should not become live routines silently. Every imported workflow template requires manager review for locations, recurrence, evidence requirements, and final activation.

## Verification

- `npm run check:checklist-migration`

## Next

Phase 09.05 should add the MarketMan migration path for items, units, suppliers, purchases, recipes, counts, and waste, with unit conversion and cost-basis validation.
