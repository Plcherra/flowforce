# 09.03 Workforce Platform Migration Path

Date: 2026-05-30

## Completed

- Defined imported workforce data: employees, roles, schedules, tasks, and messages where possible.
- Added workforce migration mapping documentation.
- Added generic workforce CSV adapters for employees, schedules, and tasks.
- Added role normalization for common workforce export role names.
- Added migration completion reporting with validation counts, object counts, skipped archive-only messages, and next actions.
- Added contract coverage that proves a sample workforce export creates valid FlowForce import previews.

## Files

- `src/services/integrations/workforceMigrationPath.ts`
- `docs/workforce-platform-migration.md`
- `scripts/check-workforce-migration-contract.mjs`

## Product Decision

Messages are archive-only for v1. The migration path should preserve message history as customer evidence, but should not insert historical conversations into live FlowForce message channels by default.

## Verification

- `npm run check:workforce-migration`

## Next

Phase 09.04 should add the checklist platform migration path for checklists, SOPs, forms, locations, and recurring tasks.
