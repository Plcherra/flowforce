# 09.05 MarketMan Migration Path

Date: 2026-05-30

## Completed

- Defined imported inventory data: items, units, suppliers, purchases, recipes, counts, and waste.
- Added unit conversion validation for positive factors, unique units, and matching dimensions.
- Added cost basis validation from weighted purchase averages or fallback item unit cost.
- Added recipe cost previews that convert ingredient quantities into item base units.
- Added count and waste readiness checks.
- Added inventory setup completeness reporting with object counts, readiness flags, cost basis, recipe previews, waste previews, issues, and next actions.
- Added contract coverage proving a sample inventory export supports cost-engine calculations.

## Files

- `src/services/integrations/marketmanMigrationPath.ts`
- `docs/marketman-migration-path.md`
- `scripts/check-marketman-migration-contract.mjs`

## Product Decision

This is still an import/migration path, not a live provider sync. It should be used for customer cutover packets and only later connected to live APIs after integration health, credentials, and retry behavior are complete.

## Verification

- `npm run check:marketman-migration`

## Next

Phase 09.06 should define the POS integration foundation, choose the first POS target, and add safe tenant-scoped credential and health models before live sync work starts.
