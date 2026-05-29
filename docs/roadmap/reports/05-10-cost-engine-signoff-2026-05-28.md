# 05.10 Cost Engine Signoff

Date: 2026-05-28

## Scope

Closed Plan 05 by making the cost engine sellable, testable, and release-gated.

## Changes

- Added `supabase/tests/phase5_cost_engine_regression.test.sql`.
- Added `20260528001000_phase5_cost_engine_signoff_grants.sql` after the regression test caught missing authenticated privileges on underlying invoker views.
- Added `20260528001100_phase5_cost_basis_artifact_closure.sql` after the Plan 05 audit caught promised cost-basis artifacts that were not yet implemented.
- Wired the regression test into `npm run test:db:security`.
- Added `docs/cost-engine-signoff.md`.
- Updated the canonical cost-engine contract with owner financial views/RPCs.
- Updated product/demo copy to emphasize actual, imported, estimated, pending, and sample source labels.
- Marked the legacy financial demo seeder as `sample` and excluded sample/demo finance rows from composed cost summaries.
- Added `npm run check:cost-engine-signoff` and wired it into `check:local` and `check:release`.
- Updated the launch checklist, master roadmap, and Plan 05 roadmap status.

## Acceptance

The cost engine is sellable as FlowForce's core v1 advantage: owners and managers can see labor, inventory, production, purchasing, waste, expenses, payments, source-labeled owner finance, and action queues in one product.

## Verification

- `npm run check:cost-engine-signoff`
- `npm run check:cost-engine`
- `npm run check:local`
- `npm run typecheck:src`
- `npm run build`
- `supabase db reset`
- `npm run test:db:security`

## Next

Plan 06: Operations Workflows And Compliance.
