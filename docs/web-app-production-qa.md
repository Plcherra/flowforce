# Web App Production QA

Date: 2026-05-28

Plan: 04 Web App Product Completion

Phase: 04.10 Web App Production QA

## Outcome

The production-facing web app shell now has a repeatable authenticated smoke gate across the visible production sidebar routes. The gate runs each route in desktop and mobile viewports, fails on application error shells, failed API responses, console errors, auth redirects, and horizontal overflow.

The 04.10 production smoke passed:

- Desktop routes: 11/11 passed.
- Mobile routes: 11/11 passed.
- Combined result: 22/22 passed.
- Report file: `docs/test-results/visible-modules-smoke.json`.

Additional verification passed:

- `npm run check:local`.
- `npm run typecheck`.
- `npm run build`.
- Local Supabase reset from the full migration chain.
- `npm run test:db:security` with the `flowforce` Colima profile.
- Remote Supabase migration push for `20260528000100_phase4_reports_ingestion_schema_contract.sql`.

## Production Routes Covered

- Dashboard
- Scheduling
- Tasks
- Messages
- Company Updates
- Forms
- Inventory
- Purchasing / Waste
- Reports
- Team
- Settings

## Fixes From QA

- `scripts/smoke-visible-modules.mjs` now runs desktop and mobile viewport checks instead of a single desktop-only pass.
- The smoke gate now detects horizontal document overflow so mobile layout regressions fail early.
- Reports no longer emits Supabase 400 responses from embedded relationship queries when the deployed schema does not expose those relationships.
- Report documents now normalize missing relationship arrays and missing processing state safely.
- The report ingestion schema has an explicit migration for file, document, event, and task-origin fields needed by upload and extraction flows.

## Remaining Launch Notes

- Plan 05 should continue with inventory, purchasing, labor, waste, and cost calculations. Inventory and purchasing are visible and smoke-clean, but the cost engine is not signed off yet.
